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
  createdAt: string
}

export interface MenuFilters {
  tenantId?: string
  categoryId?: string
  isAvailable?: boolean
}

export interface CreateMenuPayload {
  tenantId: string
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable: boolean
}

export interface UpdateMenuPayload {
  id: string
  name?: string
  description?: string
  price?: number
  categoryId?: string
  imageUrl?: string
  isAvailable?: boolean
}

export interface BulkAvailabilityPayload {
  menuIds: string[]
  isAvailable: boolean
}
