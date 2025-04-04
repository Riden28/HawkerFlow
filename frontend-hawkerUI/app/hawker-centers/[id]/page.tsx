"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, Users, Search, Filter, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/navbar"

// Sample hawker centers data
const hawkerCenters = [
  {
    id: 1,
    name: "Maxwell Food Centre",
    location: "1 Kadayanallur St, Singapore 069184",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.5,
    stallCount: 100,
    popular: true,
    distance: "1.2 km",
    openingHours: "8:00 AM - 10:00 PM",
    description:
      "Maxwell Food Centre is a popular hawker centre located in the heart of Chinatown, offering a wide variety of local dishes at affordable prices.",
  },
  {
    id: 2,
    name: "Old Airport Road Food Centre",
    location: "51 Old Airport Road, Singapore 390051",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.7,
    stallCount: 150,
    popular: true,
    distance: "3.5 km",
    openingHours: "6:00 AM - 11:00 PM",
    description:
      "One of the largest and most famous hawker centres in Singapore, known for its wide variety of local delicacies and heritage stalls.",
  },
  // Other hawker centers would be here
  {
    id: 3,
    name: "Amoy Street Food Centre",
    location: "7 Maxwell Rd, Singapore 069111",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.6,
    stallCount: 80,
    popular: true,
    distance: "2.0 km",
    openingHours: "7:00 AM - 9:00 PM",
    description:
      "Amoy Street Food Centre is a bustling hawker centre in the Central Business District, popular for lunch crowds and diverse food options.",
  },
  {
    id: 4,
    name: "Tekka Centre",
    location: "Buffalo Rd, Singapore 210665",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.3,
    stallCount: 120,
    popular: false,
    distance: "4.2 km",
    openingHours: "6:30 AM - 9:00 PM",
    description:
      "Tekka Centre is a vibrant multi-ethnic market and food centre in Little India, offering a wide range of Indian, Malay, and Chinese dishes.",
  },
  {
    id: 5,
    name: "Tiong Bahru Market",
    location: "30 Seng Poh Rd, Singapore 168898",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.5,
    stallCount: 90,
    popular: true,
    distance: "2.8 km",
    openingHours: "7:00 AM - 10:00 PM",
    description:
      "Tiong Bahru Market is a charming hawker centre in a historic neighborhood, known for its traditional dishes and fresh market produce.",
  },
  {
    id: 6,
    name: "Hong Lim Market & Food Centre",
    location: "531A Upper Cross St, Singapore 051531",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.4,
    stallCount: 110,
    popular: false,
    distance: "1.5 km",
    openingHours: "6:00 AM - 11:00 PM",
    description:
      "Hong Lim Market & Food Centre is a popular hawker centre near Chinatown, offering a variety of local dishes and traditional snacks.",
  },
]

