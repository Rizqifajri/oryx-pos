import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import type { RoleRecord } from "../types"

export const roleKeys = {
  all: () => ["roles"] as const,
  byTenant: (tenantId: string) => ["roles", "tenant", tenantId] as const,
  detail: (id: string) => ["roles", id] as const,
}

export function useRoles(tenantId?: string | null) {
  return useQuery({
    queryKey: tenantId ? roleKeys.byTenant(tenantId) : roleKeys.all(),
    queryFn: () => {
      if (tenantId) {
        return api.get<RoleRecord[]>(`/roles/tenant/${tenantId}`)
      }
      return api.get<RoleRecord[]>("/roles")
    },
  })
}

export function useCreateRole(filterTenantId?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; scope: "TENANT" | "GLOBAL"; permissionIds: string[] }) => {
      const user = getStoredUser()
      const tenantId = filterTenantId || user?.tenantId
      return api.post<RoleRecord>("/roles", { tenantId, ...payload })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all() }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; permissionIds?: string[] }) =>
      api.patch<RoleRecord>(`/roles/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all() }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all() }),
  })
}
