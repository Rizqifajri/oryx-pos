"use client"

import { useState } from "react"

import { TenantFilter } from "@/components/tenant-filter"
import { InventorySection } from "../components/inventory-section"

export function InventoryPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage stock availability for all menu items. Select multiple items for bulk updates.
          </p>
        </div>
        <TenantFilter value={tenantId} onChange={setTenantId} />
      </div>
      <InventorySection tenantId={tenantId} />
    </div>
  )
}
