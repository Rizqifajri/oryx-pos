"use client"

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
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatIdr } from "@/lib/format"
import {
  useActiveSessions,
  useServiceRequests,
} from "@/features/table/hooks/use-table-sessions"
import { useTables } from "@/features/table/hooks/use-tables"
import { useTenantDashboardStats } from "../hooks/use-tenant-dashboard-stats"
import { OrdersDonutChart } from "../components/orders-donut-chart"
import { StackedBarChart } from "../components/stacked-bar-chart"
import { StatCard } from "../components/stat-card"

// Same permissions the sidebar and page guards use for these destinations.
const QUICK_ACTIONS = [
  { href: "/pos", label: "Take an order", icon: Monitor, perms: ["order:create", "order:manage"] },
  { href: "/tables", label: "Tables & QR codes", icon: LayoutGrid, perms: ["table:list"] },
  { href: "/order", label: "Kitchen board", icon: ShoppingCart, perms: ["order:list"] },
  { href: "/payments", label: "Payments", icon: Wallet, perms: ["transaction:list"] },
  { href: "/menu", label: "Edit menu", icon: BookOpen, perms: ["menu:list"] },
]

export function TenantDashboardPage({
  tenantId,
  permissions,
}: {
  tenantId: string
  permissions: string[]
}) {
  const can = (p: string) => permissions.includes(p)
  const { stats, isLoading, isError } = useTenantDashboardStats(tenantId, can)
  const actions = QUICK_ACTIONS.filter((a) => a.perms.some(can))

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={stats.tenantName} description="What's happening in your restaurant right now." />

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Some restaurant data failed to load. Check your connection and try again.
        </div>
      )}

      {can("table:list") && <FloorNow showRequests={can("order:list")} />}

      <section aria-labelledby="restaurant-heading" className="space-y-3">
        <h2 id="restaurant-heading" className="text-sm font-medium text-muted-foreground">
          Restaurant
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {can("order:list") && (
            <StatCard
              title="Orders"
              value={stats.orderCount}
              description={`${stats.ordersToday} today · ${stats.activeOrders} in the kitchen`}
              icon={ShoppingCart}
              loading={isLoading}
              href="/order"
            />
          )}
          {can("menu:list") && (
            <StatCard
              title="Menu items"
              value={stats.menuCount}
              description={`${stats.availableMenuCount} available · ${stats.unavailableMenuCount} out of stock`}
              icon={UtensilsCrossed}
              loading={isLoading}
              href="/menu"
            />
          )}
          {can("category:list") && (
            <StatCard
              title="Categories"
              value={stats.categoryCount}
              description="Sections of your menu"
              icon={FolderOpen}
              loading={isLoading}
              href="/menu"
            />
          )}
          {can("user:list") && (
            <StatCard
              title="Staff"
              value={stats.userCount}
              description="People with an account"
              icon={Users}
              loading={isLoading}
              href="/users"
            />
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {can("order:list") && (
          <Card size="sm" className="shadow-sm xl:col-span-2">
            <CardContent className="pt-4">
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <StackedBarChart
                  title="Orders by status"
                  segments={stats.orderStatusSegments}
                  emptyMessage="No orders yet"
                />
              )}
            </CardContent>
          </Card>
        )}

        {can("menu:list") && can("category:list") && (
          <Card size="sm" className="shadow-sm">
            <CardContent className="pt-4">
              {isLoading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <OrdersDonutChart
                  title="Menu items by category"
                  segments={stats.menusByCategorySegments}
                  centerLabel="Items"
                />
              )}
            </CardContent>
          </Card>
        )}

        {actions.length > 0 && (
          <Card size="sm" className="shadow-sm">
            <CardContent className="space-y-1 pt-4">
              <p className="mb-2 text-sm font-medium">Quick actions</p>
              {actions.map(({ href, label, icon: Icon }) => (
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
        )}
      </div>
    </div>
  )
}

// Its own component so the 10-second polling only runs for roles that can see tables.
function FloorNow({ showRequests }: { showRequests: boolean }) {
  const { data: sessions = [], isLoading } = useActiveSessions()
  const { data: tables = [] } = useTables()
  const paying = sessions.filter((s) => s.status === "billing")
  const openBillValue = sessions.reduce((sum, s) => sum + s.bill.totalAmount, 0)

  return (
    <section aria-labelledby="floor-heading" className="space-y-3">
      <h2 id="floor-heading" className="text-sm font-medium text-muted-foreground">
        Floor now · updates every 10 seconds
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Occupied tables"
          value={`${sessions.length}/${tables.length}`}
          description="Open tabs from POS and QR"
          icon={LayoutGrid}
          loading={isLoading}
          href="/tables"
        />
        <StatCard
          title="Awaiting payment"
          value={paying.length}
          description={
            paying.length ? paying.map((s) => s.tableName).join(", ") : "No table is paying right now"
          }
          icon={ReceiptText}
          loading={isLoading}
          href="/tables"
        />
        <StatCard
          title="Open bills"
          value={formatIdr(openBillValue)}
          description="Incl. tax and service, not yet paid"
          icon={Wallet}
          loading={isLoading}
          href="/tables"
        />
        {showRequests && <GuestRequests />}
      </div>
    </section>
  )
}

function GuestRequests() {
  const { data: requests = [], isLoading } = useServiceRequests()
  return (
    <StatCard
      title="Guest requests"
      value={requests.length}
      description={requests.length ? "Waiting on the Orders page" : "All handled"}
      icon={BellRing}
      loading={isLoading}
      href="/order"
    />
  )
}
