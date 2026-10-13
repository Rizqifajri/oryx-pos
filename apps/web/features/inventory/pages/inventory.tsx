"use client"

import { useState } from "react"

import { PageHeader } from "@/components/page-header"
import { TenantFilter } from "@/components/tenant-filter"
import { InventorySection } from "../components/inventory-section"

export function InventoryPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Inventory"
        description="Mark items in or out of stock. Select several to update them at once."
        actions={<TenantFilter value={tenantId} onChange={setTenantId} />}
      />
      <InventorySection tenantId={tenantId} />
    </div>
  )
}
