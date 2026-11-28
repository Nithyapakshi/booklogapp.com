// Short links: booklogapp.com/go/<slug> forwards to /home with UTM tags, so links we share look
// clean and the visit is still credited to its source (lib/signup-source.ts reads the tags on /home).
//
// To add a link: add one line below. Slugs and tags use lower case letters, digits, _ and - only.
// Forwards are temporary (307), so a tag can be changed later without browsers caching the old one.
// Any extra query on the short link (e.g. ?ref=x) is passed through by Next.js.

export const SHORT_LINKS = {
  // Dubai book club outreach, 28 Nov 2026
  safar: { source: "bookclub", medium: "outreach", campaign: "safar" },
  bookends: { source: "bookclub", medium: "outreach", campaign: "bookends" },
  downtown: { source: "bookclub", medium: "outreach", campaign: "downtown" },
  elf: { source: "bookclub", medium: "outreach", campaign: "elf" },
  bookcellar: { source: "bookclub", medium: "outreach", campaign: "bookcellar" },
}

const TAG = /^[a-z0-9_-]{1,40}$/

export function shortLinkDestination({ source, medium, campaign }) {
  return `/home?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`
}

export function shortLinkRedirects(links = SHORT_LINKS) {
  return Object.entries(links).map(([slug, tags]) => {
    for (const v of [slug, tags.source, tags.medium, tags.campaign]) {
      if (!TAG.test(v)) throw new Error(`Bad short link tag: ${v}`)
    }
    return { source: `/go/${slug}`, destination: shortLinkDestination(tags), permanent: false }
  })
}
