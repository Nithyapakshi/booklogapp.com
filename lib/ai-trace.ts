import 'server-only'

// Metadata-only AI tracing to Langfuse. Sends model, token counts, latency, status and estimated
// cost - NEVER prompt text, system text, book titles from the user's library, user IDs, or emails.
// Tracing must never break a recommendation: every failure is swallowed.

const MODEL = 'claude-haiku-4-5-20251001'
// Pinned provider prices (USD per token), matching lib/ai-budget.ts: $1/M input, $5/M output.
const COST_IN = 1 / 1e6
const COST_OUT = 5 / 1e6

export type TraceEvent = {
  purpose: 'ask' | 'same-spirit'
  status: 'success' | 'error'
  startTime: Date
  endTime: Date
  maxOutputTokens: number
  inputTokens?: number
  outputTokens?: number
  // Error class name only (e.g. "APIError"), never the message text.
  errorType?: string
}

export async function traceAICall(e: TraceEvent): Promise<void> {
  try {
    const host = process.env.LANGFUSE_HOST
    const pk = process.env.LANGFUSE_PUBLIC_KEY
    const sk = process.env.LANGFUSE_SECRET_KEY
    if (!host || !pk || !sk) return
    const inTok = e.inputTokens ?? 0
    const outTok = e.outputTokens ?? 0
    const est = (inTok * COST_IN + outTok * COST_OUT)
    const traceId = crypto.randomUUID()
    const genId = crypto.randomUUID()
    const ts = e.endTime.toISOString()
    const body = {
      batch: [
        {
          id: crypto.randomUUID(),
          type: 'trace-create',
          timestamp: ts,
          body: {
            id: traceId,
            name: 'booklog-ai',
            // No user/session identifiers by design.
            metadata: { purpose: e.purpose, status: e.status },
          },
        },
        {
          id: crypto.randomUUID(),
          type: 'generation-create',
          timestamp: ts,
          body: {
            id: genId,
            traceId,
            name: 'anthropic-messages-create',
            model: MODEL,
            modelParameters: { maxTokens: e.maxOutputTokens },
            startTime: e.startTime.toISOString(),
            endTime: ts,
            // Token counts only; no input or output content is ever sent.
            usage: { input: inTok, output: outTok, total: inTok + outTok, unit: 'TOKENS' },
            level: e.status === 'error' ? 'ERROR' : 'DEFAULT',
            statusMessage: e.errorType,
            metadata: { purpose: e.purpose, estimated_cost_usd: Math.round(est * 1e6) / 1e6 },
          },
        },
      ],
    }
    const send = fetch(`${host.replace(/\/+$/, '')}/api/public/ingestion`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Basic ' + Buffer.from(`${pk}:${sk}`).toString('base64'),
      },
      body: JSON.stringify(body),
    })
    // Tracing waits at most 1.5s so a slow Langfuse never delays recommendations.
    await Promise.race([send, new Promise((_, rej) => setTimeout(() => rej(new Error('trace timeout')), 1500))])
  } catch {
    // Intentionally silent.
  }
}
