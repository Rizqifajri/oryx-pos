"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BellRing,
  BookOpen,
  FolderOpen,
  LayoutGrid,
  Monitor,
  ReceiptText,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react"
import { formatIdr } from "@/lib/format"
import {
  useActiveSessions,
  useServiceRequests,
} from "@/features/table/hooks/use-table-sessions"
import { useTables } from "@/features/table/hooks/use-tables"
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
  const { data: sessions = [], isLoading: loadingFloor } = useActiveSessions()
  const { data: requests = [] } = useServiceRequests()
  const { data: tables = [] } = useTables()
  const paying = sessions.filter((s) => s.status === "billing")
  const openBillValue = sessions.reduce((sum, s) => sum + s.bill.totalAmount, 0)

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

      <section aria-labelledby="floor-heading" className="space-y-3">
        <h2 id="floor-heading" className="text-sm font-medium text-muted-foreground">
          Floor now · updates every 10 seconds
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/tables" className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
            <StatCard
              title="Occupied tables"
              value={`${sessions.length}/${tables.length}`}
              description="Open tabs from POS and QR"
              icon={LayoutGrid}
              loading={loadingFloor}
            />
          </Link>
          <Link href="/tables" className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
            <StatCard
              title="Awaiting payment"
              value={paying.length}
              description={
                paying.length
                  ? paying.map((s) => s.tableName).join(", ")
                  : "No table is paying right now"
              }
              icon={ReceiptText}
              loading={loadingFloor}
            />
          </Link>
          <Link href="/tables" className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
            <StatCard
              title="Open bills"
              value={formatIdr(openBillValue)}
              description="Incl. tax and service, not yet paid"
              icon={Wallet}
              loading={loadingFloor}
            />
          </Link>
          <Link href="/order" className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
            <StatCard
              title="Guest requests"
              value={requests.length}
              description={requests.length ? "Waiting on the Orders page" : "All handled"}
              icon={BellRing}
              loading={loadingFloor}
            />
          </Link>
        </div>
      </section>

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

        <Card size="sm" className="shadow-sm">
          <CardContent className="space-y-1 pt-4">
            <p className="mb-2 text-sm font-medium">Quick actions</p>
            {[
              { href: "/pos", label: "Take an order", icon: Monitor },
              { href: "/tables", label: "Tables & QR codes", icon: LayoutGrid },
              { href: "/order", label: "Kitchen board", icon: ShoppingCart },
              { href: "/payments", label: "Payments", icon: Wallet },
              { href: "/menu", label: "Edit menu", icon: BookOpen },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Icon className="size-4 text-muted-foreground" /> {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
