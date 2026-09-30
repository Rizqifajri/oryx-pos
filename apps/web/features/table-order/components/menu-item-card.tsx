"use client"

import { ImageIcon, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGuestCart } from "../cart-store"
import { formatRupiah } from "../format"
import type { MenuItem } from "../types"
import { ImageBadge, Stepper } from "./primitives"

/**
 * F. Menu item card: image on top (4:3 mobile, 16:10 tablet+, ≤320px tall),
 * content below. The card opens the detail sheet; the CTA adds directly.
 */
export function MenuItemCard({
  item,
  canOrder,
  onOpen,
}: {
  item: MenuItem
  canOrder: boolean
  onOpen: (item: MenuItem) => void
}) {
  const { add, decrementItem, quantityOf } = useGuestCart()
  const quantity = quantityOf(item.id)
  const soldOut = !item.isAvailable

  return (
    <article className="flex flex-col overflow-hidden rounded-[14px] bg-pm-surface shadow-pm-card">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="relative block aspect-[4/3] max-h-[320px] w-full overflow-hidden bg-pm-surface-muted text-left sm:aspect-[16/10]"
        aria-label={`Detail ${item.name}`}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className={cn("size-full object-cover", soldOut && "grayscale-[60%]")}
          />
        ) : (
          <span className="grid size-full place-items-center text-pm-subtle">
            <ImageIcon className="size-6" strokeWidth={1.5} aria-hidden />
          </span>
        )}
        <ImageBadge badge={item.badge} soldOut={soldOut} />
      </button>

      <div className="flex flex-1 flex-col p-3">
        <button type="button" onClick={() => onOpen(item)} className="text-left">
          <h3 className="line-clamp-1 text-[15px] leading-[20px] font-bold sm:text-[16px] sm:leading-[22px]">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-[17px] text-pm-muted">
              {item.description}
            </p>
          )}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-[15px] leading-[20px] font-extrabold tabular-nums">
            {formatRupiah(item.price)}
          </span>
          {soldOut ? (
            <span className="inline-flex h-8 items-center rounded-full bg-pm-surface-muted px-3 text-[12px] leading-[16px] font-bold text-pm-subtle">
              Habis
            </span>
          ) : quantity > 0 ? (
            <Stepper
              quantity={quantity}
              name={item.name}
              disabled={!canOrder}
              onDecrement={() => decrementItem(item.id)}
              onIncrement={() => add(item)}
            />
          ) : (
            <button
              type="button"
              disabled={!canOrder}
              onClick={() => add(item)}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-pm-ink px-3 text-[12px] leading-[16px] font-bold text-white disabled:bg-pm-surface-muted disabled:text-pm-subtle"
            >
              <Plus className="size-[14px]" strokeWidth={2.25} aria-hidden />
              Tambah
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export function MenuItemCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[14px] bg-pm-surface shadow-pm-card">
      <div className="aspect-[4/3] animate-pulse bg-pm-surface-muted sm:aspect-[16/10]" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-pm-surface-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-pm-surface-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-pm-surface-muted" />
      </div>
    </div>
  )
}
