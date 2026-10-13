"use client"

import { Building2, UserPlus, Users } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSuperAdminDashboardStats } from "../hooks/use-super-admin-dashboard-stats"
import { StackedBarChart } from "../components/stacked-bar-chart"
import { StatCard } from "../components/stat-card"
import { TenantListCard } from "../components/tenant-list-card"

export function SuperAdminDashboardPage() {
  const { stats, isLoading, isError } = useSuperAdminDashboardStats()

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Platform" description="Every restaurant running on Oryx, at a glance." />

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load platform data. Check your connection and try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Restaurants"
          value={stats.tenantCount}
          description="Registered tenants"
          icon={Building2}
          loading={isLoading}
          href="/tenants"
        />
        <StatCard
          title="Staff accounts"
          value={stats.userCount}
          description="Across all restaurants"
          icon={Users}
          loading={isLoading}
          href="/users"
        />
        <StatCard
          title="New this month"
          value={stats.tenantsThisMonth}
          description="Restaurants that signed up"
          icon={UserPlus}
          loading={isLoading}
          href="/tenants"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TenantListCard tenants={stats.tenantList} loading={isLoading} />
        <Card size="sm" className="shadow-sm lg:col-span-2">
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <StackedBarChart
                title="Staff per restaurant"
                segments={stats.usersByTenantSegments}
                emptyMessage="No staff assigned to restaurants yet"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
