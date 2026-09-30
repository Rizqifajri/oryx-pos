export type OrderStatus = "NEW" | "PROCESSING" | "COMPLETED" | "CANCELED"

export type OrderItem = {
  id: string
  menuId: string
  menuName: string
  quantity: number
  price: number
  /** Guest's kitchen note (QR orders). */
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
  note?: string | null
  submittedAt?: string
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
