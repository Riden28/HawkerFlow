"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface HawkerCenter {
  hawkerId: string
  centerName: string
  address?: string
  rating?: number
}

export default function HawkerCentersPage() {
  const [centers, setCenters] = useState<HawkerCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCenters() {
      try {
        const res = await fetch("/api/order-proxy/hawkerCenters")
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error("Response is not an array")
        setCenters(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCenters()
  }, [])

  if (loading) return <div>Loading hawker centers...</div>
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
        <h1 className="text-3xl font-bold mb-6">Hawker Centers</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {centers.map((center) => (
            <Card key={center.hawkerId}>
              <CardHeader>
                <CardTitle>{center.centerName}</CardTitle>
                <CardDescription>{center.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Rating: {center.rating ?? "N/A"}</p>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href={`/hawker-centers/${center.hawkerId}/stalls`}>View Stalls</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
