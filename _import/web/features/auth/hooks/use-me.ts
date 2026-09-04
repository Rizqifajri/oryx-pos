import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface MeResponse {
  id: string
  email: string
  name: string
  tenantId: string | null
  scope: "GLOBAL" | "TENANT"
  permissions: string[]
}

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      return api.get<MeResponse>("/auth/me")
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    // Only fetch if we have a token
    enabled:
      typeof window !== "undefined" &&
      !!localStorage.getItem("access_token"),
  })
}
