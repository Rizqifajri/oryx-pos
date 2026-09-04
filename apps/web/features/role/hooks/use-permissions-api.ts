import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { PermissionRecord } from "../types"

export const permissionKeys = {
  all: () => ["permissions"] as const,
}

export function usePermissionsApi() {
  return useQuery({
    queryKey: permissionKeys.all(),
    queryFn: () => api.get<PermissionRecord[]>("/permissions"),
    staleTime: 5 * 60 * 1000,
  })
}
