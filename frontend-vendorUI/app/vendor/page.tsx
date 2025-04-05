"use client"

import { useState, useEffect } from "react"
import { Bell, ChevronDown, Clock, Filter, MoreHorizontal, Search, CheckCircle, AlertCircle, Bug } from "lucide-react"
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
import { fetchOrders, completeDish, transformOrders } from "@/services/queueService"
import { toast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import ClientOnly from "@/components/client-only"

// Define interfaces for our data
interface OrderOption {
  name: string
  choice: string
  price: number
}

interface OrderItem {
  id: string | number
  name: string
  quantity: number
  price: number
  options: OrderOption[]
  specialInstructions: string
  completed: boolean
  waitTime?: number
  time_started?: string
  time_completed?: string
}

interface Order {
  id: string
  customerName: string
  status: "pending" | "completed"
  total: number
  items: OrderItem[]
  paymentMethod: string
  orderNumber: number
}

// Sample orders data for fallback
const sampleOrders: Order[] = [
  {
    id: "HWK-1234",
    customerName: "John Lee",
    status: "pending",
    total: 15.5,
    items: [
      {
        id: 1,
        name: "Chicken Rice",
        quantity: 1,
        price: 5.5,
        options: [
          { name: "Meat Type", choice: "Steamed Chicken", price: 0 },
          { name: "Rice Type", choice: "White Rice", price: 0 },
        ],
        specialInstructions: "Less oil please",
        completed: false,
      },
      {
        id: 2,
        name: "Char Kway Teow",
        quantity: 2,
        price: 5.0,
        options: [{ name: "Spice Level", choice: "Medium", price: 0 }],
        specialInstructions: "",
        completed: false,
      },
    ],
    paymentMethod: "Credit Card",
    orderNumber: 42,
  },
  // ... other sample orders ...
]

export default function VendorDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [orderData, setOrderData] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingRealData, setIsUsingRealData] = useState(false)
  const [showDebug, setShowDebug] = useState(false)

  // Fetch orders from the backend
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true)
        console.log("Fetching orders from backend...")
        const backendOrders = await fetchOrders()
        console.log("Backend orders received:", backendOrders)
        
        const transformedOrders = transformOrders(backendOrders)
        console.log("Transformed orders:", transformedOrders)
        
        setOrderData(transformedOrders)
        setIsUsingRealData(true)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch orders:", err)
        setError("Failed to load orders. Using sample data instead.")
        setOrderData(sampleOrders) // Fallback to sample data
        setIsUsingRealData(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
    
    // Set up polling to refresh orders every 30 seconds
    const intervalId = setInterval(loadOrders, 30000)
    
    return () => clearInterval(intervalId)
  }, [])

  // Filter orders based on search query
  const filteredOrders = orderData.filter((order: Order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Handle marking an item as completed
  const handleItemCompletion = async (orderId: string, itemId: string | number, completed: boolean) => {
    try {
      // Call the backend API to mark the dish as completed
      await completeDish(orderId, itemId.toString())
      
      // Update the local state
      setOrderData((prevOrders: Order[]) =>
        prevOrders.map((order: Order) => {
          if (order.id === orderId) {
            const updatedItems = order.items.map((item: OrderItem) => 
              item.id === itemId ? { ...item, completed } : item
            )

            // Check if all items are completed
            const allCompleted = updatedItems.every((item: OrderItem) => item.completed)

            return {
              ...order,
              items: updatedItems,
              status: allCompleted ? "completed" : "pending",
            }
          }
          return order
        }),
      )
      
      toast({
        title: "Item updated",
        description: completed ? "Item marked as completed" : "Item marked as pending",
      })
    } catch (err) {
      console.error("Failed to update item:", err)
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      })
    }
  }

  // Handle marking an entire order as completed
  const handleOrderCompletion = async (orderId: string, completed: boolean) => {
    try {
      // Find the order
      const order = orderData.find(o => o.id === orderId)
      if (!order) return
      
      // Mark each item as completed
      for (const item of order.items) {
        if (item.completed !== completed) {
          await completeDish(orderId, item.id.toString())
        }
      }
      
      // Update the local state
      setOrderData((prevOrders: Order[]) =>
        prevOrders.map((order: Order) => {
          if (order.id === orderId) {
            const updatedItems = order.items.map((item: OrderItem) => ({ ...item, completed }))

            return {
              ...order,
              items: updatedItems,
              status: completed ? "completed" : "pending",
            }
          }
          return order
        }),
      )
      
      toast({
        title: "Order updated",
        description: completed ? "Order marked as completed" : "Order marked as pending",
      })
    } catch (err) {
      console.error("Failed to update order:", err)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    }
  }

  // Calculate total pending orders
  const pendingOrders = orderData.filter((order: Order) => order.status === "pending")

  // Calculate total completed orders
  const completedOrders = orderData.filter((order: Order) => order.status === "completed")

  // Calculate total revenue from completed orders
  const totalRevenue = completedOrders.reduce((acc: number, order: Order) => acc + order.total, 0)

  // Calculate total pending revenue
  const pendingRevenue = pendingOrders.reduce((acc: number, order: Order) => acc + order.total, 0)

  // Add this function to toggle debug panel
  const toggleDebug = () => {
    setShowDebug(!showDebug)
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-background">
        <VendorNavbar />

        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold">Orders Dashboard</h2>
              <p className="text-muted-foreground">Manage your incoming and completed orders</p>
              {isUsingRealData ? (
                <div className="mt-2 text-sm text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Connected to backend - showing real data
                </div>
              ) : (
                <div className="mt-2 text-sm text-amber-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Using sample data (backend connection failed)
                </div>
              )}
            </div>
            <div className="flex items-center mt-4 md:mt-0">
              <div className="relative mr-2">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {pendingOrders.length}
                </span>
              </div>
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
                <div className="text-2xl font-bold">{pendingOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {pendingOrders.reduce((acc, order) => acc + order.items.length, 0)} items to prepare
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {completedOrders.reduce((acc, order) => acc + order.items.length, 0)} items prepared
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  ${pendingRevenue.toFixed(2)} pending
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="all">All Orders</TabsTrigger>
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
                <div className="hidden md:flex items-center text-sm text-muted-foreground">
                  <span className="font-medium">{filteredOrders.length}</span> orders
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

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
                                {order.id} • {order.customerName}
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
                                    Mark All as Completed
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
                                    handleItemCompletion(order.id, item.id, checked as boolean)
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
                                      ${(item.price * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                  {item.options && item.options.length > 0 && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {item.options.map((option, idx) => (
                                        <div key={idx}>
                                          {option.name}: {option.choice}
                                          {option.price > 0 && ` (+$${option.price.toFixed(2)})`}
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
                        <CardFooter className="flex justify-between pt-0">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            Est. preparation: {order.items.reduce((sum, item) => sum + (item.quantity * 5), 0)} min
                          </div>
                          <Button variant="default" size="sm" onClick={() => handleOrderCompletion(order.id, true)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Order as Complete
                          </Button>
                        </CardFooter>
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
                                {order.id} • {order.customerName}
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
                                    Mark All as Pending
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
                                    handleItemCompletion(order.id, item.id, checked as boolean)
                                  }
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <label
                                      htmlFor={`item-${item.id}`}
                                      className="font-medium line-through text-muted-foreground"
                                    >
                                      {item.quantity}x {item.name}
                                    </label>
                                    <span className="text-muted-foreground">
                                      ${(item.price * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                  {item.options && item.options.length > 0 && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {item.options.map((option, idx) => (
                                        <div key={idx}>
                                          {option.name}: {option.choice}
                                          {option.price > 0 && ` (+$${option.price.toFixed(2)})`}
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
                        <CardFooter className="flex justify-between pt-0">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            Est. preparation: {order.items.reduce((sum, item) => sum + (item.quantity * 5), 0)} min
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </CardFooter>
                      </Card>
                    ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">No orders found</h3>
                      <p className="text-muted-foreground text-center">No orders match your search criteria.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className={order.status === "completed" ? "border-green-200 bg-green-50" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center">
                              Order #{order.orderNumber}
                              <Badge className="ml-2" variant={order.status === "completed" ? "outline" : "default"}>
                                {order.status === "completed" ? "Completed" : "Pending"}
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              {order.id} • {order.customerName}
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
                                <DropdownMenuItem
                                  onClick={() => handleOrderCompletion(order.id, order.status !== "completed")}
                                >
                                  {order.status === "completed" ? "Mark All as Pending" : "Mark All as Completed"}
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
                                onCheckedChange={(checked) => handleItemCompletion(order.id, item.id, checked as boolean)}
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
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                                {item.options && item.options.length > 0 && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {item.options.map((option, idx) => (
                                      <div key={idx}>
                                        {option.name}: {option.choice}
                                        {option.price > 0 && ` (+$${option.price.toFixed(2)})`}
                                      </div>
                                    ))}
                                  </div>
                                )}
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
                      <CardFooter className="flex justify-between pt-0">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          Est. preparation: {order.items.reduce((sum, item) => sum + (item.quantity * 5), 0)} min
                        </div>
                        {order.status === "pending" ? (
                          <Button variant="default" size="sm" onClick={() => handleOrderCompletion(order.id, true)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Order as Complete
                          </Button>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Add debug toggle button */}
          <div className="fixed bottom-4 right-4 z-50">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleDebug}
              className="flex items-center"
            >
              <Bug className="h-4 w-4 mr-2" />
              {showDebug ? "Hide Debug" : "Show Debug"}
            </Button>
          </div>
          
          {/* Debug panel */}
          {showDebug && (
            <div className="fixed bottom-16 right-4 z-50 w-80 bg-white border rounded-md shadow-lg p-4 max-h-96 overflow-auto">
              <h3 className="text-sm font-medium mb-2">Debug Information</h3>
              <div className="text-xs space-y-2">
                <div>
                  <span className="font-medium">Data Source:</span> {isUsingRealData ? "Backend API" : "Sample Data"}
                </div>
                <div>
                  <span className="font-medium">Total Orders:</span> {orderData.length}
                </div>
                <div>
                  <span className="font-medium">Filtered Orders:</span> {filteredOrders.length}
                </div>
                <div>
                  <span className="font-medium">Pending Orders:</span> {pendingOrders.length}
                </div>
                <div>
                  <span className="font-medium">Completed Orders:</span> {completedOrders.length}
                </div>
                <div>
                  <span className="font-medium">Loading:</span> {isLoading ? "Yes" : "No"}
                </div>
                {error && (
                  <div>
                    <span className="font-medium">Error:</span> {error}
                  </div>
                )}
                <div className="mt-2">
                  <span className="font-medium">First Order Sample:</span>
                  {orderData.length > 0 && (
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(orderData[0], null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ClientOnly>
  )
}

