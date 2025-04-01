import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const orderData = await request.json()
    
    // Call the backend order management service
    const response = await fetch(`${process.env.BACKEND_URL}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: orderData.userId,
        email: orderData.email,
        stalls: orderData.stalls,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to create order")
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Call the backend order management service to get orders
    const response = await fetch(`${process.env.BACKEND_URL}/order/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch orders")
    }

    const orders = await response.json()
    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
} 