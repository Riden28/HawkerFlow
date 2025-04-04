"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

// Initialize Stripe with your publishable key
const getStripe = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    console.error("Stripe publishable key is missing!")
    return null
  }
  return loadStripe(key)
}

const stripePromise = getStripe()

// The form component that collects card details
function CheckoutForm({ onTokenGenerated }: { onTokenGenerated: (token: any) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCardValid, setIsCardValid] = useState(false)

  useEffect(() => {
    if (!stripe || !elements) {
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      return
    }

    // Add change event listener to the card element
    cardElement.on('change', (event) => {
      setIsCardValid(event.complete)
      setError(event.error ? event.error.message : null)
    })
  }, [stripe, elements])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("Card element not found")
      }

      const { token, error } = await stripe.createToken(cardElement)
      
      if (error) {
        throw error
      }

      if (!token) {
        throw new Error("Failed to create token")
      }

      onTokenGenerated(token)
    } catch (err) {
      console.error("Error creating token:", err)
      setError(err instanceof Error ? err.message : "Failed to process payment")
      toast.error("Payment failed", {
        description: err instanceof Error ? err.message : "Failed to process payment"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Card Details</CardTitle>
          <CardDescription>Enter your card information to complete the payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 border rounded-md">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || !elements || loading || !isCardValid}
          >
            {loading ? "Processing..." : "Pay Now"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

// The main component that provides the Stripe context
export default function StripeTokenForm({ onTokenGenerated }: { onTokenGenerated: (token: any) => void }) {
  if (!stripePromise) {
    return null
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm onTokenGenerated={onTokenGenerated} />
    </Elements>
  )
} 