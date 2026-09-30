"use client"

import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { GuestApiError } from "./api"
import { useGuest } from "./session-context"
import type {
  Bill,
  BillPayment,
  PublicMenu,
  ServiceRequestType,
  SessionOrder,
  SessionView,
  SubmitOrderLine,
} from "./types"

export const tableOrderKeys = {
  menu: (tenantId: string) => ["table-order", "menu", tenantId] as const,
  session: (sessionId: string) => ["table-order", "session", sessionId] as const,
  payment: (paymentId: string) => ["table-order", "payment", paymentId] as const,
}

export function useMenu() {
  const { client, guest } = useGuest()
  return useQuery<PublicMenu, GuestApiError>({
    queryKey: tableOrderKeys.menu(guest.tenant.id),
    queryFn: () => client.get(`/public/tenants/${guest.tenant.id}/menu`),
    staleTime: 60_000,
  })
}

/**
 * The session (orders, bill, cooldowns). SSE invalidates it on every change;
 * the interval is the fallback when the stream is unavailable.
 */
export function useSessionView() {
  const { client, guest } = useGuest()
  return useQuery<SessionView, GuestApiError>({
    queryKey: tableOrderKeys.session(guest.sessionId),
    queryFn: () => client.get(`/public/sessions/${guest.sessionId}`),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })
}

/** Subscribes to the session's SSE stream and refetches on each event. */
export function useSessionEvents() {
  const { guest } = useGuest()
  const qc = useQueryClient()

  useEffect(() => {
    if (typeof EventSource === "undefined") return
    const url = `${process.env.NEXT_PUBLIC_API_URL}/public/sessions/${guest.sessionId}/events?token=${encodeURIComponent(guest.guestToken)}`
    const source = new EventSource(url)
    source.onmessage = (event) => {
      let type: string | undefined
      try {
        type = (JSON.parse(event.data) as { type?: string }).type
      } catch {
        // Malformed frame: refresh the session below to be safe.
      }
      if (type === "ping") return
      // Staff edited the catalog (price, sold out, new item): reload the menu.
      if (type === "menu.updated") {
        qc.invalidateQueries({ queryKey: tableOrderKeys.menu(guest.tenant.id) })
        return
      }
      // Session changes, and tenant.updated ("accepting orders", name) which
      // the session view carries.
      qc.invalidateQueries({ queryKey: tableOrderKeys.session(guest.sessionId) })
    }
    // EventSource reconnects on its own; polling covers the gap meanwhile.
    return () => source.close()
  }, [guest.guestToken, guest.sessionId, guest.tenant.id, qc])
}

function useInvalidateSession() {
  const { guest } = useGuest()
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: tableOrderKeys.session(guest.sessionId) })
}

export function useSubmitOrder() {
  const { client, guest } = useGuest()
  const invalidate = useInvalidateSession()
  return useMutation<
    SessionOrder,
    GuestApiError,
    { lines: SubmitOrderLine[]; note?: string; idempotencyKey: string }
  >({
    mutationFn: ({ lines, note, idempotencyKey }) =>
      client.post(
        `/public/sessions/${guest.sessionId}/orders`,
        { lines, note: note || undefined },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSettled: invalidate,
  })
}

export function useCancelOrder() {
  const { client } = useGuest()
  const invalidate = useInvalidateSession()
  return useMutation<SessionOrder, GuestApiError, string>({
    mutationFn: (orderId) => client.post(`/public/orders/${orderId}/cancel`),
    onSettled: invalidate,
  })
}

export function useLockBill() {
  const { client, guest } = useGuest()
  const invalidate = useInvalidateSession()
  return useMutation<Bill, GuestApiError, "online" | "cashier">({
    mutationFn: (method) =>
      client.post(`/public/sessions/${guest.sessionId}/bill/lock`, { method }),
    onSettled: invalidate,
  })
}

export function useCreateBillPayment() {
  const { client } = useGuest()
  const invalidate = useInvalidateSession()
  return useMutation<
    { method: "online" | "cashier"; payment: BillPayment | null; bill: Bill },
    GuestApiError,
    { billId: string; method: "online" | "cashier" }
  >({
    mutationFn: ({ billId, method }) =>
      client.post(`/public/bills/${billId}/payments`, { method }),
    onSettled: invalidate,
  })
}

export function useCancelBillPayment() {
  const { client } = useGuest()
  const invalidate = useInvalidateSession()
  return useMutation<Bill, GuestApiError, string>({
    mutationFn: (billId) => client.post(`/public/bills/${billId}/cancel-payment`),
    onSettled: invalidate,
  })
}

/**
 * Polls a pending payment. The server reconciles with Midtrans on each poll,
 * so this also recovers a missed webhook. The page never decides "paid".
 */
export function usePaymentStatus(paymentId: string | null | undefined, enabled: boolean) {
  const { client } = useGuest()
  const invalidate = useInvalidateSession()
  const query = useQuery<{ payment: BillPayment; bill: Bill }, GuestApiError>({
    queryKey: tableOrderKeys.payment(paymentId ?? ""),
    queryFn: () => client.get(`/public/payments/${paymentId}`),
    enabled: !!paymentId && enabled,
    refetchInterval: 5_000,
  })
  const status = query.data?.payment.status
  useEffect(() => {
    if (status && status !== "pending") void invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])
  return query
}

export function useServiceRequest() {
  const { client, guest } = useGuest()
  const invalidate = useInvalidateSession()
  return useMutation<{ id: string; retryAt: string }, GuestApiError, ServiceRequestType>({
    mutationFn: (type) =>
      client.post(`/public/sessions/${guest.sessionId}/service-requests`, { type }),
    onSettled: invalidate,
  })
}

/**
 * The restaurant as it is now: the live session view (refreshed on
 * tenant.updated) with the join-time copy as fallback while it loads.
 */
export function useLiveTenant() {
  const { guest } = useGuest()
  const { data: view } = useSessionView()
  return view?.tenant ?? guest.tenant
}
