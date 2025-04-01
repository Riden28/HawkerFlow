import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { amount, token } = await request.json()

    // Call the backend payment service
    const response = await fetch(`${process.env.BACKEND_URL}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentAmount: amount,
        token: token,
      }),
    })

    if (!response.ok) {
      throw new Error("Payment failed")
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json(
      { error: "Payment failed" },
      { status: 500 }
    )
  }
} 
