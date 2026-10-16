"use client"

import { useEffect, useState } from "react"
import { Check, ChefHat, ShoppingBag, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { useAdvanceOrder } from "@/features/order/hooks/use-orders"
import type { Order } from "@/features/order/types"
import type { KitchenSettings } from "../hooks/use-kitchen-settings"

export type Urgency = "ok" | "warn" | "late"

export function orderTime(order: Order) {
  return Date.parse(order.submittedAt ?? order.createdAt)
}

export const isDineIn = (order: Order) => !!order.tableId

export function urgencyOf(minutes: number, { warnMin, lateMin }: KitchenSettings): Urgency {
  return minutes >= lateMin ? "late" : minutes >= warnMin ? "warn" : "ok"
}

export const URGENCY_STYLES: Record<Urgency, string> = {
  ok: "bg-primary text-primary-foreground",
  warn: "bg-warning text-warning-foreground",
  late: "bg-destructive text-white",
}

export function KitchenTicket({
  order,
  now,
  highlighted,
  fresh,
  settings,
}: {
  order: Order
  now: number
  /** Menu names picked in the bottom item bar. */
  highlighted: Set<string>
  fresh: boolean
  settings: KitchenSettings
}) {
  const minutes = Math.max(0, Math.floor((now - orderTime(order)) / 60_000))
  const urgency = urgencyOf(minutes, settings)
  const dineIn = isDineIn(order)
  const TypeIcon = dineIn ? UtensilsCrossed : ShoppingBag
  const title = dineIn ? order.tableName ?? "Table" : order.customerName || "Dine-out"
  const guest = dineIn ? order.customerName : null

  return (
    <article
      className={cn(
        "mb-4 break-inside-avoid overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        urgency === "late" && "ring-2 ring-destructive",
        fresh && "kds-fade-in",
      )}
    >
      <header className={cn("px-4 py-3", URGENCY_STYLES[urgency])}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-2xl font-bold leading-tight">{title}</h3>
          <span className="shrink-0 text-2xl font-bold tabular-nums leading-tight">{minutes}m</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-sm font-medium opacity-85">
          <span className="flex min-w-0 items-center gap-1.5">
            <TypeIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {dineIn ? "Dine-in" : "Dine-out"}
              {guest && ` · ${guest}`}
            </span>
          </span>
          <span className="shrink-0 tabular-nums">#{order.id.slice(-4).toUpperCase()}</span>
        </div>
      </header>

      <ul className="divide-y divide-border">
        {order.items.map((item) => {
          const on = highlighted.has(item.menuName)
          return (
            <li key={item.id} className={cn("flex gap-3 px-4 py-2.5", on && "bg-foreground text-background")}>
              <span className="w-7 shrink-0 text-xl font-bold tabular-nums leading-snug">{item.quantity}</span>
              <div className="min-w-0">
                <p className="text-xl font-medium leading-snug">{item.menuName}</p>
                {item.note && (
                  <p className={cn("text-base font-medium", on ? "text-background/80" : "text-destructive")}>
                    {item.note}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <PermissionGuard permissions={PERMISSIONS.ORDER_UPDATE}>
        <AdvanceButton order={order} settings={settings} />
      </PermissionGuard>
    </article>
  )
}

/**
 * Start is one tap. Finishing is two taps (the second within 3s) unless turned
 * off, because a finished order leaves the board and, for takeout, records the payment.
 */
function AdvanceButton({ order, settings }: { order: Order; settings: KitchenSettings }) {
  const { step, advance, isPending } = useAdvanceOrder(order)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  const shown = { start: settings.showStart, serve: settings.showServe, complete: settings.showComplete }
  if (!step || !shown[step]) return null
  const finishing = step !== "start"

  function onClick() {
    if (finishing && settings.confirmFinish && !armed) {
      setArmed(true)
      return
    }
    setArmed(false)
    advance().catch((e: Error) => toast.error(e.message))
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 border-t border-border text-lg font-semibold transition-colors disabled:opacity-60",
        armed
          ? "bg-primary text-primary-foreground"
          : finishing
            ? "bg-card text-foreground hover:bg-accent"
            : "bg-foreground text-background hover:bg-foreground/90",
      )}
    >
      {finishing ? <Check className="size-5" aria-hidden /> : <ChefHat className="size-5" aria-hidden />}
      {isPending ? "Saving…" : armed ? "Tap again to confirm" : finishing ? (step === "serve" ? "Served" : "Done") : "Start cooking"}
    </button>
  )
}
