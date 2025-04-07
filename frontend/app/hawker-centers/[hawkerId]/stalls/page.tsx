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
import { BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs';

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

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600">
    <div className="flex flex-col items-center">
      <svg
        className="animate-spin h-16 w-16 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        ></path>
      </svg>
      <p className="mt-4 text-2xl text-white">Loading, please wait...</p>
    </div>
  </div>
  if (error) return <div>Error: {error}</div>
  // Helper functions (place these above your return statement)
  function roundRating(rating: number): number {
    return Math.round(rating * 2) / 2;
  }

  function renderStars(rating: number) {
    const rounded = roundRating(rating);
    const fullStars = Math.floor(rounded);
    const halfStar = rounded % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    const stars = [];
    for (let i = 0; i < fullStars; i++) {
      stars.push(<BsStarFill key={`full-${i}`} className="text-yellow-500" />);
    }
    if (halfStar) {
      stars.push(<BsStarHalf key="half" className="text-yellow-500" />);
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<BsStar key={`empty-${i}`} className="text-yellow-500" />);
    }
    return stars;
  }

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
                {/* Rating overlay on the bottom-right of the image */}
                <div className="absolute bottom-0 right-0 m-2 flex flex-col items-end bg-white bg-opacity-80 rounded px-2 py-1">
                  <div className="flex">{renderStars(stall.rating)}
                  <span className="text-sm font-bold text-gray-800">
                    {stall.rating}
                  </span>
                  </div>
                  
                </div>
              </div>
              <CardHeader>
                <CardTitle>{stall.stallName}</CardTitle>
                <CardDescription>{stall.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{stall.description}</p>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-700">Wait Time:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {stall.waitTime !== null ? `${stall.waitTime} min` : "N/A"}
                  </span>
                </div>
                <Button asChild>
                  <Link href={`/hawker-centers/${hawkerId}/stalls/${stall.stallId}`}>
                    View Dishes
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );

}
