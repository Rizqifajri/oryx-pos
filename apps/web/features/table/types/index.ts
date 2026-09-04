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
