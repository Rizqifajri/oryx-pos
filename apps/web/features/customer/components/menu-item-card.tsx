"use client"

import { Minus, Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart/context/cart-context"
import type { Menu } from "@/features/menu/types"

function formatPrice(cents: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function MenuItemCard({ menu }: { menu: Menu }) {
  const { items, addItem, updateQuantity } = useCart()
  const cartItem = items.find((i) => i.menuId === menu.id)
  const qty = cartItem?.quantity ?? 0

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {menu.imageUrl ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={menu.imageUrl}
            alt={menu.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] flex items-center justify-center bg-muted text-muted-foreground text-xs">
          No image
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="font-semibold text-sm leading-snug line-clamp-2">{menu.name}</p>
        {menu.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{menu.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-primary">{formatPrice(menu.price)}</span>

          {qty === 0 ? (
            <Button
              size="sm"
              className="h-7 gap-1 text-xs px-2"
              onClick={() =>
                addItem({ menuId: menu.id, name: menu.name, price: menu.price })
              }
            >
              <ShoppingCart className="size-3" />
              Add
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="size-7"
                onClick={() => updateQuantity(menu.id, qty - 1)}
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-5 text-center text-sm font-semibold">{qty}</span>
              <Button
                size="icon"
                className="size-7"
                onClick={() => updateQuantity(menu.id, qty + 1)}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
