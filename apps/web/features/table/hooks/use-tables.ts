import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, type ApiError } from "@/lib/api"
import type { Table, TableFilters, CreateTableInput, UpdateTableInput, UpdateTableStatusInput } from "../types"

const TABLES_KEY = "tables"

// Query Keys
export const tableKeys = {
  all: [TABLES_KEY] as const,
  lists: () => [...tableKeys.all, "list"] as const,
  list: (filters?: TableFilters) => [...tableKeys.lists(), filters] as const,
  details: () => [...tableKeys.all, "detail"] as const,
  detail: (id: string) => [...tableKeys.details(), id] as const,
  byTenant: (tenantId: string) => [...tableKeys.all, "tenant", tenantId] as const,
}

// List Tables
export function useTables(filters?: TableFilters) {
  return useQuery<Table[], ApiError>({
    queryKey: tableKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.status) {
        params.append("status", filters.status)
      }
      const query = params.toString()
      return api.get<Table[]>(`/tables${query ? `?${query}` : ""}`)
    },
  })
}

// Get Tables by Tenant
export function useTablesByTenant(tenantId: string) {
  return useQuery<Table[], ApiError>({
    queryKey: tableKeys.byTenant(tenantId),
    queryFn: () => api.get<Table[]>(`/tables/tenant/${tenantId}`),
    enabled: !!tenantId,
  })
}

// Get Table by ID
export function useTable(id: string) {
  return useQuery<Table, ApiError>({
    queryKey: tableKeys.detail(id),
    queryFn: () => api.get<Table>(`/tables/${id}`),
    enabled: !!id,
  })
}

// Create Table
export function useCreateTable() {
  const queryClient = useQueryClient()

  return useMutation<Table, ApiError, CreateTableInput>({
    mutationFn: (input) => api.post<Table>("/tables", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() })
    },
  })
}

// Update Table
export function useUpdateTable() {
  const queryClient = useQueryClient()

  return useMutation<Table, ApiError, { id: string; input: UpdateTableInput }>({
    mutationFn: ({ id, input }) => api.patch<Table>(`/tables/${id}`, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() })
      queryClient.invalidateQueries({ queryKey: tableKeys.detail(variables.id) })
    },
  })
}

// Update Table Status
export function useUpdateTableStatus() {
  const queryClient = useQueryClient()

  return useMutation<Table, ApiError, { id: string; status: UpdateTableStatusInput["status"] }>({
    mutationFn: ({ id, status }) => api.patch<Table>(`/tables/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() })
      queryClient.invalidateQueries({ queryKey: tableKeys.detail(variables.id) })
    },
  })
}

// Delete Table
export function useDeleteTable() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(`/tables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() })
    },
  })
}
