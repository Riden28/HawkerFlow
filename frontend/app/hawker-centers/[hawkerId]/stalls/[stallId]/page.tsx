"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface MenuItem {
    dishId: string
    dishName: string
    description: string
    dishPhoto?: string
    price: number
    waitTime: number
    inStock: boolean
}

export default function DishesPage() {
    const { hawkerId, stallId } = useParams() as { hawkerId: string; stallId: string }
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchDishes() {
            try {
                const res = await fetch(
                    `/api/order-proxy/hawkerCenters/${encodeURIComponent(hawkerId)}/stalls/${encodeURIComponent(stallId)}/dishes`
                )
                if (!res.ok) throw new Error(`Status ${res.status}`)
                const data = await res.json()
                if (!Array.isArray(data)) throw new Error("Response is not an array")
                setMenuItems(data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchDishes()
    }, [hawkerId, stallId])

    if (loading) return <div>Loading dishes...</div>
    if (error) return <div>Error: {error}</div>

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                <Button variant="ghost" onClick={() => window.history.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold mb-8">Menu for {stallId}</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.map((item) => (
                        <Card key={item.dishId}>
                            <div className="relative h-40">
                                <img
                                    src={item.dishPhoto || "/placeholder.svg"}
                                    alt={item.dishName}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <CardHeader>
                                <CardTitle>{item.dishName}</CardTitle>
                                <CardDescription>{item.description || "No description provided."}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                                    <span>Wait: {item.waitTime} min</span>
                                </div>
                                <p className="text-xl font-bold">${item.price.toFixed(2)}</p>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" disabled={!item.inStock}>
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
