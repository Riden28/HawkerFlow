import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

export async function POST(request: Request) {
  try {
    const { token, amount, email, items, specialInstructions, paymentMethod: selectedPaymentMethod } = await request.json()

    try {
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
        return NextResponse.json(
          { 
            code: 'payment_failed',
            message: "Payment was not successful. Please try again." 
          },
          { status: 400 }
        )
      }
    } catch (stripeError: any) {
      // Handle Stripe-specific errors
      if (stripeError instanceof Stripe.errors.StripeError) {
        switch (stripeError.type) {
          case 'StripeCardError':
            // Card declined, insufficient funds, etc.
            return NextResponse.json(
              { 
                code: stripeError.code,
                message: stripeError.message 
              },
              { status: 400 }
            )
          case 'StripeInvalidRequestError':
            // Invalid parameters
            return NextResponse.json(
              { 
                code: 'invalid_request',
                message: "Invalid payment request. Please try again." 
              },
              { status: 400 }
            )
          default:
            // Other Stripe errors
            return NextResponse.json(
              { 
                code: stripeError.type,
                message: "Payment processing error. Please try again." 
              },
              { status: 400 }
            )
        }
      }

      // Re-throw other errors to be caught by the outer catch
      throw stripeError
    }
  } catch (error: any) {
    console.error("Payment processing error:", error)
    
    return NextResponse.json(
      { 
        code: 'server_error',
        message: "An internal server error occurred. Please try again later." 
      },
      { status: 500 }
    )
  }
} 