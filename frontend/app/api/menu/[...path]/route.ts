import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  const { path } = context.params

  const joinedPath = path.map(decodeURIComponent).join("/") // <--- decode once only

  const targetUrl = `http://localhost:5001/menu/${joinedPath}`
  console.log("👉 Calling:", targetUrl)

  try {
    const response = await fetch(targetUrl)
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("❌ Proxy error:", error)
    return NextResponse.json({ error: "Failed to fetch from backend" }, { status: 500 })
  }
}

