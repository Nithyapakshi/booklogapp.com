// Both private tables have independent owner filters. Start them together rather
// than making every login pay for two network round trips in series.
export async function readLibrary(client: any, userId: string) {
  const [bookResult, noteResult] = await Promise.all([
    client.from("books").select("*").eq("user_id", userId),
    client.from("book_notes").select("book_id,notes").eq("user_id", userId),
  ])
  if (bookResult.error || noteResult.error || !bookResult.data) {
    throw bookResult.error || noteResult.error || new Error("Library response is missing")
  }
  return { rows: bookResult.data, noteRows: noteResult.data || [] }
}
