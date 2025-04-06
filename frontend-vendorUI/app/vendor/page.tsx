"use client"

import { useState, useEffect } from "react"
import { Bell, ChevronDown, Clock, Filter, MoreHorizontal, Search, CheckCircle, AlertCircle } from "lucide-react"
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
import { getPendingOrders, getCompletedOrders, markDishComplete, Order } from "@/lib/api"

interface OrderWithId extends Order {
  id: string;
  customerName?: string;
  status?: "pending" | "completed";
  items?: Array<{
    id: number;
    name: string;
    completed: boolean;
    quantity: number;
    price: number;
    options?: Array<{
      name: string;
      choice: string;
      price: number;
    }>;
    specialInstructions?: string;
  }>;
  total?: number;
  paymentMethod?: string;
}

export default function VendorDashboard() {
  const [hawkerCenter] = useState("Maxwell Food Center")
  const [hawkerStall] = useState("Chicken Rice Stall")
  const [searchQuery, setSearchQuery] = useState("")
  const [pendingOrders, setPendingOrders] = useState<OrderWithId[]>([])
  const [completedOrders, setCompletedOrders] = useState<OrderWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch orders when component mounts
  useEffect(() => {
    fetchOrders()
  }, [hawkerCenter, hawkerStall])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError("")
      
      // Fetch both pending and completed orders
      const [pending, completed] = await Promise.all([
        getPendingOrders(hawkerCenter, hawkerStall),
        getCompletedOrders(hawkerCenter, hawkerStall)
      ])

      // Transform pending orders
      setPendingOrders(
        Object.entries(pending).map(([id, order]) => ({
          ...order,
          id,
          status: "pending" as const
        }))
      )

      // Transform completed orders
      setCompletedOrders(
        Object.entries(completed).map(([id, order]) => ({
          ...order,
          id,
          status: "completed" as const
        }))
      )
    } catch (err) {
      console.error("Error fetching orders:", err)
      setError("Failed to fetch orders")
    } finally {
      setLoading(false)
    }
  }

  // Combine orders for filtering
  const filteredOrders = [...pendingOrders, ...completedOrders].filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Handle marking an item as completed
  const handleItemCompletion = async (orderId: string, dishName: string, completed: boolean) => {
    try {
      if (completed) {
        await markDishComplete(hawkerCenter, hawkerStall, orderId, dishName)
      }
      // Refresh orders after marking complete
      await fetchOrders()
    } catch (err) {
      console.error("Error marking dish as complete:", err)
      setError("Failed to update dish status")
    }
  }

  // Handle marking an entire order as completed
  const handleOrderCompletion = async (orderId: string, completed: boolean) => {
    try {
      const order = pendingOrders.find(o => o.id === orderId) || completedOrders.find(o => o.id === orderId)
      if (order && order.items) {
        // Mark all items as complete
        for (const item of order.items) {
          if (!item.completed) {
            await markDishComplete(hawkerCenter, hawkerStall, orderId, item.name)
          }
        }
        await fetchOrders()
      }
    } catch (err) {
      console.error("Error completing order:", err)
      setError("Failed to complete order")
    }
  }

  if (loading) return <div>Loading orders...</div>
  if (error) return <div>Error: {error}</div>

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
            <div className="relative mr-2">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
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
              <div className="text-2xl font-bold">
                {pendingOrders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingOrders.reduce((acc, order) => acc + (order.items?.length || 0), 0)}{" "}
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
                {completedOrders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {completedOrders.reduce((acc, order) => acc + (order.items?.length || 0), 0)}{" "}
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
                {completedOrders.reduce((total, order) => total + (order.total || 0), 0)
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
            </div>
          </div>

          <TabsContent value="pending" className="mt-0">
            <div className="space-y-4">
              {pendingOrders.length === 0 ? (
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
                              Order #{order.id}
                              <Badge className="ml-2" variant="default">
                                Pending
                              </Badge>
                            </CardTitle>
                            {/* <CardDescription> */}
                              {/* {order.id} •{" "} */}
                              {/* {new Date(order.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "} */}
                              {/* {order.customerName} */}
                            {/* </CardDescription> */}
                          </div>
                          <div className="flex items-center">
                            <div className="text-right mr-4">
                              <p className="font-medium">${order.total?.toFixed(2) || ""}</p>
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
                          {order.items?.map((item) => (
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
                              {order.id} •{" "}
                              {new Date(order.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                              {order.customerName}
                            </CardDescription>
                          </div>
                          <div className="flex items-center">
                            <div className="text-right mr-4">
                              <p className="font-medium">${order.total?.toFixed(2) || ""}</p>
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
                          {order.items?.map((item) => (
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
                            {order.id} •{" "}
                            {new Date(order.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                            {order.customerName}
                          </CardDescription>
                        </div>
                        <div className="flex items-center">
                          <div className="text-right mr-4">
                            <p className="font-medium">${order.total?.toFixed(2) || ""}</p>
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
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex items-start py-2">
                            <Checkbox
                              id={`item-${item.id}`}
                              className="mt-1 mr-3"
                              checked={item.completed}
                              onCheckedChange={(checked) => handleItemCompletion(order.id, item.name, checked as boolean)}
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



