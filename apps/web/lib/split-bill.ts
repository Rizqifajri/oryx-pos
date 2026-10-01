/**
 * Split-bill helpers shared by the guest bill page and the staff Settle
 * dialog. Previews mirror the server's math (apps/api …/split.service.ts); the
 * server recomputes and stays authoritative. Amounts are integer cents.
 */

export type SplitMode = "equal" | "items" | "custom"

export type SplitPayload =
  | { mode: "equal"; count: number }
  | { mode: "items"; shares: { label?: string; items: { orderItemId: string; quantity: number }[] }[] }
  | { mode: "custom"; shares: { label?: string; amount: number }[] }

export type SplitItem = { id: string; name: string; quantity: number; price: number }

/** Unit-level assignment for "by items": `${orderItemId}#${n}` → share index. */
export type UnitAssignment = Record<string, number>

export const unitKey = (orderItemId: string, n: number) => `${orderItemId}#${n}`

/** Every unit of every item, e.g. 3× Kopi → three rows. */
export function expandUnits(items: SplitItem[]) {
  return items.flatMap((item) =>
    Array.from({ length: item.quantity }, (_, n) => ({ key: unitKey(item.id, n), item })),
  )
}

/** Same rounding as the server: whole rupiah per share, remainder to the last. */
export function equalAmounts(total: number, count: number) {
  const base = Math.floor(total / count / 100) * 100
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? total - base * (count - 1) : base))
}

const withCharges = (subtotal: number) =>
  subtotal + Math.round(subtotal * 0.1) + Math.round(subtotal * 0.05)

/** Per-share totals for an item assignment (tax/service included). */
export function itemAmounts(items: SplitItem[], assignment: UnitAssignment, count: number, total: number) {
  const subtotals = Array.from({ length: count }, () => 0)
  for (const { key, item } of expandUnits(items)) {
    const share = assignment[key]
    if (share !== undefined && share < count) subtotals[share]! += item.price
  }
  const amounts = subtotals.map(withCharges)
  const unassigned = expandUnits(items).some(({ key }) => {
    const share = assignment[key]
    return share === undefined || share >= count
  })
  if (!unassigned && amounts.length) amounts[amounts.length - 1]! += total - amounts.reduce((s, a) => s + a, 0)
  return { amounts, complete: !unassigned, emptyShares: subtotals.map((s) => s === 0) }
}

/** Builds the API payload for an item assignment. */
export function itemsPayload(items: SplitItem[], assignment: UnitAssignment, labels: string[]): SplitPayload {
  const shares = labels.map((label) => ({ label: label.trim() || undefined, items: new Map<string, number>() }))
  for (const { key, item } of expandUnits(items)) {
    const share = shares[assignment[key] ?? -1]
    if (share) share.items.set(item.id, (share.items.get(item.id) ?? 0) + 1)
  }
  return {
    mode: "items",
    shares: shares.map((s) => ({
      label: s.label,
      items: [...s.items].map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
    })),
  }
}

/** Custom amounts typed in rupiah → cents; `remaining` is what is left to cover. */
export function customAmounts(rupiah: string[], total: number) {
  const cents = rupiah.map((v) => Math.round((Number(v.replace(/\D/g, "")) || 0) * 100))
  return { cents, remaining: total - cents.reduce((s, c) => s + c, 0) }
}
