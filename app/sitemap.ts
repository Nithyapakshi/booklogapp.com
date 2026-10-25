import type { MetadataRoute } from "next"
import { PUBLIC_ORIGIN, PUBLIC_DISCOVERY_PATHS } from "@/lib/public-discovery"

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_DISCOVERY_PATHS.map(path => ({ url: `${PUBLIC_ORIGIN}${path}` }))
}
