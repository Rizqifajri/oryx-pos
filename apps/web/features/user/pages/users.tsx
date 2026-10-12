"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { TenantFilter } from "@/components/tenant-filter"
import { useMe } from "@/features/auth/hooks/use-me"
import { UserSection } from "../components/user-section"

export function UsersPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const { data: me } = useMe()

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Users"
        description="Staff accounts. What each person can do comes from their role."
        actions={
          me?.scope === "GLOBAL" && (
            <TenantFilter value={selectedTenantId} onChange={setSelectedTenantId} />
          )
        }
      />
      <UserSection tenantId={selectedTenantId} />
    </div>
  )
}
