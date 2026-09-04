import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Order } from "@/features/order/types"

interface PlaceOrderPayload {
  tenantId: string
  tableId: string
  items: { menuId: string; quantity: number }[]
  notes?: string
}

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (payload: PlaceOrderPayload) =>
      api.post<Order>("/orders", payload),
  })
}
