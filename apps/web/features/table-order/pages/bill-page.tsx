"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CircleCheck, Clock, Loader2, QrCode, ReceiptText, Store } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatClock, formatRupiah, orderRef, tableLabel } from "../format"
import {
  useCancelBillPayment,
  useCancelOrder,
  useCreateBillPayment,
  useLockBill,
  usePaymentStatus,
  useSessionView,
} from "../hooks"
import { useGuest } from "../session-context"
import type { Bill, BillPayment, SessionOrder, SessionView } from "../types"
import { SubPageHeader } from "../components/menu-header"
import { OrderStatusChip } from "../components/primitives"
import { TAB_BAR_SPACE } from "../components/bottom-bars"
import { Row } from "./cart-page"

/** Tagihan Meja — every round at this table, the running bill and payment. */
export function BillPage() {
  const { data: view, isLoading } = useSessionView()

  return (
    <>
      <SubPageHeader title="Tagihan Meja" />
      <main className={cn("mx-auto max-w-[720px] space-y-3 px-3 pt-3 sm:px-4", TAB_BAR_SPACE)}>
        {isLoading || !view ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[14px] bg-pm-surface" />
            ))}
          </div>
        ) : view.bill.status === "paid" ? (
          <Receipt view={view} />
        ) : (
          <OpenBill view={view} />
        )}
      </main>
    </>
  )
}

function OpenBill({ view }: { view: SessionView }) {
  const { basePath } = useGuest()
  const rounds = view.orders
  const billable = rounds.filter((o) => o.status !== "CANCELED")

  if (rounds.length === 0) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center text-center">
        <div className="grid size-16 place-items-center rounded-full bg-pm-surface-muted" aria-hidden>
          <ReceiptText className="size-7" strokeWidth={1.5} />
        </div>
        <h2 className="mt-4 text-[18px] font-bold">Belum ada pesanan</h2>
        <p className="mt-1.5 text-[13px] text-pm-muted">Pesanan yang dikirim dari meja ini akan muncul di sini.</p>
        <Link
          href={basePath}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-pm-ink px-5 text-[13px] font-bold text-white"
        >
          Lihat menu
        </Link>
      </div>
    )
  }

  return (
    <>
      <ol className="space-y-3">
        {rounds.map((order, index) => (
          <li key={order.id}>
            <RoundCard order={order} index={index + 1} canCancel={view.session.status === "open"} />
          </li>
        ))}
      </ol>

      {billable.length > 0 && (
        <>
          <Charges bill={view.bill} />
          <PaymentPanel view={view} />
        </>
      )}
    </>
  )
}

