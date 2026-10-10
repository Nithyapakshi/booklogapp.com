import { NextResponse } from "next/server"

// Obsolete diagnostic endpoint. It is not a reliable production health check.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
