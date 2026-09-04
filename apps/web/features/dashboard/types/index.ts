import type { Category, Menu } from "@/features/menu/types"
import type { Tenant } from "@/features/tenant/types"
import type { User } from "@/features/user/types"

export type DashboardOrder = {
  id: string
  tenantId: string
  tableId: string
  customerId?: string
  status: string
  totalPrice?: number
  totalAmount?: number
  createdAt: string
}

export type StatSegment = {
  key: string
  label: string
  value: number
  color: string
}

export type TenantListItem = {
  tenantId: string
  name: string
  slug: string
  userCount: number
  createdAt: string
}

export type SuperAdminDashboardStats = {
  tenantCount: number
  userCount: number
  tenantsThisMonth: number
  tenantList: TenantListItem[]
  usersByTenantSegments: StatSegment[]
}

export type TenantDashboardStats = {
  tenantName: string
  categoryCount: number
  menuCount: number
  userCount: number
  orderCount: number
  availableMenuCount: number
  unavailableMenuCount: number
  ordersToday: number
  activeOrders: number
  orderStatusSegments: StatSegment[]
  menuAvailabilitySegments: StatSegment[]
  menusByCategorySegments: StatSegment[]
}

export type SuperAdminRawData = {
  tenants: Tenant[]
  users: User[]
}

export type TenantRawData = {
  tenant: Tenant | null
  categories: Category[]
  menus: Menu[]
  users: User[]
  orders: DashboardOrder[]
}
