import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Menu } from "@/features/menu/types"

export function usePosMenus() {
  return useQuery({
    queryKey: ["pos-menus"],
    queryFn: () => api.get<Menu[]>("/menus?isAvailable=true"),
  })
}
