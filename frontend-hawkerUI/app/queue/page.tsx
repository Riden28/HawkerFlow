// This file will still exist but won't be linked in the navbar
"use client"

import { useState } from "react"
import { Clock, Users, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Navbar } from "@/components/navbar"

// Sample data for stalls
const stalls = [
  {
    id: 1,
    name: "Hainanese Delight",
    category: "Chinese",
    waitTime: "15-20 min",
    queueLength: 12,
    status: "Open",
  },
  {
    id: 2,
    name: "Nyonya Flavors",
    category: "Malay",
    waitTime: "10-15 min",
    queueLength: 8,
    status: "Open",
  },
  {
    id: 3,
    name: "Prata House",
    category: "Indian",
    waitTime: "5-10 min",
    queueLength: 5,
    status: "Open",
  },
  {
    id: 4,
    name: "Wok Master",
    category: "Chinese",
    waitTime: "20-25 min",
    queueLength: 15,
    status: "Open",
  },
  {
    id: 5,
    name: "Western Corner",
    category: "Western",
    waitTime: "15-20 min",
    queueLength: 10,
    status: "Open",
  },
  {
    id: 6,
    name: "Sweet Treats",
    category: "Desserts",
    waitTime: "5-10 min",
    queueLength: 7,
    status: "Open",
  },
]

export default function QueuePage() {
  const [inQueue, setInQueue] = useState(false)
  const [queueNumber, setQueueNumber] = useState(0)
  const [queuePosition, setQueuePosition] = useState(0)
  const [notifications, setNotifications] = useState(true)
  const [selectedStall, setSelectedStall] = useState<number | null>(null)

  const joinQueue = (stallId: number) => {
    setSelectedStall(stallId)
    setInQueue(true)
    // Generate a random queue number
    setQueueNumber(Math.floor(Math.random() * 100) + 100)
    // Set a random position in queue
    const stall = stalls.find((s) => s.id === stallId)
    if (stall) {
      setQueuePosition(stall.queueLength)
    }
  }

  const leaveQueue = () => {
    setInQueue(false)
    setSelectedStall(null)
    setQueueNumber(0)
    setQueuePosition(0)
  }

  const refreshQueue = () => {
    if (queuePosition > 1) {
      setQueuePosition(queuePosition - 1)
    } else {
      // Your turn!
      setQueuePosition(0)
    }
  }

  const getEstimatedTime = () => {
    if (queuePosition === 0) return "It's your turn!"
    const stall = stalls.find((s) => s.id === selectedStall)
    if (!stall) return "Unknown"

    const waitTimeRange = stall.waitTime.split("-")
    const minWait = Number.parseInt(waitTimeRange[0])
    const maxWait = Number.parseInt(waitTimeRange[1])

    const avgTimePerPerson = (minWait + maxWait) / 2 / stall.queueLength
    const estimatedMinutes = Math.round(queuePosition * avgTimePerPerson)

    return `~${estimatedMinutes} minutes`
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Queue Management</h2>

        {inQueue ? (
          <div className="mb-8">
            <Card className="border-primary">
              <CardHeader className="bg-primary/10">
                <CardTitle className="flex justify-between items-center">
                  <span>Your Queue Status</span>
                  <Badge variant={queuePosition === 0 ? "default" : "outline"}>
                    {queuePosition === 0 ? "Your Turn!" : `Position: ${queuePosition}`}
                  </Badge>
                </CardTitle>
                <CardDescription>{stalls.find((s) => s.id === selectedStall)?.name}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Queue Number</p>
                      <p className="text-3xl font-bold">{queueNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Estimated Wait Time</p>
                      <p className="text-xl font-semibold">{getEstimatedTime()}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Queue Progress</span>
                      <span>{queuePosition === 0 ? "Ready!" : `${queuePosition} ahead of you`}</span>
                    </div>
                    <Progress
                      value={
                        queuePosition === 0
                          ? 100
                          : (1 - queuePosition / stalls.find((s) => s.id === selectedStall)?.queueLength!) * 100
                      }
                    />
                  </div>

                  {queuePosition === 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <AlertTitle className="text-green-800">It's your turn!</AlertTitle>
                      <AlertDescription className="text-green-700">
                        Please proceed to the stall counter to place your order.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={refreshQueue}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
                <Button variant="destructive" onClick={leaveQueue}>
                  Leave Queue
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="mb-8">
            <Alert>
              <AlertTitle>Join a queue remotely</AlertTitle>
              <AlertDescription>
                Select a stall below to join its queue. You'll receive notifications as your turn approaches.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Tabs defaultValue="all" className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All Stalls</TabsTrigger>
            <TabsTrigger value="chinese">Chinese</TabsTrigger>
            <TabsTrigger value="malay">Malay</TabsTrigger>
            <TabsTrigger value="indian">Indian</TabsTrigger>
            <TabsTrigger value="western">Western</TabsTrigger>
            <TabsTrigger value="desserts">Desserts</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stalls.map((stall) => (
                <Card key={stall.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{stall.name}</CardTitle>
                        <CardDescription>{stall.category}</CardDescription>
                      </div>
                      <Badge variant={stall.status === "Open" ? "default" : "secondary"}>{stall.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between mb-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{stall.waitTime}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{stall.queueLength} in queue</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => joinQueue(stall.id)}
                      disabled={inQueue || stall.status !== "Open"}
                    >
                      Join Queue
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {["chinese", "malay", "indian", "western", "desserts"].map((category) => (
            <TabsContent key={category} value={category} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stalls
                  .filter((stall) => stall.category.toLowerCase() === category)
                  .map((stall) => (
                    <Card key={stall.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{stall.name}</CardTitle>
                            <CardDescription>{stall.category}</CardDescription>
                          </div>
                          <Badge variant={stall.status === "Open" ? "default" : "secondary"}>{stall.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between mb-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{stall.waitTime}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{stall.queueLength} in queue</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          onClick={() => joinQueue(stall.id)}
                          disabled={inQueue || stall.status !== "Open"}
                        >
                          Join Queue
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

