"use client"

import { useState } from "react"
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
import { cn } from "@/lib/utils"
import {
  useCancelSessionSplit,
  usePayShare,
  useSessionDetail,
  useSettleSession,
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

/**
 * The table bill at the counter: pay in full, or collect the shares of a
 * bill the guest already split from their phone, one by one.
 */
export function BillDialog({
  session,
  onOpenChange,
}: {
  session: ActiveTableSession | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: detail, isLoading } = useSessionDetail(session?.id ?? null)
  const bill = detail?.bill ?? session?.bill

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bill · {session?.tableName}</DialogTitle>
          <DialogDescription>
            {bill ? `${formatIdr(bill.totalAmount)} incl. tax and service` : "Loading…"}
            {bill?.splitMode ? " · split" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {isLoading || !detail || !session ? (
            <Skeleton className="h-48 w-full" />
          ) : detail.bill.splitMode ? (
            <SharesView session={session} detail={detail} onDone={() => onOpenChange(false)} />
          ) : (
            <FullPayment session={session} bill={detail.bill} onDone={() => onOpenChange(false)} />
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

function SharesView({
  session,
  detail,
  onDone,
}: {
  session: ActiveTableSession
  detail: TableSessionDetail
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
        </DialogFooter>
      )}
    </div>
  )
}
