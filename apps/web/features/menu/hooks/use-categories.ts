import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import type { Category } from "../types"

interface CategoryFilters {
  tenantId?: string
}

export const categoryKeys = {
  all: () => ["categories"] as const,
  list: (filters?: CategoryFilters) => ["categories", "list", filters] as const,
  detail: (id: string) => ["categories", id] as const,
}

export function useCategories(filters?: CategoryFilters) {
  return useQuery({
    queryKey: categoryKeys.list(filters),
    queryFn: () => {
      const user = getStoredUser()
      if (!user) throw new Error("Not authenticated")
      
      const params = new URLSearchParams()
      if (filters?.tenantId) params.append("tenantId", filters.tenantId)
      
      const query = params.toString()
      return api.get<Category[]>(`/categories${query ? `?${query}` : ""}`)
    },
  })
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => api.get<Category>(`/categories/${id}`),
    enabled: !!id,
  })
}

export function useCreateCategory(filterTenantId?: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => {
      const user = getStoredUser()
      if (!user) throw new Error("Not authenticated")
      const tenantId = filterTenantId || user.tenantId
      return api.post<Category>("/categories", { tenantId, name })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all() })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Category>(`/categories/${id}`, { name }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(id) })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all() })
    },
  })
}
