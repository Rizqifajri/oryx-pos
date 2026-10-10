import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, type ApiError } from "@/lib/api"
import { useMe } from "@/features/auth/hooks/use-me"
import type { SplitPayload } from "@/lib/split-bill"
import type {
  ActiveTableSession,
  ServiceRequest,
  SessionBill,
  TableQr,
  TableSessionDetail,
} from "../types"

export const tableSessionKeys = {
  active: (tenantId?: string | null) => ["table-sessions", "active", tenantId ?? null] as const,
  qr: (tableId: string) => ["tables", "qr", tableId] as const,
  detail: (sessionId: string) => ["table-sessions", "detail", sessionId] as const,
  serviceRequests: (tenantId?: string | null) => ["service-requests", tenantId ?? null] as const,
  myTenant: ["tenants", "me"] as const,
}

const withTenant = (path: string, tenantId?: string | null) =>
  tenantId ? `${path}?tenantId=${encodeURIComponent(tenantId)}` : path

/** Live guest sessions (open or paying) with their running bill. */
export function useActiveSessions(tenantId?: string | null) {
  return useQuery<ActiveTableSession[], ApiError>({
    queryKey: tableSessionKeys.active(tenantId),
    queryFn: () => api.get<ActiveTableSession[]>(withTenant("/sessions/active", tenantId)),
    refetchInterval: 10_000,
  })
}

function useInvalidateSessions() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ["table-sessions"] })
    qc.invalidateQueries({ queryKey: ["tables"] })
    qc.invalidateQueries({ queryKey: ["orders"] })
    qc.invalidateQueries({ queryKey: ["service-requests"] })
  }
}

/** Cashier settles the table bill (cash / EDC / QRIS at the counter). */
export function useSettleSession() {
  const invalidate = useInvalidateSessions()
  return useMutation<unknown, ApiError, { sessionId: string; paymentMethod: string }>({
    mutationFn: ({ sessionId, paymentMethod }) =>
      api.post(`/sessions/${sessionId}/settle`, { paymentMethod }),
    onSuccess: invalidate,
  })
}

export function useCloseSession() {
  const invalidate = useInvalidateSessions()
  return useMutation<unknown, ApiError, { sessionId: string; force?: boolean; reason?: string }>({
    mutationFn: ({ sessionId, force, reason }) =>
      api.post(`/sessions/${sessionId}/close`, { force, reason }),
    onSuccess: invalidate,
  })
}

export function useUnlockSessionBill() {
  const invalidate = useInvalidateSessions()
  return useMutation<unknown, ApiError, string>({
    mutationFn: (sessionId) => api.post(`/sessions/${sessionId}/unlock-bill`, {}),
    onSuccess: invalidate,
  })
}

export function useTableQr(tableId: string | null) {
  return useQuery<TableQr, ApiError>({
    queryKey: tableSessionKeys.qr(tableId ?? ""),
    queryFn: () => api.get<TableQr>(`/tables/${tableId}/qr`),
    enabled: !!tableId,
  })
}

export function useRotateTableQr() {
  const qc = useQueryClient()
  return useMutation<TableQr, ApiError, string>({
    mutationFn: (tableId) => api.post<TableQr>(`/tables/${tableId}/rotate-qr`, {}),
    onSuccess: (data) => qc.setQueryData(tableSessionKeys.qr(data.tableId), data),
  })
}

/** Pending guest requests (call waiter, water, cutlery, bill). */
export function useServiceRequests(tenantId?: string | null) {
  return useQuery<ServiceRequest[], ApiError>({
    queryKey: tableSessionKeys.serviceRequests(tenantId),
    queryFn: () => api.get<ServiceRequest[]>(withTenant("/service-requests", tenantId)),
    refetchInterval: 10_000,
  })
}

export function useHandleServiceRequest() {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: (id) => api.patch(`/service-requests/${id}/handle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-requests"] }),
  })
}

type MyTenant = { id: string; name: string; tagline: string | null; isOpen: boolean }

/** The signed-in tenant user's own restaurant (not available to GLOBAL users). */
export function useMyTenant() {
  const { data: me } = useMe()
  return useQuery<MyTenant, ApiError>({
    queryKey: tableSessionKeys.myTenant,
    queryFn: () => api.get<MyTenant>("/tenants/me"),
    enabled: me?.scope === "TENANT" && !!me.tenantId,
  })
}

export function useUpdateMyTenant() {
  const qc = useQueryClient()
  return useMutation<MyTenant, ApiError, Partial<Pick<MyTenant, "isOpen" | "tagline">>>({
    mutationFn: (input) => api.patch<MyTenant>("/tenants/me", input),
    onSuccess: (data) => qc.setQueryData(tableSessionKeys.myTenant, data),
  })
}

/**
 * Invalidate like the other session mutations, and put the bill the API
 * returned straight into the open tab so the dialog updates without waiting
 * for the refetch.
 */
function useApplyBill() {
  const qc = useQueryClient()
  const invalidate = useInvalidateSessions()
  return (sessionId: string, bill: SessionBill) => {
    qc.setQueryData<TableSessionDetail>(tableSessionKeys.detail(sessionId), (old) =>
      old ? { ...old, bill } : old,
    )
    invalidate()
  }
}

/** One tab with its orders and bill (Settle / Split dialog). */
export function useSessionDetail(sessionId: string | null) {
  return useQuery<TableSessionDetail, ApiError>({
    queryKey: tableSessionKeys.detail(sessionId ?? ""),
    queryFn: () => api.get<TableSessionDetail>(`/sessions/${sessionId}`),
    enabled: !!sessionId,
    refetchInterval: 10_000,
  })
}

export function useSplitSession() {
  const apply = useApplyBill()
  return useMutation<SessionBill, ApiError, { sessionId: string; payload: SplitPayload }>({
    mutationFn: ({ sessionId, payload }) => api.post(`/sessions/${sessionId}/split`, payload),
    onSuccess: (bill, { sessionId }) => apply(sessionId, bill),
  })
}

export function useCancelSessionSplit() {
  const apply = useApplyBill()
  return useMutation<SessionBill, ApiError, string>({
    mutationFn: (sessionId) => api.post(`/sessions/${sessionId}/split/cancel`, {}),
    onSuccess: (bill, sessionId) => apply(sessionId, bill),
  })
}

/** Cashier collected one share. */
export function usePayShare() {
  const apply = useApplyBill()
  return useMutation<SessionBill, ApiError, { sessionId: string; shareId: string; paymentMethod: string }>({
    mutationFn: ({ sessionId, shareId, paymentMethod }) =>
      api.post(`/sessions/${sessionId}/shares/${shareId}/pay`, { paymentMethod }),
    onSuccess: (bill, { sessionId }) => apply(sessionId, bill),
  })
}

export function useTransferSession() {
  const invalidate = useInvalidateSessions()
  return useMutation<unknown, ApiError, { sessionId: string; toTableId: string }>({
    mutationFn: ({ sessionId, toTableId }) => api.post(`/sessions/${sessionId}/transfer`, { toTableId }),
    onSuccess: invalidate,
  })
}

export function useMergeSession() {
  const invalidate = useInvalidateSessions()
  return useMutation<unknown, ApiError, { sessionId: string; intoSessionId: string }>({
    mutationFn: ({ sessionId, intoSessionId }) =>
      api.post(`/sessions/${sessionId}/merge`, { intoSessionId }),
    onSuccess: invalidate,
  })
}
