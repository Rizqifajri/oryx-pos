import { useQuery } from "@tanstack/react-query"
import { api, type ApiError } from "@/lib/api"

export interface TransactionRow {
  id: string
  orderId: string
  paymentRequestId: string | null
  subtotal: number
  taxAmount: number
  serviceAmount: number
  totalAmount: number
  paymentMethod: string
  createdAt: string
  tableName: string | null
  /** Set when the order was part of a table bill (QR or POS dine-in). */
  sessionId: string | null
}

export function useTransactions(tenantId?: string | null) {
  return useQuery<TransactionRow[], ApiError>({
    queryKey: ["transactions", tenantId ?? null],
    queryFn: () =>
      api.get<TransactionRow[]>(tenantId ? `/transactions?tenantId=${tenantId}` : "/transactions"),
    refetchInterval: 30_000,
  })
}
