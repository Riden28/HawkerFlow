"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useMemo } from "react"

// Define types for our cart items
export type CartItem = {
  id: number
  name: string
  price: number
  quantity: number
  image: string
  stallId: number
  stallName: string
  hawkerCenterId: number
  hawkerCenterName: string
  waitTime: string
  prepTime: string
  options?: {
    name: string
    choice: string
    price: number
  }[]
  specialInstructions?: string
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getSubtotal: () => number
  getMaxWaitTime: () => { minutes: number; stallName: string }
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  // Initialize cart from localStorage if available
  const [items, setItems] = useState<CartItem[]>([])

  // Load cart from localStorage on initial render
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart")
      if (savedCart) {
        setItems(JSON.parse(savedCart))
      }
    } catch (e) {
      console.error("Failed to parse cart from localStorage", e)
      // Don't set the error directly in state or render it
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(items))
    } catch (e) {
      console.error("Failed to save cart to localStorage", e)
      // Don't set the error directly in state or render it
    }
  }, [items])

  const addItem = (newItem: CartItem) => {
    try {
      setItems((prevItems) => {
        // Check if item already exists in cart
        const existingItemIndex = prevItems.findIndex(
          (item) => item.id === newItem.id && JSON.stringify(item.options) === JSON.stringify(newItem.options),
        )

        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          const updatedItems = [...prevItems]
          updatedItems[existingItemIndex].quantity += newItem.quantity
          return updatedItems
        } else {
          // Add new item
          return [...prevItems, newItem]
        }
      })
    } catch (e) {
      console.error("Failed to add item to cart", e)
      // Don't set the error directly in state or render it
      throw new Error("Failed to add item to cart")
    }
  }

  const removeItem = (id: number) => {
    try {
      setItems((prevItems) => prevItems.filter((item) => item.id !== id))
    } catch (e) {
      console.error("Failed to remove item from cart", e)
      // Don't set the error directly in state or render it
    }
  }

  const updateQuantity = (id: number, quantity: number) => {
    try {
      if (quantity < 1) return

      setItems((prevItems) => prevItems.map((item) => (item.id === id ? { ...item, quantity } : item)))
    } catch (e) {
      console.error("Failed to update item quantity", e)
      // Don't set the error directly in state or render it
    }
  }

  const clearCart = () => {
    try {
      setItems([])
    } catch (e) {
      console.error("Failed to clear cart", e)
      // Don't set the error directly in state or render it
    }
  }

  const getTotalItems = () => {
    try {
      return items.reduce((total, item) => total + item.quantity, 0)
    } catch (e) {
      console.error("Failed to calculate total items", e)
      return 0
    }
  }

  const getSubtotal = () => {
    try {
      return items.reduce((total, item) => {
        const itemTotal = item.price * item.quantity
        const optionsTotal = item.options?.reduce((sum, option) => sum + option.price, 0) || 0
        return total + (itemTotal + optionsTotal * item.quantity)
      }, 0)
    } catch (e) {
      console.error("Failed to calculate subtotal", e)
      return 0
    }
  }

  // Calculate the maximum wait time from all items in cart
  const getMaxWaitTime = () => {
    try {
      if (items.length === 0) {
        return {
          minutes: 0,
          stallName: "",
        }
      }

      let maxMinutes = 0
      let maxStallName = ""

      items.forEach((item) => {
        // Safely handle wait time and prep time parsing
        try {
          const queueRange = item.waitTime.split("-")
          const prepRange = item.prepTime.split("-")

          const maxQueueTime = Number.parseInt(queueRange[1] || queueRange[0] || "0")
          const maxPrepTime = Number.parseInt(prepRange[1] || prepRange[0] || "0")

          const totalTime = maxQueueTime + maxPrepTime

          if (totalTime > maxMinutes) {
            maxMinutes = totalTime
            maxStallName = item.stallName
          }
        } catch (parseError) {
          console.error("Error parsing time for item", item.name, parseError)
          // Skip this item if there's a parsing error
        }
      })

      return {
        minutes: maxMinutes,
        stallName: maxStallName,
      }
    } catch (e) {
      console.error("Failed to calculate max wait time", e)
      return {
        minutes: 0,
        stallName: "",
      }
    }
  }

  // Use useMemo to avoid recalculating these values on every render
  const memoizedValue = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getTotalItems,
      getSubtotal,
      getMaxWaitTime,
    }),
    [items],
  )

  return <CartContext.Provider value={memoizedValue}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

