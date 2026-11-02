# Interim title and code shared-book route

New shares use /book-title/unique-code. The code is a canonical reversible base64url encoding of the existing UUID's 16 bytes, preserving all existing token entropy. It is not a username or a new stored identifier. The resolved snapshot title must match the slug; otherwise the page returns not found. Existing /s/UUID links remain unchanged.

No database migration, new permission, profile rewrite, username publication or retention change is needed. Uses existing book_shares insertion and exact-token read_book_share only. Sender display name and this book's public snapshot are shared, never notes, rating or library.

Preserves approved cover and OG metadata, minimal landing, shared Add Book description UI, signup context and exact auth-return path, locked Save and duplicate safety. No analytics or policy publishing.

Local tests do not replace real preview verification. Code publication remains blocked by filename-changing browser uploads and unavailable authenticated git push. No feature code deployed. Before release: publish exact reviewed files through supported path-preserving capability, verify protected preview points to avxpsxtbtqlfyeglgkom, test real Google summary and synthetic email/Google auth callbacks, and check legacy links/member/nonmember flows. Production requires separate approval. No SQL application is part of this interim scope.
