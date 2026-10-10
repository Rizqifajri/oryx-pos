"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useGuestCart } from "../cart-store"
import { formatRupiah } from "../format"
import type { MenuItem } from "../types"
import { ImageBadge, Stepper } from "./primitives"

/**
 * Item detail: full description, a note for the kitchen and a quantity. A
 * bottom sheet on phones, a centered panel on larger screens.
 */
export function ItemDetailSheet({
  item,
  canOrder,
  onOpenChange,
}: {
  item: MenuItem | null
  canOrder: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="public-menu mx-auto max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[20px] border-pm-line bg-pm-surface p-0 sm:bottom-6 sm:max-w-[520px] sm:rounded-[20px]"
      >
        {/* Keyed so quantity/note reset for each item. */}
        {item && <ItemDetailBody key={item.id} item={item} canOrder={canOrder} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function ItemDetailBody({
  item,
  canOrder,
  onDone,
}: {
  item: MenuItem
  canOrder: boolean
  onDone: () => void
}) {
  const { add } = useGuestCart()
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const soldOut = !item.isAvailable

  return (
    <>
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-pm-surface-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-pm-subtle">
            <ImageIcon className="size-8" strokeWidth={1.5} aria-hidden />
          </span>
        )}
        <ImageBadge badge={item.badge} soldOut={soldOut} />
      </div>

      <div className="space-y-4 p-4">
        <div>
          <SheetTitle className="text-[18px] leading-[24px] font-bold text-pm-ink">{item.name}</SheetTitle>
          <p className="mt-1 text-[15px] leading-[20px] font-extrabold tabular-nums">
            {formatRupiah(item.price)}
          </p>
          <SheetDescription className="mt-2 text-[13px] leading-[19px] whitespace-pre-line text-pm-muted">
            {item.description || "Tidak ada deskripsi."}
          </SheetDescription>
        </div>

        <label className="block">
          <span className="text-[12px] leading-[16px] font-semibold">Catatan untuk dapur</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            rows={2}
            disabled={soldOut || !canOrder}
            placeholder="Contoh: tidak pedas, tanpa bawang"
            className="mt-1.5 w-full resize-none rounded-[12px] bg-pm-surface-muted px-3 py-2 text-[13px] leading-[18px] outline-none placeholder:text-pm-subtle"
          />
        </label>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-pm-line bg-pm-surface p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <Stepper
          size="lg"
          name={item.name}
          quantity={quantity}
          disabled={soldOut || !canOrder}
          onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
          onIncrement={() => setQuantity((q) => Math.min(50, q + 1))}
        />
        <button
          type="button"
          disabled={soldOut || !canOrder}
          onClick={() => {
            add(item, quantity, note)
            onDone()
          }}
          className="h-11 flex-1 rounded-full bg-pm-ink px-4 text-[13px] leading-[16px] font-bold text-white tabular-nums disabled:bg-pm-surface-muted disabled:text-pm-subtle"
        >
          {soldOut
            ? "Habis"
            : !canOrder
              ? "Pemesanan dijeda"
              : `Tambah · ${formatRupiah(item.price * quantity)}`}
        </button>
      </div>
    </>
  )
}
