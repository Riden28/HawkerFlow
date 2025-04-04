"use client"

import { useState } from "react"
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
import StripeTokenForm from "@/components/stripe-form"

export default function PaymentPage() {
  const router = useRouter()
  const { cart, clearCart } = useCart()
  const [email, setEmail] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "qr" | "cash">("card")
  const [cardToken, setCardToken] = useState<any>(null)
  const [isCardValid, setIsCardValid] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const handleBack = () => {
    router.back()
  }

  const handleCardTokenGenerated = (token: any) => {
    console.log("Token generated:", token)
    setCardToken(token)
    setIsCardValid(true)
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

    if (!cart?.items || cart.items.length === 0) {
      setError("Your cart is empty")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      console.log("Starting payment process...")
      const orderItems = cart.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        stallName: item.stallName,
        hawkerCenterName: item.hawkerCenterName,
        waitTime: item.waitTime,
        prepTime: item.prepTime,
        image: item.image,
        options: item.options || [],
        specialInstructions: item.specialInstructions
      }))

      // Create the complete request data structure
      const requestData = {
        createdAt: new Date().toISOString(),
        email,
        stripeToken: cardToken.id,
        token: {
          card: {
            address_city: cardToken.card.address_city,
            address_country: cardToken.card.address_country,
            address_line1: cardToken.card.address_line1,
            address_line1_check: cardToken.card.address_line1_check,
            address_line2: cardToken.card.address_line2,
            address_state: cardToken.card.address_state,
            address_zip: cardToken.card.address_zip,
            address_zip_check: cardToken.card.address_zip_check,
            brand: cardToken.card.brand,
            country: cardToken.card.country,
            cvc_check: cardToken.card.cvc_check,
            dynamic_last4: cardToken.card.dynamic_last4,
            exp_month: cardToken.card.exp_month,
            exp_year: cardToken.card.exp_year,
            funding: cardToken.card.funding,
            id: cardToken.card.id,
            last4: cardToken.card.last4,
            name: cardToken.card.name,
            networks: cardToken.card.networks,
            object: cardToken.card.object,
            regulated_status: cardToken.card.regulated_status,
            tokenization_method: cardToken.card.tokenization_method,
            wallet: cardToken.card.wallet
          },
          client_ip: cardToken.client_ip,
          created: cardToken.created,
          id: cardToken.id,
          livemode: cardToken.livemode,
          object: cardToken.object,
          type: cardToken.type,
          used: cardToken.used
        },
        items: orderItems,
        paymentMethod,
        specialInstructions,
        status: "ready_for_pickup",
        total: calculateTotal(),
        orderSummary: {
          subtotal: calculateSubtotal(),
          discount: calculateDiscount(),
          serviceFee: calculateServiceFee(),
          total: calculateTotal()
        }
      }

      console.log("Sending request data:", requestData)

      const response = await fetch("/api/order-management/process-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
      })

      console.log("Received response:", response.status, response.statusText)
      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.message || "Failed to process order")
      }

      // Payment successful
      console.log("Payment successful, creating local order...")
      toast.success("Payment successful! Redirecting to orders...")
      
      // Create order in localStorage
      const order = {
        id: data.orderId,
        items: orderItems,
        total: calculateTotal(),
        email,
        specialInstructions,
        paymentMethod,
        status: "ready_for_pickup",
        createdAt: new Date().toISOString()
      }

      const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]")
      localStorage.setItem("orders", JSON.stringify([...existingOrders, order]))
      console.log("=== FINAL DATA SENT TO ORDERMGMT ===")
      console.log({
        createdAt: new Date().toISOString(),
        email,
        id: data.orderId,
        token: {
          card: cardToken.card,
          client_ip: cardToken.client_ip,
          created: cardToken.created,
          id: cardToken.id,
          livemode: cardToken.livemode,
          object: cardToken.object,
          type: cardToken.type,
          used: cardToken.used
        },
        items: orderItems,
        paymentMethod,
        specialInstructions,
        status: "ready_for_pickup",
        total: calculateTotal()
      })
      console.log("=== END OF ORDERMGMT DATA ===")

      // Clear the card token and form state
      setCardToken(null)
      setIsCardValid(false)
      
      clearCart()
      router.push("/orders")

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

  const calculateSubtotal = () => {
    return cart.items.reduce((total, item) => {
      const itemTotal = item.price * item.quantity
      const optionsTotal = item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0
      return total + (itemTotal + optionsTotal * item.quantity)
    }, 0)
  }

  const calculateDiscount = () => {
    return calculateSubtotal() * 0.1 // 10% discount
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

                  {paymentMethod === "card" && (
                    <StripeTokenForm onTokenGenerated={handleCardTokenGenerated} />
                  )}

                  {paymentMethod === "qr" && (
                    <div className="text-center p-6">
                      <QrCode className="w-48 h-48 mx-auto mb-4" />
                      <p className="text-muted-foreground">Scan this QR code with your mobile payment app</p>
                      <p className="font-medium mt-2">Amount: ${calculateTotal().toFixed(2)}</p>
                    </div>
                  )}

                  {paymentMethod === "cash" && (
                    <div className="text-center p-6">
                      <Banknote className="w-24 h-24 mx-auto mb-4" />
                      <p className="text-muted-foreground">Pay with cash upon food collection</p>
                      <p className="font-medium mt-2">Amount to prepare: ${calculateTotal().toFixed(2)}</p>
                    </div>
                  )}

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
                    disabled={
                      isProcessing || 
                      (paymentMethod === "card" && (!cardToken || !isCardValid)) ||
                      !email
                    }
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