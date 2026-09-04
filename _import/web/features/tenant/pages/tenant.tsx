"use client"

import { TenantSection } from "../components/tenant-section"

export function TenantPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Tenant Management</h1>
        <p className="text-sm text-muted-foreground">Manage all restaurant tenants on the platform.</p>
      </div>
      <TenantSection />
    </div>
  )
}
