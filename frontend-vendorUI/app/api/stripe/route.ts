import { NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe with your secret key
// In production, you should use environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, paymentMethodId } = body

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      currency: "sgd",
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success`,
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error("Stripe payment error:", error)
    return NextResponse.json({ success: false, error: "Payment failed" }, { status: 500 })
  }
}

