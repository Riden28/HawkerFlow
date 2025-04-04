import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const hawker = req.nextUrl.searchParams.get("hawker")
  const stall = req.nextUrl.searchParams.get("stall")

  if (!hawker || !stall) {
    return new Response(JSON.stringify({ error: "Missing hawker or stall" }), {
      status: 400,
    })
  }

  const url = `http://localhost:5000/${encodeURIComponent(hawker)}/${encodeURIComponent(stall)}/waitTime`

  try {
    const res = await fetch(url)
    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(`❌ Proxy failed for ${stall}`, err)
    return new Response(JSON.stringify({ waitTime: -1 }), { status: 500 })
  }
}
