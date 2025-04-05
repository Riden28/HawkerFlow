import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  // Await params if they are a Promise
  const resolvedParams = context.params instanceof Promise ? await context.params : context.params
  const joinedPath = resolvedParams.path.join("/")
  // Update the target URL to use the correct backend port (5003 instead of 5555)
  const targetUrl = `http://localhost:5003/${joinedPath}`
  console.log(`📦 Proxying GET to: ${targetUrl}`)

  try {
    const response = await fetch(targetUrl)
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("❌ Proxy GET error:", error)
    return NextResponse.json({ error: "Failed to fetch from backend" }, { status: 500 })
  }
}
