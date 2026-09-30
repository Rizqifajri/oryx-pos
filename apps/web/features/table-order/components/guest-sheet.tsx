"use client"

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { formatClock, tableLabel } from "../format"
import { useLiveTenant, useSessionView } from "../hooks"
import { useGuest } from "../session-context"

const STATUS_LABEL = { open: "Aktif", billing: "Sedang membayar", closed: "Selesai" } as const

/** Profile button: what this device is connected to. */
export function GuestSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { guest, reopen } = useGuest()
  const { data: view } = useSessionView()
  const tenant = useLiveTenant()
  const rounds = view?.orders.filter((o) => o.status !== "CANCELED").length ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="public-menu mx-auto gap-0 rounded-t-[20px] border-pm-line bg-pm-surface p-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:bottom-6 sm:max-w-[520px] sm:rounded-[20px]"
      >
        <SheetTitle className="text-[16px] font-bold text-pm-ink">Sesi tamu</SheetTitle>
        <SheetDescription className="text-[12px] text-pm-muted">
          Semua tamu yang memindai QR {tableLabel(guest.table.name)} berbagi satu tagihan.
        </SheetDescription>

        <dl className="mt-4 divide-y divide-pm-line rounded-[12px] bg-pm-bg text-[13px]">
          {[
            ["Restoran", tenant.name],
            ["Meja", tableLabel(guest.table.name)],
            ["Status sesi", view ? STATUS_LABEL[view.session.status] : "…"],
            ["Dibuka", view ? formatClock(view.session.openedAt) : "…"],
            ["Pesanan terkirim", `${rounds} kali`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 px-3 py-2.5">
              <dt className="text-pm-muted">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-[12px] leading-[17px] text-pm-muted">
          Keranjang hanya tersimpan di perangkat ini sampai Anda menekan “Kirim Pesanan”.
        </p>

        <button
          type="button"
          onClick={() => {
            onOpenChange(false)
            void reopen()
          }}
          className="mt-4 h-11 w-full rounded-full bg-pm-surface-muted text-[13px] font-bold"
        >
          Muat ulang sesi meja
        </button>
      </SheetContent>
    </Sheet>
  )
}
