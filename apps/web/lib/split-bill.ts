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

/** "By items": orderItemId → units of that item per share, e.g. 3× Kopi → [1, 2, 0]. */
export type ItemAssignment = Record<string, number[]>

const sum = (ns: number[]) => ns.reduce((s, n) => s + n, 0)

/** Nothing assigned yet. */
export const initialAssignment = (items: SplitItem[], count: number): ItemAssignment =>
  Object.fromEntries(items.map((i) => [i.id, Array.from({ length: count }, () => 0)]))

/** Resizes to `count` shares; units on removed shares become unassigned again. */
export const resizeAssignment = (a: ItemAssignment, count: number): ItemAssignment =>
  Object.fromEntries(Object.entries(a).map(([id, c]) => [id, Array.from({ length: count }, (_, s) => c[s] ?? 0)]))

/** One unit more (+1) or less (-1) for `share`, within what is still unassigned. */
export function bumpUnit(counts: number[], share: number, delta: 1 | -1, quantity: number): number[] {
  const n = (counts[share] ?? 0) + delta
  if (n < 0 || (delta > 0 && sum(counts) >= quantity)) return counts
  return counts.map((c, s) => (s === share ? n : c))
}

/** Gives every still-unassigned unit to `share`. */
export const assignRest = (a: ItemAssignment, items: SplitItem[], share: number): ItemAssignment =>
  Object.fromEntries(
    items.map((i) => {
      const c = a[i.id] ?? []
      return [i.id, c.map((n, s) => (s === share ? n + i.quantity - sum(c) : n))]
    }),
  )

/** Same rounding as the server: whole rupiah per share, remainder to the last. */
export function equalAmounts(total: number, count: number) {
  const base = Math.floor(total / count / 100) * 100
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? total - base * (count - 1) : base))
}

const withCharges = (subtotal: number) =>
  subtotal + Math.round(subtotal * 0.1) + Math.round(subtotal * 0.05)

/** Per-share totals for an item assignment (tax/service included). */
export function itemAmounts(items: SplitItem[], assignment: ItemAssignment, count: number, total: number) {
  const subtotals = Array.from({ length: count }, () => 0)
  let unassigned = 0
  for (const item of items) {
    const counts = assignment[item.id] ?? []
    counts.slice(0, count).forEach((n, s) => { subtotals[s]! += n * item.price })
    unassigned += item.quantity - sum(counts.slice(0, count))
  }
  const amounts = subtotals.map(withCharges)
  if (!unassigned && amounts.length) amounts[amounts.length - 1]! += total - sum(amounts)
  return { amounts, unassigned, emptyShares: subtotals.map((s) => s === 0) }
}

/** Builds the API payload for an item assignment. */
export function itemsPayload(items: SplitItem[], assignment: ItemAssignment, labels: string[]): SplitPayload {
  return {
    mode: "items",
    shares: labels.map((label, s) => ({
      label: label.trim() || undefined,
      items: items
        .map((i) => ({ orderItemId: i.id, quantity: assignment[i.id]?.[s] ?? 0 }))
        .filter((i) => i.quantity > 0),
    })),
  }
}

/** Custom amounts typed in rupiah → cents; `remaining` is what is left to cover. */
export function customAmounts(rupiah: string[], total: number) {
  const cents = rupiah.map((v) => Math.round((Number(v.replace(/\D/g, "")) || 0) * 100))
  return { cents, remaining: total - cents.reduce((s, c) => s + c, 0) }
}
