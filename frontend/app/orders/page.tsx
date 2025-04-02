"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle, XCircle, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Navbar } from "@/components/navbar"
import { toast } from "sonner"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  options?: Array<{
    name: string
    price: number
  }>
}

interface Order {
  id: string
  items: OrderItem[]
  total: number
  email: string
  paymentMethod: string
  cardToken?: string
  specialInstructions?: string
  status: string
  createdAt: string
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [orders, setOrders] = useState<Order[]>([])
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get orders from localStorage
    const storedOrders = JSON.parse(localStorage.getItem("orders") || "[]")
    const currentOrder = JSON.parse(localStorage.getItem("currentOrder") || "{}")

    // If there's a current order, add it to the list
    if (currentOrder && Object.keys(currentOrder).length > 0) {
      const updatedOrders = [...storedOrders, currentOrder]
      localStorage.setItem("orders", JSON.stringify(updatedOrders))
      localStorage.removeItem("currentOrder") // Clear the current order
      setOrders(updatedOrders)
    } else {
      setOrders(storedOrders)
    }

    setIsLoading(false)
  }, [])

  const handleOrderStatus = async (order: Order) => {
    try {
      console.log("Processing order:", order)
      // Send order to backend
      const response = await fetch("/api/order-management/process-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      })

      const responseData = await response.json()
      console.log("Backend response:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to process order")
      }

      // Update order status in localStorage
      const updatedOrders = orders.map((o) =>
        o.id === order.id ? { ...o, status: "processing" } : o
      )
      localStorage.setItem("orders", JSON.stringify(updatedOrders))
      setOrders(updatedOrders)

      toast.success("Order processed successfully!", {
        description: "Your order has been sent to the kitchen"
      })
    } catch (error: any) {
      console.error("Error processing order:", error)
      toast.error("Failed to process order", {
        description: error.message || "Please try again later"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "ready":
        return <Badge className="bg-green-500">Ready for Pickup</Badge>
      case "completed":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Completed
          </Badge>
        )
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">Processing</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "ready":
        return <Clock className="h-8 w-8 text-green-500" />
      case "completed":
        return <CheckCircle className="h-8 w-8 text-muted-foreground" />
      case "cancelled":
        return <XCircle className="h-8 w-8 text-destructive" />
      default:
        return <Clock className="h-8 w-8 text-muted-foreground" />
    }
  }

  const handleBack = () => {
    router.back()
  }

  const filteredOrders = activeTab === "all" 
    ? orders 
    : orders.filter((order) => order.status.toLowerCase() === activeTab)

  if (isLoading) {
    return <div>Loading...</div>
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
          <h2 className="text-3xl font-bold">My Orders</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="paid">Ready for Pickup</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-muted-foreground">No orders found</p>
                  <Button asChild>
                    <Link href="/">Order Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order, index) => (
                  <Card key={`order-${order.id}-${index}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Order #{order.id}</CardTitle>
                          <CardDescription>
                            {new Date(order.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">Items</h3>
                          {order.items.map((item, itemIndex) => (
                            <div key={`item-${order.id}-${item.id}-${itemIndex}`} className="flex justify-between py-1">
                              <div>
                                <p>{item.name} x {item.quantity}</p>
                                {item.options && item.options.length > 0 && (
                                  <div className="text-sm text-muted-foreground">
                                    {item.options.map((option, optionIndex) => (
                                      <p key={`option-${order.id}-${item.id}-${option.name}-${optionIndex}`}>
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
                        </div>

                        <Separator />

                        <div className="flex justify-between">
                          <span className="font-bold">Total</span>
                          <span className="font-bold">${order.total.toFixed(2)}</span>
                        </div>

                        {order.specialInstructions && (
                          <div>
                            <h3 className="font-medium mb-1">Special Instructions</h3>
                            <p className="text-muted-foreground">{order.specialInstructions}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-muted py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

