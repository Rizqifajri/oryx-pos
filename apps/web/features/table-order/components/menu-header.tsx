"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BellRing, ConciergeBell, Search, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { tableLabel } from "../format"
import { useLiveTable, useLiveTenant } from "../hooks"
import { IconButton } from "./primitives"

/**
 * A. Sticky app header. The hairline appears only once the page scrolls.
 * The search button is mobile-only: tablet+ always shows the search bar.
 */
export function MenuHeader({
  title = "Menu Meja",
  onCallWaiter,
  onSearch,
  onProfile,
}: {
  title?: string
  onCallWaiter: () => void
  onSearch?: () => void
  onProfile: () => void
}) {
  const tenant = useLiveTenant()
  const table = useLiveTable()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-30 border-b border-transparent bg-pm-bg pt-[env(safe-area-inset-top)] transition-colors data-scrolled:border-pm-line"
    >
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-3 sm:px-4">
        <div className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-pm-surface-muted">
          <ConciergeBell className="size-[16px]" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] leading-[12px] font-semibold tracking-[0.08em] text-pm-muted uppercase">
            {tenant.name}
          </p>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[16px] leading-[20px] font-bold">{title}</h1>
            <span className="shrink-0 rounded-full bg-pm-amber-bg px-2 py-0.5 text-[10px] leading-[12px] font-semibold whitespace-nowrap text-pm-amber-fg">
              {tableLabel(table.name)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Panggil pelayan" icon={BellRing} onClick={onCallWaiter} />
          {onSearch && (
            <IconButton label="Cari menu" icon={Search} onClick={onSearch} className="sm:hidden" />
          )}
          <IconButton label="Sesi tamu" icon={User} variant="ink" onClick={onProfile} />
        </div>
      </div>
    </header>
  )
}

/** B. Restaurant card. Below 400px the table chip wraps under the name. */
export function RestaurantCard() {
  const tenant = useLiveTenant()
  const table = useLiveTable()
  return (
    <section className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px] bg-pm-surface p-3 shadow-pm-card">
      <div className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-pm-surface-muted">
        <ConciergeBell className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 basis-[160px]">
        <h2 className="truncate text-[15px] leading-[20px] font-extrabold tracking-[0.01em] uppercase">
          {tenant.name}
        </h2>
        <p className="truncate text-[12px] leading-[17px] text-pm-muted">
          {tenant.tagline || "Pesan langsung dari meja Anda"}
        </p>
      </div>
      <div className="flex items-center gap-2 max-[399px]:w-full max-[399px]:pl-12 min-[400px]:flex-col min-[400px]:items-end min-[400px]:gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pm-surface-muted px-2 py-1 text-[10px] leading-[12px] font-semibold whitespace-nowrap">
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", tenant.isOpen ? "bg-pm-success" : "bg-pm-subtle")}
          />
          {tableLabel(table.name)}
        </span>
        <span className="text-[10px] leading-[13px] font-medium whitespace-nowrap text-pm-muted">
          Dine-in • QR Order
        </span>
      </div>
    </section>
  )
}

/** Header for secondary pages (cart, bill, help): back link + title + table. */
export function SubPageHeader({ title, backHref }: { title: string; backHref?: string }) {
  const table = useLiveTable()
  return (
    <header className="sticky top-0 z-30 border-b border-pm-line bg-pm-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-[720px] items-center gap-3 px-3 sm:px-4">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Kembali ke menu"
            className="relative grid size-8 place-items-center rounded-full bg-pm-surface-muted"
          >
            <span aria-hidden className="absolute -inset-1.5" />
            <ArrowLeft className="size-[16px]" strokeWidth={1.75} aria-hidden />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-[16px] leading-[20px] font-bold">{title}</h1>
        <span className="shrink-0 rounded-full bg-pm-amber-bg px-2 py-0.5 text-[10px] leading-[12px] font-semibold whitespace-nowrap text-pm-amber-fg">
          {tableLabel(table.name)}
        </span>
      </div>
    </header>
  )
}
