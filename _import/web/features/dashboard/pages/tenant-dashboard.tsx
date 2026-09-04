"use client"

import { useEffect, useState } from "react"
import { BookOpen, FolderOpen, ShoppingCart, Users, UtensilsCrossed } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import { useTenantDashboardStats } from "../hooks/use-tenant-dashboard-stats"
import { OperationsStatusCard } from "../components/operations-status-card"
import { OrdersDonutChart } from "../components/orders-donut-chart"
import { StackedBarChart } from "../components/stacked-bar-chart"
import { StatCard } from "../components/stat-card"

export function TenantDashboardPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    setTenantId(getStoredUser()?.tenantId ?? null)
  }, [])

  const { stats, isLoading, isError } = useTenantDashboardStats(tenantId ?? "", !!tenantId)

  if (!tenantId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Loading restaurant context…
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">{stats.tenantName}</h1>
        <p className="text-sm text-muted-foreground">
          Operational overview — menu, categories, orders, and staff for your restaurant.
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load restaurant data. Check your connection and permissions.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Categories"
          value={stats.categoryCount}
          description="Menu categories"
          icon={FolderOpen}
          loading={isLoading}
        />
        <StatCard
          title="Menu Items"
          value={stats.menuCount}
          description={`${stats.availableMenuCount} available · ${stats.unavailableMenuCount} unavailable`}
          icon={UtensilsCrossed}
          loading={isLoading}
        />
        <StatCard
          title="Orders"
          value={stats.orderCount}
          description={`${stats.ordersToday} today · ${stats.activeOrders} active`}
          icon={ShoppingCart}
          loading={isLoading}
        />
        <StatCard
          title="Staff"
          value={stats.userCount}
          description="Users in your tenant"
          icon={Users}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card size="sm" className="shadow-sm lg:col-span-2">
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <StackedBarChart
                title="Order Status"
                segments={stats.orderStatusSegments}
                emptyMessage="No orders yet"
              />
            )}
          </CardContent>
        </Card>
        <Card size="sm" className="shadow-sm lg:col-span-2">
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <StackedBarChart
                title="Menu Availability"
                segments={stats.menuAvailabilitySegments}
                emptyMessage="No menu items yet"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card size="sm" className="shadow-sm">
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <OrdersDonutChart
                title="Menus by Category"
                segments={stats.menusByCategorySegments}
                centerLabel="Menus"
              />
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <Card size="sm" className="shadow-sm">
            <CardContent className="pt-4">
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <OperationsStatusCard
            activeOrders={stats.activeOrders}
            ordersToday={stats.ordersToday}
            menuCount={stats.menuCount}
            tenantName={stats.tenantName}
          />
        )}

        <Card size="sm" className="shadow-sm flex items-center justify-center">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <BookOpen className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Quick links</p>
            <p className="text-xs text-muted-foreground">
              Manage menu, inventory, and orders from the sidebar.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
