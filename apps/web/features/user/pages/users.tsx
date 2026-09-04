"use client"

import { useState } from "react"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import { TenantFilter } from "@/components/tenant-filter"
import { UserSection } from "../components/user-section"

export function UsersPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const userScope = getStoredUser()?.scope

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and assign roles. Users with a Global-scoped role have full access to all features.
          </p>
        </div>
        
        {userScope === "GLOBAL" && (
          <TenantFilter
            value={selectedTenantId}
            onChange={setSelectedTenantId}
          />
        )}
      </div>
      
      <UserSection tenantId={selectedTenantId} />
    </div>
  )
}
