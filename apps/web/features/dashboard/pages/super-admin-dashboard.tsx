"use client"

import { Building2, UserPlus, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSuperAdminDashboardStats } from "../hooks/use-super-admin-dashboard-stats"
import { OrdersDonutChart } from "../components/orders-donut-chart"
import { StackedBarChart } from "../components/stacked-bar-chart"
import { StatCard } from "../components/stat-card"
import { TenantListCard } from "../components/tenant-list-card"

export function SuperAdminDashboardPage() {
  const { stats, isLoading, isError } = useSuperAdminDashboardStats()

  const usersPerTenantSegments = stats.tenantList
    .filter((t) => t.userCount > 0)
    .slice(0, 8)
    .map((t, i) => ({
      key: t.tenantId,
      label: t.name,
      value: t.userCount,
      color: `var(--chart-${(i % 5) + 1})`,
    }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Monitor and manage restaurant clients (tenants) using DIO Systems.
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load platform data. Ensure you are logged in with GLOBAL scope.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Tenants"
          value={stats.tenantCount}
          description="Registered restaurant clients"
          icon={Building2}
          loading={isLoading}
        />
        <StatCard
          title="Platform Users"
          value={stats.userCount}
          description="Staff accounts across all tenants"
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="New This Month"
          value={stats.tenantsThisMonth}
          description="Tenants registered this month"
          icon={UserPlus}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <TenantListCard tenants={stats.tenantList} loading={isLoading} />
        <Card size="sm" className="shadow-sm lg:col-span-1 xl:col-span-3">
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <StackedBarChart
                title="Staff Distribution by Tenant"
                segments={usersPerTenantSegments}
                emptyMessage="No staff assigned to tenants yet"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card size="sm" className="shadow-sm">
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <OrdersDonutChart
                title="Users by Tenant"
                segments={stats.usersByTenantSegments}
                centerLabel="Users"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
