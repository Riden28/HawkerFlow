"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, QrCode, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useCart } from "@/contexts/cart-context"
import { Navbar } from "@/components/navbar"
import { toast } from "sonner"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements, CardElement } from "@stripe/react-stripe-js"

// Initialize Stripe with error handling
const stripePromise = (() => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    console.error("Stripe publishable key is missing. Please check your environment variables.")
    return null
  }
  return loadStripe(key)
})()

const appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#0F172A',
    colorBackground: '#ffffff',
    colorText: '#0F172A',
    colorDanger: '#df1b41',
    fontFamily: 'system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '8px',
  },
} as const

// Stripe card component
function CardForm({ onSubmit }: { onSubmit: (token: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCardValid, setIsCardValid] = useState(false)

  useEffect(() => {
    // Log when Stripe is initialized
    if (stripe) {
      console.log('Stripe initialized successfully')
    }
  }, [stripe])

  useEffect(() => {
    if (!elements) return

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const handleChange = (event: any) => {
      console.log('Card input changed:', event)
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
    console.log('Submit button clicked')

    if (!stripe || !elements) {
      console.error('Stripe or elements not initialized')
      setError("Payment system not initialized")
      return
    }

    if (!isCardValid) {
      setError("Please enter valid card details")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("Card element not found")
      }

      console.log('Creating token...')
      const result = await stripe.createToken(cardElement)
      console.log('Token creation result:', result)
      
      if (result.error) {
        throw result.error
      }

      if (!result.token) {
        throw new Error("Failed to generate card token")
      }

      console.log('Token generated:', result.token.id)
      onSubmit(result.token.id)
      toast.success("Card details verified!")
    } catch (err: any) {
      console.error('Token creation error:', err)
      setError(err.message || "Payment failed")
      toast.error(err.message || "Payment failed")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#0F172A',
                '::placeholder': {
                  color: '#6B7280',
                },
              },
              invalid: {
                color: '#EF4444',
              },
            },
          }}
        />
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !elements || isProcessing || !isCardValid}
      >
        {isProcessing ? "Processing..." : "Submit Card Details"}
      </Button>
    </form>
  )
}

