import { NextResponse } from "next/server"
import Stripe from "stripe"
import path from "path"
import fs from "fs"

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  stallName: string
  hawkerCenterName: string
  waitTime: number
  prepTime: number
  image: string
  options?: any[]
  specialInstructions?: string
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia"
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Received request body:", body)
    
    const { phoneNumber, token, items, specialInstructions, orderSummary } = body

    if (!phoneNumber || !token || !items || !items.length) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log("Processing order with data:", {
      phoneNumber,
      itemsCount: items.length,
      specialInstructions,
      orderSummary
    })

    // Process the payment with Stripe
    const charge = await stripe.charges.create({
      amount: Math.round(orderSummary.total * 100), // Convert to cents
      currency: "sgd",
      source: token.id,
      description: `Order for ${phoneNumber}`,
      metadata: {
        phoneNumber,
        specialInstructions: specialInstructions || "None"
      }
    })

    console.log("Stripe charge created:", charge.id)

    // Get unique stall names from items
    const uniqueStalls = [...new Set(items.map((item: OrderItem) => item.stallName))]

    // Prepare the order data to send to the backend
    const orderData = {
      userId: "user123",
      phoneNumber: phoneNumber,
      email: `${phoneNumber}@placeholder.com`,
      stalls: {
        [uniqueStalls[0] as string]: {
          dishes: items.map((item: OrderItem) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      payment: {
        createdAt: new Date().toISOString(),
        phoneNumber: phoneNumber,
        email: `${phoneNumber}@placeholder.com`,
        id: charge.id,
        items: items.map((item: OrderItem) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          stallName: item.stallName
        })),
        paymentMethod: "card",
        specialInstructions: specialInstructions || "",
        status: "succeeded",
        token: token.id,
        total: orderSummary.total
      }
    }

    // Send the order data to the Python backend
    const backendUrl = "http://localhost:5555/order"
    console.log("Sending order data to backend:", JSON.stringify(orderData, null, 2))
    
    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        console.error("Backend error response:", errorData)
        throw new Error(`Backend error: ${errorData.message || response.statusText}`)
      }

      const backendResponse = await response.json()
      console.log("Backend response:", backendResponse)

      return NextResponse.json({
        success: true,
        orderId: charge.id,
        message: "Order processed successfully",
        backendResponse
      })
    } catch (backendError) {
      console.error("Backend request failed:", backendError)
      // Still return success since payment was processed
      return NextResponse.json({
        success: true,
        orderId: charge.id,
        message: "Payment processed successfully, but order notification failed",
        error: backendError instanceof Error ? backendError.message : "Backend communication failed"
      })
    }

  } catch (error) {
    console.error("Error processing order:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to process order" 
      },
      { status: 500 }
    )
  }
} 