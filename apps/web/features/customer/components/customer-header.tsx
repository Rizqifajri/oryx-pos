"use client"

import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/features/cart/context/cart-context"

interface Props {
  cartHref: string
}

export function CustomerHeader({ cartHref }: Props) {
  const { itemCount } = useCart()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 max-w-2xl mx-auto">
        <div className="font-semibold text-lg">DIO Systems</div>
        <Link
          href={cartHref}
          className="relative flex items-center gap-1.5 text-sm font-medium py-1.5 px-3 rounded-lg hover:bg-muted transition-colors"
        >
          <ShoppingCart className="size-5" />
          <span>Cart</span>
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
