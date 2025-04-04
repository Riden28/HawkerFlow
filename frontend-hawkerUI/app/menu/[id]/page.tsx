"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useCart } from "@/contexts/cart-context"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/navbar"

// Sample menu item data
const menuItems = [
  {
    id: 1,
    name: "Chicken Rice",
    stall: "Hainanese Delight",
    price: 5.5,
    description: "Tender poached chicken with fragrant rice and chili sauce",
    category: "Chinese",
    image: "/placeholder.svg?height=300&width=500",
    popular: true,
    options: [
      {
        name: "Meat Type",
        required: true,
        choices: [
          { id: "chicken-breast", name: "Chicken Breast", price: 0 },
          { id: "chicken-thigh", name: "Chicken Thigh", price: 0.5 },
          { id: "roasted-chicken", name: "Roasted Chicken", price: 0.5 },
        ],
      },
      {
        name: "Rice Portion",
        required: true,
        choices: [
          { id: "regular-rice", name: "Regular Rice", price: 0 },
          { id: "large-rice", name: "Large Rice", price: 1.0 },
          { id: "no-rice", name: "No Rice", price: -1.0 },
        ],
      },
      {
        name: "Add-ons",
        required: false,
        choices: [
          { id: "extra-sauce", name: "Extra Chili Sauce", price: 0.5 },
          { id: "extra-cucumber", name: "Extra Cucumber", price: 0.5 },
          { id: "soup", name: "Chicken Soup", price: 1.5 },
        ],
      },
    ],
  },
  // Other menu items would be here
]

export default function MenuItemPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const itemId = Number.parseInt(params.id)

  // Find the menu item by ID
  const menuItem = menuItems.find((item) => item.id === itemId)

  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [addons, setAddons] = useState<string[]>([])
  const [specialInstructions, setSpecialInstructions] = useState("")

  const { addItem, getTotalItems } = useCart()
  const { toast } = useToast()

  const handleBack = () => {
    router.back()
  }

  if (!menuItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4 text-muted-foreground">Menu item not found</p>
            <Button asChild>
              <Link href="/menu">Back to Menu</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity)
    }
  }

  const handleOptionChange = (optionName: string, choiceId: string) => {
    setSelectedOptions({
      ...selectedOptions,
      [optionName]: choiceId,
    })
  }

  const handleAddonToggle = (choiceId: string) => {
    if (addons.includes(choiceId)) {
      setAddons(addons.filter((id) => id !== choiceId))
    } else {
      setAddons([...addons, choiceId])
    }
  }

  const calculateTotalPrice = () => {
    let total = menuItem.price

    // Add price for selected options
    menuItem.options.forEach((option) => {
      const selectedChoice = option.choices.find((choice) => choice.id === selectedOptions[option.name])
      if (selectedChoice) {
        total += selectedChoice.price
      }
    })

    // Add price for addons
    menuItem.options
      .filter((option) => !option.required)
      .forEach((option) => {
        option.choices.forEach((choice) => {
          if (addons.includes(choice.id)) {
            total += choice.price
          }
        })
      })

    return total * quantity
  }

  const handleAddToCart = () => {
    // Check if required options are selected
    const requiredOptions = menuItem.options.filter((option) => option.required)
    const allRequiredSelected = requiredOptions.every((option) => selectedOptions[option.name])

    if (!allRequiredSelected) {
      toast({
        title: "Please select all required options",
        description: "Some required options are not selected",
        variant: "destructive",
      })
      return
    }

    // Format selected options for cart
    const formattedOptions = []

    // Add selected required options
    for (const option of menuItem.options) {
      if (option.required && selectedOptions[option.name]) {
        const selectedChoice = option.choices.find((choice) => choice.id === selectedOptions[option.name])
        if (selectedChoice) {
          formattedOptions.push({
            name: `${option.name}: ${selectedChoice.name}`,
            choice: selectedChoice.id,
            price: selectedChoice.price,
          })
        }
      }
    }

    // Add selected addons
    for (const option of menuItem.options) {
      if (!option.required) {
        for (const choice of option.choices) {
          if (addons.includes(choice.id)) {
            formattedOptions.push({
              name: choice.name,
              choice: choice.id,
              price: choice.price,
            })
          }
        }
      }
    }

    // Add item to cart
    addItem({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: quantity,
      image: menuItem.image,
      stallId: 0, // Since we don't have stall info in this view
      stallName: menuItem.stall,
      hawkerCenterId: 0, // Since we don't have hawker center info in this view
      hawkerCenterName: "Menu",
      waitTime: "10-15 min", // Default wait time
      prepTime: "5-10 min", // Default prep time
      options: formattedOptions,
      specialInstructions: specialInstructions || undefined,
    })

    toast({
      title: "Added to cart",
      description: `${quantity} x ${menuItem.name} added to your cart`,
    })

    // Navigate to cart
    router.push("/cart")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-3xl font-bold">{menuItem.name}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="relative rounded-lg overflow-hidden mb-4">
              <img
                src={menuItem.image || "/placeholder.svg"}
                alt={menuItem.name}
                className="w-full h-auto object-cover"
              />
              {menuItem.popular && <Badge className="absolute top-4 right-4 bg-red-500">Popular</Badge>}
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">About this dish</h3>
              <p className="text-muted-foreground">{menuItem.description}</p>
            </div>
          </div>

          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-1">{menuItem.name}</h2>
              <p className="text-muted-foreground mb-2">{menuItem.stall}</p>
              <p className="text-2xl font-bold">${menuItem.price.toFixed(2)}</p>
            </div>

            <Separator className="my-6" />

            <div className="space-y-6">
              {menuItem.options.map((option, index) => (
                <div key={index}>
                  <h3 className="font-medium mb-2">
                    {option.name}
                    {option.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>

                  {option.required ? (
                    <RadioGroup
                      value={selectedOptions[option.name] || ""}
                      onValueChange={(value) => handleOptionChange(option.name, value)}
                    >
                      {option.choices.map((choice) => (
                        <div key={choice.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={choice.id} id={choice.id} />
                            <Label htmlFor={choice.id}>{choice.name}</Label>
                          </div>
                          {choice.price > 0 && <span>+${choice.price.toFixed(2)}</span>}
                          {choice.price < 0 && <span>-${Math.abs(choice.price).toFixed(2)}</span>}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {option.choices.map((choice) => (
                        <div key={choice.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={choice.id}
                              checked={addons.includes(choice.id)}
                              onChange={() => handleAddonToggle(choice.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={choice.id}>{choice.name}</Label>
                          </div>
                          {choice.price > 0 && <span>+${choice.price.toFixed(2)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div>
                <h3 className="font-medium mb-2">Special Instructions</h3>
                <Textarea
                  placeholder="Any special requests for this item?"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Quantity</h3>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="mx-4 w-8 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => handleQuantityChange(quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl font-bold">${calculateTotalPrice().toFixed(2)}</span>
              </div>

              <Button className="w-full" size="lg" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HawkerFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

