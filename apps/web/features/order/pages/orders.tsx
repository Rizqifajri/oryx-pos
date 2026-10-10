"use client"

import { useState } from "react"

import { PageHeader } from "@/components/page-header"
import { TenantFilter } from "@/components/tenant-filter"
import { OrderSection } from "../components/order-section"

export function OrdersPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Orders"
        description="Kitchen board for POS and QR orders. Guest requests appear on top."
        actions={<TenantFilter value={tenantId} onChange={setTenantId} />}
      />
      <OrderSection tenantId={tenantId} />
    </div>
  )
}
