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
    // Guests order from their phones, so the board refreshes on its own.
    refetchInterval: 10_000,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["tables"] })
      // Dine-in orders open/extend the table's session and bill.
      qc.invalidateQueries({ queryKey: ["table-sessions"] })
    },
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<Order>(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["table-sessions"] })
    },
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    // paymentMethod is optional — when omitted, the backend uses the method
    // the order was created with (POS), falling back to "cash".
    mutationFn: ({ orderId, paymentMethod }: { orderId: string; paymentMethod?: string }) =>
      api.post<{ id: string }>(`/transactions`, { orderId, paymentMethod }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["tables"] })
    },
  })
}


/**
 * Sidebar badge: new orders waiting for the kitchen plus unanswered guest
 * requests. Shares cache keys with the Orders page so both stay in step.
 */
export function useOrdersAttentionCount(enabled: boolean) {
  const newOrders = useQuery({
    queryKey: orderKeys.all({ status: "NEW" }),
    queryFn: () => api.get<Order[]>("/orders?status=NEW"),
    refetchInterval: 10_000,
    enabled,
  })
  const requests = useQuery({
    queryKey: ["service-requests", null],
    queryFn: () => api.get<unknown[]>("/service-requests"),
    refetchInterval: 10_000,
    enabled,
  })
  return (newOrders.data?.length ?? 0) + (requests.data?.length ?? 0)
}
