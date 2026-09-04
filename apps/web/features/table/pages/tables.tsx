"use client"

import { useState } from "react"

import { TenantFilter } from "@/components/tenant-filter"
import { TableSection } from "../components/table-section"

export default function TablesPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Table Management</h1>
          <p className="text-sm text-muted-foreground">Manage restaurant tables and their status.</p>
        </div>
        <TenantFilter value={tenantId} onChange={setTenantId} />
      </div>

      <TableSection tenantId={tenantId} />
    </div>
  )
}
