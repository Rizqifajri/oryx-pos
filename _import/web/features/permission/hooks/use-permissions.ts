import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Permission, CreatePermissionInput, UpdatePermissionInput } from "../types"

export const permissionKeys = {
  all: () => ["permissions"] as const,
  detail: (id: string) => ["permissions", id] as const,
}

export function usePermissions() {
  return useQuery({
    queryKey: permissionKeys.all(),
    queryFn: () => api.get<Permission[]>("/permissions"),
  })
}

export function useCreatePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePermissionInput) =>
      api.post<Permission>("/permissions", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: permissionKeys.all() }),
  })
}

export function useUpdatePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdatePermissionInput) =>
      api.patch<Permission>(`/permissions/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: permissionKeys.all() }),
  })
}

export function useDeletePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/permissions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: permissionKeys.all() }),
  })
}
