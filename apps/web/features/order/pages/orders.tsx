"use client"

import { useState } from "react"

import { TenantFilter } from "@/components/tenant-filter"
import { OrderSection } from "../components/order-section"

export function OrdersPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">Monitor and update incoming dine-in orders.</p>
        </div>
        <TenantFilter value={tenantId} onChange={setTenantId} />
      </div>
      <OrderSection tenantId={tenantId} />
    </div>
  )
}
