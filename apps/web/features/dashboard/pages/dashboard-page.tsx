"use client"

import { useEffect, useState } from "react"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import { SuperAdminDashboardPage } from "./super-admin-dashboard"
import { TenantDashboardPage } from "./tenant-dashboard"

export function DashboardPage() {
  const [scope, setScope] = useState<"GLOBAL" | "TENANT" | null>(null)

  useEffect(() => {
    setScope(getStoredUser()?.scope ?? null)
  }, [])

  if (scope === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    )
  }

  if (scope === "GLOBAL") {
    return <SuperAdminDashboardPage />
  }

  return <TenantDashboardPage />
}
