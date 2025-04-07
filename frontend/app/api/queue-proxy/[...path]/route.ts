import { NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    context: { params: { path: string[] } }
) {
    const joinedPath = context.params.path.join("/")
    // IMPORTANT: No extra “hawkerCenters” in the final URL
    const targetUrl = `http://127.0.0.1:5000/${joinedPath}`

    console.log("Proxying GET to:", targetUrl)
    try {
        const response = await fetch(targetUrl)
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error) {
        console.error("❌ Queue Proxy GET error:", error)
        return NextResponse.json(
            { error: "Failed to fetch from backend" },
            { status: 500 }
        )
    }
}
