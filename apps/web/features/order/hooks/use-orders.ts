import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Order, OrderFilters, OrderStatus, CreateOrderPayload } from "../types"

export const orderKeys = {
  all: (filters?: OrderFilters) => ["orders", filters ?? null] as const,
  detail: (id: string) => ["orders", id] as const,
}

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.all(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.status) params.set("status", filters.status)
      if (filters?.tableId) params.set("tableId", filters.tableId)
      const qs = params.toString()
      return api.get<Order[]>(qs ? `/orders?${qs}` : "/orders")
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => api.get<Order>(`/orders/${id}`),
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      api.post<Order>("/orders", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  })
}

export interface PosCheckoutPayload extends CreateOrderPayload {
  paymentMethod: string
}

export interface PosCheckoutResult extends Order {
  transaction: {
    id: string
    subtotal: number
    taxAmount: number
    serviceAmount: number
    totalAmount: number
    paymentMethod: string
  }
}

/**
 * POS "Proses & Bayar": creates an already-COMPLETED order and records its
 * payment (with server-computed tax/service) in a single request.
 */
export function usePosCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PosCheckoutPayload) =>
      api.post<PosCheckoutResult>("/orders/checkout", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["tables"] })
    },
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<Order>(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, paymentMethod = "cash" }: { orderId: string; paymentMethod?: string }) =>
      api.post<{ id: string }>(`/transactions`, { orderId, paymentMethod }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  })
}

