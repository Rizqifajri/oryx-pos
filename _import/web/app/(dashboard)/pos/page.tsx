"use client"

import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { CartProvider } from "@/features/cart/context/cart-context"
import { PosDashboard } from "@/features/pos/pages/pos-dashboard"

export default function PosPage() {
  return (
    <RequirePermission permissions={PERMISSIONS.ORDER_CREATE}>
      <CartProvider>
        <PosDashboard />
      </CartProvider>
    </RequirePermission>
  )
}
