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

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [orders, setOrders] = useState([])
  const router = useRouter()

  // Load orders from localStorage when component mounts
  useEffect(() => {
    const loadOrders = () => {
      try {
        const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]")
        setOrders(savedOrders)
      } catch (error) {
        console.error("Error loading orders:", error)
        setOrders([])
      }
    }

    loadOrders()
    // Set up an interval to check for new orders every 30 seconds
    const interval = setInterval(loadOrders, 30000)

    return () => clearInterval(interval)
  }, [])

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
                {filteredOrders.map((order) => (
                  <Card key={order.orderId}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Order #{order.orderId}</CardTitle>
                          <CardDescription>
                            {new Date(order.timestamp).toLocaleDateString()} at{" "}
                            {new Date(order.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </CardDescription>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <h3 className="font-medium mb-2">Order Items</h3>
                          <div className="space-y-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex flex-col">
                                <div className="flex justify-between">
                                  <span>
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span>
                                    ${(
                                      (item.price + (item.options?.reduce((sum, opt) => sum + opt.price, 0) || 0)) *
                                      item.quantity
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.stallName}, {item.hawkerCenterName}
                                </div>
                              </div>
                            ))}
                            <Separator />
                            <div className="flex justify-between font-bold">
                              <span>Total</span>
                              <span>${order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-muted p-4 rounded-lg">
                          {getStatusIcon(order.status)}
                          <h3 className="font-medium mt-2">
                            {order.status === "paid"
                              ? "Ready for Pickup"
                              : order.status === "completed"
                                ? "Order Completed"
                                : order.status === "cancelled"
                                  ? "Order Cancelled"
                                  : "Processing"}
                          </h3>
                          <p className="text-sm text-muted-foreground text-center mt-1">
                            {order.status === "paid"
                              ? "Your order is ready for pickup"
                              : order.status === "completed"
                                ? "Order was picked up successfully"
                                : order.status === "cancelled"
                                  ? "This order was cancelled"
                                  : "Your order is being prepared"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Payment Method</p>
                          <p className="font-medium">{order.paymentMethod}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      {order.status === "paid" ? (
                        <Button className="w-full">View Pickup Details</Button>
                      ) : order.status === "completed" ? (
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/">
                            Order Again <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

