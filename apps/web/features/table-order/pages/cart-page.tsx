"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ImageIcon, Loader2, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { usePaymentCalculation } from "@/features/cart/hooks/use-payment-calculation"
import { useGuestCart } from "../cart-store"
import { formatRupiah, orderRef } from "../format"
import { tableOrderKeys, useSessionView, useSubmitOrder } from "../hooks"
import { newIdempotencyKey } from "../idempotency"
import { useGuest } from "../session-context"
import { SubPageHeader } from "../components/menu-header"
import { Stepper } from "../components/primitives"
import { Banner } from "./menu-page"

type LineIssue = "unavailable" | "price_changed"

/** Lihat Pesanan — review the cart and send it to the kitchen. */
export function CartPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { guest, basePath } = useGuest()
  const cart = useGuestCart()
  const { data: view } = useSessionView()
  const submit = useSubmitOrder()
  const { tax, service, totalPayment } = usePaymentCalculation(cart.subtotal)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [issues, setIssues] = useState<Record<string, LineIssue>>({})

  // One key per cart content: a retry of the same cart (double tap, timeout)
  // reuses it so the server creates a single order; any edit gets a new key.
  const signature = JSON.stringify([cart.lines.map((l) => [l.lineId, l.quantity, l.unitPrice]), cart.note])
  const [submitKey, setSubmitKey] = useState(() => ({ signature, key: newIdempotencyKey() }))
  if (submitKey.signature !== signature) {
    setSubmitKey({ signature, key: newIdempotencyKey() })
  }

  const tenantOpen = view?.tenant?.isOpen ?? guest.tenant.isOpen
  const sessionStatus = view?.session.status ?? "open"
  const blocking = cart.lines.some((l) => issues[l.menuId] === "unavailable")
  const canSubmit = tenantOpen && sessionStatus === "open" && !blocking && cart.lines.length > 0

  function send() {
    submit.mutate(
      {
        idempotencyKey: submitKey.key,
        note: cart.note.trim(),
        lines: cart.lines.map((l) => ({
          menuId: l.menuId,
          quantity: l.quantity,
          note: l.note || undefined,
          unitPrice: l.unitPrice,
        })),
      },
      {
        onSuccess: (order) => {
          setConfirmOpen(false)
          cart.clear()
          toast.success("Pesanan dikirim ke dapur", {
            description: `Nomor pesanan ${orderRef(order.id)}`,
          })
          router.push(`${basePath}/bill`)
        },
        onError: (error) => {
          setConfirmOpen(false)
          const lines = (error.details as { lines?: { menuId: string; price?: number }[] } | undefined)?.lines ?? []
          if (error.code === "ITEM_UNAVAILABLE") {
            setIssues(Object.fromEntries(lines.map((l) => [l.menuId, "unavailable" as const])))
            toast.error("Beberapa menu sudah habis. Hapus dari pesanan untuk melanjutkan.")
            void qc.invalidateQueries({ queryKey: tableOrderKeys.menu(guest.tenant.id) })
          } else if (error.code === "PRICE_CHANGED") {
            for (const l of lines) if (l.price !== undefined) cart.repriceItem(l.menuId, l.price)
            setIssues(Object.fromEntries(lines.map((l) => [l.menuId, "price_changed" as const])))
            toast.error("Harga beberapa menu berubah. Periksa total lalu kirim ulang.")
            void qc.invalidateQueries({ queryKey: tableOrderKeys.menu(guest.tenant.id) })
          } else if (error.isNetwork) {
            toast.error("Pesanan gagal dikirim. Periksa koneksi lalu coba lagi.")
          } else {
            toast.error(error.message)
          }
        },
      },
    )
  }

  if (cart.hydrated && cart.lines.length === 0) {
    return (
      <>
        <SubPageHeader title="Pesanan Anda" backHref={basePath} />
        <main className="mx-auto flex min-h-[60dvh] max-w-[420px] flex-col items-center justify-center px-6 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-pm-surface-muted" aria-hidden>
            <ShoppingBag className="size-7" strokeWidth={1.5} />
          </div>
          <h2 className="mt-4 text-[18px] font-bold">Keranjang masih kosong</h2>
          <p className="mt-1.5 text-[13px] text-pm-muted">Pilih menu favorit Anda terlebih dahulu.</p>
          <Link
            href={basePath}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-pm-ink px-5 text-[13px] font-bold text-white"
          >
            Lihat menu
          </Link>
        </main>
      </>
    )
  }

  return (
    <>
      <SubPageHeader title="Pesanan Anda" backHref={basePath} />

      <main className={cn("mx-auto max-w-[720px] space-y-3 px-3 pt-3 sm:px-4", "pb-[calc(56px+84px+24px+env(safe-area-inset-bottom))]")}>
        {!tenantOpen && <Banner icon={null}>Dapur sedang tutup. Pesanan belum bisa dikirim.</Banner>}
        {sessionStatus === "billing" && (
          <Banner icon={null}>
            Tagihan sedang dibayar.{" "}
            <Link href={`${basePath}/bill`} className="font-bold underline underline-offset-2">
              Batalkan pembayaran
            </Link>{" "}
            untuk menambah pesanan.
          </Banner>
        )}

        <ul className="divide-y divide-pm-line overflow-hidden rounded-[14px] bg-pm-surface shadow-pm-card">
          {cart.lines.map((line) => {
            const issue = issues[line.menuId]
            return (
              <li key={line.lineId} className={cn("flex gap-3 p-3", issue && "bg-[#FBEFEC]")}>
                <div className="size-12 shrink-0 overflow-hidden rounded-[8px] bg-pm-surface-muted">
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-pm-subtle">
                      <ImageIcon className="size-4" aria-hidden />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-[19px] font-bold">{line.name}</p>
                  {line.note && (
                    <p className="text-[12px] leading-[16px] text-pm-muted italic">“{line.note}”</p>
                  )}
                  <p className="text-[12px] leading-[16px] text-pm-muted tabular-nums">
                    {formatRupiah(line.unitPrice)} / porsi
                  </p>
                  {issue === "unavailable" && (
                    <p className="mt-1 text-[12px] font-semibold text-pm-danger">
                      Menu ini sudah habis.{" "}
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => cart.removeItem(line.menuId)}
                      >
                        Hapus
                      </button>
                    </p>
                  )}
                  {issue === "price_changed" && (
                    <p className="mt-1 text-[12px] font-semibold text-pm-danger">Harga diperbarui.</p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Stepper
                      quantity={line.quantity}
                      name={line.name}
                      onDecrement={() => cart.setQuantity(line.lineId, line.quantity - 1)}
                      onIncrement={() => cart.setQuantity(line.lineId, line.quantity + 1)}
                    />
                    <span className="text-[14px] font-extrabold tabular-nums">
                      {formatRupiah(line.unitPrice * line.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <Link href={basePath} className="block text-center text-[12px] font-bold text-pm-ink underline underline-offset-4">
          + Tambah menu lain
        </Link>

        <label className="block rounded-[14px] bg-pm-surface p-3 shadow-pm-card">
          <span className="text-[12px] font-semibold">Catatan pesanan (opsional)</span>
          <textarea
            value={cart.note}
            onChange={(e) => cart.setNote(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="Contoh: sajikan bersamaan"
            className="mt-1.5 w-full resize-none rounded-[12px] bg-pm-surface-muted px-3 py-2 text-[13px] outline-none placeholder:text-pm-subtle"
          />
        </label>

        <section aria-label="Ringkasan" className="space-y-1.5 rounded-[14px] bg-pm-surface p-3 text-[13px] shadow-pm-card">
          <Row label="Subtotal" value={formatRupiah(cart.subtotal)} />
          <Row label="Pajak Restoran (10%)" value={formatRupiah(tax)} muted />
          <Row label="Service Charge (5%)" value={formatRupiah(service)} muted />
          <div className="border-t border-pm-line pt-1.5">
            <Row label="Estimasi total" value={formatRupiah(totalPayment)} strong />
          </div>
          <p className="text-[11px] leading-[15px] text-pm-muted">
            Harga dihitung ulang oleh sistem saat pesanan dikirim. Bayar sekali untuk semua pesanan meja di
            Tagihan Meja.
          </p>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t border-pm-line bg-pm-bg/95 px-3 py-3 backdrop-blur sm:px-4">
        <button
          type="button"
          disabled={!canSubmit || submit.isPending}
          onClick={() => setConfirmOpen(true)}
          className="mx-auto flex h-13 w-full max-w-[720px] items-center justify-between rounded-full bg-pm-ink px-5 text-[14px] font-bold text-white disabled:bg-pm-surface-muted disabled:text-pm-subtle"
        >
          <span>Kirim Pesanan</span>
          <span className="tabular-nums">
            {cart.itemCount} item · {formatRupiah(cart.subtotal)}
          </span>
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => !submit.isPending && setConfirmOpen(open)}>
        <DialogContent showCloseButton={false} className="public-menu max-w-[calc(100%-32px)] rounded-[20px] bg-pm-surface sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold">Kirim pesanan ke dapur?</DialogTitle>
            <DialogDescription className="text-[13px] text-pm-muted">
              {cart.itemCount} item · {formatRupiah(cart.subtotal)}. Pesanan yang sudah diproses dapur tidak bisa
              dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <button
              type="button"
              disabled={submit.isPending}
              onClick={() => setConfirmOpen(false)}
              className="h-11 flex-1 rounded-full bg-pm-surface-muted text-[13px] font-bold"
            >
              Periksa lagi
            </button>
            <button
              type="button"
              disabled={submit.isPending}
              onClick={send}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-pm-ink text-[13px] font-bold text-white"
            >
              {submit.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {submit.isPending ? "Mengirim…" : "Kirim"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div className={cn("flex justify-between gap-3", muted && "text-pm-muted", strong && "text-[15px] font-extrabold")}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
