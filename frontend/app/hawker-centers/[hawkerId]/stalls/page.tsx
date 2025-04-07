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
  waitTime?: number
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
        // For each stall, fetch its wait time from the queueMgt endpoint via the queue-proxy
        const stallsWithWaitTimes = await Promise.all(
          data.map(async (stall: Stall) => {
            try {
              const waitRes = await fetch(
                `/api/queue-proxy/${encodeURIComponent(hawkerId)}/${encodeURIComponent(stall.stallId)}/waitTime`
              )
              if (waitRes.ok) {
                const waitData = await waitRes.json()
                // Extract the waitTime from the response JSON
                stall.waitTime = waitData.waitTime
              } else {
                // Log the error response for debugging and set a fallback value
                const errorText = await waitRes.text()
                console.error(`Wait time fetch failed for stall ${stall.stallId}: ${errorText}`)
                stall.waitTime = 0
              }
            } catch (error) {
              console.error("Error fetching wait time:", error)
              stall.waitTime = 0
            }
            return stall
          })
        )

        setStalls(stallsWithWaitTimes)
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
              <div className="relative h-48">
                <img
                  src={stall.stallPhoto || "/placeholder.svg"}
                  alt={stall.stallName}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{stall.stallName}</CardTitle>
                  <div className="text-sm font-bold">{stall.rating}</div>
                </div>
                <CardDescription>{stall.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{stall.description}</p>
                {/* Added wait time display snippet */}
                {stall.waitTime !== null ? (
                  <p className="mt-2 text-sm text-gray-700">
                    Estimated Wait Time: {stall.waitTime} min
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-700">Estimated Wait Time: N/A</p>
                )}
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
