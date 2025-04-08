"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useCart, type CartItem } from "@/contexts/cart-context"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/navbar"

// Mock data for a food item
const mockItem = {
  id: 101,
  name: "Chicken Rice",
  description: "Fragrant rice with steamed chicken, served with chili sauce and cucumber garnish.",
  price: 5.5,
  image: "/placeholder.svg?height=300&width=400",
  options: [
    {
      name: "Meat Type",
      choices: [
        { name: "Steamed Chicken", price: 0 },
        { name: "Roasted Chicken", price: 0.5 },
        { name: "Combination", price: 1.0 },
      ],
    },
    {
      name: "Rice Type",
      choices: [
        { name: "White Rice", price: 0 },
        { name: "Brown Rice", price: 0.5 },
      ],
    },
    {
      name: "Extra",
      choices: [
        { name: "None", price: 0 },
        { name: "Extra Chicken", price: 2.0 },
        { name: "Extra Rice", price: 1.0 },
      ],
    },
  ],
  stallId: 1,
  stallName: "Ah Hock Chicken Rice",
  hawkerCenterId: 1,
  hawkerCenterName: "Maxwell Food Centre",
  waitTime: "5-10",
  prepTime: "3-5",
}

export default function ItemDetailPage({ params }: { params: { id: string; stallId: string; itemId: string } }) {
  const { toast } = useToast()
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<{
    [key: string]: { name: string; choice: string; price: number }
  }>({})
  const [specialInstructions, setSpecialInstructions] = useState("")

  const incrementQuantity = () => setQuantity((prev) => prev + 1)
  const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1))

  const handleOptionChange = (optionName: string, choice: string, price: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: {
        name: optionName,
        choice,
        price,
      },
    }))
  }

  const handleAddToCart = () => {
    try {
      const item: CartItem = {
        id: mockItem.id,
        name: mockItem.name,
        price: mockItem.price,
        quantity,
        image: mockItem.image,
        stallId: mockItem.stallId,
        stallName: mockItem.stallName,
        hawkerCenterId: mockItem.hawkerCenterId,
        hawkerCenterName: mockItem.hawkerCenterName,
        waitTime: mockItem.waitTime,
        prepTime: mockItem.prepTime,
        options: Object.values(selectedOptions),
        specialInstructions: specialInstructions.trim() || undefined,
      }

      addItem(item)

      toast({
        title: "Added to cart",
        description: `${quantity}x ${mockItem.name} added to your cart.`,
      })
    } catch (error) {
      // Convert error to string instead of rendering the error object
      const errorMessage = error instanceof Error ? error.message : "An error occurred"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const calculateTotalPrice = () => {
    const basePrice = mockItem.price * quantity
    const optionsPrice = Object.values(selectedOptions).reduce((sum, option) => sum + option.price, 0) * quantity
    return (basePrice + optionsPrice).toFixed(2)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href={`/hawker-centers/${params.id}/stalls/${params.stallId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Stall
            </Link>
          </Button>
          <h2 className="text-3xl font-bold">{decodeURIComponent(mockItem.name)}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img
              src={mockItem.image || "/placeholder.svg"}
              alt={mockItem.name}
              className="w-full h-auto rounded-lg shadow-md"
            />
            <div className="mt-4 bg-muted p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Wait Time:</span>
                <span>{mockItem.waitTime} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Preparation Time:</span>
                <span>{mockItem.prepTime} mins</span>
              </div>
            </div>
          </div>

          <div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xl font-bold mb-2">${mockItem.price.toFixed(2)}</p>
                <p className="text-muted-foreground mb-6">{mockItem.description}</p>

                {mockItem.options.map((option, index) => (
                  <div key={index} className="mb-6">
                    <h3 className="font-medium mb-3">{option.name}</h3>
                    <RadioGroup
                      defaultValue={option.choices[0].name}
                      onValueChange={(value) => {
                        const selectedChoice = option.choices.find((c) => c.name === value)
                        if (selectedChoice) {
                          handleOptionChange(option.name, value, selectedChoice.price)
                        }
                      }}
                    >
                      {option.choices.map((choice, choiceIndex) => (
                        <div key={choiceIndex} className="flex items-center justify-between py-2">
                          <div className="flex items-center">
                            <RadioGroupItem value={choice.name} id={`${option.name}-${choice.name}`} />
                            <Label htmlFor={`${option.name}-${choice.name}`} className="ml-2">
                              {choice.name}
                            </Label>
                          </div>
                          {choice.price > 0 && <span>+${choice.price.toFixed(2)}</span>}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}

                <div className="mb-6">
                  <h3 className="font-medium mb-3">Special Instructions</h3>
                  <Textarea
                    placeholder="Any special requests for this item?"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Button variant="outline" size="icon" onClick={decrementQuantity} disabled={quantity <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="mx-4 w-8 text-center">{quantity}</span>
                    <Button variant="outline" size="icon" onClick={incrementQuantity}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xl font-bold">Total: ${calculateTotalPrice()}</div>
                </div>

                <Button className="w-full" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-muted py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

