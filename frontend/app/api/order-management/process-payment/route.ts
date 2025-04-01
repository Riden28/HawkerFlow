import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

export async function POST(request: Request) {
  try {
    const { token, amount, email, items, specialInstructions, paymentMethod: selectedPaymentMethod } = await request.json()

    // First create a payment method from the token
    const stripePaymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: token,
      },
    })

    // Then create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "sgd",
      payment_method: stripePaymentMethod.id,
      confirm: true,
      payment_method_types: ['card'],
      receipt_email: email,
      metadata: {
        order_items: JSON.stringify(items),
        special_instructions: specialInstructions
      }
    })

    // If payment is successful, create the order
    if (paymentIntent.status === "succeeded") {
      // Generate a unique order ID
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      return NextResponse.json({
        orderId,
        status: "success",
        message: "Payment processed successfully"
      })
    } else {
      throw new Error("Payment failed")
    }
  } catch (error: any) {
    console.error("Payment processing error:", error)
    
    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { 
          code: error.code,
          message: error.message 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        code: 'payment_failed',
        message: error.message || "Payment failed. Please try again." 
      },
      { status: 500 }
    )
  }
} 