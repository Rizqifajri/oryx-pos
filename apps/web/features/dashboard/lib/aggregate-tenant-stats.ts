import type { TenantDashboardStats, TenantRawData } from "../types"
import { CHART_COLORS, isToday, normalizeOrderStatus, toSegments } from "./shared"

export function aggregateTenantStats(data: TenantRawData): TenantDashboardStats {
  const { tenant, categories, menus, users, orders } = data

  const orderStatusCounts: Record<string, number> = {}
  let ordersToday = 0
  let activeOrders = 0

  for (const order of orders) {
    const normalized = normalizeOrderStatus(order.status)
    orderStatusCounts[normalized] = (orderStatusCounts[normalized] ?? 0) + 1
    if (isToday(order.createdAt)) ordersToday += 1
    if (normalized === "NEW" || normalized === "PROCESSING") activeOrders += 1
  }

  const availableMenuCount = menus.filter((m) => m.isAvailable).length
  const unavailableMenuCount = menus.length - availableMenuCount

  const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const menusByCategory: Record<string, number> = {}
  for (const menu of menus) {
    const label = categoryNameById[menu.categoryId] ?? "Uncategorized"
    menusByCategory[label] = (menusByCategory[label] ?? 0) + 1
  }

  const menusByCategorySegments = Object.entries(menusByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value], index) => ({
      key: label,
      label,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))

  return {
    tenantName: tenant?.name ?? "Your Restaurant",
    categoryCount: categories.length,
    menuCount: menus.length,
    userCount: users.length,
    orderCount: orders.length,
    availableMenuCount,
    unavailableMenuCount,
    ordersToday,
    activeOrders,
    orderStatusSegments: toSegments(orderStatusCounts, {
      NEW: "New",
      PROCESSING: "Processing",
      COMPLETED: "Completed",
      CANCELED: "Canceled",
    }),
    menuAvailabilitySegments: [
      { key: "available", label: "Available", value: availableMenuCount, color: CHART_COLORS[0] },
      {
        key: "unavailable",
        label: "Unavailable",
        value: unavailableMenuCount,
        color: CHART_COLORS[2],
      },
    ].filter((s) => s.value > 0),
    menusByCategorySegments,
  }
}
