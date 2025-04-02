import { NextResponse } from "next/server"
import Stripe from "stripe"
import fs from "fs"
import path from "path"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia"
})

const ORDERS_DIR = path.join(process.cwd(), "backend", "orderMgmt")
console.log("Orders directory path:", ORDERS_DIR)

// Ensure orders directory exists
if (!fs.existsSync(ORDERS_DIR)) {
  console.log("Creating orders directory...")
  fs.mkdirSync(ORDERS_DIR, { recursive: true })
  console.log(`Created orders directory at: ${ORDERS_DIR}`)
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
    
    const { stripeToken, total, email, items, specialInstructions, paymentMethod } = body

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
        console.log("API Route: Creating Stripe charge")
        // Create a charge using Stripe
        const charge = await stripe.charges.create({
          amount: Math.round(total * 100),
          currency: "sgd",
          source: stripeToken,
          receipt_email: email,
          description: `Order for ${email}`,
          metadata: {
            order_items: JSON.stringify(formattedItems.map((item: FormattedOrderItem) => ({
              name: item.name,
              quantity: item.quantity,
              options: item.options.map((opt: { name: string }) => opt.name).join(", ")
            }))),
            special_instructions: specialInstructions || "None",
            total_amount: total.toFixed(2)
          }
        })
        console.log("API Route: Stripe charge created:", charge.id)

        // Prepare order data
        const orderData = {
          order_id: charge.id,
          order_date: new Date().toISOString(),
          payment_details: {
            stripe_token: stripeToken,
            charge_id: charge.id,
            payment_method: "card",
            status: "paid"
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
        const orderFile = path.join(ORDERS_DIR, `${charge.id}.json`)
        console.log("Saving card payment order to:", orderFile)
        console.log("Order details:", {
          id: orderData.order_id,
          items: orderData.order_items.map((item: FormattedOrderItem) => `${item.quantity}x ${item.name}`),
          special_instructions: orderData.special_instructions,
          total: orderData.order_summary.total_amount
        })
        
        fs.writeFileSync(orderFile, JSON.stringify(orderData, null, 2))
        console.log("Order file saved successfully")

        return NextResponse.json({
          orderId: charge.id,
          message: "Payment processed successfully"
        })
      } catch (stripeError: any) {
        console.error("API Route: Stripe error:", {
          message: stripeError.message,
          code: stripeError.code,
          type: stripeError.type
        })
        return NextResponse.json(
          { 
            message: stripeError.message,
            code: stripeError.code 
          },
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
      const orderFile = path.join(ORDERS_DIR, `${orderId}.json`)
      console.log("Saving non-card payment order to:", orderFile)
      console.log("Order details:", {
        id: orderData.order_id,
        items: orderData.order_items.map((item: FormattedOrderItem) => `${item.quantity}x ${item.name}`),
        special_instructions: orderData.special_instructions,
        total: orderData.order_summary.total_amount
      })
      
      fs.writeFileSync(orderFile, JSON.stringify(orderData, null, 2))
      console.log("Order file saved successfully")

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