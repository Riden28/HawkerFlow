"use client"

import { useState, useEffect, FormEvent } from "react"
import { loadStripe, Stripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

// 1) Load the publishable key from environment variables
const getStripe = (): Promise<Stripe | null> => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    console.error("Stripe publishable key is missing!")
    return Promise.resolve(null)
  }
  return loadStripe(key)
}

const stripePromise = getStripe()

// 2) The main form that collects card details & generates the token
function CheckoutForm({ onTokenGenerated }: { onTokenGenerated: (token: any) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCardValid, setIsCardValid] = useState(false)

  useEffect(() => {
    if (!stripe || !elements) return
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    // Listen for card detail changes (e.g. validation errors)
    cardElement.on("change", (event) => {
      setIsCardValid(event.complete)
      setError(event.error ? event.error.message : null)
    })
  }, [stripe, elements])

  // Only creates a token; does not finalize payment
  const handleGetToken = async (e: FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)
    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("CardElement not found")
      }
      const { token, error } = await stripe.createToken(cardElement)
      if (error) {
        throw error
      }
      if (!token) {
        throw new Error("Failed to create token")
      }
      onTokenGenerated(token)
      toast.success("Token generated successfully. Now click the bottom 'Pay Now' to finalize payment.")
    } catch (err: any) {
      console.error("Error creating token:", err)
      setError(err.message || "Failed to process payment")
      toast.error("Failed to generate token", {
        description: err.message || "Please check your card details."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleGetToken} className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Card Details</CardTitle>
          <CardDescription>Enter your card information to generate a token</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 border rounded-md">
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
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
        </CardContent>
        <CardFooter>
          {/* 3) Renamed button to "Get Token" to avoid confusion with final payment */}
          <Button
            type="submit"
            className="w-full"
            disabled={!stripe || !elements || loading || !isCardValid}
          >
            {loading ? "Generating..." : "Get Token"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

// 4) Wrap the CheckoutForm with <Elements> to provide Stripe context
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
