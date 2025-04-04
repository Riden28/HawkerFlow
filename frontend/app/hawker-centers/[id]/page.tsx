"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import Link from "next/link"

interface Stall {
  stallName: string
  category: string
  description: string
  rating: number
  stallPhoto?: string
}

export default function HawkerPage() {
  const [stalls, setStalls] = useState<Stall[]>([])
  const [waitTimes, setWaitTimes] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)

  const hawkerName = "Maxwell Food Centre" // Hardcoded hawker center name

  useEffect(() => {
    const fetchStalls = async () => {
      const url = `/api/order-proxy/menu/${encodeURIComponent(hawkerName)}`
      console.log("📡 Calling proxy:", url)

      try {
        const res = await fetch(url)
        console.log("📡 API response status:", res.status)
        const data = await res.json()
        console.log("✅ stalls from proxy baby", data)

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

  if (loading) return <div className="p-8">Loading stalls...</div>

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Stalls in {hawkerName}</h1>
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
  )
}
