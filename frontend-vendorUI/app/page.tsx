"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Clock, Filter, MoreHorizontal, Search, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VendorNavbar } from "@/components/vendor-navbar"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatTime } from "@/lib/utils"
import { getPendingOrders, getCompletedOrders, markDishComplete, type Order } from "@/lib/api"

// Constants for the current hawker center and stall
const HAWKER_CENTER = "Maxwell Food Centre"
const HAWKER_STALL = "Chicken Rice Stall"

interface OrderDetails {
  quantity: number
  waitTime: number
  completed: boolean
}

interface ApiOrder {
  userId: string
  phoneNumber: string
  [key: string]: OrderDetails | string
}

interface ProcessedOrder {
  id: string
  customerName: string
  date: string
  status: "pending" | "completed"
  total: number
  items: {
    id: number
    name: string
    quantity: number
    waitTime: number
    completed: boolean
    specialInstructions?: string
  }[]
  paymentMethod: string
  orderNumber: number
}

function isOrderDetails(value: unknown): value is OrderDetails {
  return (
    typeof value === 'object' &&
    value !== null &&
    'completed' in value &&
    'quantity' in value &&
    'waitTime' in value
  )
}

export default function VendorDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [orderData, setOrderData] = useState<ProcessedOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch orders from the API
  useEffect(() => {
    async function fetchOrders() {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch both pending and completed orders
        const [pendingOrders, completedOrders] = await Promise.all([
          getPendingOrders(HAWKER_CENTER, HAWKER_STALL),
          getCompletedOrders(HAWKER_CENTER, HAWKER_STALL)
        ])
        
        // Process pending orders
        const processedPendingOrders: ProcessedOrder[] = Object.entries(pendingOrders).map(([orderId, rawOrder], index) => {
          const order = rawOrder as ApiOrder
          const orderEntries = Object.entries(order)
          const dishEntries = orderEntries.filter(([key, value]) => {
            return key !== 'userId' && key !== 'phoneNumber' && isOrderDetails(value)
          }) as [string, OrderDetails][]

          const items = dishEntries.map(([dishName, details], itemIndex) => ({
            id: itemIndex + 1,
            name: dishName,
            quantity: details.quantity,
            waitTime: details.waitTime,
            completed: details.completed,
            specialInstructions: "",
          }))

          return {
            id: orderId.replace(/ /g, '_'),
            customerName: `Customer ${order.phoneNumber}`,
            date: new Date().toISOString(),
            status: "pending" as const,
            total: items.reduce((sum, item) => sum + (item.waitTime * item.quantity), 0),
            items,
            paymentMethod: "Not specified",
            orderNumber: index + 1,
          }
        })

        // Process completed orders
        const processedCompletedOrders: ProcessedOrder[] = Object.entries(completedOrders).map(([orderId, rawOrder], index) => {
          const order = rawOrder as ApiOrder
          const orderEntries = Object.entries(order)
          const dishEntries = orderEntries.filter(([key, value]) => {
            return key !== 'userId' && key !== 'phoneNumber' && isOrderDetails(value)
          }) as [string, OrderDetails][]

          const items = dishEntries.map(([dishName, details], itemIndex) => ({
            id: itemIndex + 1,
            name: dishName,
            quantity: details.quantity,
            waitTime: details.waitTime,
            completed: details.completed,
            specialInstructions: "",
          }))

          return {
            id: orderId.replace(/ /g, '_'),
            customerName: `Customer ${order.phoneNumber}`,
            date: new Date().toISOString(),
            status: "completed" as const,
            total: items.reduce((sum, item) => sum + (item.waitTime * item.quantity), 0),
            items,
            paymentMethod: "Not specified",
            orderNumber: processedPendingOrders.length + index + 1,
          }
        })

        setOrderData([...processedPendingOrders, ...processedCompletedOrders])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch orders')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
    // Set up polling every 30 seconds
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filter orders based on search query
  const filteredOrders = orderData.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Handle marking an item as completed
  const handleItemCompletion = async (orderId: string, itemName: string, completed: boolean) => {
    try {
      if (completed) {
        console.log('Attempting to complete dish:', {
          orderId,
          itemName,
          originalName: itemName
        })
        await markDishComplete(HAWKER_CENTER, HAWKER_STALL, orderId, itemName)
      }
      
      setOrderData((prevOrders) =>
        prevOrders.map((order) => {
          if (order.id === orderId) {
            const updatedItems = order.items.map((item) => 
              item.name === itemName ? { ...item, completed } : item
            )

            // Check if all items are completed
            const allCompleted = updatedItems.every((item) => item.completed)

            return {
              ...order,
              items: updatedItems,
              status: allCompleted ? "completed" : "pending",
            }
          }
          return order
        }),
      )
    } catch (err) {
      console.error('Failed to update item completion:', err)
      // You might want to show an error toast here
    }
  }

  // Handle marking an entire order as completed
  const handleOrderCompletion = async (orderId: string, completed: boolean) => {
    try {
      const order = orderData.find(o => o.id === orderId)
      if (!order) return

      // Mark all items as completed
      for (const item of order.items) {
        if (!item.completed && completed) {
          await markDishComplete(HAWKER_CENTER, HAWKER_STALL, orderId, item.name)
        }
      }

      setOrderData((prevOrders) =>
        prevOrders.map((order) => {
          if (order.id === orderId) {
            const updatedItems = order.items.map((item) => ({ ...item, completed }))

            return {
              ...order,
              items: updatedItems,
              status: completed ? "completed" : "pending",
            }
          }
          return order
        }),
      )
    } catch (err) {
      console.error('Failed to update order completion:', err)
      // You might want to show an error toast here
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <VendorNavbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-lg text-muted-foreground">Loading orders...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <VendorNavbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-lg text-red-500">Error: {error}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <VendorNavbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Orders Dashboard</h2>
            <p className="text-muted-foreground">Manage your incoming and completed orders</p>
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-2">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback>TH</AvatarFallback>
                  </Avatar>
                  Tian Hainanese Chicken
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Stall</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Help</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderData.filter((order) => order.status === "pending").length}</div>
              <p className="text-xs text-muted-foreground">
                {orderData
                  .filter((order) => order.status === "pending")
                  .reduce((acc, order) => acc + order.items.length, 0)}{" "}
                items to prepare
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orderData.filter((order) => order.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">
                {orderData
                  .filter((order) => order.status === "completed")
                  .reduce((acc, order) => acc + order.items.length, 0)}{" "}
                items prepared
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount Earned Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {orderData
                  .filter((order) => order.status === "completed")
                  .reduce((total, order) => total + order.total, 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">↑ 15%</span> from yesterday
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <div className="flex w-full md:w-auto mt-4 md:mt-0 space-x-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search orders..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <TabsContent value="pending" className="mt-0">
            <div className="space-y-4">
              {filteredOrders.filter((order) => order.status === "pending").length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No pending orders</h3>
                    <p className="text-muted-foreground text-center">
                      You don't have any pending orders at the moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders
                  .filter((order) => order.status === "pending")
                  .map((order) => (
                    <Card key={order.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center">
                              Order #{order.orderNumber}
                              <Badge className="ml-2" variant="default">
                                Pending
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              {order.id} • {formatTime(order.date)} • {order.customerName}
                            </CardDescription>
                          </div>
                          <div className="flex items-center">
                            <div className="text-right mr-4">
                              <p className="font-medium">${order.total.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">{order.paymentMethod}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">More</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOrderCompletion(order.id, true)}>
                                  Mark as Completed
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Print Order</DropdownMenuItem>
                                <DropdownMenuItem>Contact Customer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-start py-2">
                              <Checkbox
                                id={`item-${item.id}`}
                                className="mt-1 mr-3"
                                checked={item.completed}
                                onCheckedChange={(checked) =>
                                  handleItemCompletion(order.id, item.name, checked as boolean)
                                }
                              />
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <label
                                    htmlFor={`item-${item.id}`}
                                    className={`font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}
                                  >
                                    {item.quantity}x {item.name}
                                  </label>
                                  <span className={item.completed ? "text-muted-foreground" : ""}>
                                    ${(item.waitTime * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                                {item.specialInstructions && (
                                  <div className="flex items-start mt-1">
                                    <AlertCircle className="h-3 w-3 text-amber-500 mr-1 mt-0.5" />
                                    <p className="text-sm text-amber-600">{item.specialInstructions}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            <div className="space-y-4">
              {filteredOrders.filter((order) => order.status === "completed").length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <CheckCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No completed orders</h3>
                    <p className="text-muted-foreground text-center">You haven't completed any orders yet.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders
                  .filter((order) => order.status === "completed")
                  .map((order) => (
                    <Card key={order.id} className="border-green-200 bg-green-50">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center">
                              Order #{order.orderNumber}
                              <Badge className="ml-2" variant="outline">
                                Completed
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              {order.id} • {formatTime(order.date)} • {order.customerName}
                            </CardDescription>
                          </div>
                          <div className="flex items-center">
                            <div className="text-right mr-4">
                              <p className="font-medium">${order.total.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">{order.paymentMethod}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">More</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOrderCompletion(order.id, false)}>
                                  Mark as Pending
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Print Order</DropdownMenuItem>
                                <DropdownMenuItem>Contact Customer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-start py-2">
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <span className="font-medium text-muted-foreground">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="text-muted-foreground">
                                    ${(item.waitTime * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                                {item.specialInstructions && (
                                  <div className="flex items-start mt-1">
                                    <AlertCircle className="h-3 w-3 text-amber-500 mr-1 mt-0.5" />
                                    <p className="text-sm text-amber-600">{item.specialInstructions}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

