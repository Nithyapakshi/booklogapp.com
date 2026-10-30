// Questions and answers shown in the homepage FAQ (app/home/home-sections.tsx),
// repeated here only for the FAQPage structured data on /home.
// tests/home-structured-data.test.cjs checks every part still appears verbatim in the FAQ,
// so the structured data cannot drift from what visitors actually see.
export const HOME_FAQ: ReadonlyArray<{ question: string; answerParts: readonly string[] }> = [
  { question: "What is BookLog?", answerParts: ["BookLog (booklogapp.com) is a free web app for keeping a reading log. Track what you want to read, are reading and have finished, keep ratings and notes, share a shelf of recommendations with friends, and get book recommendations based on your library and your reading mood."] },
  { question: "What can I keep in my reading log?", answerParts: ["Books you want to read, are reading, or have finished. Keep your ratings and notes alongside them."] },
  { question: "Do I have to share my library?", answerParts: ["No. Profile sharing is optional. If you turn it on in Settings, choose whether visitors see only your recommendations or your full library."] },
  { question: "How do I create an account?", answerParts: ["Sign up with Google or use your email and a password. If you're asked to confirm your email, follow the link in your inbox to finish."] },
  { question: "Is BookLog free or paid?", answerParts: ["BookLog is currently free to use. You can create an account without entering payment details."] },
  { question: "What stays private when I share?", answerParts: ["Your personal notes are not included in shared profiles or book links.", "Single-book links are separate from your profile. Anyone with the link can view it, even if your profile is private. These links do not expire and currently have no Stop sharing control.", "Read the privacy notice", " for details."] },
  { question: "What happens when I ask AI for ideas?", answerParts: ["Your request is sent to Anthropic to generate recommendations. Your personal book notes are not sent with it. Avoid including sensitive personal information in your request."] },
  { question: "Can I take my reading log with me?", answerParts: ["Yes. Download your library as a CSV from Settings, including book details, lists, dates, ratings and your notes."] },
]

export function faqAnswerText(parts: readonly string[]): string {
  return parts.join(" ").replace(/\s+/g, " ").trim()
}
