"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// The form component that collects card details
function CheckoutForm({ onTokenGenerated }: { onTokenGenerated: (token: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCardValid, setIsCardValid] = useState(false)

  useEffect(() => {
    if (!elements) return

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const handleChange = (event: any) => {
      setIsCardValid(event.complete)
      if (event.error) {
        setError(event.error.message)
      } else {
        setError(null)
      }
    }

    cardElement.on('change', handleChange)
    return () => {
      cardElement.off('change', handleChange)
    }
  }, [elements])

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

      // Pass the token to the parent component
      onTokenGenerated(result.token.id)
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
      <div className="space-y-2">
        <label htmlFor="card-element" className="text-sm font-medium">
          Card Details
        </label>
        <div className="border rounded-md p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#9e2146",
                },
              },
            }}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || loading || !isCardValid} 
        className="w-full"
      >
        {loading ? "Processing..." : "Submit Card Details"}
      </Button>

      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </form>
  )
}

// The main component that wraps the form with Stripe Elements
export default function StripeTokenForm({ onTokenGenerated }: { onTokenGenerated: (token: string) => void }) {
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
      <CardFooter className="text-xs text-gray-500">Your payment information is secured with Stripe.</CardFooter>
    </Card>
  )
} 