// Decides whether the "Add your first book" prompt may render.
// It must NEVER render while the library is still loading or after a load
// error - in both cases the book list is empty-looking but the person may
// own books, and flashing "Your shelf is empty" at them would be wrong.
export function showFirstBookPrompt(state: { loading: boolean; loadError: boolean; bookCount: number }): boolean {
  return !state.loading && !state.loadError && state.bookCount === 0
}
