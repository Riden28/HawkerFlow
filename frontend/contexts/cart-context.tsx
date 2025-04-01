"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

// Define types for our cart items
interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  stallName: string
  hawkerCenterName: string
  waitTime: string
  prepTime: string
  image?: string
  options?: Array<{
    name: string
    price: number
    choice: string
  }>
  specialInstructions?: string
}

interface CartContextType {
  cart: {
    items: CartItem[]
  }
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getSubtotal: () => number
  getMaxWaitTime: () => { minutes: number }
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<{ items: CartItem[] }>({ items: [] })

  // Load cart from localStorage on initial render
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart")
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        setCart({ items: parsedCart.items || [] })
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage", e)
      setCart({ items: [] })
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart))
    } catch (e) {
      console.error("Failed to save cart to localStorage", e)
    }
  }, [cart])

  const addItem = (item: CartItem) => {
    setCart((prevCart) => {
      // Create a unique key for the item based on its ID and options
      const getItemKey = (cartItem: CartItem) => {
        const optionsKey = cartItem.options
          ? cartItem.options
              .map(opt => `${opt.name}:${opt.choice}:${opt.price}`)
              .sort()
              .join('|')
          : '';
        return `${cartItem.id}-${optionsKey}-${cartItem.specialInstructions || ''}`;
      };

      const itemKey = getItemKey(item);
      const existingItem = prevCart.items.find((i) => getItemKey(i) === itemKey);

      if (existingItem) {
        return {
          items: prevCart.items.map((i) =>
            getItemKey(i) === itemKey ? { ...i, quantity: i.quantity + item.quantity } : i
          ),
        }
      }
      return {
        items: [...prevCart.items, { ...item }],
      }
    })
  }

  const removeItem = (itemId: string) => {
    setCart((prevCart) => ({
      items: prevCart.items.filter((item) => item.id !== itemId),
    }))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(itemId)
      return
    }
    setCart((prevCart) => ({
      items: prevCart.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }))
  }

  const clearCart = () => {
    setCart({ items: [] })
  }

  const getTotalItems = () => {
    return cart.items.reduce((total, item) => total + item.quantity, 0)
  }

  const getSubtotal = () => {
    return cart.items.reduce((total, item) => {
      const itemTotal = item.price * item.quantity
      const optionsTotal = item.options?.reduce((sum, option) => sum + option.price, 0) || 0
      return total + (itemTotal + optionsTotal * item.quantity)
    }, 0)
  }

  const getMaxWaitTime = () => {
    if (cart.items.length === 0) {
      return { minutes: 0 }
    }

    let maxMinutes = 0
    let maxStallName = ""

    cart.items.forEach((item) => {
      // Parse wait time and prep time
      const waitMinutes = parseInt(item.waitTime) || 0
      const prepMinutes = parseInt(item.prepTime) || 0
      const totalMinutes = waitMinutes + prepMinutes

      if (totalMinutes > maxMinutes) {
        maxMinutes = totalMinutes
        maxStallName = item.stallName
      }
    })

    return { minutes: maxMinutes }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getSubtotal,
        getMaxWaitTime,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

