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

export type ServiceRequestType = "call_waiter" | "water" | "cutlery" | "bill"

export interface ServiceRequest {
  id: string
  tenantId: string
  sessionId: string
  tableId: string
  tableName: string
  type: ServiceRequestType
  status: "pending" | "handled"
  createdAt: string
}
