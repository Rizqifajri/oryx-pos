"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart/context/cart-context"
import { usePlaceOrder } from "../hooks/use-place-order"
import type { ApiError } from "@/lib/api"

function formatPrice(cents: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function CustomerCartPage() {
  const params = useSearchParams()
  const tenantId = params.get("tenantId") ?? ""
  const tableId = params.get("tableId") ?? ""
  const menuHref = `/customer?tenantId=${tenantId}&tableId=${tableId}`

  const { items, updateQuantity, removeItem, clear, total, itemCount } = useCart()
  const [notes, setNotes] = useState("")
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)
  const { mutate: placeOrder, isPending, error } = usePlaceOrder()

  function handlePlaceOrder() {
    if (!tenantId || !tableId || items.length === 0) return
    placeOrder(
      {
        tenantId,
        tableId,
        items: items.map((i) => ({ menuId: i.menuId, quantity: i.quantity })),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (order) => {
          clear()
          setPlacedOrderId(order.id)
        },
      },
    )
  }

  if (placedOrderId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-6xl select-none">🎉</div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Order Placed!</h1>
          <p className="text-sm text-muted-foreground">
            Your order has been received and is being prepared.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            Order #{placedOrderId.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <Link href={menuHref}>
          <Button variant="outline">Back to Menu</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-3 px-4 max-w-2xl mx-auto">
          <Link
            href={menuHref}
            className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-semibold">
            Cart {itemCount > 0 && `(${itemCount})`}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4 pb-36">
        {items.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Link href={menuHref}>
              <Button variant="outline">Browse Menu</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.menuId}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(item.price)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() => updateQuantity(item.menuId, item.quantity - 1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      className="size-7"
                      onClick={() => updateQuantity(item.menuId, item.quantity + 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive ml-1"
                      onClick={() => removeItem(item.menuId)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  <div className="text-right text-sm font-semibold w-20 shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special requests, allergies…"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
          </>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total ({itemCount} item{itemCount !== 1 ? "s" : ""})
              </span>
              <span className="text-xl font-bold">{formatPrice(total)}</span>
            </div>
            {error && (
              <p className="text-xs text-destructive">
                {(error).message ?? "Failed to place order. Please try again."}
              </p>
            )}
            <Button
              className="w-full"
              size="lg"
              disabled={isPending || !tenantId || !tableId}
              onClick={handlePlaceOrder}
            >
              {isPending ? "Placing Order…" : "Place Order"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
