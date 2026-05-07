const AMAZON_DOMAINS: Record<string, string> = {
  US: "amazon.com",
  GB: "amazon.co.uk",
  AE: "amazon.ae",
  IN: "amazon.in",
  DE: "amazon.de",
  FR: "amazon.fr",
  JP: "amazon.co.jp",
  CA: "amazon.ca",
  AU: "amazon.com.au",
  IT: "amazon.it",
  ES: "amazon.es",
  MX: "amazon.com.mx",
  BR: "amazon.com.br",
  NL: "amazon.nl",
  SG: "amazon.sg",
  SA: "amazon.sa",
  SE: "amazon.se",
  PL: "amazon.pl",
  TR: "amazon.com.tr",
  EG: "amazon.eg",
}

const DEFAULT_DOMAIN = "amazon.com"

let resolvedDomain: string = DEFAULT_DOMAIN
let prefetchDone: boolean = false

export function prefetchAmazonDomain(): void {
  if (prefetchDone) return
  prefetchDone = true
  fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
    .then((res) => res.json())
    .then((data) => {
      const code = data?.country_code as string | undefined
      if (code && AMAZON_DOMAINS[code]) {
        resolvedDomain = AMAZON_DOMAINS[code]
      }
    })
    .catch(() => {
      // silent — stays on DEFAULT_DOMAIN
    })
}

export function getAmazonSearchUrl(title: string, author: string): string {
  const query = encodeURIComponent(`${title} ${author}`)
  return `https://www.${resolvedDomain}/s?k=${query}`
}
