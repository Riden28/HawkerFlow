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
  }, [stripe, elements])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      setError("Payment system not initialized")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("Card element not found")
      }

      const result = await stripe.createToken(cardElement)
      if (result.error) {
        throw result.error
      }

      if (!result.token) {
        throw new Error("Failed to generate card token")
      }

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
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white relative" 
            style={{ minHeight: '44px' }}
          >
            <CardElement
              id="card-element"
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                    ':-webkit-autofill': {
                      color: '#424770',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                    iconColor: '#9e2146'
                  }
                },
                classes: {
                  base: 'stripe-element',
                  complete: 'stripe-element--complete',
                  empty: 'stripe-element--empty',
                  focus: 'stripe-element--focus',
                  invalid: 'stripe-element--invalid',
                  webkitAutofill: 'stripe-element--webkit-autofill'
                },
                hidePostalCode: true,
                showIcon: true,
                iconStyle: 'solid'
              }}
              className="w-full h-full"
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

        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </form>
    </div>
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
    <div className="w-full">
      <Elements stripe={stripePromise}>
        <CheckoutForm onTokenGenerated={onTokenGenerated} />
      </Elements>
    </div>
  )
} 