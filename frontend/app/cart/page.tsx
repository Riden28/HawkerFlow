"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, Plus, Minus, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { useCart } from "@/contexts/cart-context"
import { Navbar } from "@/components/navbar"
import { toast } from "sonner"

export default function CartPage() {
  const { cart, removeItem, updateQuantity, getTotalItems, getSubtotal, getMaxWaitTime } = useCart()
  const [promoCode, setPromoCode] = useState("")
  const [promoApplied, setPromoApplied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if Stripe is properly initialized
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      console.error("Stripe publishable key is not set")
    }
  }, [])

  const applyPromoCode = () => {
    if (promoCode.toLowerCase() === "hawker10") {
      setPromoApplied(true)
      toast.success("Promo code applied successfully!")
    } else {
      setPromoApplied(false)
      toast.error("Invalid promo code")
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleProceedToPayment = () => {
    if (cart.items.length === 0) {
      toast.error("Your cart is empty")
      return
    }
    router.push("/payment")
  }

  const subtotal = getSubtotal()
  const discount = promoApplied ? subtotal * 0.1 : 0
  const serviceFee = 0.5
  const total = subtotal - discount + serviceFee

  const stallCount = useMemo(() => {
    if (!cart.items || cart.items.length === 0) return 0
    const uniqueStalls = new Set(cart.items.map((item) => item.stallName))
    return uniqueStalls.size
  }, [cart.items])

  const maxWaitTime = useMemo(() => getMaxWaitTime(), [getMaxWaitTime])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-3xl font-bold">Your Cart</h2>
        </div>

        {cart.items.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="pt-6 text-center">
              <p className="mb-4 text-muted-foreground">Your cart is empty</p>
              <Button asChild>
                <Link href="/menu">Browse Menu</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Cart Items ({getTotalItems()})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cart.items.map((item) => (
                      <div
                        key={`${item.id}-${item.options?.map((o) => o.choice).join("-") || "no-options"}`}
                        className="flex flex-col"
                      >
                        <div className="flex items-center">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-md mr-4"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-lg"><b>{decodeURIComponent(item.stallName)}</b></p>
                            <p className="text-xs text-muted-foreground">{item.hawkerCenterName}</p>
                            {item.options && item.options.length > 0 && (
                              <div className="mt-1">
                                {item.options.map((option, idx) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    {option.name} {option.price > 0 ? `(+$${option.price.toFixed(2)})` : ""}
                                  </p>
                                ))}
                              </div>
                            )}
                            {item.specialInstructions && (
                              <p className="text-xs italic mt-1">"{item.specialInstructions}"</p>
                            )}
                          </div>
                          <div className="flex items-center mr-4">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="mx-2 w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right mr-4 w-20">
                            $
                            {(
                              (item.price + (item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0)) *
                              item.quantity
                            ).toFixed(2)}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="ml-20 mt-1 mb-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <span className="mr-4">Wait time: {item.waitTime} mins</span>
                          </div>
                        </div>
                        <Separator className="my-2" />
                      </div>
                    ))}
                  </div>
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {promoApplied && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount (10%)</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span>${serviceFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm mb-2">Promo Code</p>
                      <div className="flex space-x-2">
                        <Input
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="Enter code"
                        />
                        <Button variant="outline" onClick={applyPromoCode}>
                          Apply
                        </Button>
                      </div>
                      {promoApplied && <p className="text-sm text-green-600 mt-1">Promo code applied!</p>}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2"><b>Total Wait Time</b></h3>
                    {cart.items.length > 0 ? (
                      <>
                        <p className="text-sm mb-2">
                          Your order includes items from {stallCount} stall(s). The total estimated time is the sum of wait times for all dishes:
                        </p>
                        <div className="font-bold">
                          {cart.items.reduce((total, item) => total + (parseInt(item.waitTime) || 0), 0)} minutes total
                        </div>

                        <p className="text-xs text-muted-foreground">
                          (Includes queue waiting time and food preparation)
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Add items to your cart to see estimated wait time</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={handleProceedToPayment}
                    disabled={cart.items.length === 0 || isProcessing}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isProcessing ? "Processing..." : "Proceed to Payment"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

