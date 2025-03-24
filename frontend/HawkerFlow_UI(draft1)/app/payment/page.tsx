"use client"

import type React from "react"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCart } from "@/contexts/cart-context"
import { Navbar } from "@/components/navbar"

export default function PaymentPage() {
  const { items, getSubtotal, getMaxWaitTime, clearCart } = useCart()
  const [paymentMethod, setPaymentMethod] = useState("credit-card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [orderId] = useState(`HWK-${Math.floor(Math.random() * 10000)}`)
  const router = useRouter()

  const [hawkerCenterId] = useState(() => {
    // Get hawker center ID from the first item in cart
    return items[0]?.hawkerCenterId || null
  })

  const handleBack = () => {
    router.back()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false)
      setIsComplete(true)
      // Clear cart after successful payment
      clearCart()
    }, 2000)
  }

  // Calculate order summary
  const subtotal = getSubtotal()
  const discount = subtotal * 0.1 // Assuming 10% discount
  const serviceFee = 0.5
  const total = subtotal - discount + serviceFee

  // Get maximum wait time
  const totalTimeEstimate = useMemo(() => getMaxWaitTime(), [getMaxWaitTime])

  // Calculate unique stalls
  const uniqueStalls = useMemo(() => {
    return new Set(items.map((item) => item.stallName)).size
  }, [items])

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-6 flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-muted-foreground mb-8">
              Your order has been placed successfully. You can track your order status below.
            </p>
            <Card>
              <CardHeader>
                <CardTitle>Order #{orderId}</CardTitle>
                <CardDescription>Order placed at {new Date().toLocaleTimeString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-medium">Estimated total time:</p>
                <p className="text-xl font-bold mb-2">{totalTimeEstimate.minutes} minutes</p>
                <p className="text-sm text-muted-foreground mb-4">(Includes queue waiting time and food preparation)</p>
                <p className="font-medium">Estimated pickup time:</p>
                <p className="text-xl font-bold mb-4">
                  {new Date(Date.now() + totalTimeEstimate.minutes * 60000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <Separator className="my-4" />
                <div className="text-sm text-muted-foreground">
                  <p>Total amount paid: ${total.toFixed(2)}</p>
                  <p>
                    Payment method:{" "}
                    {paymentMethod === "credit-card"
                      ? "Credit Card"
                      : paymentMethod === "paynow"
                        ? "PayNow"
                        : "Cash on Pickup"}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button asChild className="w-full">
                  <Link href="/orders">Track Order</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={hawkerCenterId ? `/hawker-centers/${hawkerCenterId}` : "/"}>Order More Food</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>

        <footer className="bg-muted py-6">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Cart
          </Button>
          <h2 className="text-3xl font-bold">Payment</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Choose how you want to pay</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="mb-6">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="credit-card">Credit Card</TabsTrigger>
                      <TabsTrigger value="paynow">PayNow</TabsTrigger>
                      <TabsTrigger value="cash">Cash</TabsTrigger>
                    </TabsList>

                    <TabsContent value="credit-card">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label htmlFor="cardName">Name on Card</Label>
                            <Input id="cardName" placeholder="John Doe" required />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input id="cardNumber" placeholder="1234 5678 9012 3456" required />
                          </div>
                          <div>
                            <Label htmlFor="expiryDate">Expiry Date</Label>
                            <Input id="expiryDate" placeholder="MM/YY" required />
                          </div>
                          <div>
                            <Label htmlFor="cvv">CVV</Label>
                            <Input id="cvv" placeholder="123" required />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="paynow">
                      <div className="text-center">
                        <div className="bg-muted p-6 rounded-lg mb-4">
                          <img src="/placeholder.svg?height=200&width=200" alt="PayNow QR Code" className="mx-auto" />
                        </div>
                        <p className="text-muted-foreground mb-4">
                          Scan the QR code above with your banking app to pay via PayNow
                        </p>
                        <div className="text-left">
                          <Label htmlFor="paynowRef">PayNow Reference Number</Label>
                          <Input id="paynowRef" placeholder="Enter reference number after payment" required />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="cash">
                      <div className="p-4 bg-muted rounded-lg">
                        <RadioGroup defaultValue="pickup">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pickup" id="pickup" />
                            <Label htmlFor="pickup">Pay cash on pickup</Label>
                          </div>
                        </RadioGroup>
                        <p className="text-sm text-muted-foreground mt-2">
                          You'll pay in cash when you collect your order at the hawker center.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6">
                    <Label htmlFor="email">Email for Receipt</Label>
                    <Input id="email" type="email" placeholder="your@email.com" required />
                  </div>

                  <div className="mt-6">
                    <Label htmlFor="notes">Special Instructions (Optional)</Label>
                    <Input id="notes" placeholder="Any special requests for your order" />
                  </div>

                  <Button type="submit" className="w-full mt-6" disabled={isProcessing || items.length === 0}>
                    {isProcessing ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay ${total.toFixed(2)}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="mb-8 sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>
                        $
                        {(
                          (item.price + (item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0)) *
                          item.quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Discount (10%)</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Estimated Time</h3>
                  <p className="text-sm mb-2">
                    Your order includes items from {uniqueStalls} stall(s). The total estimated time is based on the
                    longest wait:
                  </p>
                  <p className="font-bold">{totalTimeEstimate.minutes} minutes total</p>
                  <p className="text-xs text-muted-foreground">(Includes queue waiting time and food preparation)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

