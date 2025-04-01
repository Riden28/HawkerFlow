import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = headers().get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed")
      return NextResponse.json({ error: "Webhook Error" }, { status: 400 })
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // Handle successful payment
        // You can add additional logic here, such as updating order status in your database
        console.log("Payment succeeded:", paymentIntent.id)
        break
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object as Stripe.PaymentIntent
        // Handle failed payment
        console.log("Payment failed:", failedPayment.id)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
} 