import { useQuery, useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { PublicMenuResponse, CreatePublicOrderPayload } from "../types"

export const publicOrderKeys = {
  menu: (tableId: string) => ["public-menu", tableId] as const,
}

export function usePublicMenu(tableId: string) {
  return useQuery({
    queryKey: publicOrderKeys.menu(tableId),
    queryFn: () => api.get<PublicMenuResponse>(`/orders/public/menu?tableId=${tableId}`),
    enabled: !!tableId,
  })
}

export function useCreatePublicOrder() {
  return useMutation({
    mutationFn: (payload: CreatePublicOrderPayload) =>
      api.post<any>("/orders/public", payload),
  })
}
