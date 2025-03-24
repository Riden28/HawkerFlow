"use client"

import { useState } from "react"
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

// Sample order data
const orders = [
  {
    id: "HWK-1234",
    date: "2023-06-15T14:30:00",
    status: "ready",
    total: 15.17,
    items: [
      {
        name: "Chicken Rice",
        quantity: 1,
        price: 5.5,
        stallName: "Tian Tian Hainanese Chicken Rice",
        hawkerCenter: "Maxwell Food Centre",
      },
      {
        name: "Char Kway Teow",
        quantity: 2,
        price: 5.0,
        stallName: "Maxwell Fuzhou Oyster Cake",
        hawkerCenter: "Maxwell Food Centre",
      },
      {
        name: "Teh Tarik",
        quantity: 1,
        price: 1.8,
        stallName: "Sweet Desserts",
        hawkerCenter: "Maxwell Food Centre",
      },
    ],
    hawkerCenter: "Maxwell Food Centre",
    paymentMethod: "Credit Card",
    estimatedTime: 35,
    elapsedTime: 20,
    readyTime: "15:05",
  },
  {
    id: "HWK-1122",
    date: "2023-06-10T12:15:00",
    status: "completed",
    total: 9.5,
    items: [
      {
        name: "Laksa",
        quantity: 1,
        price: 6.0,
        stallName: "Famous Sungei Road Laksa",
        hawkerCenter: "Old Airport Road Food Centre",
      },
      {
        name: "Ice Kachang",
        quantity: 1,
        price: 3.5,
        stallName: "Lao Ban Soya Beancurd",
        hawkerCenter: "Old Airport Road Food Centre",
      },
    ],
    hawkerCenter: "Old Airport Road Food Centre",
    paymentMethod: "PayNow",
    estimatedTime: 30,
    elapsedTime: 30,
    readyTime: "12:45",
  },
  {
    id: "HWK-1001",
    date: "2023-06-05T18:45:00",
    status: "cancelled",
    total: 8.0,
    items: [
      {
        name: "Chicken Chop",
        quantity: 1,
        price: 8.0,
        stallName: "Western Delights",
        hawkerCenter: "Maxwell Food Centre",
      },
    ],
    hawkerCenter: "Maxwell Food Centre",
    paymentMethod: "Cash",
    estimatedTime: 25,
    elapsedTime: 0,
    readyTime: "N/A",
  },
]

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all")
  const router = useRouter()

  const getStatusBadge = (status: string) => {
    switch (status) {
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
    switch (status) {
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

  const filteredOrders = activeTab === "all" ? orders : orders.filter((order) => order.status === activeTab)

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
            <TabsTrigger value="ready">Ready for Pickup</TabsTrigger>
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
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Order #{order.id}</CardTitle>
                          <CardDescription>
                            {new Date(order.date).toLocaleDateString()} at{" "}
                            {new Date(order.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.stallName}, {item.hawkerCenter}
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
                            {order.status === "ready"
                              ? "Ready for Pickup"
                              : order.status === "completed"
                                ? "Order Completed"
                                : order.status === "cancelled"
                                  ? "Order Cancelled"
                                  : "Processing"}
                          </h3>
                          <p className="text-sm text-muted-foreground text-center mt-1">
                            {order.status === "ready"
                              ? `Ready at ${order.readyTime}`
                              : order.status === "completed"
                                ? "Order was picked up successfully"
                                : order.status === "cancelled"
                                  ? "This order was cancelled"
                                  : "Your order is being prepared"}
                          </p>

                          {order.status === "ready" && (
                            <div className="w-full mt-4">
                              <p className="text-xs text-center mb-1">Estimated time: {order.estimatedTime} min</p>
                              <Progress value={(order.elapsedTime / order.estimatedTime) * 100} className="h-2" />
                              <p className="text-xs text-center mt-1">{order.elapsedTime} min elapsed</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Hawker Centre</p>
                          <p className="font-medium">{order.hawkerCenter}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment Method</p>
                          <p className="font-medium">{order.paymentMethod}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      {order.status === "ready" ? (
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