function RoundCard({ order, index, canCancel }: { order: SessionOrder; index: number; canCancel: boolean }) {
  const cancel = useCancelOrder()
  const [confirming, setConfirming] = useState(false)
  const cancelled = order.status === "CANCELED"

  return (
    <article className={cn("rounded-[14px] bg-pm-surface p-3 shadow-pm-card", cancelled && "opacity-60")}>
      <header className="flex items-center gap-2">
        <h2 className="text-[14px] font-bold">Pesanan ke-{index}</h2>
        <span className="text-[11px] text-pm-muted tabular-nums">
          {formatClock(order.submittedAt)} · {orderRef(order.id)}
        </span>
        <span className="ml-auto">
          <OrderStatusChip status={order.status} />
        </span>
      </header>
      <ul className="mt-2 space-y-1.5">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-2 text-[13px] leading-[18px]">
            <span className="w-6 shrink-0 font-semibold tabular-nums">{item.quantity}×</span>
            <span className="min-w-0 flex-1">
              {item.menuName}
              {item.note && <span className="block text-[12px] text-pm-muted italic">“{item.note}”</span>}
            </span>
            <span className="tabular-nums">{formatRupiah(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-2 text-[12px] text-pm-muted">Catatan: {order.note}</p>}

      {order.status === "NEW" && canCancel && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-pm-line pt-2">
          {confirming ? (
            <>
              <span className="mr-auto text-[12px] text-pm-muted">Batalkan pesanan ini?</span>
              <button type="button" onClick={() => setConfirming(false)} className="h-8 rounded-full px-3 text-[12px] font-bold">
                Tidak
              </button>
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(order.id, {
                    onSuccess: () => toast.success("Pesanan dibatalkan"),
                    onError: (e) => toast.error(e.message),
                    onSettled: () => setConfirming(false),
                  })
                }
                className="h-8 rounded-full bg-pm-danger px-3 text-[12px] font-bold text-white"
              >
                Ya, batalkan
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="h-8 rounded-full px-3 text-[12px] font-bold text-pm-danger"
            >
              Batalkan
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function Charges({ bill }: { bill: Bill }) {
  return (
    <section aria-label="Rincian tagihan" className="space-y-1.5 rounded-[14px] bg-pm-surface p-3 text-[13px] shadow-pm-card">
      <Row label="Subtotal" value={formatRupiah(bill.subtotal)} />
      <Row label="Pajak Restoran (10%)" value={formatRupiah(bill.taxAmount)} muted />
      <Row label="Service Charge (5%)" value={formatRupiah(bill.serviceAmount)} muted />
      <div className="border-t border-pm-line pt-1.5">
        <Row label="Total" value={formatRupiah(bill.totalAmount)} strong />
      </div>
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

/**
 * Pay online (Midtrans Snap: QRIS / e-wallet) or ask the cashier. The page
 * only ever *shows* "paid" once the server says so (webhook/reconciliation).
 */
function PaymentPanel({ view }: { view: SessionView }) {
  const { bill } = view
  const lock = useLockBill()
  const create = useCreateBillPayment()
  const cancel = useCancelBillPayment()
  const [verifying, setVerifying] = useState(false)

  const pendingOnline =
    bill.status === "locked" && bill.paymentMethod === "online" && bill.payment?.status === "pending"
      ? bill.payment
      : null
  usePaymentStatus(pendingOnline?.id, !!pendingOnline)
  const countdown = useCountdown(pendingOnline?.expiresAt)
  const busy = lock.isPending || create.isPending || cancel.isPending

  function openSnap(payment: BillPayment) {
    if (!payment.snapToken) return
    if (!window.snap) {
      if (payment.snapRedirectUrl) window.location.href = payment.snapRedirectUrl
      else toast.error("Halaman pembayaran belum siap. Coba lagi sebentar.")
      return
    }
    window.snap.pay(payment.snapToken, {
      onSuccess: () => setVerifying(true),
      onPending: () => setVerifying(true),
      onError: () => toast.error("Pembayaran gagal. Coba lagi atau bayar di kasir."),
    })
  }

  async function start(method: "online" | "cashier") {
    try {
      const locked = bill.status === "locked" && bill.paymentMethod === method ? bill : await lock.mutateAsync(method)
      const result = await create.mutateAsync({ billId: locked.id!, method })
      if (method === "online" && result.payment) openSnap(result.payment)
      if (method === "cashier") toast.success("Kasir akan datang membawa tagihan")
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  function cancelPayment() {
    if (!bill.id) return
    setVerifying(false)
    cancel.mutate(bill.id, {
      onSuccess: () => toast("Pembayaran dibatalkan. Anda bisa memesan lagi."),
      onError: (e) => toast.error(e.message),
    })
  }

  if (bill.status === "locked" && bill.paymentMethod === "cashier") {
    return (
      <PanelShell icon={<Store className="size-5" aria-hidden />} title="Menunggu kasir">
        <p>Staf kami akan datang ke meja membawa tagihan. Bayar tunai, kartu, atau QRIS kasir.</p>
        <div className="mt-3 flex gap-2">
          <SecondaryButton onClick={() => void start("online")} disabled={busy}>
            Bayar online saja
          </SecondaryButton>
          <SecondaryButton onClick={cancelPayment} disabled={busy}>
            Batalkan
          </SecondaryButton>
        </div>
      </PanelShell>
    )
  }

  if (bill.status === "locked") {
    return (
      <PanelShell icon={<QrCode className="size-5" aria-hidden />} title={verifying ? "Memverifikasi pembayaran…" : "Menunggu pembayaran"}>
        {verifying ? (
          <p className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Kami sedang menunggu konfirmasi dari penyedia pembayaran.
          </p>
        ) : (
          <p>
            Selesaikan pembayaran {formatRupiah(bill.totalAmount)} lewat QRIS atau e-wallet.
            {countdown && (
              <span className="mt-1 flex items-center gap-1 font-semibold text-pm-ink tabular-nums">
                <Clock className="size-3.5" aria-hidden /> Berlaku {countdown}
              </span>
            )}
          </p>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <PrimaryButton
            disabled={busy}
            onClick={() => (pendingOnline ? openSnap(pendingOnline) : void start("online"))}
          >
            {pendingOnline ? "Lanjutkan pembayaran" : "Buat QR baru"}
          </PrimaryButton>
          <SecondaryButton onClick={() => void start("cashier")} disabled={busy}>
            Bayar di kasir
          </SecondaryButton>
          <SecondaryButton onClick={cancelPayment} disabled={busy}>
            Batalkan
          </SecondaryButton>
        </div>
        <p className="mt-2 text-[11px] text-pm-muted">Selama pembayaran berlangsung, pesanan baru dijeda.</p>
      </PanelShell>
    )
  }

  const kitchenBusy = view.orders.some((o) => o.status === "NEW" || o.status === "PROCESSING")
  return (
    <div className="space-y-2">
      {kitchenBusy && (
        <p className="text-center text-[12px] text-pm-muted">
          Sebagian pesanan masih disiapkan. Anda tetap bisa membayar sekarang.
        </p>
      )}
      <PrimaryButton disabled={busy} onClick={() => void start("online")} className="w-full">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <QrCode className="size-4" aria-hidden />}
        Bayar Sekarang · {formatRupiah(bill.totalAmount)}
      </PrimaryButton>
      <SecondaryButton disabled={busy} onClick={() => void start("cashier")} className="w-full">
        <Store className="size-4" aria-hidden /> Bayar di Kasir
      </SecondaryButton>
      <p className="text-center text-[11px] leading-[15px] text-pm-muted">
        Satu tagihan untuk semua tamu di meja ini. Setelah pembayaran dimulai, pesanan baru dijeda.
      </p>
    </div>
  )
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  other_qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  debit: "Kartu debit",
  transfer: "Transfer",
  online: "Online",
  cashier: "Kasir",
}

function Receipt({ view }: { view: SessionView }) {
  const { guest, reopen } = useGuest()
  const { bill } = view
  const paidOrders = view.orders.filter((o) => o.status !== "CANCELED")
  const items = paidOrders.flatMap((o) => o.items)

  return (
    <>
      <section className="rounded-[14px] bg-pm-surface p-5 text-center shadow-pm-card">
        <CircleCheck className="mx-auto size-10 text-pm-success" strokeWidth={1.5} aria-hidden />
        <h2 className="mt-2 text-[18px] font-bold">Pembayaran berhasil</h2>
        <p className="mt-1 text-[13px] text-pm-muted">
          {view.tenant?.name ?? guest.tenant.name} · {tableLabel(guest.table.name)}
        </p>
        <p className="text-[12px] text-pm-muted tabular-nums">
          {bill.paidAt && `${formatClock(bill.paidAt)} · `}
          {METHOD_LABEL[bill.paymentMethod ?? ""] ?? bill.paymentMethod}
          {bill.payment?.id && ` · Ref ${bill.payment.id.slice(-8).toUpperCase()}`}
        </p>
      </section>

      <section aria-label="Struk" className="rounded-[14px] bg-pm-surface p-3 text-[13px] shadow-pm-card">
        <p className="text-[12px] text-pm-muted">
          Pesanan {paidOrders.map((o) => orderRef(o.id)).join(", ")}
        </p>
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex gap-2">
              <span className="w-6 shrink-0 tabular-nums">{item.quantity}×</span>
              <span className="min-w-0 flex-1">{item.menuName}</span>
              <span className="tabular-nums">{formatRupiah(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1.5 border-t border-dashed border-pm-line pt-2">
          <Row label="Subtotal" value={formatRupiah(bill.subtotal)} />
          <Row label="Pajak Restoran (10%)" value={formatRupiah(bill.taxAmount)} muted />
          <Row label="Service Charge (5%)" value={formatRupiah(bill.serviceAmount)} muted />
          <Row label="Total dibayar" value={formatRupiah(bill.totalAmount)} strong />
        </div>
      </section>

      <p className="text-center text-[14px] font-semibold">Terima kasih! Sampai jumpa lagi.</p>
      {view.session.status === "closed" && (
        <button
          type="button"
          onClick={() => void reopen()}
          className="h-11 w-full rounded-full bg-pm-surface-muted text-[13px] font-bold"
        >
          Mulai pesanan baru
        </button>
      )}
    </>
  )
}

function PanelShell({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section role="status" className="rounded-[14px] bg-pm-surface p-4 text-[13px] leading-[19px] text-pm-muted shadow-pm-card">
      <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold text-pm-ink">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function PrimaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-pm-ink px-5 text-[14px] font-bold text-white tabular-nums disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

function SecondaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-pm-surface-muted px-4 text-[13px] font-bold text-pm-ink disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}
