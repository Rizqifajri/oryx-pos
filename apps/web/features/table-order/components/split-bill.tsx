"use client"

import { useEffect, useMemo, useState } from "react"
import { CircleCheck, Clock, Loader2, Minus, Plus, QrCode, Store, Users } from "lucide-react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
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
import { formatRupiah } from "../format"
import {
  useCancelSplit,
  usePayShare,
  usePaymentStatus,
  useServiceRequest,
  useSplitBill,
} from "../hooks"
import type { BillPayment, BillShare, SessionView } from "../types"

const MODES: { value: SplitMode; label: string; hint: string }[] = [
  { value: "equal", label: "Rata", hint: "Total dibagi sama rata" },
  { value: "items", label: "Per item", hint: "Tiap orang bayar pesanannya" },
  { value: "custom", label: "Nominal", hint: "Tentukan jumlah tiap bagian" },
]

/** Opens Midtrans Snap for a (share) payment; falls back to the redirect URL. */
export function openSnap(payment: BillPayment, onDone: () => void) {
  if (!payment.snapToken) return
  if (!window.snap) {
    if (payment.snapRedirectUrl) window.location.href = payment.snapRedirectUrl
    else toast.error("Halaman pembayaran belum siap. Coba lagi sebentar.")
    return
  }
  window.snap.pay(payment.snapToken, {
    onSuccess: onDone,
    onPending: onDone,
    onError: () => toast.error("Pembayaran gagal. Coba lagi atau bayar di kasir."),
  })
}

function billItems(view: SessionView): SplitItem[] {
  return view.orders
    .filter((o) => o.status !== "CANCELED")
    .flatMap((o) => o.items.map((i) => ({ id: i.id, name: i.menuName, quantity: i.quantity, price: i.price })))
}

function CountStepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-[12px] bg-pm-bg px-3 py-2">
      <span className="text-[13px] font-semibold">{label}</span>
      <div className="inline-flex h-9 items-center rounded-full bg-pm-ink text-white">
        <button type="button" aria-label="Kurangi" disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center disabled:opacity-40">
          <Minus className="size-3.5" />
        </button>
        <span className="min-w-6 text-center text-[14px] font-bold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" aria-label="Tambah" disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center disabled:opacity-40">
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Sheet to split the table bill: evenly, by items, or custom amounts. */
export function SplitBillSheet({ view, open, onOpenChange }: { view: SessionView; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="public-menu mx-auto max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[20px] border-pm-line bg-pm-surface p-0 sm:bottom-6 sm:max-w-[560px] sm:rounded-[20px]"
      >
        {open && <SplitEditor view={view} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function SplitEditor({ view, onDone }: { view: SessionView; onDone: () => void }) {
  const total = view.bill.totalAmount
  const items = useMemo(() => billItems(view), [view])
  const units = useMemo(() => expandUnits(items), [items])
  const split = useSplitBill()

  const [mode, setMode] = useState<SplitMode>("equal")
  const [count, setCount] = useState(2)
  const [names, setNames] = useState<string[]>([])
  const [assignment, setAssignment] = useState<UnitAssignment>(() =>
    Object.fromEntries(units.map((u) => [u.key, 0])),
  )
  const [custom, setCustom] = useState<string[]>([])

  const labels = Array.from({ length: count }, (_, i) => names[i] ?? "")
  const customState = customAmounts(Array.from({ length: count }, (_, i) => custom[i] ?? ""), total)
  const itemState = itemAmounts(items, assignment, count, total)
  const amounts =
    mode === "equal" ? equalAmounts(total, count) : mode === "items" ? itemState.amounts : customState.cents

  const problem =
    mode === "items" && itemState.emptyShares.some(Boolean)
      ? "Setiap bagian harus punya minimal satu item."
      : mode === "custom" && customState.remaining !== 0
        ? customState.remaining > 0
          ? `Masih kurang ${formatRupiah(customState.remaining)}`
          : `Kelebihan ${formatRupiah(-customState.remaining)}`
        : mode === "custom" && customState.cents.some((c) => c <= 0)
          ? "Setiap bagian harus lebih dari Rp 0."
          : null

  function submit() {
    const named = labels.map((l) => l.trim() || undefined)
    const payload: SplitPayload =
      mode === "equal"
        ? { mode, count }
        : mode === "items"
          ? itemsPayload(items, assignment, labels)
          : { mode, shares: customState.cents.map((amount, i) => ({ label: named[i], amount })) }
    split.mutate(payload, {
      onSuccess: () => {
        toast.success(`Tagihan dibagi jadi ${count} bagian`)
        onDone()
      },
      onError: (e) => toast.error(e.message),
    })
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-4 p-4">
        <div>
          <SheetTitle className="text-[17px] font-bold text-pm-ink">Bagi tagihan</SheetTitle>
          <SheetDescription className="text-[12px] text-pm-muted">
            Total {formatRupiah(total)}. Setelah dibagi, pesanan baru dijeda sampai semua bagian lunas.
          </SheetDescription>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-full bg-pm-surface-muted p-1" role="radiogroup" aria-label="Cara membagi">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              onClick={() => {
                setMode(m.value)
                setCount((c) => Math.min(c, m.value === "items" ? 6 : 10))
              }}
              className={cn(
                "h-9 rounded-full text-[12px] font-bold",
                mode === m.value ? "bg-pm-ink text-white" : "text-pm-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="-mt-2 text-center text-[11px] text-pm-muted">{MODES.find((m) => m.value === mode)!.hint}</p>

        <CountStepper label="Jumlah bagian" value={count} min={2} max={mode === "items" ? 6 : 10} onChange={(n) => {
          setCount(n)
          // Units assigned to a share that no longer exists go back to share 1.
          setAssignment((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v >= n ? 0 : v])))
        }} />

        {mode === "items" && (
          <section aria-label="Pilih item per bagian" className="space-y-1.5">
            <p className="text-[12px] font-semibold">Siapa bayar apa?</p>
            <ul className="divide-y divide-pm-line rounded-[12px] bg-pm-bg">
              {units.map(({ key, item }) => (
                <li key={key} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="block truncate font-semibold">{item.name}</span>
                    <span className="text-[11px] text-pm-muted tabular-nums">{formatRupiah(item.price)}</span>
                  </span>
                  <div className="flex gap-1" role="radiogroup" aria-label={`Bagian untuk ${item.name}`}>
                    {Array.from({ length: count }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={assignment[key] === i}
                        aria-label={labels[i]?.trim() || `Bagian ${i + 1}`}
                        onClick={() => setAssignment((a) => ({ ...a, [key]: i }))}
                        className={cn(
                          "grid size-8 place-items-center rounded-full text-[12px] font-bold tabular-nums",
                          assignment[key] === i ? "bg-pm-ink text-white" : "bg-pm-surface text-pm-muted",
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Rincian bagian" className="space-y-1.5">
          <p className="text-[12px] font-semibold">Bagian</p>
          <ul className="space-y-1.5">
            {labels.map((name, i) => (
              <li key={i} className="flex items-center gap-2 rounded-[12px] bg-pm-bg px-3 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pm-surface text-[12px] font-bold tabular-nums">{i + 1}</span>
                <input
                  value={name}
                  onChange={(e) => {
                    const next = [...labels]
                    next[i] = e.target.value.slice(0, 40)
                    setNames(next)
                  }}
                  placeholder={`Nama (opsional)`}
                  aria-label={`Nama bagian ${i + 1}`}
                  className="h-9 min-w-0 flex-1 rounded-[10px] bg-pm-surface px-2.5 text-[13px] outline-none placeholder:text-pm-subtle"
                />
                {mode === "custom" ? (
                  <label className="flex h-9 w-32 items-center gap-1 rounded-[10px] bg-pm-surface px-2.5 text-[13px]">
                    <span className="text-pm-muted">Rp</span>
                    <input
                      inputMode="numeric"
                      value={custom[i] ?? ""}
                      onChange={(e) => setCustom((all) => { const next = Array.from({ length: count }, (_, j) => all[j] ?? ""); next[i] = e.target.value.replace(/\D/g, ""); return next })}
                      aria-label={`Nominal bagian ${i + 1}`}
                      className="w-full min-w-0 bg-transparent text-right font-bold tabular-nums outline-none"
                    />
                  </label>
                ) : (
                  <span className="w-28 text-right text-[14px] font-extrabold tabular-nums">{formatRupiah(amounts[i] ?? 0)}</span>
                )}
              </li>
            ))}
          </ul>
          {mode === "custom" && customState.remaining > 0 && (
            <button
              type="button"
              onClick={() => setCustom(() => {
                const next = Array.from({ length: count }, (_, j) => custom[j] ?? "")
                const last = count - 1
                next[last] = String(Math.round((customState.cents[last]! + customState.remaining) / 100))
                return next
              })}
              className="text-[12px] font-bold text-pm-ink underline underline-offset-4"
            >
              Isi sisa ke bagian terakhir
            </button>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 space-y-2 border-t border-pm-line bg-pm-surface p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        {problem && <p role="alert" className="text-center text-[12px] font-semibold text-pm-danger">{problem}</p>}
        <button
          type="button"
          disabled={!!problem || split.isPending}
          onClick={submit}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-pm-ink text-[14px] font-bold text-white disabled:opacity-50"
        >
          {split.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Bagi jadi {count} bagian
        </button>
      </div>
    </div>
  )
}

/** A split bill: each share with its status and pay buttons. */
export function SplitSharesPanel({ view }: { view: SessionView }) {
  const { bill } = view
  const [editing, setEditing] = useState(false)
  const cancel = useCancelSplit()
  const paid = bill.shares.filter((s) => s.status === "paid").length
  const itemName = new Map(view.orders.flatMap((o) => o.items.map((i) => [i.id, i.menuName] as const)))

  return (
    <section aria-label="Tagihan dibagi" className="space-y-3">
      <div className="flex items-center gap-2 rounded-[14px] bg-pm-surface p-3 shadow-pm-card">
        <span className="grid size-9 place-items-center rounded-full bg-pm-surface-muted" aria-hidden>
          <Users className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">Tagihan dibagi {bill.shares.length}</p>
          <p className="text-[12px] text-pm-muted tabular-nums">{paid} dari {bill.shares.length} bagian lunas</p>
        </div>
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-pm-surface-muted" aria-hidden>
          <div className="h-full rounded-full bg-pm-success" style={{ width: `${(paid / bill.shares.length) * 100}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {bill.shares.map((share) => (
          <li key={share.id}>
            <ShareCard share={share} billId={bill.id!} itemName={itemName} />
          </li>
        ))}
      </ul>

      {paid === 0 && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="h-11 flex-1 rounded-full bg-pm-surface-muted text-[13px] font-bold">
            Ubah pembagian
          </button>
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(undefined, {
              onSuccess: () => toast("Pembagian dibatalkan. Anda bisa memesan lagi."),
              onError: (e) => toast.error(e.message),
            })}
            className="h-11 flex-1 rounded-full text-[13px] font-bold text-pm-danger"
          >
            Batalkan pembagian
          </button>
        </div>
      )}
      <SplitBillSheet view={view} open={editing} onOpenChange={setEditing} />
    </section>
  )
}

function useCountdown(iso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!iso) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [iso])
  if (!iso) return null
  const s = Math.max(0, Math.floor((Date.parse(iso) - now) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function ShareCard({ share, billId, itemName }: { share: BillShare; billId: string; itemName: Map<string, string> }) {
  const pay = usePayShare()
  const askCashier = useServiceRequest()
  const [verifying, setVerifying] = useState(false)
  const inFlight = share.status === "pending" ? share.payment : null
  usePaymentStatus(inFlight?.id, !!inFlight)
  const countdown = useCountdown(inFlight?.expiresAt)
  const isPaid = share.status === "paid"

  function payOnline() {
    if (inFlight) return openSnap(inFlight, () => setVerifying(true))
    pay.mutate({ billId, shareId: share.id }, {
      onSuccess: (res) => openSnap(res.payment, () => setVerifying(true)),
      onError: (e) => toast.error(e.message),
    })
  }

  return (
    <article className={cn("rounded-[14px] bg-pm-surface p-3 shadow-pm-card", isPaid && "opacity-75")}>
      <header className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[14px] font-bold">{share.label}</h3>
        <span className="text-[15px] font-extrabold tabular-nums">{formatRupiah(share.amount)}</span>
      </header>
      {share.items.length > 0 && (
        <p className="mt-0.5 text-[12px] text-pm-muted">
          {share.items.map((i) => `${i.quantity}× ${itemName.get(i.orderItemId) ?? "Item"}`).join(", ")}
        </p>
      )}
      {isPaid ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-pm-best">
          <CircleCheck className="size-4" aria-hidden /> Lunas
        </p>
      ) : verifying && inFlight ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-pm-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Memverifikasi pembayaran…
        </p>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={pay.isPending}
            onClick={payOnline}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-pm-ink text-[12px] font-bold text-white disabled:opacity-50"
          >
            <QrCode className="size-3.5" aria-hidden />
            {inFlight ? "Lanjutkan bayar" : "Bayar online"}
          </button>
          <button
            type="button"
            disabled={askCashier.isPending}
            onClick={() => askCashier.mutate("bill", {
              onSuccess: () => toast.success("Kasir akan datang ke meja"),
              onError: (e) => toast.error(e.message),
            })}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-pm-surface-muted text-[12px] font-bold"
          >
            <Store className="size-3.5" aria-hidden /> Bayar di kasir
          </button>
        </div>
      )}
      {inFlight && countdown && !isPaid && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-pm-muted tabular-nums">
          <Clock className="size-3" aria-hidden /> QR berlaku {countdown}
        </p>
      )}
    </article>
  )
}
