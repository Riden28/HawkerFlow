"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
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

interface Stall {
  stallId: string
  stallName: string
  category: string
  description: string
  rating: number
  stallPhoto?: string
}

export default function StallsPage() {
  const { hawkerId } = useParams() as { hawkerId: string }
  const [stalls, setStalls] = useState<Stall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStalls() {
      try {
        const res = await fetch(`/api/order-proxy/hawkerCenters/${encodeURIComponent(hawkerId)}/stalls`)
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error("Response is not an array")
        setStalls(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStalls()
  }, [hawkerId])

  if (loading) return <div>Loading stalls...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-6">Stalls</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stalls.map((stall) => (
            <Card key={stall.stallId}>
              <CardHeader>
                <CardTitle>{stall.stallName}</CardTitle>
                <CardDescription>{stall.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{stall.description}</p>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href={`/hawker-centers/${hawkerId}/stalls/${stall.stallId}`}>View Dishes</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
