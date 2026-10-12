import { SCOPE_ROLE_MAP, type Permission, type Role } from "@/constants/permissions"
import { useMe } from "./use-me"

// /auth/me is the single source: it reads the DB, as the API's guard does, so
// the UI never shows a page the API would refuse.

/** Returns the current user's role derived from their API scope. */
export function useUserRole(): { role: Role | null; isLoading: boolean } {
  const { data: me, error } = useMe()
  return { role: me ? SCOPE_ROLE_MAP[me.scope] : null, isLoading: !me && !error }
}

/** Returns all permissions the current user holds. */
export function useUserPermissions(): {
  permissions: Permission[]
  isLoading: boolean
  error: Error | null
} {
  const { data: me, error } = useMe()
  return {
    permissions: (me?.permissions ?? []) as Permission[],
    // Pending until /auth/me answers, so guards show a skeleton, not "Access denied".
    isLoading: !me && !error,
    error: error as Error | null,
  }
}

/** Returns true if the user has ALL of the given permissions. */
export function useHasPermission(...permissions: Permission[]) {
  const { permissions: userPermissions, isLoading } = useUserPermissions()
  return {
    hasPermission: !isLoading && permissions.every((p) => userPermissions.includes(p)),
    isLoading,
  }
}

/** Returns true if the user has ANY of the given permissions. */
export function useHasAnyPermission(...permissions: Permission[]) {
  const { permissions: userPermissions, isLoading } = useUserPermissions()
  return {
    hasPermission: !isLoading && permissions.some((p) => userPermissions.includes(p)),
    isLoading,
  }
}
