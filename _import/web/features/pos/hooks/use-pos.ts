import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Menu } from "@/features/menu/types"

export type PosTable = {
  id: string
  tenantId: string
  name: string
  capacity: number
  status: "AVAILABLE" | "OCCUPIED"
}

export function usePosTables() {
  return useQuery({
    queryKey: ["pos-tables"],
    queryFn: () => api.get<PosTable[]>("/tables?status=AVAILABLE"),
  })
}

export function usePosMenus() {
  return useQuery({
    queryKey: ["pos-menus"],
    queryFn: () => api.get<Menu[]>("/menus?isAvailable=true"),
  })
}
