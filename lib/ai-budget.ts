import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { traceAICall } from './ai-trace'

// Draft server wrapper. All paid entry points must use this before enablement.
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_INPUT = 4096
export type Purpose = 'ask' | 'same-spirit'

export async function aiRpc(op: string, args: object) {
  const secret = process.env.BOOKLOG_AI_RPC_SECRET
  if (!secret) throw new Error('AI budget setup is incomplete')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const {data,error} = await db.rpc('booklog_ai_op', {p_secret: secret,p_op:op,p_args:args})
  if (error) throw new Error('AI budget operation failed')
  return data
}

export async function authenticatedClient(accessToken: string) {
  if (!accessToken || accessToken.length > 10000) throw new Error('Please log in again')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: {persistSession:false}, global: {headers: {Authorization: `Bearer ${accessToken}`}} })
  const {data,error} = await db.auth.getUser(accessToken)
  if (error || !data.user) throw new Error('Please log in again')
  return {db,userId:data.user.id}
}

export async function budgetedMessage(input: {accessToken:string,purpose:Purpose,system:string,prompt:string,claimId?:string,cacheKeys?:string[]}) {
  const {userId} = await authenticatedClient(input.accessToken)
  // Length bound is only a preliminary guard. Provider counting sets the exact token budget.
  if (input.system.length + input.prompt.length > 16000) throw new Error('Please shorten this request')
  const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY, maxRetries:0, timeout:35000})
  const messages: Anthropic.MessageParam[] = [{role:'user',content:input.prompt}]
  const counted = await client.messages.countTokens({model:MODEL,system:input.system,messages},{timeout:8000})
  if (counted.input_tokens < 1 || counted.input_tokens > MAX_INPUT) throw new Error('Please shorten this request')
  const id = input.claimId || randomUUID()
  const outputLimit = input.purpose === 'ask' ? 2048 : 4096
  const reserved = await aiRpc('reserve', {id,user_id:userId,purpose:input.purpose,input_tokens:counted.input_tokens,output_limit:outputLimit,cache_keys:input.cacheKeys || []})
  if (!reserved?.ok) throw new Error('Recommendations are not available right now')
  // No automatic retries. Failed/unknown calls retain the full DB reservation.
  const callStart = new Date()
  let result
  try {
    result = await client.messages.create({model:MODEL,max_tokens:outputLimit,system:input.system,messages})
  } catch (err) {
    // Metadata-only trace: status and error class name, never the error text.
    await traceAICall({purpose: input.purpose, status: 'error', startTime: callStart, endTime: new Date(), maxOutputTokens: outputLimit, errorType: err instanceof Error ? err.constructor.name : 'Error'})
    throw err
  }
  // Metadata-only trace: model, token counts, latency, estimated cost. No prompt or user data.
  await traceAICall({purpose: input.purpose, status: 'success', startTime: callStart, endTime: new Date(), maxOutputTokens: outputLimit, inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens})
  try {
    const settled = await aiRpc('settle', {id,input_tokens:result.usage.input_tokens,output_tokens:result.usage.output_tokens})
    if (!settled?.ok) throw new Error('AI usage exceeded reservation')
  } catch {
    // Settlement failure is conservative: the original reservation remains charged.
    console.error('AI budget settlement failed')
  }
  return result
}
