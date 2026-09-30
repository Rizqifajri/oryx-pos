"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleCheck, QrCode, RefreshCw, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { orderRef } from "../format"
import { useSessionEvents, useSessionView } from "../hooks"
import { useGuest, useTableSession } from "../session-context"
import type { OrderStatus } from "../types"
import { BottomTabBar } from "./bottom-bars"
import { MenuItemCardSkeleton } from "./menu-item-card"

/** Renders the right screen for the session bootstrap phase. */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const { phase, errorMessage, reopen } = useTableSession()

  if (phase === "loading") return <MenuPageSkeleton />

  if (phase === "invalid") {
    return (
      <FullPageState
        icon={<QrCode className="size-7" strokeWidth={1.5} />}
        title="QR meja tidak valid"
        body="Minta bantuan pelayan untuk memindai ulang."
      />
    )
  }

  if (phase === "error") {
    return (
      <FullPageState
        icon={<WifiOff className="size-7" strokeWidth={1.5} />}
        title="Menu belum bisa dimuat"
        body={errorMessage ?? "Periksa koneksi internet Anda lalu coba lagi."}
        action={
          <button
            type="button"
            onClick={() => void reopen()}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-pm-ink px-5 text-[13px] font-bold text-white"
          >
            <RefreshCw className="size-4" aria-hidden /> Coba lagi
          </button>
        }
      />
    )
  }

  return <ReadyShell>{children}</ReadyShell>
}

const STATUS_TOAST: Partial<Record<OrderStatus, string>> = {
  PROCESSING: "sedang dimasak",
  COMPLETED: "sudah diantar",
  CANCELED: "dibatalkan",
}

function ReadyShell({ children }: { children: React.ReactNode }) {
  const { basePath, reopen } = useGuest()
  const pathname = usePathname()
  const { data: view, error } = useSessionView()
  useSessionEvents()

  // Guest tokens last 12h; an expired one quietly rejoins the table.
  useEffect(() => {
    if (error?.status === 401) void reopen()
  }, [error, reopen])

  // Announce kitchen progress on any page.
  const seen = useRef<Map<string, OrderStatus> | null>(null)
  useEffect(() => {
    if (!view) return
    const prev = seen.current
    const next = new Map(view.orders.map((o) => [o.id, o.status]))
    if (prev) {
      for (const order of view.orders) {
        const before = prev.get(order.id)
        const phrase = STATUS_TOAST[order.status]
        if (before && before !== order.status && phrase) {
          toast(`Pesanan ${orderRef(order.id)} ${phrase}`)
        }
      }
    }
    seen.current = next
  }, [view])

  const closed = view?.session.status === "closed"
  const onBillPage = pathname === `${basePath}/bill`

  return (
    <>
      {closed && !onBillPage ? <SessionClosedState /> : children}
      <BottomTabBar />
    </>
  )
}

function SessionClosedState() {
  const { basePath, reopen } = useGuest()
  return (
    <FullPageState
      icon={<CircleCheck className="size-7" strokeWidth={1.5} />}
      title="Sesi meja selesai"
      body="Terima kasih sudah berkunjung! Tagihan meja ini sudah ditutup."
      action={
        <div className="flex flex-col items-center gap-2">
          <Link
            href={`${basePath}/bill`}
            className="inline-flex h-11 items-center rounded-full bg-pm-ink px-5 text-[13px] font-bold text-white"
          >
            Lihat struk
          </Link>
          <button
            type="button"
            onClick={() => void reopen()}
            className="h-11 rounded-full px-5 text-[13px] font-bold text-pm-ink underline underline-offset-4"
          >
            Mulai pesanan baru
          </button>
        </div>
      }
    />
  )
}

export function FullPageState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-pm-surface-muted" aria-hidden>
        {icon}
      </div>
      <h1 className="mt-4 text-[18px] leading-[24px] font-bold">{title}</h1>
      <p className="mt-1.5 text-[13px] leading-[19px] text-pm-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </main>
  )
}

export function MenuPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat menu">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-3 sm:px-4">
        <div className="size-7 animate-pulse rounded-[8px] bg-pm-surface-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-24 animate-pulse rounded bg-pm-surface-muted" />
          <div className="h-4 w-36 animate-pulse rounded bg-pm-surface-muted" />
        </div>
      </div>
      <div className="mx-auto max-w-[1120px] space-y-3 px-3 sm:px-4">
        <div className="h-16 animate-pulse rounded-[12px] bg-pm-surface" />
        <div className="h-10 animate-pulse rounded-[12px] bg-pm-surface-muted" />
        <div className="flex gap-3">
          <div className="w-12 space-y-1.5 sm:w-14 lg:w-[180px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-[8px] bg-pm-surface" />
            ))}
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <MenuItemCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