export default function PaymentPage() {
  const router = useRouter()
  const { cart, clearCart } = useCart()
  const [email, setEmail] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "qr" | "cash">("card")
  const [cardToken, setCardToken] = useState<string | null>(null)
  const [isCardValid, setIsCardValid] = useState(false)

  const handleBack = () => {
    router.back()
  }

  const handleCardSubmit = (token: string) => {
    setCardToken(token)
    setIsCardValid(true)
    toast.success("Card verified successfully!")
  }

  const handlePayment = async () => {
    if (!email) {
      setError("Please enter your email for the receipt")
      return
    }

    if (paymentMethod === "card" && !cardToken) {
      setError("Please complete card payment first")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      if (paymentMethod === "card") {
        const paymentResponse = await fetch("/api/order-management/process-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            token: cardToken,
            amount: calculateTotal(),
            email,
            items: cart.items,
            specialInstructions,
            paymentMethod
          })
        })

        const data = await paymentResponse.json()

        if (!paymentResponse.ok) {
          // Handle different error cases
          switch (paymentResponse.status) {
            case 400:
              switch (data.code) {
                case 'card_declined':
                  throw new Error("Your card was declined. Please try another card.")
                case 'insufficient_funds':
                  throw new Error("Insufficient funds in your card. Please try another card.")
                case 'expired_card':
                  throw new Error("Your card has expired. Please use a different card.")
                case 'incorrect_cvc':
                  throw new Error("Incorrect CVC code. Please check and try again.")
                case 'invalid_card':
                  throw new Error("Invalid card details. Please check and try again.")
                default:
                  throw new Error(data.message || "Payment failed. Please try again.")
              }
            case 500:
              throw new Error("An internal server error occurred. Please try again later.")
            default:
              throw new Error("Payment failed. Please try again.")
          }
        }

        // Payment successful
        toast.success("Payment successful! Redirecting to orders...")
        
        // Create order in localStorage
        const order = {
          id: data.orderId,
          items: cart.items,
          total: calculateTotal(),
          email,
          specialInstructions,
          paymentMethod,
          status: "ready_for_pickup",
          createdAt: new Date().toISOString()
        }

        const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]")
        localStorage.setItem("orders", JSON.stringify([...existingOrders, order]))

        clearCart()
        router.push("/orders")
      } else {
        // Handle QR and cash payments (existing logic)
        await new Promise(resolve => setTimeout(resolve, 2000))

        const order = {
          id: `ORD-${Date.now()}`,
          items: cart.items,
          total: calculateTotal(),
          email,
          specialInstructions,
          paymentMethod,
          status: "ready_for_pickup",
          createdAt: new Date().toISOString()
        }

        const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]")
        localStorage.setItem("orders", JSON.stringify([...existingOrders, order]))

        clearCart()
        toast.success("Order placed successfully!")
        router.push("/orders")
      }
    } catch (err) {
      console.error("Payment error:", err)
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.")
      toast.error(err instanceof Error ? err.message : "Payment failed. Please try again.", {
        description: "Please check your card details or try another payment method.",
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const renderPaymentForm = () => {
    switch (paymentMethod) {
      case "card":
        if (!stripePromise) {
          return (
            <div className="p-4 text-red-500">
              Card payment is currently unavailable. Please try another payment method.
            </div>
          )
        }
        return (
          <Elements stripe={stripePromise} options={{ appearance }}>
            <CardForm onSubmit={handleCardSubmit} />
          </Elements>
        )
      case "qr":
        return (
          <div className="text-center p-6">
            <QrCode className="w-48 h-48 mx-auto mb-4" />
            <p className="text-muted-foreground">Scan this QR code with your mobile payment app</p>
            <p className="font-medium mt-2">Amount: ${calculateTotal().toFixed(2)}</p>
          </div>
        )
      case "cash":
        return (
          <div className="text-center p-6">
            <Banknote className="w-24 h-24 mx-auto mb-4" />
            <p className="text-muted-foreground">Pay with cash upon food collection</p>
            <p className="font-medium mt-2">Amount to prepare: ${calculateTotal().toFixed(2)}</p>
          </div>
        )
    }
  }

  const calculateSubtotal = () => {
    return cart.items.reduce((total, item) => {
      const itemTotal = item.price * item.quantity
      const optionsTotal = item.options?.reduce((sum, option) => sum + option.price, 0) || 0
      return total + (itemTotal + optionsTotal * item.quantity)
    }, 0)
  }

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal()
    return subtotal * 0.1 // 10% discount
  }

  const calculateServiceFee = () => {
    return 0.50 // Fixed service fee
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = calculateDiscount()
    const serviceFee = calculateServiceFee()
    return subtotal - discount + serviceFee
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-3xl font-bold">Payment</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email for Receipt
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-4">
                      Payment Method
                    </label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as "card" | "qr" | "cash")}
                      className="grid grid-cols-3 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="card" id="card" className="peer sr-only" />
                        <Label
                          htmlFor="card"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <CreditCard className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">Credit Card</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="qr" id="qr" className="peer sr-only" />
                        <Label
                          htmlFor="qr"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <QrCode className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">QR Code</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                        <Label
                          htmlFor="cash"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <Banknote className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">Cash</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {renderPaymentForm()}

                  <div>
                    <label htmlFor="special-instructions" className="block text-sm font-medium mb-2">
                      Special Instructions
                    </label>
                    <Textarea
                      id="special-instructions"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Any special requests?"
                      className="resize-none"
                    />
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handlePayment}
                    disabled={isProcessing || (paymentMethod === "card" && !isCardValid)}
                  >
                    {isProcessing ? "Processing..." : `Pay ${paymentMethod === "cash" ? "Later" : "Now"}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        {item.options && item.options.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {item.options.map((option, idx) => (
                              <p key={idx}>
                                {option.name} (+${option.price.toFixed(2)})
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="font-medium">
                        ${((item.price + (item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0)) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-green-600">
                      <span>Discount (10%)</span>
                      <span>-${calculateDiscount().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-4">
                      <span>Service Fee</span>
                      <span>${calculateServiceFee().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-muted py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}