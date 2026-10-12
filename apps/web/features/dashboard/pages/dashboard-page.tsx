"use client"

import { useMe } from "@/features/auth/hooks/use-me"
import { SuperAdminDashboardPage } from "./super-admin-dashboard"
import { TenantDashboardPage } from "./tenant-dashboard"

export function DashboardPage() {
  const { data: me } = useMe()

  if (!me) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    )
  }

  if (me.scope === "GLOBAL") return <SuperAdminDashboardPage />
  return <TenantDashboardPage tenantId={me.tenantId ?? ""} permissions={me.permissions} />
}
