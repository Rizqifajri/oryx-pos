export type OrderStatus = "NEW" | "PROCESSING" | "COMPLETED" | "CANCELED"

export type OrderItem = {
  id: string
  menuId: string
  menuName: string
  quantity: number
  price: number
}

export type Order = {
  id: string
  tenantId: string
  tableId: string
  tableName?: string
  status: OrderStatus
  items: OrderItem[]
  totalPrice: number
  paymentMethod?: string | null
  notes?: string
  createdAt: string
}

export type OrderFilters = {
  tenantId?: string
  status?: OrderStatus
  tableId?: string
}

export type CreateOrderPayload = {
  tenantId: string
  tableId?: string | null
  customerId?: string
  customerName?: string
  paymentMethod?: string
  items: { menuId: string; quantity: number }[]
}
