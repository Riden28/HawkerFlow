// This file will still exist but won't be linked in the navbar
import Link from "next/link"
import { Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/navbar"

// Sample data for menu items
const categories = ["All", "Chinese", "Malay", "Indian", "Western", "Desserts", "Drinks"]

const menuItems = [
  {
    id: 1,
    name: "Chicken Rice",
    stall: "Hainanese Delight",
    price: 5.5,
    description: "Tender poached chicken with fragrant rice and chili sauce",
    category: "Chinese",
    image: "/placeholder.svg?height=200&width=300",
    popular: true,
  },
  {
    id: 2,
    name: "Laksa",
    stall: "Nyonya Flavors",
    price: 6.0,
    description: "Spicy coconut milk noodle soup with prawns and fish cake",
    category: "Malay",
    image: "/placeholder.svg?height=200&width=300",
    popular: true,
  },
  {
    id: 3,
    name: "Roti Prata",
    stall: "Prata House",
    price: 3.5,
    description: "Crispy flatbread served with curry sauce",
    category: "Indian",
    image: "/placeholder.svg?height=200&width=300",
    popular: false,
  },
  {
    id: 4,
    name: "Char Kway Teow",
    stall: "Wok Master",
    price: 5.0,
    description: "Stir-fried flat rice noodles with prawns, cockles, and Chinese sausage",
    category: "Chinese",
    image: "/placeholder.svg?height=200&width=300",
    popular: true,
  },
  {
    id: 5,
    name: "Nasi Lemak",
    stall: "Malay Delights",
    price: 4.5,
    description: "Coconut rice with sambal, fried fish, and various sides",
    category: "Malay",
    image: "/placeholder.svg?height=200&width=300",
    popular: true,
  },
  {
    id: 6,
    name: "Chicken Chop",
    stall: "Western Corner",
    price: 8.0,
    description: "Grilled chicken with fries and coleslaw",
    category: "Western",
    image: "/placeholder.svg?height=200&width=300",
    popular: false,
  },
  {
    id: 7,
    name: "Ice Kachang",
    stall: "Sweet Treats",
    price: 3.5,
    description: "Shaved ice with red beans, jelly, and sweet syrup",
    category: "Desserts",
    image: "/placeholder.svg?height=200&width=300",
    popular: false,
  },
  {
    id: 8,
    name: "Teh Tarik",
    stall: "Beverage Station",
    price: 1.8,
    description: "Pulled milk tea with a frothy top",
    category: "Drinks",
    image: "/placeholder.svg?height=200&width=300",
    popular: true,
  },
]

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h2 className="text-3xl font-bold mb-4 md:mb-0">Menu</h2>
          <div className="flex w-full md:w-auto space-x-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search dishes..." className="pl-8" />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <Tabs defaultValue="All" className="mb-8">
          <TabsList className="mb-4 flex flex-wrap h-auto">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="mb-1">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems
                  .filter((item) => category === "All" || item.category === category)
                  .map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="relative h-48">
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
                            <p className="text-sm text-muted-foreground">{item.stall}</p>
                          </div>
                          <p className="font-bold">${item.price.toFixed(2)}</p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{item.description}</p>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full" asChild>
                          <Link href={`/menu/${item.id}`}>Add to Order</Link>
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

