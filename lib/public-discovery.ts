// Only the two public product-information pages belong in discovery feeds.
// robots.txt is crawl guidance, not authorization or a substitute for access controls.
export const PUBLIC_ORIGIN = "https://www.booklogapp.com"
export const HOME_TITLE = "BookLog | Book Tracker & Reading Log"
export const HOME_DESCRIPTION = "A simple book tracker and reading log."
export const PUBLIC_DISCOVERY_PATHS = ["/home", "/privacy"] as const
