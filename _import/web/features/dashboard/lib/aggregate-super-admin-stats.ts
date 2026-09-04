import type { SuperAdminDashboardStats, SuperAdminRawData, StatSegment } from "../types"
import { CHART_COLORS, isThisMonth } from "./shared"

export function aggregateSuperAdminStats(data: SuperAdminRawData): SuperAdminDashboardStats {
  const { tenants, users } = data

  const usersByTenant: Record<string, number> = {}
  for (const user of users) {
    usersByTenant[user.tenantId] = (usersByTenant[user.tenantId] ?? 0) + 1
  }

  const tenantList = tenants
    .map((tenant) => ({
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      userCount: usersByTenant[tenant.id] ?? 0,
      createdAt: tenant.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const usersByTenantSegments: StatSegment[] = tenantList
    .filter((t) => t.userCount > 0)
    .slice(0, 6)
    .map((tenant, index) => ({
      key: tenant.tenantId,
      label: tenant.name,
      value: tenant.userCount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))

  return {
    tenantCount: tenants.length,
    userCount: users.length,
    tenantsThisMonth: tenants.filter((t) => isThisMonth(t.createdAt)).length,
    tenantList,
    usersByTenantSegments,
  }
}
