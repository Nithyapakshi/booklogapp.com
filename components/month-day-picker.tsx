"use client"

import { MONTH_NAMES, daysInMonth, isValidDate, type DatePrecision } from "@/lib/reading-dates"

export type PickedDate = { value: string; precision: DatePrecision }

// A month and year picker. "Add the day" reveals a day field; without it the date is month-only and never claims a day.
export function MonthDayPicker({ label, value, precision, onChange, disabled }: {
  label: string
  value: string
  precision: DatePrecision
  onChange: (next: PickedDate) => void
  disabled?: boolean
}) {
  const now = new Date()
  const thisYear = now.getFullYear()
  const parts = isValidDate(value) ? value.split("-").map(Number) : null
  const year = parts ? parts[0] : 0
  const month = parts ? parts[1] : 0
  const day = parts ? parts[2] : 0
  const pad = (n: number) => String(n).padStart(2, "0")
  const emit = (y: number, m: number, d: number, p: DatePrecision) => {
    if (!y || !m) { onChange({ value: "", precision: "day" }); return }
    const dd = p === "day" ? Math.min(d || 1, daysInMonth(y, m)) : 1
    onChange({ value: `${y}-${pad(m)}-${pad(dd)}`, precision: p })
  }
  const years: number[] = []
  for (let y = thisYear; y >= thisYear - 80; y--) years.push(y)
  const cls = "border rounded px-2 py-1 bg-background text-foreground"
  return <fieldset className="space-y-1">
    <legend className="text-sm">{label}</legend>
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label={`${label} month`} className={cls} disabled={disabled} value={month || ""} onChange={(e) => emit(year || thisYear, Number(e.target.value), day, parts ? precision : "month")}>
        <option value="">Month</option>
        {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
      </select>
      <select aria-label={`${label} year`} className={cls} disabled={disabled} value={year || ""} onChange={(e) => emit(Number(e.target.value), month || 1, day, parts ? precision : "month")}>
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      {parts && precision === "day" && <select aria-label={`${label} day`} className={cls} disabled={disabled} value={day} onChange={(e) => emit(year, month, Number(e.target.value), "day")}>
        {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
      </select>}
    </div>
    {parts && <div className="flex gap-3 text-xs">
      {precision === "month"
        ? <button type="button" disabled={disabled} className="underline" onClick={() => emit(year, month, 1, "day")}>Add the day</button>
        : <button type="button" disabled={disabled} className="underline" onClick={() => emit(year, month, day, "month")}>Month only</button>}
      <button type="button" disabled={disabled} className="underline" onClick={() => onChange({ value: "", precision: "day" })}>Clear</button>
    </div>}
  </fieldset>
}
