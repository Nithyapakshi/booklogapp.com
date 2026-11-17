// One-time BookLog reader update email (Nov 2026). Pure rendering: no network, no database.
// Three versions, one per reader, chosen by recipients.sql:
//   A: has a book on Reading   B: has books, none on Reading   C: no books yet
// Wording reviewed with Pakshiraj on 17 Nov 2026 (no founder intro, "The BookLog team", one-time footer)
// and approved for a test send to him only. The reader send itself still needs his explicit approval.

export const FROM = "BookLog <hello@booklogapp.com>"
export const CAMPAIGN = "reader_update_1"
// Resend's Acceptable Use Policy requires a valid address and company name in the email.
// Set to a real address Pakshiraj controls (e.g. a PO box) before any reader send. send.mjs refuses --send while empty.
export const POSTAL_ADDRESS = ""
const ORIGIN = "https://www.booklogapp.com"

const BLOCKED_NAMES = new Set(["user", "test", "admin", "booklog", "reader", "name", "null", "undefined"])

// A first name we can greet with, or "" for "Hello,".
export function cleanFirstName(fullName) {
  const first = String(fullName || "").trim().split(/\s+/)[0] || ""
  if (first.length < 2 || !/^[\p{L}][\p{L}'-]*$/u.test(first) || BLOCKED_NAMES.has(first.toLowerCase())) return ""
  return first === first.toLowerCase() ? first[0].toUpperCase() + first.slice(1) : first
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

export function buttonUrl(version) {
  return `${ORIGIN}/books?from=email&campaign=${CAMPAIGN}&v=${version}`
}

export function unsubscribeUrl(token) {
  return `${ORIGIN}/unsubscribe?t=${encodeURIComponent(token)}`
}

export function unsubscribeHeaders(token) {
  return {
    "List-Unsubscribe": `<${ORIGIN}/api/unsubscribe?t=${encodeURIComponent(token)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}

const FEATURES = {
  recommend: ["Recommend books.", "Discover suggests books based on your library, and Ask AI finds books on any subject."],
  next: ["Choose your next read.", "Pick one book from your queue, or let BookLog show you one at a time."],
  stats: ["Show your stats.", "Books finished, top genres, and your reading by month and year."],
  goodreads: ["Import from Goodreads.", "Bring in your full history, with ratings and dates."],
  dates: ["Track reading dates.", "Record when you started and finished each book."],
}
const FEATURE_ORDER = {
  A: ["recommend", "next", "stats", "goodreads", "dates"],
  B: ["recommend", "next", "stats", "goodreads", "dates"],
  C: ["goodreads", "recommend", "next", "dates"],
}

// r: { version, name, title, author, book_count, token }
export function render(r) {
  const v = r.version
  if (!["A", "B", "C"].includes(v)) throw new Error(`Unknown version ${v}`)
  if (!r.token) throw new Error("Missing unsubscribe token")
  if (v === "A" && !(r.title && r.title.trim())) throw new Error("Version A needs a book title")
  const first = cleanFirstName(r.name)
  const greeting = first ? `Hello ${first},` : "Hello,"
  const author = r.author && r.author.trim() ? r.author.trim() : ""
  const title = (r.title || "").trim()
  const n = Number(r.book_count) || 0

  let subject, lead, button
  if (v === "A") {
    subject = `Are you still reading ${title}?`
    lead = [
      { html: `Your BookLog shelf shows you are reading <b>${esc(title)}</b>${author ? ` by ${esc(author)}` : ""}. Are you still reading it?`,
        text: `Your BookLog shelf shows you are reading ${title}${author ? ` by ${author}` : ""}. Are you still reading it?` },
      { html: "Finished it? Mark it as finished and rate it. Moved on? Put it On Hold.",
        text: "Finished it? Mark it as finished and rate it. Moved on? Put it On Hold." },
    ]
    button = "Update my reading"
  } else if (v === "B") {
    subject = "What are you reading now?"
    const line = n === 1
      ? "You have 1 book on your BookLog shelf, and it is not marked as Reading. What are you reading now?"
      : `You have ${n} books on your BookLog shelf, and none marked as Reading. What are you reading now?`
    lead = [{ html: esc(line), text: line }]
    button = "Add my current book"
  } else {
    subject = "Three books to start your BookLog library"
    lead = [
      { html: "Your BookLog library is empty. Three books to start with: <b>Project Hail Mary</b> by Andy Weir, <b>Atomic Habits</b> by James Clear, and <b>The Midnight Library</b> by Matt Haig.",
        text: "Your BookLog library is empty. Three books to start with: Project Hail Mary by Andy Weir, Atomic Habits by James Clear, and The Midnight Library by Matt Haig." },
      { html: "Add the one you want to read first.", text: "Add the one you want to read first." },
    ]
    button = "Start my library"
  }

  const features = FEATURE_ORDER[v].map(k => FEATURES[k])
  const url = buttonUrl(v)
  const unsub = unsubscribeUrl(r.token)
  const p = "margin:0 0 16px;"

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf7f2;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1208;">
<p style="font-family:Georgia,serif;font-size:20px;color:#c17f3e;margin:0 0 24px;">BookLog</p>
<p style="${p}">${esc(greeting)}</p>
${lead.map(l => `<p style="${p}">${l.html}</p>`).join("\n")}
<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#c17f3e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">${esc(button)}</a></p>
<p style="margin:0 0 8px;">BookLog can also:</p>
<ul style="margin:0 0 16px;padding-left:20px;">
${features.map(([h, t]) => `<li style="margin:0 0 6px;"><b>${h}</b> ${t}</li>`).join("\n")}
</ul>
<p style="${p}">Thanks,<br>The BookLog team</p>
<p style="margin:32px 0 0;font-size:12px;color:#8a7560;">This is a one-time update for BookLog members. <a href="${unsub}" style="color:#8a7560;">Unsubscribe</a></p>
${POSTAL_ADDRESS ? `<p style="margin:8px 0 0;font-size:12px;color:#8a7560;">BookLog, ${esc(POSTAL_ADDRESS)}</p>` : ""}
</div></body></html>`

  const text = [
    greeting, "",
    ...lead.flatMap(l => [l.text, ""]),
    `${button}: ${url}`, "",
    "BookLog can also:",
    ...features.map(([h, t]) => `- ${h} ${t}`), "",
    "Thanks,", "The BookLog team", "",
    `This is a one-time update for BookLog members. Unsubscribe: ${unsub}`,
    ...(POSTAL_ADDRESS ? [`BookLog, ${POSTAL_ADDRESS}`] : []),
  ].join("\n")

  return { subject, html, text, headers: unsubscribeHeaders(r.token) }
}
