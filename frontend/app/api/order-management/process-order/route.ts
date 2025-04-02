import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia"
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { stripeToken, total, email, items, specialInstructions, paymentMethod } = body

    if (paymentMethod === "card") {
      if (!stripeToken) {
        return NextResponse.json(
          { message: "Stripe token is required for card payments" },
          { status: 400 }
        )
      }

      try {
        // Create a charge using Stripe
        const charge = await stripe.charges.create({
          amount: Math.round(total * 100), // Convert to cents
          currency: "sgd",
          source: stripeToken,
          receipt_email: email,
          description: `Order for ${email}`,
          metadata: {
            orderItems: JSON.stringify(items),
            specialInstructions
          }
        })

        // Return success response with order ID
        return NextResponse.json({
          orderId: charge.id,
          message: "Payment processed successfully"
        })
      } catch (stripeError: any) {
        console.error("Stripe error:", stripeError)
        return NextResponse.json(
          { 
            message: stripeError.message,
            code: stripeError.code 
          },
          { status: 400 }
        )
      }
    } else {
      // For non-card payments (QR, cash), just generate an order ID
      const orderId = `ORD-${Date.now()}`
      return NextResponse.json({
        orderId,
        message: "Order created successfully"
      })
    }
  } catch (error) {
    console.error("Order processing error:", error)
    return NextResponse.json(
      { message: "Failed to process order" },
      { status: 500 }
    )
  }
} 