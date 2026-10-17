import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useGuest } from "@/features/table-order/session-context";
import type { GuestApiError } from "@/features/table-order/api";
import type {
  FeedbackSummary,
  PaginatedFeedbacks,
  SubmitFeedbackPayload,
} from "../types";

export const feedbackKeys = {
  all: (filters?: { overallRating?: number; page?: number; limit?: number; tenantId?: string }) =>
    ["feedbacks", filters ?? null] as const,
  summary: (tenantId?: string) => ["feedbacks", "summary", tenantId ?? null] as const,
};

export function useFeedbacks(filters?: {
  overallRating?: number;
  page?: number;
  limit?: number;
  tenantId?: string;
}) {
  return useQuery({
    queryKey: feedbackKeys.all(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.overallRating) params.set("overallRating", String(filters.overallRating));
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.tenantId) params.set("tenantId", filters.tenantId);
      const qs = params.toString();
      return api.get<PaginatedFeedbacks>(qs ? `/feedbacks?${qs}` : "/feedbacks");
    },
  });
}

export function useFeedbackSummary(tenantId?: string) {
  return useQuery({
    queryKey: feedbackKeys.summary(tenantId),
    queryFn: () => {
      const qs = tenantId ? `?tenantId=${tenantId}` : "";
      return api.get<FeedbackSummary>(`/feedbacks/summary${qs}`);
    },
  });
}

/**
 * Hook for guest ordering table to submit feedback.
 * Uses guest client with X-Guest-Token from session context so it never triggers staff 401 redirect to /login.
 */
export function useSubmitGuestFeedback() {
  const qc = useQueryClient();
  const { client, guest } = useGuest();

  return useMutation<unknown, GuestApiError, SubmitFeedbackPayload>({
    mutationFn: (payload: SubmitFeedbackPayload) => {
      return client.post(`/public/sessions/${guest.sessionId}/feedbacks`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });
}

