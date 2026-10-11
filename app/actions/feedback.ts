"use server"

import { createClient } from "@supabase/supabase-js"

export type FeedbackResult = { ok: true } | { ok: false; error: string }

const MAX_PER_HOUR = 5

export async function submitFeedback(input: {
  message: string
  replyTo: string
  accessToken: string
}): Promise<FeedbackResult> {
  const message = (input.message || "").trim()
  const replyTo = (input.replyTo || "").trim()
  if (!message) return { ok: false, error: "Please write a message." }
  if (message.length > 4000) return { ok: false, error: "Message is too long (4000 characters max)." }
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) return { ok: false, error: "That reply-to email doesn't look right." }
  if (!input.accessToken) return { ok: false, error: "Please log in again." }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  const supabase = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${input.accessToken}` } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser(input.accessToken)
  const user = userData?.user
  if (userErr || !user) return { ok: false, error: "Please log in again." }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since)
  if ((count ?? 0) >= MAX_PER_HOUR) return { ok: false, error: "That's a lot of feedback for one hour. Please try again later." }

  const { data: profile } = await supabase.from("profiles").select("name, username").eq("user_id", user.id).single()
  const userName = profile?.name || profile?.username || (user.email || "").split("@")[0] || "A BookLog user"

  const { error: insertErr } = await supabase.from("feedback").insert({
    user_id: user.id,
    message,
    reply_to: replyTo || null,
    user_name: userName,
  })
  if (insertErr) {
    console.error("feedback insert failed", insertErr.message)
    return { ok: false, error: "Could not send your feedback. Please try again." }
  }

  // Email is best effort. The row above is the record.
  const resendKey = process.env.RESEND_API_KEY
  const to = process.env.FEEDBACK_TO_EMAIL || "pakshiraj.ananthan@gmail.com"
  if (resendKey && to) {
    try {
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "BookLog Feedback <onboarding@resend.dev>",
          to: [to],
          reply_to: replyTo || user.email || undefined,
          subject: `BookLog feedback from ${userName}`,
          html: `<p>From <b>${esc(userName)}</b> (${esc(replyTo || user.email || "no email")})</p><p style="white-space:pre-wrap">${esc(message)}</p>`,
          text: `From ${userName} (${replyTo || user.email || "no email"})\n\n${message}`,
        }),
      })
      if (!res.ok) console.error("feedback email failed", res.status)
    } catch (e) {
      console.error("feedback email error", e)
    }
  }
  return { ok: true }
}
