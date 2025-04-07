"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useCart } from "@/contexts/cart-context"
import { Navbar } from "@/components/navbar"
import { toast } from "sonner"
import dynamic from "next/dynamic"

// Dynamically import StripeTokenForm so that it's only loaded on the client
const StripeTokenForm = dynamic(() => import("@/components/stripe-form"), { ssr: false })

export default function PaymentPage() {
  const router = useRouter()
  const { cart, clearCart } = useCart()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card">("card")
  const [cardToken, setCardToken] = useState<any>(null)
  const [isCardValid, setIsCardValid] = useState(false)

  // Define handleBack so it’s available
  const handleBack = () => {
    router.back()
  }

  // Handler for token generation from StripeTokenForm ("Get Token")
  const handleCardTokenGenerated = (token: any) => {
    console.log("Token generated:", token)
    setCardToken(token)
    setIsCardValid(true)
  }

  // Calculation functions
  const calculateSubtotal = () => {
    return cart.items.reduce((total, item) => {
      const itemTotal = item.price * item.quantity
      const optionsTotal = item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0
      return total + (itemTotal + optionsTotal * item.quantity)
    }, 0)
  }

  const calculateDiscount = () => {
    return calculateSubtotal() * 0.05 // 10% discount
  }

  const calculateServiceFee = () => {
    return 0.5 // Fixed fee
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = calculateDiscount()
    const serviceFee = calculateServiceFee()
    return subtotal - discount + serviceFee
  }

  // Final payment submission handler ("Pay Now")
  const handlePayment = async () => {
    if (!phoneNumber) {
      setError("Please enter your phone number for order updates")
      return
    }
    if (paymentMethod === "card" && !cardToken) {
      setError("Please generate your card token first by clicking 'Get Token'")
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

      // Build the requestData object using only the token fields required by payment.py.
      const requestData = {
        createdAt: new Date().toISOString(),
        phoneNumber,
        // Send the full token object as returned from Stripe
        token: cardToken,
        items: orderItems,
        userId: "user123",
        stalls: {
          [orderItems[0].stallName]: {
            dishes: orderItems
          }
        },
        amount: calculateTotal(),
        hawkerCenter: "maxwell-food-centre",
        orderId: "order_" + Date.now(),
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

      // const data = await response.json()
      // console.log("Response data:", data)

      // if (!response.ok) {
      //   throw new Error(data.message || "Failed to process order")
      // }

      // if (data.paymentStatus === "success") {
      //   toast.success("Payment successful! Redirecting to orders...")
      //   const order = {
      //     id: data.orderId,
      //     items: orderItems,
      //     total: calculateTotal(),
      //     phoneNumber,
      //     specialInstructions,
      //     paymentMethod,
      //     status: "ready_for_pickup",
      //     createdAt: new Date().toISOString()
      //   }
      //   const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]")
      //   localStorage.setItem("orders", JSON.stringify([...existingOrders, order]))
      //   clearCart()
      //   router.push("/orders")
      // } else {
      //   toast.error("Payment failed", {
      //     description: "Please try again or use another card."
      //   })
      // }

      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.message || "Failed to process order")
      }

      if (data.success) {
        toast.success("Payment successful! Redirecting to orders...")
        // Example in Payment Page after the user pays
        // const order = {
        //   id: data.orderId,
        //   items: orderItems,               // from your cart context
        //   total: calculateTotal(),
        //   phoneNumber,
        //   specialInstructions,
        //   paymentMethod,
        //   status: "ready_for_pickup",
        //   createdAt: new Date().toISOString(),
        //   userId: "user_zz1",
        //   hawkerCenter: orderItems[0].hawkerCenterName,
        // }

        const order = {
          id: "order_" + Date.now(),
          userId: "user_zz1",
          hawkerCenter: orderItems[0].hawkerCenterName,
          items: cart.items.map((item) => ({
            id: item.id,
            name: item.name,
            stallName: item.stallName,
            quantity: item.quantity,
            price: item.price,
            // etc.
          })),
          total: calculateTotal(),
          createdAt: new Date().toISOString(),
          status: "processing", // or “paid”
          specialInstructions: "some instructions",
        };
        localStorage.setItem("currentOrder", JSON.stringify(order));
        // localStorage.clear();

        clearCart()
        router.push("/orders")
      } else {
        toast.error("Payment failed", {
          description: "Please try again or use another card."
        })
      }

    } catch (err: any) {
      console.error("Payment error:", err)
      setError(err.message || "Payment failed. Please try again.")
      toast.error(err.message || "Payment failed. Please try again.", {
        description: "Please check your card details or try another payment method.",
        duration: 5000
      })
    } finally {
      setIsProcessing(false)
    }
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
                    <label htmlFor="phone" className="block text-sm font-medium mb-2">
                      Phone Number for Order Updates
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-4">
                      Payment Method
                    </label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as "card")}
                      className="grid grid-cols-1 gap-4"
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
                    </RadioGroup>
                  </div>
                  {/* StripeTokenForm renders a card input field with a "Get Token" button */}
                  {paymentMethod === "card" && (
                    <div className="mt-6">
                      <StripeTokenForm onTokenGenerated={handleCardTokenGenerated} />
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
                  {error && <div className="text-red-500 text-sm">{error}</div>}
                  {/* Final "Pay Now" button for sending payment request */}
                  <Button
                    className="w-full"
                    onClick={handlePayment}
                    disabled={
                      isProcessing ||
                      (paymentMethod === "card" && !cardToken) ||
                      !phoneNumber
                    }
                  >
                    {isProcessing ? "Processing..." : "Pay Now"}
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
