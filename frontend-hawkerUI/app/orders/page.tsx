"use client"

import { useState } from "react"
import { Clock, Search, CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { VendorNavbar } from "@/components/vendor-navbar"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

// Sample orders data for the vendor
const orders = [
  {
    id: "HWK-1234",
    customerName: "John Lee",
    date: "2023-06-15T14:30:00",
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
    estimatedTime: 15,
    orderNumber: 42,
  },
  {
    id: "HWK-1235",
    customerName: "Sarah Tan",
    date: "2023-06-15T14:35:00",
    status: "pending",
    total: 12.0,
    items: [
      {
        id: 3,
        name: "Laksa",
        quantity: 1,
        price: 7.0,
        options: [
          { name: "Spice Level", choice: "Extra Spicy", price: 0.5 },
          { name: "Noodle Type", choice: "Thick Noodles", price: 0 },
        ],
        specialInstructions: "Extra cockles please",
        completed: false,
      },
      {
        id: 4,
        name: "Teh Tarik",
        quantity: 1,
        price: 1.8,
        options: [{ name: "Sweetness", choice: "Less Sweet", price: 0 }],
        specialInstructions: "",
        completed: true,
      },
      {
        id: 5,
        name: "Roti Prata",
        quantity: 1,
        price: 3.5,
        options: [{ name: "Type", choice: "Plain", price: 0 }],
        specialInstructions: "",
        completed: false,
      },
    ],
    paymentMethod: "PayNow",
    estimatedTime: 20,
    orderNumber: 43,
  },
  {
    id: "HWK-1236",
    customerName: "Michael Wong",
    date: "2023-06-15T14:40:00",
    status: "completed",
    total: 8.5,
    items: [
      {
        id: 6,
        name: "Nasi Lemak",
        quantity: 1,
        price: 5.5,
        options: [{ name: "Protein", choice: "Fried Chicken", price: 1.0 }],
        specialInstructions: "Extra sambal",
        completed: true,
      },
      {
        id: 7,
        name: "Iced Milo",
        quantity: 1,
        price: 2.0,
        options: [],
        specialInstructions: "",
        completed: true,
      },
    ],
    paymentMethod: "Cash",
    estimatedTime: 10,
    orderNumber: 44,
  },
  {
    id: "HWK-1237",
    customerName: "Lisa Chen",
    date: "2023-06-15T14:45:00",
    status: "pending",
    total: 22.0,
    items: [
      {
        id: 8,
        name: "Hokkien Mee",
        quantity: 2,
        price: 6.0,
        options: [{ name: "Size", choice: "Large", price: 1.0 }],
        specialInstructions: "",
        completed: false,
      },
      {
        id: 9,
        name: "Satay",
        quantity: 10,
        price: 1.0,
        options: [{ name: "Meat", choice: "Mixed (Chicken & Beef)", price: 0 }],
        specialInstructions: "Extra peanut sauce",
        completed: false,
      },
    ],
    paymentMethod: "Credit Card",
    estimatedTime: 25,
    orderNumber: 45,
  },
  {
    id: "HWK-1238",
    customerName: "David Lim",
    date: "2023-06-15T15:00:00",
    status: "completed",
    total: 18.5,
    items: [
      {
        id: 10,
        name: "Chicken Rice",
        quantity: 2,
        price: 5.5,
        options: [{ name: "Meat Type", choice: "Roasted Chicken", price: 0.5 }],
        specialInstructions: "",
        completed: true,
      },
      {
        id: 11,
        name: "Wonton Soup",
        quantity: 1,
        price: 7.0,
        options: [],
        specialInstructions: "",
        completed: true,
      },
    ],
    paymentMethod: "PayNow",
    estimatedTime: 15,
    orderNumber: 46,
  },
]

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [orderData, setOrderData] = useState(orders)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sortBy, setSortBy] = useState("time")

  // Filter orders based on active tab and search query
  const filteredOrders = orderData.filter((order) => {
    const matchesTab = activeTab === "all" || order.status === activeTab
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(order.orderNumber).includes(searchQuery)
    return matchesTab && matchesSearch
  })

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "time") {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    } else if (sortBy === "number") {
      return b.orderNumber - a.orderNumber
    } else if (sortBy === "total") {
      return b.total - a.total
    }
    return 0
  })

  // Handle marking an item as completed
  const handleItemCompletion = (orderId: string, itemId: number, completed: boolean) => {
    setOrderData((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          const updatedItems = order.items.map((item) => (item.id === itemId ? { ...item, completed } : item))

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
  }

  // Handle marking an entire order as completed
  const handleOrderCompletion = (orderId: string, completed: boolean) => {
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
  }

  // Open order details dialog
  const openOrderDetails = (order: any) => {
    setSelectedOrder(order)
    setIsDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <VendorNavbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Orders Management</h2>
            <p className="text-muted-foreground">View and manage all your orders</p>
          </div>
          <div className="flex items-center mt-4 md:mt-0 space-x-2">
            <Select defaultValue="today">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All Orders</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex w-full md:w-auto mt-4 md:mt-0 space-x-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by order #, ID, or customer"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="number">Order #</SelectItem>
                <SelectItem value="total">Total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <div className="rounded-full bg-muted p-3 mb-3">
                          {activeTab === "pending" ? (
                            <Clock className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <CheckCircle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="text-lg font-medium mb-1">No orders found</h3>
                        <p className="text-muted-foreground text-center">
                          {activeTab === "pending"
                            ? "You don't have any pending orders at the moment."
                            : "No completed orders match your search criteria."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className={order.status === "completed" ? "bg-green-50" : ""}
                      onClick={() => openOrderDetails(order)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        {new Date(order.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span>{order.items.length} items</span>
                          {order.items.some((item) => item.specialInstructions) && (
                            <AlertCircle className="h-3 w-3 text-amber-500 ml-2" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === "completed" ? "outline" : "default"}>
                          {order.status === "completed" ? "Completed" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={order.status === "completed" ? "outline" : "default"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOrderCompletion(order.id, order.status !== "completed")
                          }}
                        >
                          {order.status === "completed" ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Reopen
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order #{selectedOrder.orderNumber}</span>
                  <Badge variant={selectedOrder.status === "completed" ? "outline" : "default"}>
                    {selectedOrder.status === "completed" ? "Completed" : "Pending"}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder.id} • {new Date(selectedOrder.date).toLocaleString()} • {selectedOrder.customerName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Order Items</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item: any) => (
                      <div key={item.id} className="flex items-start">
                        <Checkbox
                          id={`dialog-item-${item.id}`}
                          className="mt-1 mr-3"
                          checked={item.completed}
                          onCheckedChange={(checked) =>
                            handleItemCompletion(selectedOrder.id, item.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <label
                              htmlFor={`dialog-item-${item.id}`}
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
                              {item.options.map((option: any, idx: number) => (
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
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span>{selectedOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span>{selectedOrder.estimatedTime} min</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant={selectedOrder.status === "completed" ? "outline" : "default"}
                  onClick={() => handleOrderCompletion(selectedOrder.id, selectedOrder.status !== "completed")}
                  className="w-full"
                >
                  {selectedOrder.status === "completed" ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark as Pending
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark All as Complete
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

