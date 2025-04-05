"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface Stall {
  stallName: string
  category: string
  description: string
  rating: number
  stallPhoto?: string
}

export default function HawkerCenterPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Always call hooks at the top level.
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  useEffect(() => {
    (async () => {
      const p = params instanceof Promise ? await params : params
      setResolvedParams(p)
    })()
  }, [params])

  const [stalls, setStalls] = useState<Stall[]>([])
  const [waitTimes, setWaitTimes] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  // Compute centerId if resolvedParams is available
  const centerId = resolvedParams ? Number.parseInt(resolvedParams.id) : null

  const hawkerName = "Maxwell Food Centre" // Hardcoded hawker center name for now

  useEffect(() => {
    const fetchStalls = async () => {
      const url = `/api/order-proxy/menu/${encodeURIComponent(hawkerName)}`
      console.log("📡 Calling proxy:", url)

      try {
        const res = await fetch(url)
        console.log("📡 API response status:", res.status)
        const data = await res.json()
        console.log("✅ stalls from proxy", data)

        if (Array.isArray(data)) {
          setStalls(data)

          // 🔁 Fetch wait time for each stall
          const times: { [key: string]: number } = {}
          await Promise.all(
            data.map(async (stall: Stall) => {
              try {
                const res = await fetch(
                  `/api/wait-time?hawker=${encodeURIComponent(hawkerName)}&stall=${encodeURIComponent(stall.stallName)}`
                )
                const json = await res.json()
                times[stall.stallName] = json.waitTime
              } catch (err) {
                console.error(`❌ Failed to get wait time for ${stall.stallName}`, err)
                times[stall.stallName] = -1
              }
            })
          )
          setWaitTimes(times)
        } else {
          throw new Error("Response is not a valid array of stalls")
        }
      } catch (err) {
        console.error("Failed to load stalls:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStalls()
  }, [hawkerName])

  // Instead of returning early, conditionally render inside the JSX.
  return (
    <>
      {(!resolvedParams || loading) ? (
        <div className="p-8">Loading...</div>
      ) : (
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">Stalls in {hawkerName}</h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stalls.map((stall) => (
                <Card key={stall.stallName}>
                  <div className="h-40 bg-gray-100">
                    <img src={stall.stallPhoto || "/placeholder.svg"} alt={stall.stallName} className="w-full h-full object-cover" />
                  </div>
                  <CardHeader>
                    <CardTitle>{stall.stallName}</CardTitle>
                    <CardDescription>{stall.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{stall.description}</p>
                    <p className="text-sm text-blue-600 mt-2">
                      Estimated Wait Time:{" "}
                      {waitTimes[stall.stallName] === undefined
                        ? "Loading..."
                        : waitTimes[stall.stallName] === -1
                        ? "Unavailable"
                        : `${waitTimes[stall.stallName]} min`}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <Link href={`/hawker-centers/${encodeURIComponent(hawkerName)}/stalls/${encodeURIComponent(stall.stallName)}`}>View Menu</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </main>
        </div>
      )}
    </>
  )
}
