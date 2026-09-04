import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"
import { api } from "@/lib/api"
import type { Tenant } from "@/features/tenant/types"
import type { User } from "@/features/user/types"
import { aggregateSuperAdminStats } from "../lib/aggregate-super-admin-stats"
import { dashboardKeys } from "./keys"

export function useSuperAdminDashboardStats(enabled = true) {
  const results = useQueries({
    queries: [
      {
        queryKey: [...dashboardKeys.all, "super-admin", "tenants"],
        queryFn: () => api.get<Tenant[]>("/tenants"),
        enabled,
      },
      {
        queryKey: [...dashboardKeys.all, "super-admin", "users"],
        queryFn: () => api.get<User[]>("/users"),
        enabled,
      },
    ],
  })

  const [tenantsQ, usersQ] = results
  const isLoading = results.some((r) => r.isLoading)
  const isError = results.some((r) => r.isError)

  const stats = useMemo(
    () =>
      aggregateSuperAdminStats({
        tenants: tenantsQ.data ?? [],
        users: usersQ.data ?? [],
      }),
    [tenantsQ.data, usersQ.data],
  )

  return { stats, isLoading, isError }
}
