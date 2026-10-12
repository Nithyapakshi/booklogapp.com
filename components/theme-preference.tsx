"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

export function ThemePreference() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <section className="mb-5" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h2>
      <div className="rounded-[10px] border bg-card p-5 text-card-foreground">
        <p className="mb-3 text-sm">Theme</p>
        <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
          {["light", "dark", "system"].map(value => (
            <button key={value} type="button" disabled={!mounted} aria-pressed={mounted && theme === value}
              onClick={() => setTheme(value)}
              className={`min-h-11 rounded-md border px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${mounted && theme === value ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-card-foreground hover:bg-accent"}`}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">System follows your device. This choice is saved in this browser.</p>
      </div>
    </section>
  )
}
