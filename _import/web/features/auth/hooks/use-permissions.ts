import { useEffect, useState } from "react"
import {
  SCOPE_ROLE_MAP,
  type Permission,
  type Role,
} from "@/constants/permissions"
import { getStoredUser } from "./use-auth"
import { useMe } from "./use-me"

function getCachedPermissions(): Permission[] {
  const user = getStoredUser()
  if (!user || !user.permissions) return []
  return user.permissions as Permission[]
}

/** Returns the current user's role derived from their API scope. */
export function useUserRole(): { role: Role | null; isLoading: boolean } {
  const { data: meData, isLoading } = useMe()
  const [cachedRole, setCachedRole] = useState<Role | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    setCachedRole(user ? (SCOPE_ROLE_MAP[user.scope] ?? null) : null)
  }, [])

  const role = meData ? (SCOPE_ROLE_MAP[meData.scope] ?? null) : cachedRole

  return { role, isLoading }
}

/** Returns all permissions the current user holds.
 *  Fetches from API with localStorage as cache/fallback. */
export function useUserPermissions(): {
  permissions: Permission[]
  isLoading: boolean
  error: Error | null
} {
  const { data: meData, isLoading: apiLoading, error } = useMe()
  const [cachedPermissions, setCachedPermissions] = useState<Permission[]>([])
  const [cacheLoaded, setCacheLoaded] = useState(false)

  // Load cached permissions from localStorage on mount
  useEffect(() => {
    setCachedPermissions(getCachedPermissions())
    setCacheLoaded(true)
  }, [])

  // Use API data if available, otherwise use cache
  const permissions =
    (meData?.permissions as Permission[]) ?? cachedPermissions

  // Keep loading state true until cache is loaded OR API returns data
  // This prevents showing "Access Denied" before permissions are ready
  const isLoading = !cacheLoaded || (apiLoading && cachedPermissions.length === 0)

  return {
    permissions,
    isLoading,
    error: error as Error | null,
  }
}

/** Returns true if the user has ALL of the given permissions. */
export function useHasPermission(
  ...permissions: Permission[]
): {
  hasPermission: boolean
  isLoading: boolean
} {
  const { permissions: userPermissions, isLoading } = useUserPermissions()

  return {
    hasPermission: isLoading
      ? false
      : permissions.every((p) => userPermissions.includes(p)),
    isLoading,
  }
}

/** Returns true if the user has ANY of the given permissions. */
export function useHasAnyPermission(
  ...permissions: Permission[]
): {
  hasPermission: boolean
  isLoading: boolean
} {
  const { permissions: userPermissions, isLoading } = useUserPermissions()

  return {
    hasPermission: isLoading
      ? false
      : permissions.some((p) => userPermissions.includes(p)),
    isLoading,
  }
}
