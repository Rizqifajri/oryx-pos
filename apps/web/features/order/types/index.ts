export type OrderStatus = "NEW" | "PROCESSING" | "COMPLETED" | "CANCELED"

/** Not stored — derived from whether the order has a table (dine-in) or not (dine-out/takeaway). */
export type OrderType = "DINE_IN" | "DINE_OUT"

export type OrderItem = {
  id: string
  menuId: string
  menuName: string
  quantity: number
  price: number
  /** Kitchen note for this line, e.g. "no chili". */
  note?: string | null
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
  customerName?: string | null
  /** Set for guest QR orders; these are paid through the table bill. */
  sessionId?: string | null
  submittedAt?: string
  createdAt: string
}

export type OrderFilters = {
  tenantId?: string
  status?: OrderStatus
  tableId?: string
  orderType?: OrderType
  page?: number
  limit?: number
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type PaginatedOrders = {
  items: Order[]
  pagination: PaginationMeta
}

export type CreateOrderPayload = {
  tenantId: string
  tableId?: string | null
  customerId?: string
  customerName?: string
  paymentMethod?: string
  items: { menuId: string; quantity: number; note?: string }[]
}
