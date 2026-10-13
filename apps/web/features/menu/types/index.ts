export interface Category {
  id: string
  tenantId: string
  name: string
  createdAt: string
}

export interface Menu {
  id: string
  tenantId: string
  categoryId: string
  name: string
  description: string
  price: number
  imageUrl: string
  isAvailable: boolean
  isPopular?: boolean
  badge?: MenuBadge | null
  createdAt: string
}

export type MenuBadge = "chef_pick" | "best_seller" | "new" | "spicy"

export interface MenuFilters {
  tenantId?: string
  categoryId?: string
  isAvailable?: boolean
  search?: string
  page?: number
  limit?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedMenus {
  items: Menu[]
  pagination: PaginationMeta
}

export interface CreateMenuPayload {
  tenantId: string
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable: boolean
  isPopular?: boolean
  badge?: MenuBadge | null
}

export interface UpdateMenuPayload {
  id: string
  name?: string
  description?: string
  price?: number
  categoryId?: string
  imageUrl?: string
  isAvailable?: boolean
  isPopular?: boolean
  badge?: MenuBadge | null
}

export interface BulkAvailabilityPayload {
  menuIds: string[]
  isAvailable: boolean
}
