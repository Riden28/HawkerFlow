
"use client"
import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { useCart } from "@/contexts/cart-context"
import { useToast } from "@/hooks/use-toast"
interface MenuItem {
  dishName: string
  description: string
  dishPhoto?: string
  price: number
  waitTime: number
  inStock: boolean
}
export default function StallPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { stallId } = useParams() as { stallId: string }
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()
  const fetchMenuItems = async () => {
    try {
      const hawker = "Maxwell Food Centre"
      const stall = decodeURIComponent(stallId)
      const url = `/api/menu/${encodeURIComponent(hawker)}/${encodeURIComponent(stall)}`
      const res = await fetch(url)

      if (!res.ok) throw new Error("Failed to fetch menu items")
      const data = await res.json()
      setMenuItems(data)
    } catch (err) {
      setError("Failed to load menu items")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchMenuItems()
  }, [stallId])
  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Menu for {decodeURIComponent(stallId)}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card key={item.dishName}>
              <div className="relative h-40">
                <img
                  src={item.dishPhoto || "/placeholder.svg"}
                  alt={item.dishName}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{item.dishName}</CardTitle>
                    <CardDescription className="line-clamp-2 text-muted-foreground">
                      {item.description || "No description provided."}
                    </CardDescription>
                  </div>
                  <Badge variant={item.inStock ? "default" : "secondary"}>
                    {item.inStock ? "In Stock" : "Out of Stock"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Wait: {item.waitTime} min</span>
                </div>
                <p className="text-xl font-bold">${item.price.toFixed(2)}</p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => {
                    addItem({
                      id: item.dishName,
                      name: item.dishName,
                      price: item.price,
                      quantity: 1,
                      image: item.dishPhoto || "",
                      stallId: stallId,
                      stallName: decodeURIComponent(stallId),
                      hawkerCenterId: 1,
                      hawkerCenterName: "Maxwell Food Centre",
                      waitTime: item.waitTime.toString(),
                      prepTime: "",
                      options: [],
                      specialInstructions: "",
                    })
                    toast({
                      title: "Added to cart",
                      description: `1x ${item.dishName} added to your cart.`,
                    })
                    // Optional: Go straight to the cart
                    // router.push("/cart")
                  }}
                  disabled={!item.inStock}
                >
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
