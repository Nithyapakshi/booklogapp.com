// The country of the request that reached BookLog, as a two-letter code (Vercel's x-vercel-ip-country
// header). Called by the reader's own browser (lib/usage.ts visitorCountry). Returns the code only;
// nothing is stored or logged here, and no IP address is read or kept.
export const dynamic = "force-dynamic"

export function GET(request: Request) {
  const raw = (request.headers.get("x-vercel-ip-country") || "").trim().toUpperCase()
  const country = /^[A-Z]{2}$/.test(raw) && raw !== "XX" ? raw : null
  return Response.json({ country }, { headers: { "Cache-Control": "no-store" } })
}
