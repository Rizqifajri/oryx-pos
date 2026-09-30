"use client"

import { useEffect, useState } from "react"
import { BellRing, GlassWater, type LucideIcon, ReceiptText, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useServiceRequest, useSessionView } from "../hooks"
import type { ServiceRequestType } from "../types"

const ACTIONS: { type: ServiceRequestType; label: string; hint: string; icon: LucideIcon }[] = [
  { type: "call_waiter", label: "Panggil pelayan", hint: "Pelayan akan datang ke meja", icon: BellRing },
  { type: "water", label: "Minta air putih", hint: "Air mineral untuk meja", icon: GlassWater },
  { type: "cutlery", label: "Minta alat makan", hint: "Sendok, garpu, sumpit, tisu", icon: UtensilsCrossed },
  { type: "bill", label: "Minta tagihan", hint: "Kasir membawa tagihan ke meja", icon: ReceiptText },
]

const SUCCESS: Record<ServiceRequestType, string> = {
  call_waiter: "Pelayan sedang menuju meja Anda",
  water: "Permintaan air putih terkirim",
  cutlery: "Permintaan alat makan terkirim",
  bill: "Kasir akan membawa tagihan",
}

/** Seconds until each request type may be sent again (60s anti-spam). */
function useCooldowns(local: Partial<Record<ServiceRequestType, string>>) {
  const { data: view } = useSessionView()
  const [now, setNow] = useState(() => Date.now())
  const merged = { ...view?.serviceCooldowns, ...local }
  const remaining = (type: ServiceRequestType) => {
    const until = merged[type]
    return until ? Math.max(0, Math.ceil((Date.parse(until) - now) / 1000)) : 0
  }
  const anyActive = ACTIONS.some((a) => remaining(a.type) > 0)
  useEffect(() => {
    if (!anyActive) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [anyActive])
  return remaining
}

/** Quick service actions, each rate-limited with a visible countdown. */
export function HelpActions({ className }: { className?: string }) {
  const { data: view } = useSessionView()
  const { mutate, isPending, variables } = useServiceRequest()
  const [local, setLocal] = useState<Partial<Record<ServiceRequestType, string>>>({})
  const remaining = useCooldowns(local)
  const closed = view?.session.status === "closed"

  function send(type: ServiceRequestType) {
    mutate(type, {
      onSuccess: (res) => {
        setLocal((l) => ({ ...l, [type]: res.retryAt }))
        toast.success(SUCCESS[type])
      },
      onError: (error) => {
        const retryAt = (error.details as { retryAt?: string } | undefined)?.retryAt
        if (retryAt) setLocal((l) => ({ ...l, [type]: retryAt }))
        toast.error(error.message)
      },
    })
  }

  return (
    <ul className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {ACTIONS.map((action) => {
        const wait = remaining(action.type)
        const sending = isPending && variables === action.type
        const Icon = action.icon
        return (
          <li key={action.type}>
            <button
              type="button"
              disabled={wait > 0 || sending || closed}
              onClick={() => send(action.type)}
              className="flex w-full items-center gap-3 rounded-[14px] bg-pm-surface p-3 text-left shadow-pm-card disabled:opacity-60"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pm-surface-muted">
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] leading-[19px] font-bold">{action.label}</span>
                <span className="block truncate text-[12px] leading-[16px] text-pm-muted">
                  {sending ? "Mengirim…" : wait > 0 ? `Terkirim · kirim lagi dalam ${wait} dtk` : action.hint}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function HelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="public-menu mx-auto gap-0 rounded-t-[20px] border-pm-line bg-pm-bg p-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:bottom-6 sm:max-w-[560px] sm:rounded-[20px]"
      >
        <SheetTitle className="text-[16px] font-bold text-pm-ink">Panggil Pelayan</SheetTitle>
        <SheetDescription className="mb-4 text-[12px] text-pm-muted">
          Permintaan langsung masuk ke staf kami.
        </SheetDescription>
        <HelpActions />
      </SheetContent>
    </Sheet>
  )
}
