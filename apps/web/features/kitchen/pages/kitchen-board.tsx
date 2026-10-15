"use client"

import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { ArrowLeft, Flame, Inbox, Maximize, Minimize, Moon, Sun, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOrders } from "@/features/order/hooks/use-orders"
import { Toaster } from "@/components/ui/sonner"
import type { Order } from "@/features/order/types"
import {
  KitchenTicket,
  LATE_MIN,
  URGENCY_STYLES,
  WARN_MIN,
  isDineIn,
  orderTime,
  type Urgency,
} from "../components/kitchen-ticket"

type Filter = "all" | "dine-in" | "dine-out"
type Theme = "light" | "dark"

const THEME_KEY = "kitchen-theme"

/** Follows the TV's system setting until someone picks one, then remembers it. */
function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark"
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === "light" || saved === "dark") return saved
    } catch {}
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  })
  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {}
  }
  return [theme, toggle] as const
}

function useNow() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [])
  return now
}

/** Two-tone ding. The AudioContext must be created from a click, so it lives in a ref. */
function playChime(ctx: AudioContext) {
  ;[880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const start = ctx.currentTime + i * 0.18
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.45)
  })
}

export function KitchenBoard() {
  const now = useNow()
  const [theme, toggleTheme] = useTheme()
  const newOrders = useOrders({ status: "NEW" })
  const cooking = useOrders({ status: "PROCESSING" })
  const isLoading = newOrders.isLoading || cooking.isLoading
  const isError = newOrders.isError || cooking.isError

  const [filter, setFilter] = useState<Filter>("all")
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set())

  const active = [...(newOrders.data ?? []), ...(cooking.data ?? [])].sort((a, b) => orderTime(a) - orderTime(b))
  const dineInCount = active.filter(isDineIn).length
  const visible = active.filter((o) => filter === "all" || (filter === "dine-in") === isDineIn(o))
  const lateCount = now ? active.filter((o) => now - orderTime(o) >= LATE_MIN * 60_000).length : 0

  // What the line has to cook right now, biggest first.
  const totals = new Map<string, number>()
  for (const o of visible) for (const i of o.items) totals.set(i.menuName, (totals.get(i.menuName) ?? 0) + i.quantity)
  const itemTotals = [...totals].sort((a, b) => b[1] - a[1])

  function toggleHighlight(name: string) {
    setHighlighted((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Fade-in + chime for tickets that land after the first load.
  const seen = useRef<Set<string> | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const activeKey = active.map((o) => o.id).join(",")

  useEffect(() => {
    if (isLoading) return
    const ids = activeKey ? activeKey.split(",") : []
    if (seen.current) {
      const arrived = ids.filter((id) => !seen.current!.has(id))
      if (arrived.length) {
        if (soundOn && audio.current) playChime(audio.current)
        setFresh((prev) => new Set([...prev, ...arrived]))
        setTimeout(() => {
          setFresh((prev) => {
            const next = new Set(prev)
            arrived.forEach((id) => next.delete(id))
            return next
          })
        }, 6000)
      }
    }
    seen.current = new Set(ids)
  }, [activeKey, isLoading, soundOn])

  function toggleSound() {
    if (!soundOn) {
      audio.current ??= new AudioContext()
      void audio.current.resume()
      playChime(audio.current)
    }
    setSoundOn((on) => !on)
  }

  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])
  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: active.length },
    { value: "dine-in", label: "Dine-in", count: dineInCount },
    { value: "dine-out", label: "Dine-out", count: active.length - dineInCount },
  ]

  return (
    <div className={cn("flex h-dvh flex-col gap-3 overflow-hidden bg-muted p-3 text-foreground dark:bg-background", theme === "dark" && "dark")}>
      <header className="flex shrink-0 items-center gap-2">
        <BarButton asLink="/order" label="Back to orders">
          <ArrowLeft className="size-5" />
        </BarButton>

        <div className="flex overflow-hidden rounded-lg border border-border bg-card" role="radiogroup" aria-label="Order type">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-5 py-2.5 text-base transition-colors",
                filter === f.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-semibold tabular-nums">{f.count}</span> {f.label}
            </button>
          ))}
        </div>

        {lateCount > 0 && (
          <span className="rounded-lg bg-destructive px-4 py-2.5 text-base font-semibold text-white">
            {lateCount} late
          </span>
        )}

        <div className="ml-4 hidden items-center gap-4 text-sm text-muted-foreground xl:flex" aria-label="Colour key">
          <Legend urgency="ok" label={`Under ${WARN_MIN}m`} />
          <Legend urgency="warn" label={`${WARN_MIN}–${LATE_MIN}m`} />
          <Legend urgency="late" label={`${LATE_MIN}m+`} />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-full", isError ? "bg-destructive" : "bg-primary")} aria-hidden />
            {isError ? "Reconnecting…" : "Live"}
          </span>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {now ? new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </p>
          <BarButton onClick={toggleTheme} label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </BarButton>
          <BarButton onClick={toggleSound} label={soundOn ? "Mute new-order chime" : "Turn on new-order chime"} active={soundOn}>
            {soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </BarButton>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Lane title="New" icon={Inbox} orders={visible.filter((o) => o.status === "NEW")} empty="No new orders" loading={isLoading || now === null}>
          {(order) => <KitchenTicket key={order.id} order={order} now={now!} highlighted={highlighted} fresh={fresh.has(order.id)} />}
        </Lane>
        <Lane title="Cooking" icon={Flame} orders={visible.filter((o) => o.status === "PROCESSING")} empty="Nothing on the stove" loading={isLoading || now === null}>
          {(order) => <KitchenTicket key={order.id} order={order} now={now!} highlighted={highlighted} fresh={fresh.has(order.id)} />}
        </Lane>
      </main>

      <footer className="flex shrink-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto" aria-label="Items to cook">
          {itemTotals.map(([name, qty]) => (
            <button
              key={name}
              type="button"
              aria-pressed={highlighted.has(name)}
              onClick={() => toggleHighlight(name)}
              className={cn(
                "shrink-0 rounded-lg border px-4 py-2.5 text-base transition-colors",
                highlighted.has(name)
                  ? "border-transparent bg-foreground text-background"
                  : "border-border bg-card text-card-foreground hover:bg-accent",
              )}
            >
              <span className="font-semibold tabular-nums">{qty}</span> {name}
            </button>
          ))}
        </div>
        <BarButton onClick={toggleFullscreen} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
          {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </BarButton>
      </footer>
      <Toaster position="top-center" />
    </div>
  )
}

function BarButton({
  onClick,
  asLink,
  label,
  active,
  children,
}: {
  onClick?: () => void
  asLink?: string
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  const className = cn(
    "flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-accent",
    active ? "text-primary-foreground bg-primary hover:bg-primary/90" : "text-foreground",
  )
  if (asLink) {
    return (
      <Link href={asLink} aria-label={label} title={label} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={active} className={className}>
      {children}
    </button>
  )
}

function Lane({
  title,
  icon: Icon,
  orders,
  empty,
  loading,
  children,
}: {
  title: string
  icon: LucideIcon
  orders: Order[]
  empty: string
  loading: boolean
  children: (order: Order) => React.ReactNode
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg bg-background/60 dark:bg-card/40" aria-label={title}>
      <h2 className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3 text-lg font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-5" aria-hidden />
        {title}
        <span className="rounded-full bg-foreground px-2.5 text-base tabular-nums text-background">{orders.length}</span>
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1">
        {loading ? (
          <div className="columns-[18rem] gap-4">
            {[200, 280, 160].map((h, i) => (
              <div key={i} className="mb-4 animate-pulse rounded-lg bg-foreground/10" style={{ height: h }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Icon className="size-10" strokeWidth={1.5} aria-hidden />
            <p className="text-lg">{empty}</p>
          </div>
        ) : (
          <div className="columns-[18rem] gap-4">{orders.map(children)}</div>
        )}
      </div>
    </section>
  )
}

function Legend({ urgency, label }: { urgency: Urgency; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-full", URGENCY_STYLES[urgency])} aria-hidden />
      {label}
    </span>
  )
}
