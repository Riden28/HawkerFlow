import { NextResponse } from "next/server"
import Stripe from "stripe"
import path from "path"
import fs from "fs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia"
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("=== FINAL DATA SENT TO ORDERMGT ===")
    console.log(body)
    console.log("=== END OF ORDERMGT DATA ===")

    const { stripeToken, token, email, items, specialInstructions, paymentMethod, total, orderSummary } = body

    // Create a charge using Stripe
    const charge = await stripe.charges.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: "sgd",
      source: stripeToken,
      receipt_email: email,
      description: `Order for ${email}`,
      metadata: {
        order_items: JSON.stringify(items),
        special_instructions: specialInstructions || "None"
      }
    })

    // Save order data to backend/orderMgt
    const backendPath = path.resolve(process.cwd(), '..', 'backend', 'orderMgt')
    if (!fs.existsSync(backendPath)) {
      fs.mkdirSync(backendPath, { recursive: true })
    }

    const orderData = {
      createdAt: new Date().toISOString(),
      email: email,
      id: charge.id,
      items: items,
      paymentMethod: paymentMethod,
      specialInstructions: specialInstructions || "",
      status: "ready_for_pickup",
      token: token,
      total: total,
      orderSummary: orderSummary
    }

    const filePath = path.join(backendPath, `${charge.id}.json`)
    await fs.promises.writeFile(filePath, JSON.stringify(orderData, null, 2))

    return NextResponse.json({
      orderId: charge.id,
      message: "Payment processed successfully"
    })

  } catch (error: any) {
    console.error("Error processing order:", error)
    return NextResponse.json(
      { message: error.message || "Failed to process order" },
      { status: 500 }
    )
  }
} 