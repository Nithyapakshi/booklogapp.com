import { safeCover } from "@/lib/shared-book"
import { isShareSource, orderSources, type ShareSource } from "@/lib/collection-share"

export type SharedCollectionItem = { source: ShareSource; title: string; author: string; cover: string; position: number }
export type SharedCollection = { display_name: string; full_library: boolean; sources: ShareSource[]; items: SharedCollectionItem[] }

export function toCollection(rows: any[] | null | undefined): SharedCollection | null {
  if (!rows?.length) return null
  const first = rows[0]
  const sources = orderSources((Array.isArray(first.sources) ? first.sources : []).filter(isShareSource))
  const items = rows.filter(r => isShareSource(r.source) && typeof r.title === "string")
    .map(r => ({ source: r.source as ShareSource, title: r.title, author: r.author || "", cover: safeCover(r.cover || ""), position: Number(r.sort_order) || 0 }))
  return { display_name: String(first.display_name || ""), full_library: !!first.full_library, sources, items }
}
