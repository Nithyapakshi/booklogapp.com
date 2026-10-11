const test = require("node:test")
const assert = require("node:assert")
const fs = require("fs")
const read = (p) => fs.readFileSync(p, "utf8")
test("recommendations action accepts an exclusion list for Show me more", () => {
  const s = read("app/actions/ai-recommendations.ts")
  assert.match(s, /exclude: string\[\] = \[\]/)
  assert.match(s, /Do not recommend any of these books/)
})
test("discover persists history per user and offers show-more and clear", () => {
  const s = read("app/books/page.tsx")
  assert.match(s, /booklog\.discover:\$\{discoverUser\.id\}/)
  assert.match(s, /localStorage\.setItem\(discoverKey/)
  assert.match(s, /Show me more/)
  assert.match(s, /getAIBookRecommendations\(prompt, seen\)/)
})
test("lists can be filtered by title or author, genre row is labelled", () => {
  const s = read("app/books/page.tsx")
  assert.match(s, /Filter this list by title or author/)
  assert.match(s, /Genre:/)
  assert.equal((s.match(/Filter this list by title or author\.\.\./g) || []).length, 2)
})
test("Edit details matches the other menu items, recommendations has a star", () => {
  for (const f of ["app/books/page.tsx", "components/book-card.tsx"]) {
    const s = read(f)
    assert.doesNotMatch(s, /<button[^>]*>Edit details<\/button>/)
    assert.match(s, /Edit details<\/div>/)
  }
  for (const f of ["app/books/page.tsx", "components/book-card.tsx", "components/book-card-dropdown.tsx"]) assert.match(read(f), /&#9733; Move to Recommendations/)
})
