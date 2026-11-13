// App routes win over the dynamic book route. Keep in sync with the SQL guard.
export const RESERVED_SHARE_SLUGS = ['feedback','actions','api','auth','books','home','privacy','profile','settings','signup','login','forgot-password','reset-password','s','u','learn-more','dashboard','test','debug','minimal','favicon-ico','robots-txt','sitemap-xml','basic-dashboard','direct-login','env-check','env-debug','file-check','schema-check','simple-dashboard','simple-test','style-test','supabase-connect-test','unsubscribe']
export function publicBookSlug(title: string, author?: string): string {
  let slug = [title,author].filter(Boolean).join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,190).replace(/-$/,'') || 'shared-book'
  // Include all static directories, including future additions, in reserved-route tests.
  if (RESERVED_SHARE_SLUGS.some(s=>slug===s || slug.startsWith(s+'-'))) slug='book-'+slug
  return slug
}
// Lossless encoding of the existing UUID, not a new identifier or shorter token.
export function shareCode(token: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) throw new Error("Invalid share token")
  const bytes = token.replace(/-/g, "").match(/../g)!.map(hex => parseInt(hex,16))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")
}
export function tokenFromShareCode(code: string): string | null {
  if (!/^[A-Za-z0-9_-]{22}$/.test(code)) return null
  try {
    const bytes=atob(code.replace(/-/g,"+").replace(/_/g,"/")+"==")
    const hex=Array.from(bytes,c=>c.charCodeAt(0).toString(16).padStart(2,"0")).join("")
    const token=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
    return shareCode(token)===code?token:null
  } catch { return null }
}
export function codedSharePath(title: string, token: string): string { return `/${publicBookSlug(title)}/${shareCode(token)}` }
export function parseCodedSave(value: string | null | undefined): {slug:string;token:string} | null {
  const m=/^\/([a-z0-9][a-z0-9-]{0,199})\/([A-Za-z0-9_-]{22})\?save=1$/.exec(value||"")
  if (!m || m[0]!==value || RESERVED_SHARE_SLUGS.some(s=>m[1]===s||m[1].startsWith(s+"-"))) return null
  const token=tokenFromShareCode(m[2]); return token?{slug:m[1],token}:null
}
