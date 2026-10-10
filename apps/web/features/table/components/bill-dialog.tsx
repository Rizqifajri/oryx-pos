"use client"

import { useMemo, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatIdr } from "@/lib/format"
import {
  customAmounts,
  equalAmounts,
  expandUnits,
  itemAmounts,
  itemsPayload,
  type SplitItem,
  type SplitMode,
  type SplitPayload,
  type UnitAssignment,
} from "@/lib/split-bill"
import { cn } from "@/lib/utils"
import {
  useCancelSessionSplit,
  usePayShare,
  useSessionDetail,
  useSettleSession,
  useSplitSession,
} from "../hooks/use-table-sessions"
import type { ActiveTableSession, SessionBill, TableSessionDetail } from "../types"

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "qris", label: "QRIS (counter)" },
  { value: "debit", label: "Debit / EDC" },
  { value: "transfer", label: "Transfer" },
]
const methodLabel = (m: string | null) => METHODS.find((x) => x.value === m)?.label ?? m ?? "—"

function MethodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
      {METHODS.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={value === m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            value === m.value ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="grid gap-1 rounded-md bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded px-3 py-1.5 text-sm font-medium", value === o.value ? "bg-background shadow-sm" : "text-muted-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * The table bill at the counter: pay in full, split it (evenly / by items /
 * custom amounts), or collect the shares of a split bill one by one.
 */
export function BillDialog({
  session,
  onOpenChange,
}: {
  session: ActiveTableSession | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: detail, isLoading } = useSessionDetail(session?.id ?? null)
  const [tab, setTab] = useState<"full" | "split">("full")
  const [resplit, setResplit] = useState(false)
  const bill = detail?.bill ?? session?.bill

  return (
    <Dialog
      open={!!session}
      onOpenChange={(open) => {
        if (!open) {
          setTab("full")
          setResplit(false)
        }
        onOpenChange(open)
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bill · {session?.tableName}</DialogTitle>
          <DialogDescription>
            {bill ? `${formatIdr(bill.totalAmount)} incl. tax and service` : "Loading…"}
            {bill?.splitMode && !resplit ? " · split" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {isLoading || !detail || !session ? (
            <Skeleton className="h-48 w-full" />
          ) : detail.bill.splitMode && !resplit ? (
            <SharesView session={session} detail={detail} onResplit={() => setResplit(true)} onDone={() => onOpenChange(false)} />
          ) : (
            <div className="space-y-4">
              {!resplit && (
                <Segmented
                  label="Payment"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "full", label: "Pay in full" },
                    { value: "split", label: "Split bill" },
                  ]}
                />
              )}
              {tab === "full" && !resplit ? (
                <FullPayment session={session} bill={detail.bill} onDone={() => onOpenChange(false)} />
              ) : (
                <SplitEditor detail={detail} sessionId={session.id} onDone={() => { setResplit(false); setTab("full") }} />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Totals({ bill }: { bill: SessionBill }) {
  return (
    <dl className="space-y-1 text-sm">
      {[
        ["Subtotal", bill.subtotal],
        ["Tax (10%)", bill.taxAmount],
        ["Service (5%)", bill.serviceAmount],
      ].map(([label, value]) => (
        <div key={label} className="flex justify-between text-muted-foreground">
          <dt>{label}</dt>
          <dd className="tabular-nums">{formatIdr(value as number)}</dd>
        </div>
      ))}
      <div className="flex justify-between border-t pt-1 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatIdr(bill.totalAmount)}</dd>
      </div>
    </dl>
  )
}

function FullPayment({ session, bill, onDone }: { session: ActiveTableSession; bill: SessionBill; onDone: () => void }) {
  const settle = useSettleSession()
  const [method, setMethod] = useState("cash")
  return (
    <div className="space-y-4">
      <Totals bill={bill} />
      <MethodPicker value={method} onChange={setMethod} />
      {session.activeOrderCount > 0 && (
        <p className="text-xs text-amber-700">
          {session.activeOrderCount} order(s) are still in the kitchen — they stay on the board after payment.
        </p>
      )}
      <DialogFooter>
        <Button
          className="w-full sm:w-auto"
          disabled={settle.isPending || bill.totalAmount === 0}
          onClick={() =>
            settle.mutate(
              { sessionId: session.id, paymentMethod: method },
              {
                onSuccess: () => {
                  toast.success(`${session.tableName} paid and closed`)
                  onDone()
                },
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          {settle.isPending ? "Saving…" : `Mark ${formatIdr(bill.totalAmount)} as paid`}
        </Button>
      </DialogFooter>
    </div>
  )
}

function detailItems(detail: TableSessionDetail): SplitItem[] {
  return detail.orders
    .filter((o) => o.status !== "CANCELED")
    .flatMap((o) => o.items.map((i) => ({ id: i.id, name: i.menuName, quantity: i.quantity, price: i.price })))
}

function SplitEditor({ detail, sessionId, onDone }: { detail: TableSessionDetail; sessionId: string; onDone: () => void }) {
  const total = detail.bill.totalAmount
  const items = useMemo(() => detailItems(detail), [detail])
  const units = useMemo(() => expandUnits(items), [items])
  const split = useSplitSession()

  const [mode, setMode] = useState<SplitMode>("equal")
  const [count, setCount] = useState(2)
  const [names, setNames] = useState<string[]>([])
  const [assignment, setAssignment] = useState<UnitAssignment>(() => Object.fromEntries(units.map((u) => [u.key, 0])))
  const [custom, setCustom] = useState<string[]>([])

  const labels = Array.from({ length: count }, (_, i) => names[i] ?? "")
  const customState = customAmounts(Array.from({ length: count }, (_, i) => custom[i] ?? ""), total)
  const itemState = itemAmounts(items, assignment, count, total)
  const amounts = mode === "equal" ? equalAmounts(total, count) : mode === "items" ? itemState.amounts : customState.cents
  const maxCount = mode === "items" ? Math.min(10, Math.max(2, units.length)) : 20

  const problem =
    mode === "items" && itemState.emptyShares.some(Boolean)
      ? "Every share needs at least one item."
      : mode === "custom" && customState.remaining !== 0
        ? customState.remaining > 0
          ? `${formatIdr(customState.remaining)} still unassigned`
          : `${formatIdr(-customState.remaining)} over the total`
        : mode === "custom" && customState.cents.some((c) => c <= 0)
          ? "Every share must be more than Rp 0."
          : null

  function changeCount(n: number) {
    const next = Math.min(maxCount, Math.max(2, n))
    setCount(next)
    setAssignment((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v >= next ? 0 : v])))
  }

  function submit() {
    const payload: SplitPayload =
      mode === "equal"
        ? { mode, count }
        : mode === "items"
          ? itemsPayload(items, assignment, labels)
          : { mode, shares: customState.cents.map((amount, i) => ({ label: labels[i]?.trim() || undefined, amount })) }
    split.mutate(
      { sessionId, payload },
      {
        onSuccess: () => {
          toast.success(`Bill split into ${count} shares`)
          onDone()
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <div className="space-y-4">
      <Segmented
        label="Split mode"
        value={mode}
        onChange={(m) => {
          setMode(m)
          if (m === "items") changeCount(Math.min(count, Math.max(2, units.length)))
        }}
        options={[
          { value: "equal", label: "Evenly" },
          { value: "items", label: "By items" },
          { value: "custom", label: "Custom" },
        ]}
      />
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Number of shares</span>
        <input
          type="number"
          min={2}
          max={maxCount}
          value={count}
          onChange={(e) => changeCount(Number(e.target.value) || 2)}
          className="h-9 w-20 rounded-md border bg-background px-2 text-right tabular-nums"
        />
      </label>

      {mode === "items" && (
        <div className="rounded-md border">
          <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">Assign each item to a share</div>
          <ul className="max-h-56 divide-y overflow-y-auto">
            {units.map(({ key, item }) => (
              <li key={key} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">{formatIdr(item.price)}</span>
                <div className="flex gap-1" role="radiogroup" aria-label={`Share for ${item.name}`}>
                  {Array.from({ length: count }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={assignment[key] === i}
                      onClick={() => setAssignment((a) => ({ ...a, [key]: i }))}
                      className={cn(
                        "size-7 rounded text-xs font-medium tabular-nums",
                        assignment[key] === i ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-1.5">
        {labels.map((name, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
            <input
              value={name}
              onChange={(e) => {
                const next = [...labels]
                next[i] = e.target.value.slice(0, 40)
                setNames(next)
              }}
              placeholder={`Share ${i + 1} name (optional)`}
              className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
            />
            {mode === "custom" ? (
              <input
                inputMode="numeric"
                value={custom[i] ?? ""}
                onChange={(e) => {
                  const next = Array.from({ length: count }, (_, j) => custom[j] ?? "")
                  next[i] = e.target.value.replace(/\D/g, "")
                  setCustom(next)
                }}
                placeholder="Rp"
                aria-label={`Amount for share ${i + 1}`}
                className="h-9 w-32 rounded-md border bg-background px-2 text-right text-sm tabular-nums"
              />
            ) : (
              <span className="w-32 text-right text-sm font-medium tabular-nums">{formatIdr(amounts[i] ?? 0)}</span>
            )}
          </li>
        ))}
      </ul>

      {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
      <DialogFooter>
        <Button disabled={!!problem || split.isPending} onClick={submit}>
          {split.isPending ? "Splitting…" : `Split into ${count} shares`}
        </Button>
      </DialogFooter>
    </div>
  )
}

function SharesView({
  session,
  detail,
  onResplit,
  onDone,
}: {
  session: ActiveTableSession
  detail: TableSessionDetail
  onResplit: () => void
  onDone: () => void
}) {
  const { bill } = detail
  const pay = usePayShare()
  const settleRest = useSettleSession()
  const cancel = useCancelSessionSplit()
  const [methods, setMethods] = useState<Record<string, string>>({})
  const [restMethod, setRestMethod] = useState("cash")
  const itemName = new Map(detail.orders.flatMap((o) => o.items.map((i) => [i.id, i.menuName] as const)))
  const paid = bill.shares.filter((s) => s.status === "paid")
  const remaining = bill.shares.filter((s) => s.status === "pending").reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {paid.length} of {bill.shares.length} shares paid · {formatIdr(remaining)} remaining. Guests can also pay their
        share online from their phone.
      </p>
      <ul className="divide-y rounded-md border">
        {bill.shares.map((share) => (
          <li key={share.id} className="space-y-2 p-3">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-medium">{share.label}</span>
              <span className="font-semibold tabular-nums">{formatIdr(share.amount)}</span>
            </div>
            {share.items.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {share.items.map((i) => `${i.quantity}× ${itemName.get(i.orderItemId) ?? "Item"}`).join(", ")}
              </p>
            )}
            {share.status === "paid" ? (
              <p className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 className="size-3.5" /> Paid · {methodLabel(share.paymentMethod)}
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={methods[share.id] ?? "cash"}
                  onChange={(e) => setMethods((m) => ({ ...m, [share.id]: e.target.value }))}
                  aria-label={`Payment method for ${share.label}`}
                  className="h-8 flex-1 rounded-md border bg-background px-2 text-sm"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={pay.isPending}
                  onClick={() =>
                    pay.mutate(
                      { sessionId: session.id, shareId: share.id, paymentMethod: methods[share.id] ?? "cash" },
                      {
                        onSuccess: (b) => {
                          if (b.status === "paid") {
                            toast.success(`${session.tableName} fully paid and closed`)
                            onDone()
                          } else toast.success(`${share.label} paid`)
                        },
                        onError: (e) => toast.error(e.message),
                      },
                    )
                  }
                >
                  Mark paid
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {remaining > 0 && paid.length > 0 && (
        <div className="space-y-2 rounded-md bg-muted/50 p-3">
          <p className="text-sm font-medium">Collect everything left ({formatIdr(remaining)})</p>
          <MethodPicker value={restMethod} onChange={setRestMethod} />
          <Button
            variant="outline"
            className="w-full"
            disabled={settleRest.isPending}
            onClick={() =>
              settleRest.mutate(
                { sessionId: session.id, paymentMethod: restMethod },
                {
                  onSuccess: () => {
                    toast.success(`${session.tableName} fully paid and closed`)
                    onDone()
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            Mark remaining as paid
          </Button>
        </div>
      )}

      {paid.length === 0 && (
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(session.id, {
                onSuccess: () => toast.success("Split removed — the table can order again"),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            Remove split
          </Button>
          <Button variant="outline" onClick={onResplit}>
            Change split
          </Button>
        </DialogFooter>
      )}
    </div>
  )
}