// Sample stalls data
const stalls = [
  {
    id: 1,
    name: "Tian Tian Hainanese Chicken Rice",
    category: "Chinese",
    waitTime: "15-20 min",
    queueLength: 12,
    status: "Open",
    rating: 4.8,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "10-15 min",
  },
  {
    id: 2,
    name: "Maxwell Fuzhou Oyster Cake",
    category: "Chinese",
    waitTime: "10-15 min",
    queueLength: 8,
    status: "Open",
    rating: 4.5,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "8-12 min",
  },
  {
    id: 3,
    name: "Zhen Zhen Porridge",
    category: "Chinese",
    waitTime: "5-10 min",
    queueLength: 5,
    status: "Open",
    rating: 4.3,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    prepTime: "5-8 min",
  },
  {
    id: 4,
    name: "Marina South Delicious Food",
    category: "Chinese",
    waitTime: "20-25 min",
    queueLength: 15,
    status: "Open",
    rating: 4.6,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    prepTime: "15-20 min",
  },
  {
    id: 5,
    name: "Hainanese Curry Rice",
    category: "Chinese",
    waitTime: "15-20 min",
    queueLength: 10,
    status: "Open",
    rating: 4.4,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    prepTime: "10-15 min",
  },
  {
    id: 6,
    name: "Maxwell Fuzhou Fishball",
    category: "Chinese",
    waitTime: "5-10 min",
    queueLength: 7,
    status: "Open",
    rating: 4.2,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    prepTime: "3-7 min",
  },
  {
    id: 7,
    name: "Special Nasi Lemak",
    category: "Malay",
    waitTime: "10-15 min",
    queueLength: 9,
    status: "Open",
    rating: 4.7,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "8-12 min",
  },
  {
    id: 8,
    name: "Indian Rojak",
    category: "Indian",
    waitTime: "5-10 min",
    queueLength: 4,
    status: "Open",
    rating: 4.1,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    prepTime: "3-5 min",
  },
  {
    id: 9,
    name: "Western Delights",
    category: "Western",
    waitTime: "15-20 min",
    queueLength: 11,
    status: "Open",
    rating: 4.0,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    prepTime: "12-18 min",
  },
  {
    id: 10,
    name: "Sweet Desserts",
    category: "Desserts",
    waitTime: "5-10 min",
    queueLength: 6,
    status: "Open",
    rating: 4.5,
    hawkerCenterId: 1,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "3-7 min",
  },
  {
    id: 11,
    name: "Famous Sungei Road Laksa",
    category: "Chinese",
    waitTime: "20-25 min",
    queueLength: 15,
    status: "Open",
    rating: 4.7,
    hawkerCenterId: 2,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "5-10 min",
  },
  {
    id: 12,
    name: "Whitley Road Big Prawn Noodles",
    category: "Chinese",
    waitTime: "15-20 min",
    queueLength: 10,
    status: "Open",
    rating: 4.6,
    hawkerCenterId: 2,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "8-12 min",
  },
  {
    id: 13,
    name: "Lao Ban Soya Beancurd",
    category: "Desserts",
    waitTime: "5-10 min",
    queueLength: 6,
    status: "Open",
    rating: 4.4,
    hawkerCenterId: 2,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    prepTime: "3-5 min",
  },
  {
    id: 14,
    name: "Roast Paradise",
    category: "Chinese",
    waitTime: "15-20 min",
    queueLength: 12,
    status: "Open",
    rating: 4.5,
    hawkerCenterId: 3,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "10-15 min",
  },
  {
    id: 15,
    name: "Hong Kong Soya Sauce Chicken",
    category: "Chinese",
    waitTime: "25-30 min",
    queueLength: 20,
    status: "Open",
    rating: 4.9,
    hawkerCenterId: 3,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "10-15 min",
  },
  {
    id: 16,
    name: "Tekka Nasi Biryani",
    category: "Indian",
    waitTime: "10-15 min",
    queueLength: 8,
    status: "Open",
    rating: 4.6,
    hawkerCenterId: 4,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "5-10 min",
  },
  {
    id: 17,
    name: "Tiong Bahru Fried Kway Teow",
    category: "Chinese",
    waitTime: "15-20 min",
    queueLength: 10,
    status: "Open",
    rating: 4.4,
    hawkerCenterId: 5,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "5-8 min",
  },
  {
    id: 18,
    name: "A Noodle Story",
    category: "Chinese",
    waitTime: "20-25 min",
    queueLength: 15,
    status: "Open",
    rating: 4.7,
    hawkerCenterId: 6,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    prepTime: "8-12 min",
  },
]

export default function HawkerCenterPage({ params }: { params: { id: string } }) {
  const centerId = Number.parseInt(params.id)
  const hawkerCenter = hawkerCenters.find((center) => center.id === centerId)

  const [activeTab, setActiveTab] = useState("all")

  if (!hawkerCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4 text-muted-foreground">Hawker center not found</p>
            <Button asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const centerStalls = stalls.filter((stall) => stall.hawkerCenterId === centerId)

  const filteredStalls =
    activeTab === "all"
      ? centerStalls
      : centerStalls.filter((stall) => stall.category.toLowerCase() === activeTab.toLowerCase())

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Hawker Centres
          </Link>
        </Button>

        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              <img
                src={hawkerCenter.image || "/placeholder.svg"}
                alt={hawkerCenter.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
            <div className="md:w-2/3">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-3xl font-bold">{hawkerCenter.name}</h2>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 mr-1" />
                  <span className="font-medium">{hawkerCenter.rating}</span>
                </div>
              </div>
              <p className="flex items-center text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                {hawkerCenter.location}
              </p>
              <p className="mb-4">{hawkerCenter.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {hawkerCenter.openingHours}
                </Badge>
                <Badge variant="outline">{hawkerCenter.stallCount} Stalls</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h3 className="text-2xl font-bold mb-4 md:mb-0">Stalls</h3>
          <div className="flex w-full md:w-auto space-x-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search stalls..." className="pl-8" />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-4 flex flex-wrap h-auto">
            <TabsTrigger value="all" className="mb-1">
              All
            </TabsTrigger>
            <TabsTrigger value="chinese" className="mb-1">
              Chinese
            </TabsTrigger>
            <TabsTrigger value="malay" className="mb-1">
              Malay
            </TabsTrigger>
            <TabsTrigger value="indian" className="mb-1">
              Indian
            </TabsTrigger>
            <TabsTrigger value="western" className="mb-1">
              Western
            </TabsTrigger>
            <TabsTrigger value="desserts" className="mb-1">
              Desserts
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStalls.map((stall) => (
                <Card key={stall.id}>
                  <div className="relative h-40">
                    <img
                      src={stall.image || "/placeholder.svg"}
                      alt={stall.name}
                      className="w-full h-full object-cover"
                    />
                    {stall.popular && <Badge className="absolute top-2 right-2 bg-red-500">Popular</Badge>}
                  </div>
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
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Prep: {stall.prepTime}</span>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>{stall.rating}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button className="w-full" asChild>
                      <Link href={`/hawker-centers/${centerId}/stalls/${stall.id}`}>View Menu</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
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

