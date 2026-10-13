"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { TenantFilter } from "@/components/tenant-filter"
import { useMe } from "@/features/auth/hooks/use-me"
import { RoleSection } from "../components/role-section"

export function RolesPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const { data: me } = useMe()

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Roles"
        description="A role is a named set of permissions. Assign it to staff on the Users page."
        actions={
          me?.scope === "GLOBAL" && (
            <TenantFilter value={selectedTenantId} onChange={setSelectedTenantId} />
          )
        }
      />
      <RoleSection tenantId={selectedTenantId} />
    </div>
  )
}
