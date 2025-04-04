import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  const { path } = context.params
  const joinedPath = path.join("/")
  const targetUrl = `http://localhost:5555/${joinedPath}`

  console.log("📦 Proxying GET to:", targetUrl)

  try {
    const response = await fetch(targetUrl)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("❌ Proxy GET error:", error)
    return NextResponse.json({ error: "Failed to fetch from backend" }, { status: 500 })
  }
}
