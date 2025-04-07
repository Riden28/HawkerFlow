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
  name: string            // dish name
  price: number
  quantity: number
  stallName?: string      // add this if you want to store stall
  hawkerCenterName?: string
  options?: Array<{
    name: string
    price: number
  }>
  specialInstructions?: string
}

interface Order {
  id: string
  items: OrderItem[]
  total: number
  email?: string
  paymentMethod?: string
  cardToken?: string
  specialInstructions?: string
  status: string
  createdAt: string

  // New fields to show on the My Orders page:
  userId?: string
  hawkerCenter?: string   // e.g. "Maxwell Food Centre"
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
    // <div className="min-h-screen bg-background">
    //   <Navbar />

    //   <main className="container mx-auto px-4 py-8">
    //     <div className="flex items-center mb-6">
    //       <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">
    //         <ArrowLeft className="h-4 w-4 mr-1" />
    //         Back
    //       </Button>
    //       <h2 className="text-3xl font-bold">My Orders</h2>
    //     </div>

    //     <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
    //       <TabsList>
    //         <TabsTrigger value="all">All Orders</TabsTrigger>
    //         <TabsTrigger value="paid">Ready for Pickup</TabsTrigger>
    //         <TabsTrigger value="completed">Completed</TabsTrigger>
    //         <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
    //       </TabsList>

    //       <TabsContent value={activeTab} className="mt-6">
    //         {filteredOrders.length === 0 ? (
    //           <Card>
    //             <CardContent className="pt-6 text-center">
    //               <p className="mb-4 text-muted-foreground">No orders found</p>
    //               <Button asChild>
    //                 <Link href="/">Order Now</Link>
    //               </Button>
    //             </CardContent>
    //           </Card>
    //         ) : (
    //           <div className="space-y-6">
    //             {filteredOrders.map((order, index) => (
    //               <Card key={`order-${order.id}-${index}`}>
    //                 <CardHeader>
    //                   <div className="flex justify-between items-start">
    //                     <div>
    //                       <CardTitle>{order.id}</CardTitle>
    //                       {/* <CardDescription>
    //                         {new Date(order.createdAt).toLocaleString()}
    //                       </CardDescription> */}
    //                     </div>
    //                     {/* Example of showing userId, hawkerCenter, etc. */}
    //                     <div className="text-sm text-muted-foreground">
    //                       <p>User: {order.userId}</p>
    //                       <p>Hawker Center: {order.hawkerCenter}</p>
    //                       {new Date(order.createdAt).toLocaleString()}
    //                     </div>
    //                   </div>
    //                 </CardHeader>
    //                 <CardContent>
    //                   <div className="space-y-2">
    //                     <h3 className="font-medium mb-2">Items</h3>
    //                     {order.items.map((item, itemIndex) => (
    //                       <div key={`item-${item.id}-${itemIndex}`}>
    //                         <p>
    //                           <strong>{item.id}</strong> from <em>{decodeURIComponent(item.stallName)}</em> x {item.quantity}
    //                         </p>
    //                         {/* If each item has item.hawkerCenterName */}
    //                         {/* <p>Hawker Center: {item.hawkerCenterName}</p> */}
    //                       </div>
    //                     ))}

    //                     <div className="mt-2 font-bold">Total: ${order.total.toFixed(2)}</div>

    //                     {order.specialInstructions && (
    //                       <div>
    //                         <h4>Special Instructions</h4>
    //                         <p>{order.specialInstructions}</p>
    //                       </div>
    //                     )}
    //                   </div>
    //                 </CardContent>
    //               </Card>
    //             ))}

    //           </div>
    //         )}
    //       </TabsContent>
    //     </Tabs>
    //   </main>

    //   <footer className="bg-muted py-6 mt-12">
    //     <div className="container mx-auto px-4 text-center text-muted-foreground">
    //       <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
    //     </div>
    //   </footer>
    // </div>
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
                {filteredOrders.map((order, index) => {
                  // Group items by stall name
                  const groupedItemsByStall = order.items.reduce((acc, item) => {
                    const stall = decodeURIComponent(item.stallName ?? "Unknown Stall")
                    if (!acc[stall]) {
                      acc[stall] = []
                    }
                    acc[stall].push(item)
                    return acc
                  }, {} as Record<string, OrderItem[]>)

                  return (
                    <Card key={`order-${order.id}-${index}`} className="shadow-lg rounded-lg">
                      <CardHeader className="p-4 border-b">
                        <div className="flex justify-between items-center">
                          <div>
                            {/* Order ID in a bold, larger font */}
                            <CardTitle className="text-xl font-bold text-gray-800">
                              {order.id}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-500">
                              Placed on: {new Date(order.createdAt).toLocaleString()}
                            </CardDescription>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p className="font-medium">User: {order.userId}</p>
                            <p className="font-medium">Hawker Center: {order.hawkerCenter}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        {/* Grouped items by stall */}
                        <div className="space-y-6">
                          {Object.entries(groupedItemsByStall).map(([stall, items]) => (
                            <div key={stall} className="bg-gray-50 p-3 rounded-lg">
                              <h3 className="text-lg font-semibold text-primary mb-2">
                                {stall}
                              </h3>
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between items-center py-1"
                                >
                                  <span className="font-medium text-gray-700">
                                    {item.id} (x{item.quantity})
                                  </span>
                                  {/* If you also want to show price per item, uncomment below */}
                                  {/* <span className="text-gray-600">
                                    ${item.price.toFixed(2)}
                                  </span> */}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="mt-4 text-xl font-bold text-gray-800">
                          Total: ${order.total.toFixed(2)}
                        </div>

                        {/* Special Instructions */}
                        {order.specialInstructions && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-700">Special Instructions</h4>
                            <p className="italic text-gray-600">
                              {order.specialInstructions}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
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

