#!/usr/bin/env node
// One-time BookLog reader update email, sent through Resend from BookLog <hello@booklogapp.com>.
// Needs RESEND_API_KEY in the environment. Never commit the key or the recipients file.
//
//   1. Test: the three versions to one address only (unsubscribe link is a dummy).
//        RESEND_API_KEY=... node scripts/reader-update/send.mjs --test you@example.com
//   2. Dry run: render every reader's email from the CSV, send nothing, print counts.
//        node scripts/reader-update/send.mjs --dry-run --recipients recipients.csv
//   3. Send: only with Pakshiraj's approval. --confirm must equal the number of readers.
//        RESEND_API_KEY=... node scripts/reader-update/send.mjs --send --recipients recipients.csv --confirm 93
//
// Each reader gets at most one email: a Resend idempotency key per account, and a local log of
// accounts already sent (sent-reader_update_1.csv) that a re-run skips.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { render, cleanFirstName, FROM, CAMPAIGN, POSTAL_ADDRESS } from "./render.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const SENT_LOG = path.join(here, `sent-${CAMPAIGN}.csv`)
const DUMMY_TOKEN = "00000000-0000-4000-8000-000000000000"

export function parseCsv(text) {
  const rows = []
  let row = [], field = "", quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field); field = ""
      if (row.some(f => f !== "")) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some(f => f !== "")) rows.push(row)
  const [head, ...body] = rows
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ""])))
}

function args() {
  const a = process.argv.slice(2), o = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--test") o.test = a[++i]
    else if (a[i] === "--recipients") o.recipients = a[++i]
    else if (a[i] === "--dry-run") o.dryRun = true
    else if (a[i] === "--send") o.send = true
    else if (a[i] === "--confirm") o.confirm = Number(a[++i])
    else throw new Error(`Unknown option ${a[i]}`)
  }
  return o
}

async function sendOne(to, mail, idempotencyKey) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject: mail.subject, html: mail.html, text: mail.text, headers: mail.headers }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message || JSON.stringify(body)}`)
  return body.id
}

const pause = ms => new Promise(r => setTimeout(r, ms))

function loadRecipients(file) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"))
  const seen = new Set()
  for (const r of rows) {
    if (!r.user_id || !r.email || !r.token) throw new Error("Each row needs user_id, email and token")
    if (seen.has(r.user_id)) throw new Error("Duplicate account in recipients file")
    seen.add(r.user_id)
    render(r) // fail before sending anything if any row cannot be rendered
  }
  return rows
}

async function main() {
  const o = args()
  const needKey = o.test || o.send
  if (needKey && !process.env.RESEND_API_KEY) throw new Error("Set RESEND_API_KEY")

  if (o.test) {
    const samples = [
      { version: "A", name: "Pakshiraj Ananthan", title: "The Immortal Life of Henrietta Lacks", author: "Rebecca Skloot", book_count: 89 },
      { version: "B", name: "pakshiraj", book_count: 12 },
      { version: "C", name: "", book_count: 0 },
    ]
    for (const s of samples) {
      const mail = render({ ...s, token: DUMMY_TOKEN })
      mail.subject = `[TEST ${s.version}] ${mail.subject}`
      const id = await sendOne(o.test, mail, `${CAMPAIGN}/test/${s.version}/${Date.now()}`)
      console.log(`Test ${s.version} sent (${id})`)
      await pause(600)
    }
    return
  }

  if (!o.recipients) throw new Error("Pass --recipients <csv>")
  const rows = loadRecipients(o.recipients)
  const byVersion = rows.reduce((m, r) => ({ ...m, [r.version]: (m[r.version] || 0) + 1 }), {})
  const named = rows.filter(r => cleanFirstName(r.name)).length
  console.log(`Readers: ${rows.length}  A: ${byVersion.A || 0}  B: ${byVersion.B || 0}  C: ${byVersion.C || 0}  greeted by name: ${named}`)

  if (o.dryRun) {
    const out = path.join(here, "preview")
    fs.mkdirSync(out, { recursive: true })
    for (const v of ["A", "B", "C"]) {
      const r = rows.find(x => x.version === v)
      if (r) fs.writeFileSync(path.join(out, `version-${v}.html`), render(r).html)
    }
    console.log(`Dry run only. One preview per version written to ${out}. Nothing sent.`)
    return
  }

  if (!o.send) throw new Error("Choose --test, --dry-run or --send")
  if (!POSTAL_ADDRESS.trim()) console.log("Note: no postal address in the footer (owner decision for this one-time send).")
  if (o.confirm !== rows.length) throw new Error(`--confirm must equal the number of readers (${rows.length})`)

  const done = new Set(fs.existsSync(SENT_LOG) ? fs.readFileSync(SENT_LOG, "utf8").split("\n").map(l => l.split(",")[0]).filter(Boolean) : [])
  let sent = 0, skipped = 0, failed = 0
  for (const r of rows) {
    if (done.has(r.user_id)) { skipped++; continue }
    try {
      const id = await sendOne(r.email, render(r), `${CAMPAIGN}/${r.user_id}`)
      fs.appendFileSync(SENT_LOG, `${r.user_id},${r.version},${id},${new Date().toISOString()}\n`)
      sent++
    } catch (e) {
      failed++
      console.error(`Failed for account ${r.user_id}: ${e.message}`)
    }
    await pause(600)
  }
  console.log(`Sent: ${sent}  Already sent, skipped: ${skipped}  Failed: ${failed}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1) })
}
