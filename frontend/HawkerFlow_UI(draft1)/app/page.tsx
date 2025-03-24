import Link from "next/link"
import { ArrowRight, MapPin, Star, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  },
  {
    id: 3,
    name: "Chinatown Complex Food Centre",
    location: "335 Smith Street, Singapore 050335",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.4,
    stallCount: 260,
    popular: true,
    distance: "0.8 km",
    openingHours: "7:00 AM - 10:00 PM",
  },
  {
    id: 4,
    name: "Tekka Centre",
    location: "665 Buffalo Road, Singapore 210665",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.3,
    stallCount: 80,
    popular: false,
    distance: "2.7 km",
    openingHours: "6:30 AM - 9:00 PM",
  },
  {
    id: 5,
    name: "Tiong Bahru Market",
    location: "30 Seng Poh Road, Singapore 168898",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.6,
    stallCount: 83,
    popular: true,
    distance: "1.9 km",
    openingHours: "7:00 AM - 8:00 PM",
  },
  {
    id: 6,
    name: "Amoy Street Food Centre",
    location: "7 Maxwell Road, Singapore 069111",
    image: "/placeholder.svg?height=200&width=300",
    rating: 4.2,
    stallCount: 100,
    popular: false,
    distance: "1.5 km",
    openingHours: "7:00 AM - 9:00 PM",
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Find Your Hawker Centre</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
            {hawkerCenters.map((center) => (
              <Card key={center.id} className="overflow-hidden">
                <div className="relative h-48">
                  <img
                    src={center.image || "/placeholder.svg"}
                    alt={center.name}
                    className="w-full h-full object-cover"
                  />
                  {center.popular && <Badge className="absolute top-2 right-2 bg-red-500">Popular</Badge>}
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{center.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {center.location}
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
                        {center.stallCount} Stalls
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {center.openingHours}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/hawker-centers/${center.id}`}>
                      View Stalls <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="bg-muted rounded-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">How It Works</h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium">Select a Hawker Centre</h3>
                      <p className="text-muted-foreground">Choose from popular hawker centres near you</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium">Browse Stalls & Join Queue</h3>
                      <p className="text-muted-foreground">View waiting times and join queues remotely</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium">Order & Pay</h3>
                      <p className="text-muted-foreground">Place your order and pay securely online</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">
                      4
                    </div>
                    <div>
                      <h3 className="font-medium">Collect Your Food</h3>
                      <p className="text-muted-foreground">Skip the line and collect your food when it's ready</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="bg-background rounded-lg overflow-hidden shadow-md">
                <img src="/placeholder.svg?height=300&width=400" alt="How it works" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">HawkerFlow</h3>
              <p className="text-muted-foreground">Making hawker food more accessible for everyone.</p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-muted-foreground hover:text-foreground">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className="text-muted-foreground hover:text-foreground">
                    My Orders
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-muted-foreground hover:text-foreground">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-muted-foreground hover:text-foreground">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

