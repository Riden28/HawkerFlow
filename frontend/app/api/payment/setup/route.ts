import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: Request) {
  try {
    const { amount, currency = "sgd" } = await request.json()

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe expects amount in cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error("Error creating payment intent:", error)
    return NextResponse.json(
      { error: "Error creating payment intent" },
      { status: 500 }
    )
  }
} 