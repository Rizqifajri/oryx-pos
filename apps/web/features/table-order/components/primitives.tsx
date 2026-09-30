"use client"

import {
  CakeSlice,
  Coffee,
  Cookie,
  Flame,
  GlassWater,
  type LucideIcon,
  Minus,
  Plus,
  Soup,
  UtensilsCrossed,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { MenuBadge, OrderStatus } from "../types"

/** 32px visual circle with a 44px hit area (touch target). */
export function IconButton({
  label,
  icon: Icon,
  variant = "muted",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: LucideIcon
  variant?: "muted" | "ink"
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("relative grid size-8 shrink-0 place-items-center rounded-full", className, {
        "bg-pm-surface-muted text-pm-ink": variant === "muted",
        "bg-pm-ink text-white": variant === "ink",
      })}
      {...props}
    >
      <span aria-hidden className="absolute -inset-1.5" />
      <Icon className="size-[16px]" strokeWidth={1.75} />
    </button>
  )
}

/** Black pill stepper: [−] n [+]. */
export function Stepper({
  quantity,
  name,
  onDecrement,
  onIncrement,
  disabled,
  size = "md",
}: {
  quantity: number
  name: string
  onDecrement: () => void
  onIncrement: () => void
  disabled?: boolean
  size?: "md" | "lg"
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-pm-ink text-white",
        size === "md" ? "h-8" : "h-11",
      )}
    >
      <button
        type="button"
        aria-label={`Kurangi ${name}`}
        onClick={onDecrement}
        disabled={disabled}
        className={cn("grid place-items-center disabled:opacity-40", size === "md" ? "size-8" : "size-11")}
      >
        <Minus className="size-[14px]" strokeWidth={2.25} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "min-w-5 text-center font-bold tabular-nums",
          size === "md" ? "text-[12px]" : "text-[15px]",
        )}
      >
        {quantity}
      </span>
      <button
        type="button"
        aria-label={`Tambah ${name}`}
        onClick={onIncrement}
        disabled={disabled}
        className={cn("grid place-items-center disabled:opacity-40", size === "md" ? "size-8" : "size-11")}
      >
        <Plus className="size-[14px]" strokeWidth={2.25} />
      </button>
    </div>
  )
}

export const BADGE_LABEL: Record<MenuBadge, string> = {
  chef_pick: "Chef's Pick",
  best_seller: "Best Seller",
  new: "Baru",
  spicy: "Pedas",
}

export function ImageBadge({ badge, soldOut }: { badge: MenuBadge | null; soldOut?: boolean }) {
  if (!badge && !soldOut) return null
  return (
    <span
      className={cn(
        "absolute top-2 left-2 rounded-full bg-white/85 px-2 py-1 text-[10px] leading-[12px] font-semibold backdrop-blur-sm",
        soldOut
          ? "text-pm-danger"
          : badge === "best_seller"
            ? "text-pm-best"
            : badge === "spicy"
              ? "text-pm-danger"
              : "text-pm-ink",
      )}
    >
      {soldOut ? "Habis" : BADGE_LABEL[badge!]}
    </span>
  )
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  NEW: { label: "Diterima", className: "bg-pm-amber-bg text-pm-amber-fg" },
  PROCESSING: { label: "Dimasak", className: "bg-[#E4ECF7] text-[#2F4E7A]" },
  COMPLETED: { label: "Diantar", className: "bg-[#E3F1E7] text-pm-best" },
  CANCELED: { label: "Dibatalkan", className: "bg-pm-surface-muted text-pm-muted line-through" },
}

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] leading-[14px] font-semibold",
        s.className,
      )}
    >
      {s.label}
    </span>
  )
}

/** Categories have no icon field; pick one from the (Indonesian/English) name. */
export function categoryIcon(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (/(kopi|coffee|espresso|latte|teh|tea)/.test(n)) return Coffee
  if (/(minum|drink|jus|juice|segar|beverage|mocktail|es )/.test(n)) return GlassWater
  if (/(dessert|cake|kue|manis|sweet|pastry)/.test(n)) return CakeSlice
  if (/(camilan|snack|cemilan|gorengan|side)/.test(n)) return Cookie
  if (/(makan|food|nasi|rice|mie|noodle|soup|sup|main|utama)/.test(n)) return Soup
  return UtensilsCrossed
}

export const PopularIcon = Flame
