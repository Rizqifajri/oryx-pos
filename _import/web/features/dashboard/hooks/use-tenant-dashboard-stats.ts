import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"
import { api } from "@/lib/api"
import type { Category, Menu } from "@/features/menu/types"
import type { Tenant } from "@/features/tenant/types"
import type { User } from "@/features/user/types"
import { aggregateTenantStats } from "../lib/aggregate-tenant-stats"
import type { DashboardOrder } from "../types"
import { dashboardKeys } from "./keys"

export function useTenantDashboardStats(tenantId: string, enabled = true) {
  const results = useQueries({
    queries: [
      {
        queryKey: [...dashboardKeys.all, "tenant", tenantId, "me"],
        queryFn: () => api.get<Tenant>("/tenants/me"),
        enabled: enabled && !!tenantId,
      },
      {
        queryKey: [...dashboardKeys.all, "tenant", tenantId, "categories"],
        queryFn: () => api.get<Category[]>(`/categories/tenant/${tenantId}`),
        enabled: enabled && !!tenantId,
      },
      {
        queryKey: [...dashboardKeys.all, "tenant", tenantId, "menus"],
        queryFn: () => api.get<Menu[]>(`/menus/tenant/${tenantId}`),
        enabled: enabled && !!tenantId,
      },
      {
        queryKey: [...dashboardKeys.all, "tenant", tenantId, "users"],
        queryFn: () => api.get<User[]>(`/users/tenant/${tenantId}`),
        enabled: enabled && !!tenantId,
      },
      {
        queryKey: [...dashboardKeys.all, "tenant", tenantId, "orders"],
        queryFn: () => api.get<DashboardOrder[]>("/orders"),
        enabled: enabled && !!tenantId,
      },
    ],
  })

  const [tenantQ, categoriesQ, menusQ, usersQ, ordersQ] = results
  const isLoading = results.some((r) => r.isLoading)
  const isError = results.some((r) => r.isError)

  const stats = useMemo(
    () =>
      aggregateTenantStats({
        tenant: tenantQ.data ?? null,
        categories: categoriesQ.data ?? [],
        menus: menusQ.data ?? [],
        users: usersQ.data ?? [],
        orders: ordersQ.data ?? [],
      }),
    [tenantQ.data, categoriesQ.data, menusQ.data, usersQ.data, ordersQ.data],
  )

  return { stats, isLoading, isError }
}
