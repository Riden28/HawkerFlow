"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, Star, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/navbar"

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
    description: "Famous for their tender and flavorful Hainanese chicken rice, a local favorite.",
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
    description: "Specializing in traditional Fuzhou-style oyster cakes with a crispy exterior and savory filling.",
  },
  // Other stalls would be here
]

// Sample menu items data
const menuItems = [
  {
    id: 101,
    name: "Chicken Rice (Regular)",
    description: "Tender poached chicken with fragrant rice, served with chili sauce and cucumber garnish.",
    price: 5.5,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    stallId: 1,
    category: "Main",
    waitTime: "5-10 min",
    prepTime: "3-5 min",
  },
  {
    id: 102,
    name: "Chicken Rice (Large)",
    description: "Larger portion of our signature chicken rice with extra meat.",
    price: 7.0,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    stallId: 1,
    category: "Main",
    waitTime: "5-10 min",
    prepTime: "3-5 min",
  },
  {
    id: 103,
    name: "Roasted Chicken Rice",
    description: "Crispy skin roasted chicken with fragrant rice and special sauce.",
    price: 6.0,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    stallId: 1,
    category: "Main",
    waitTime: "5-10 min",
    prepTime: "3-5 min",
  },
  {
    id: 104,
    name: "Chicken Soup",
    description: "Clear chicken broth with vegetables and herbs.",
    price: 3.0,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    stallId: 1,
    category: "Sides",
    waitTime: "2-5 min",
    prepTime: "1-3 min",
  },
  {
    id: 105,
    name: "Extra Chicken",
    description: "Additional portion of chicken meat.",
    price: 3.5,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    stallId: 1,
    category: "Sides",
    waitTime: "2-5 min",
    prepTime: "1-3 min",
  },
  {
    id: 106,
    name: "Vegetables",
    description: "Stir-fried seasonal vegetables.",
    price: 3.0,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    stallId: 1,
    category: "Sides",
    waitTime: "2-5 min",
    prepTime: "1-3 min",
  },
  {
    id: 107,
    name: "Canned Drink",
    description: "Assorted soft drinks and beverages.",
    price: 1.5,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    stallId: 1,
    category: "Drinks",
    waitTime: "1-2 min",
    prepTime: "1 min",
  },
  {
    id: 201,
    name: "Fuzhou Oyster Cake",
    description: "Traditional crispy cake filled with oysters, minced meat, and vegetables.",
    price: 5.0,
    image: "/placeholder.svg?height=120&width=200",
    popular: true,
    stallId: 2,
    category: "Main",
    waitTime: "8-12 min",
    prepTime: "5-8 min",
  },
  {
    id: 202,
    name: "Prawn Fritter",
    description: "Crispy fritter with whole prawns and vegetables.",
    price: 4.5,
    image: "/placeholder.svg?height=120&width=200",
    popular: false,
    stallId: 2,
    category: "Main",
    waitTime: "8-12 min",
    prepTime: "5-8 min",
  },
]

// Sample hawker centers data
const hawkerCenters = [
  {
    id: 1,
    name: "Maxwell Food Centre",
    location: "1 Kadayanallur St, Singapore 069184",
  },
  {
    id: 2,
    name: "Old Airport Road Food Centre",
    location: "51 Old Airport Road, Singapore 390051",
  },
  // Other hawker centers would be here
]

export default function StallPage({ params }: { params: { id: string; stallId: string } }) {
  const centerId = Number.parseInt(params.id)
  const stallId = Number.parseInt(params.stallId)

  const hawkerCenter = hawkerCenters.find((center) => center.id === centerId)
  const stall = stalls.find((s) => s.id === stallId && s.hawkerCenterId === centerId)

  const [activeTab, setActiveTab] = useState("all")

  if (!hawkerCenter || !stall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4 text-muted-foreground">Stall not found</p>
            <Button asChild>
              <Link href={`/hawker-centers/${centerId}`}>Back to Hawker Centre</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter menu items for this stall
  const stallMenuItems = menuItems.filter((item) => item.stallId === stallId)

  // Get unique categories
  const categories = ["all", ...new Set(stallMenuItems.map((item) => item.category.toLowerCase()))]

  // Filter menu items by category
  const filteredMenuItems =
    activeTab === "all" ? stallMenuItems : stallMenuItems.filter((item) => item.category.toLowerCase() === activeTab)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href={`/hawker-centers/${centerId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {hawkerCenter.name}
          </Link>
        </Button>

        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              <img
                src={stall.image || "/placeholder.svg"}
                alt={stall.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
            <div className="md:w-2/3">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-3xl font-bold">{stall.name}</h2>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 mr-1" />
                  <span className="font-medium">{stall.rating}</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-2">{stall.category}</p>
              <p className="mb-4">{stall.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Wait: {stall.waitTime}
                </Badge>
                <Badge variant="outline" className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Prep: {stall.prepTime}
                </Badge>
                <Badge variant={stall.status === "Open" ? "default" : "secondary"}>{stall.status}</Badge>
                {stall.popular && <Badge className="bg-red-500">Popular</Badge>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h3 className="text-2xl font-bold mb-4 md:mb-0">Menu</h3>
          <div className="flex w-full md:w-auto space-x-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search menu..." className="pl-8" />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-4 flex flex-wrap h-auto">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="mb-1 capitalize">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenuItems.map((item) => (
                <Card key={item.id}>
                  <div className="relative h-40">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.popular && <Badge className="absolute top-2 right-2 bg-red-500">Popular</Badge>}
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{item.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                      </div>
                      <span className="font-bold">${item.price.toFixed(2)}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Wait: {item.waitTime}</span>
                      <span>Prep: {item.prepTime}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <Link href={`/hawker-centers/${centerId}/stalls/${stallId}/items/${item.id}`}>Order Now</Link>
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

