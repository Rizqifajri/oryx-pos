import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import type {
  BulkAvailabilityPayload,
  CreateMenuPayload,
  Menu,
  MenuFilters,
  UpdateMenuPayload,
} from "../types"
import type { CreateMenuValues, UpdateMenuValues } from "../schemas/menu"

export const menuKeys = {
  all: (filters?: MenuFilters) => ["menus", filters ?? null] as const,
  byTenant: (tenantId: string, filters?: Omit<MenuFilters, "tenantId">) =>
    ["menus", "tenant", tenantId, filters ?? null] as const,
  detail: (id: string) => ["menus", id] as const,
}

export function useMenusByTenant(tenantId: string, filters?: Omit<MenuFilters, "tenantId">) {
  return useQuery({
    queryKey: menuKeys.byTenant(tenantId, filters),
    queryFn: () =>
      api.get<Menu[]>(`/menus/tenant/${tenantId}`, { params: filters }),
    enabled: !!tenantId,
  })
}

export function useMenus(filters?: MenuFilters) {
  return useQuery({
    queryKey: menuKeys.all(filters),
    queryFn: () => api.get<Menu[]>("/menus", { params: filters }),
  })
}

export function useMenu(id: string) {
  return useQuery({
    queryKey: menuKeys.detail(id),
    queryFn: () => api.get<Menu>(`/menus/${id}`),
    enabled: !!id,
  })
}

export function useCreateMenu(filterTenantId?: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: CreateMenuValues) => {
      const user = getStoredUser()
      if (!user) throw new Error("Not authenticated")

      const payload: CreateMenuPayload = {
        ...values,
        tenantId: filterTenantId || user.tenantId,
        price: Math.round(values.price * 100), // decimal → cents
        imageUrl: values.imageUrl || undefined,
        description: values.description || undefined,
        isAvailable: values.isAvailable ?? true,
      }
      return api.post<Menu>("/menus", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] })
    },
  })
}

export function useUpdateMenu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateMenuValues & { id: string }) => {
      const payload: Omit<UpdateMenuPayload, "id"> = {
        ...values,
        price: values.price !== undefined ? Math.round(values.price * 100) : undefined,
        imageUrl: values.imageUrl || undefined,
        description: values.description || undefined,
      }
      return api.patch<Menu>(`/menus/${id}`, payload)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["menus"] })
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(id) })
    },
  })
}

export function useToggleAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch<Menu>(`/menus/${id}/availability`, { isAvailable }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["menus"] })
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(id) })
    },
  })
}

export function useBulkAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BulkAvailabilityPayload) =>
      api.patch<Menu[]>("/menus/bulk/availability", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] })
    },
  })
}

export function useDeleteMenu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/menus/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] })
    },
  })
}
