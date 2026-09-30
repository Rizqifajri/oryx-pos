"use client"

import { useState } from "react"

import { PageHeader } from "@/components/page-header"
import { TenantFilter } from "@/components/tenant-filter"
import { TableSection } from "../components/table-section"

export default function TablesPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Tables"
        description="Seat guests, share table QR codes, and settle table bills."
        actions={<TenantFilter value={tenantId} onChange={setTenantId} />}
      />

      <TableSection tenantId={tenantId} />
    </div>
  )
}
