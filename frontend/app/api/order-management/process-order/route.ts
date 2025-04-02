import { NextResponse } from "next/server"
import Stripe from "stripe"
import path from "path"
import fs from "fs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia"
})

// Ensure orders directory exists
if (!fs.existsSync(path.join(process.cwd(), "backend", "orderMgmt"))) {
  console.log("Creating orders directory...")
  fs.mkdirSync(path.join(process.cwd(), "backend", "orderMgmt"), { recursive: true })
  console.log(`Created orders directory at: ${path.join(process.cwd(), "backend", "orderMgmt")}`)
} else {
  console.log("Orders directory already exists")
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  options?: Array<{
    name: string
    price: number
  }>
}

interface FormattedOrderItem {
  id: string
  name: string
  quantity: number
  unit_price: number
  options: Array<{
    name: string
    price: number
  }>
  item_total: number
  options_total: number
  subtotal: number
}

const saveOrderToFile = async (orderId: string, orderData: any) => {
  try {
    // Change the directory path to the main backend folder
    const orderMgtDir = path.join(process.cwd(), '..', 'backend', 'orderMgt')
    const filePath = path.join(orderMgtDir, `${orderId}.json`)

    // Ensure the directory exists
    if (!fs.existsSync(orderMgtDir)) {
      fs.mkdirSync(orderMgtDir, { recursive: true })
    }

    // Write the order data to file
    await fs.promises.writeFile(filePath, JSON.stringify(orderData, null, 2))
    console.log(`Order saved to ${filePath}`)
  } catch (error) {
    console.error('Error saving order to file:', error)
    throw error
  }
}

export async function POST(request: Request) {
  console.log("API Route: Received POST request")
  
  try {
    const body = await request.json()
    console.log("API Route: Parsed request body:", {
      email: body.email,
      total: body.total,
      paymentMethod: body.paymentMethod,
      itemCount: body.items?.length,
      hasStripeToken: !!body.stripeToken,
      specialInstructions: body.specialInstructions || "None"
    })
    
    const { stripeToken, tokenObject, total, email, items, specialInstructions, paymentMethod } = body

    // Format order items with detailed information
    const formattedItems = items.map((item: OrderItem): FormattedOrderItem => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      options: item.options?.map(opt => ({
        name: opt.name,
        price: opt.price
      })) || [],
      item_total: item.price * item.quantity,
      options_total: (item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0) * item.quantity,
      subtotal: item.price * item.quantity + 
        (item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0) * item.quantity
    }))

    // Calculate order summary
    const orderSummary = {
      subtotal: formattedItems.reduce((sum: number, item: FormattedOrderItem) => sum + item.subtotal, 0),
      discount: formattedItems.reduce((sum: number, item: FormattedOrderItem) => sum + item.subtotal, 0) * 0.1,
      service_fee: 0.50,
      total_amount: total
    }

    if (paymentMethod === "card") {
      console.log("API Route: Processing card payment")
      
      if (!stripeToken) {
        console.log("API Route: Missing Stripe token")
        return NextResponse.json(
          { message: "Stripe token is required for card payments" },
          { status: 400 }
        )
      }

      try {
        // Create a charge using Stripe with the token ID
        const charge = await stripe.charges.create({
          amount: Math.round(total * 100),
          currency: "sgd",
          source: stripeToken,  // Use the token ID directly
          receipt_email: email,
          description: `Order for ${email}`,
          metadata: {
            order_items: JSON.stringify(formattedItems.map((item: OrderItem) => ({
              name: item.name,
              quantity: item.quantity,
              options: item.options?.map((opt: { name: string }) => opt.name).join(", ")
            }))),
            special_instructions: specialInstructions || "None",
            total_amount: total.toFixed(2)
          }
        })
        console.log("API Route: Stripe charge created:", charge.id)

        // Prepare complete order data using the token object we received
        const orderData = {
          token: tokenObject,  // Store the complete token object
          order_details: {
            items: formattedItems.map((item: OrderItem) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.price,
              options: item.options?.map(opt => ({
                name: opt.name,
                price: opt.price
              })) || [],
              item_total: item.price * item.quantity,
              options_total: (item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0) * item.quantity,
              subtotal: item.price * item.quantity + 
                (item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0) * item.quantity
            })),
            order_summary: {
              subtotal: orderSummary.subtotal,
              discount: orderSummary.discount,
              service_fee: orderSummary.service_fee,
              total_amount: orderSummary.total_amount
            },
            special_instructions: specialInstructions || "None",
            customer_email: email,
            order_id: charge.id,
            order_date: new Date().toISOString(),
            payment_status: "paid",
            order_status: "ready_for_pickup",
            charge_id: charge.id
          }
        }

        // Save complete order to file
        await saveOrderToFile(charge.id, orderData)

        return NextResponse.json({
          orderId: charge.id,
          message: "Payment processed successfully"
        })

      } catch (stripeError: any) {
        console.error("API Route: Stripe error:", stripeError)
        return NextResponse.json(
          { message: stripeError.message },
          { status: 400 }
        )
      }
    } else {
      console.log("API Route: Processing non-card payment:", paymentMethod)
      const orderId = `ORD-${Date.now()}`
      
      // Prepare order data
      const orderData = {
        order_id: orderId,
        order_date: new Date().toISOString(),
        payment_details: {
          payment_method: paymentMethod,
          status: paymentMethod === "cash" ? "pending" : "processing"
        },
        customer_details: {
          email: email
        },
        order_items: formattedItems,
        order_summary: orderSummary,
        special_instructions: specialInstructions || "None",
        status: "ready_for_pickup"
      }

      // Save order to file
      await saveOrderToFile(orderId, orderData)

      return NextResponse.json({
        orderId,
        message: "Order created successfully"
      })
    }
  } catch (error: any) {
    console.error("API Route: Error processing order:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { message: error.message || "Failed to process order" },
      { status: 500 }
    )
  }
} 