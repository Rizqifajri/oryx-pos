"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Headset, ReceiptText, UtensilsCrossed } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGuestCart } from "../cart-store"
import { formatRupiah } from "../format"
import { useSessionView } from "../hooks"
import { useGuest } from "../session-context"

/** H. Bottom tab bar: Buku Menu · Tagihan Meja · Bantuan. */
export function BottomTabBar() {
  const { basePath } = useGuest()
  const pathname = usePathname()
  const { data: view } = useSessionView()
  const hasOpenBill =
    !!view &&
    view.bill.status !== "paid" &&
    view.orders.some((o) => o.status !== "CANCELED")

  const tabs = [
    { href: basePath, label: "Buku Menu", icon: UtensilsCrossed, match: (p: string) => p === basePath || p === `${basePath}/cart` },
    { href: `${basePath}/bill`, label: "Tagihan Meja", icon: ReceiptText, dot: hasOpenBill },
    { href: `${basePath}/help`, label: "Bantuan", icon: Headset },
  ]

  return (
    <nav
      aria-label="Navigasi meja"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-pm-line bg-pm-bg pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-14 max-w-[720px] grid-cols-3 px-2">
        {tabs.map((tab) => {
          const active = tab.match ? tab.match(pathname) : pathname === tab.href
          const Icon = tab.icon
          return (
            <li key={tab.href} className="flex items-center justify-center">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] leading-[13px]",
                  active ? "bg-pm-surface-muted font-semibold text-pm-ink" : "font-medium text-pm-muted",
                )}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.dot && (
                  <span className="absolute top-1.5 left-6 size-1.5 rounded-full bg-pm-danger">
                    <span className="sr-only">(ada tagihan aktif)</span>
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Height reserved at the bottom of scrolling pages for the fixed bars. */
export const TAB_BAR_SPACE = "pb-[calc(56px+16px+env(safe-area-inset-bottom))]"
export const TAB_AND_CART_SPACE = "pb-[calc(56px+52px+12px+24px+env(safe-area-inset-bottom))]"

function useCountUp(value: number) {
  const [display, setDisplay] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    from.current = value
    if (start === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value)
      return
    }
    let frame = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 200)
      setDisplay(Math.round(start + (value - start) * p))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return display
}

/** G. Floating cart bar above the tab bar; only rendered with ≥1 item. */
export function CartBar() {
  const { basePath } = useGuest()
  const { itemCount, subtotal, hydrated } = useGuestCart()
  const total = useCountUp(subtotal)
  if (!hydrated || itemCount === 0) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(56px+12px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[720px]">
      <div className="pm-cart-in flex h-13 items-center gap-2 rounded-full bg-pm-ink py-1.5 pr-1.5 pl-2 text-white shadow-pm-float">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[12px] font-bold text-pm-ink tabular-nums">
          {itemCount}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] leading-[13px] font-medium text-white/70">Total Pesanan</p>
          <p className="text-[16px] leading-[20px] font-extrabold tabular-nums">{formatRupiah(total)}</p>
        </div>
        <Link
          href={`${basePath}/cart`}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[12px] leading-[16px] font-bold text-pm-ink"
        >
          Lihat Pesanan
          <ArrowRight className="size-[14px]" strokeWidth={2.25} aria-hidden />
        </Link>
        <p className="sr-only" aria-live="polite">
          {itemCount} item, total {formatRupiah(subtotal)}
        </p>
      </div>
    </div>
  )
}
