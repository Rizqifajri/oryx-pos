import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
 * Uses guest token in Authorization header.
 */
export function useSubmitGuestFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitFeedbackPayload) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("guest_token") : null;
      return api.post("/feedbacks/public", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });
}

