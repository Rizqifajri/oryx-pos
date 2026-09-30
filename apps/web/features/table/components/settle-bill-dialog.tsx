"use client"

import { useState } from "react"
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
import { formatIdr } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSettleSession } from "../hooks/use-table-sessions"
import type { ActiveTableSession } from "../types"

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "qris", label: "QRIS (counter)" },
  { value: "debit", label: "Debit / EDC" },
  { value: "transfer", label: "Transfer" },
]

/**
 * Cashier path: record that the guest paid at the table/counter. Settling
 * records the payment for every order in the session, closes it and frees
 * the table.
 */
export function SettleBillDialog({
  session,
  onOpenChange,
}: {
  session: ActiveTableSession | null
  onOpenChange: (open: boolean) => void
}) {
  const settle = useSettleSession()
  const [method, setMethod] = useState("cash")
  const bill = session?.bill

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settle bill · {session?.tableName}</DialogTitle>
          <DialogDescription>
            {session?.orderCount ?? 0} order(s). This closes the table session.
          </DialogDescription>
        </DialogHeader>

        {bill && (
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
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Payment method</legend>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={method === m.value}
                onClick={() => setMethod(m.value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  method === m.value ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        {session?.activeOrderCount ? (
          <p className="text-xs text-amber-700">
            {session.activeOrderCount} order(s) are still in the kitchen — they stay on the board after payment.
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={settle.isPending}>
            Cancel
          </Button>
          <Button
            disabled={settle.isPending || !session}
            onClick={() =>
              settle.mutate(
                { sessionId: session!.id, paymentMethod: method },
                {
                  onSuccess: () => {
                    toast.success(`${session!.tableName} paid and closed`)
                    onOpenChange(false)
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {settle.isPending ? "Saving…" : "Mark as paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
