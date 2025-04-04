"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

// Make sure we have the key
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!stripeKey) {
  console.error("Stripe publishable key is missing!")
}

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(stripeKey!)
console.log("Stripe initialization status:", stripePromise ? "Success" : "Failed")

// The form component that collects card details
function CheckoutForm({ onTokenGenerated }: { onTokenGenerated: (token: any) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCardValid, setIsCardValid] = useState(false)

  useEffect(() => {
    // Log initialization status
    console.log("Stripe available:", !!stripe)
    console.log("Elements available:", !!elements)

    if (!stripe || !elements) {
      setError("Payment system is initializing...")
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError("Card element not found")
      return
    }

    const handleChange = (event: any) => {
      console.log("Card input change:", event.complete ? "complete" : "incomplete")
      setIsCardValid(event.complete)
      if (event.error) {
        setError(event.error.message)
        console.error("Card input error:", event.error)
      } else {
        setError(null)
      }
    }

    cardElement.on('change', handleChange)
    return () => {
      cardElement.off('change', handleChange)
    }
  }, [stripe, elements])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setError("Payment system not initialized")
      return
    }

    if (!isCardValid) {
      setError("Please enter valid card details")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("Card element not found")
      }

      console.log("Creating token...")
      const result = await stripe.createToken(cardElement)
      console.log("Token creation result:", result)

      if (result.error) {
        throw result.error
      }

      if (!result.token) {
        throw new Error("Failed to generate card token")
      }

      // Pass the complete token object to the parent component
      onTokenGenerated(result.token)
      toast.success("Card details verified!")
    } catch (err: any) {
      console.error("Error creating token:", err)
      setError(err.message || "An error occurred while processing your card")
      toast.error(err.message || "An error occurred while processing your card")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2 relative">
        <label htmlFor="card-element" className="text-sm font-medium">
          Card Details
        </label>
        <div className="relative border rounded-md p-3 bg-white min-h-[40px] overflow-visible" style={{ zIndex: 100 }}>
          <CardElement
            id="card-element"
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                  fontSmoothing: "antialiased",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                  backgroundColor: "white",
                },
                invalid: {
                  color: "#9e2146",
                  iconColor: "#9e2146"
                },
              },
              hidePostalCode: true,
            }}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || loading || !isCardValid} 
        className="w-full mt-4"
      >
        {loading ? "Processing..." : "Submit Card Details"}
      </Button>

      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </form>
  )
}

// The main component that wraps the form with Stripe Elements
export default function StripeTokenForm({ onTokenGenerated }: { onTokenGenerated: (token: any) => void }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading payment form...</div>
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
        <CardDescription>Enter your card details to create a Stripe token</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise}>
          <CheckoutForm onTokenGenerated={onTokenGenerated} />
        </Elements>
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        Your payment information is secured with Stripe.
      </CardFooter>
    </Card>
  )
} 