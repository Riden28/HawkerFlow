"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, MapPin, Star, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"

interface HawkerCenter {
  hawkerId: string
  centerName: string
  address?: string
  rating?: number
  image?: string
  stallCount?: number
  popular?: boolean
  openingHours?: string
}

export default function Home() {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Find Your Hawker Centre</h2>
            <p className="text-xl text-muted-foreground mx-auto">
              Browse hawker centres, check waiting times, and order food without the wait.
            </p>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="text" placeholder="Search hawker centres..." className="pl-10" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centers.map((center) => (
              <Card key={center.hawkerId} className="overflow-hidden">
                <div className="relative h-48">
                  <img
                    src={center.image || "/placeholder.svg"}
                    alt={center.centerName}
                    className="w-full h-full object-cover"
                  />
                  {center.popular && (
                    <Badge className="absolute top-2 right-2 bg-red-500">Popular</Badge>
                  )}
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{center.centerName}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {center.address}
                      </CardDescription>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>{center.rating}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">
                        Halal
                      </Badge>
                      <Badge variant="outline" className="mr-2">
                        Chinese
                      </Badge>
                      <Badge variant="outline" className="mr-2">
                        Vegetarian
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      5am - 8pm
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/hawker-centers/${center.hawkerId}/stalls`}>
                      View Stalls <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="bg-muted py-12">
          <div className="text-center text-muted-foreground">
            <p>© 2025 HawkerFlow - Enterprise Solution Development G8 Team 2 </p>
          </div>
      </footer>
    </div>
  )
}
