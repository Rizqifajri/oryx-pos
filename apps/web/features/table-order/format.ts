/** Amounts are integer cents on the wire; the menu shows whole rupiah. */
export const formatRupiah = (cents: number) =>
  "Rp " +
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Math.round(cents / 100),
  )
// formatRupiah(7_800_000) -> "Rp 78.000"

/** "12" → "Meja 12"; names that already say Meja/Table are kept as-is. */
export const tableLabel = (name: string) =>
  /^(meja|table)\b/i.test(name.trim()) ? name.trim() : `Meja ${name.trim()}`

export const formatClock = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  )

/** Short, human order reference derived from the id. */
export const orderRef = (id: string) => `#${id.slice(-5).toUpperCase()}`
