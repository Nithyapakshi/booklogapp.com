// Marketing email consent: pure logic only (no network, no React).
// The words shown and the version sent must match public.marketing_consent_text() in
// supabase/migrations/20261123_marketing_consent.sql. The server stores its own copy of the words,
// so the browser can never change what is recorded as shown.
//
// A reader is on the marketing list only when they said yes and have not unsubscribed since.
// Nothing here may block signup, sign-in or the library.

export const CONSENT_VERSION = "v1"
export const CONSENT_LEAD = "Get book recommendations and new features by email."
export const CONSENT_REST = "Unsubscribe anytime."
export const CONSENT_TEXT = `${CONSENT_LEAD} ${CONSENT_REST}`

export type ConsentSource = "signup" | "login_prompt" | "welcome_step" | "settings"
export type PromptVariant = "login_prompt" | "welcome_step"

// What get_marketing_preference() returns.
export interface MarketingPreference { subscribed: boolean; ask: boolean }

export function parsePreference(raw: unknown): MarketingPreference | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.subscribed !== "boolean" || typeof r.ask !== "boolean") return null
  return { subscribed: r.subscribed, ask: r.ask }
}

// Signup metadata: only the choice and the version, never the words. The checkbox starts unticked,
// so an untouched box is recorded as a clear "no", never as consent.
export function signupConsentMetadata(checked: boolean): { marketing_opt_in: "true" | "false"; consent_version: string } {
  return { marketing_opt_in: checked === true ? "true" : "false", consent_version: CONSENT_VERSION }
}

// Accounts created from this instant onwards with Google get the welcome step instead of the
// login prompt (they never saw the signup form). Bump to the real go-live instant before merging.
export const WELCOME_STEP_AFTER = "2026-11-23T00:00:00Z"

export function isNewGoogleAccount(user: { created_at?: string | null; app_metadata?: { provider?: string } | null } | null | undefined): boolean {
  if (!user || user.app_metadata?.provider !== "google") return false
  const t = Date.parse(user.created_at || "")
  return Number.isFinite(t) && t >= Date.parse(WELCOME_STEP_AFTER)
}

// Which one-time card to show, if any. Never stacks on another popup: when the welcome survey
// is open, about to open, or its check has not finished, wait (it shows on a later visit).
export function promptToShow(args: {
  pref: MarketingPreference | null
  user: { created_at?: string | null; app_metadata?: { provider?: string } | null } | null | undefined
  onMyBooks: boolean
  otherPopupPending: boolean
}): PromptVariant | null {
  const { pref, user, onMyBooks, otherPopupPending } = args
  if (!pref || !pref.ask || !user || !onMyBooks || otherPopupPending) return null
  return isNewGoogleAccount(user) ? "welcome_step" : "login_prompt"
}
