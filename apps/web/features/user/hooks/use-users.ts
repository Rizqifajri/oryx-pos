import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import type { User } from "../types"

export const userKeys = {
  all: () => ["users"] as const,
  byTenant: (tenantId: string) => ["users", "tenant", tenantId] as const,
  detail: (id: string) => ["users", id] as const,
}

export function useUsers(tenantId?: string | null) {
  return useQuery({
    queryKey: tenantId ? userKeys.byTenant(tenantId) : userKeys.all(),
    queryFn: () => {
      if (tenantId) {
        return api.get<User[]>(`/users/tenant/${tenantId}`)
      }
      return api.get<User[]>("/users")
    },
  })
}

export function useCreateUser(filterTenantId?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; email: string; password: string; roleId: string }) => {
      const user = getStoredUser()
      const tenantId = filterTenantId || user?.tenantId
      return api.post<User>("/users", { tenantId, ...payload })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all() }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: {
      id: string
      name: string
      email: string
      roleId: string
      password?: string
    }) => {
      const body = { ...payload, password: payload.password || undefined }
      return api.patch<User>(`/users/${id}`, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all() }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all() }),
  })
}
