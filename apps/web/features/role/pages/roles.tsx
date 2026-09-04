"use client"

import { useState } from "react"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import { TenantFilter } from "@/components/tenant-filter"
import { RoleSection } from "../components/role-section"

export function RolesPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const userScope = getStoredUser()?.scope

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">View and manage roles and their permission sets.</p>
        </div>
        
        {userScope === "GLOBAL" && (
          <TenantFilter
            value={selectedTenantId}
            onChange={setSelectedTenantId}
          />
        )}
      </div>
      
      <RoleSection tenantId={selectedTenantId} />
    </div>
  )
}
