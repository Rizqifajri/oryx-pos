export type TableStatus = "AVAILABLE" | "OCCUPIED"

export interface Table {
  id: string
  tenantId: string
  name: string
  capacity: number
  status: TableStatus
  createdAt: string
}

export interface TableFilters {
  tenantId?: string
  status?: TableStatus
}

export interface CreateTableInput {
  tenantId: string
  name: string
  capacity: number
  status?: TableStatus
}

export interface UpdateTableInput {
  name?: string
  capacity?: number
  status?: TableStatus
}

export interface UpdateTableStatusInput {
  status: TableStatus
}

export interface TableQr {
  tableId: string
  tableName: string
  tenantSlug: string
  qrToken: string
  /** Path of the public guest menu, e.g. /order/demo/abc… */
  path: string
}

export interface SessionBill {
  id: string | null
  status: "open" | "locked" | "paid"
  subtotal: number
  taxAmount: number
  serviceAmount: number
  totalAmount: number
  paymentMethod: string | null
  splitMode: "equal" | "items" | "custom" | null
  shares: SessionBillShare[]
}

export interface SessionBillShare {
  id: string
  label: string
  amount: number
  status: "pending" | "paid"
  paymentMethod: string | null
  paidAt: string | null
  items: { orderItemId: string; quantity: number }[]
}

/** GET /sessions/:id — the tab with its orders (for splitting by items). */
export interface TableSessionDetail {
  id: string
  tableId: string
  status: "open" | "billing" | "closed"
  orders: {
    id: string
    status: "NEW" | "PROCESSING" | "COMPLETED" | "CANCELED"
    items: { id: string; menuName: string; quantity: number; price: number }[]
  }[]
  bill: SessionBill
}

export interface ActiveTableSession {
  id: string
  tenantId: string
  tableId: string
  tableName: string
  status: "open" | "billing"
  openedAt: string
  orderCount: number
  activeOrderCount: number
  bill: SessionBill
}

export type ServiceRequestType = "call_waiter" | "water" | "cutlery" | "bill" | "move_table"

export interface ServiceRequest {
  id: string
  tenantId: string
  sessionId: string
  tableId: string
  tableName: string
  type: ServiceRequestType
  status: "pending" | "handled"
  /** Guest's note, e.g. where they want to move. */
  note: string | null
  createdAt: string
}
