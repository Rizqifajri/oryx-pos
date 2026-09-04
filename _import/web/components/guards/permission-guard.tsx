"use client"

import { useHasPermission, useHasAnyPermission } from "@/features/auth/hooks/use-permissions"
import type { Permission } from "@/constants/permissions"
import type { ReactNode } from "react"

interface PermissionGuardProps {
  /** Single permission or array of permissions required */
  permissions: Permission | Permission[]
  /** If true, user must have ALL permissions. If false, user needs ANY permission. Default: true */
  requireAll?: boolean
  /** Content to show when user has permission */
  children: ReactNode
  /** Optional fallback content to show when user lacks permission */
  fallback?: ReactNode
}

/**
 * Conditionally renders children based on user permissions.
 * 
 * @example
 * // Show button only if user has menu:create permission
 * <PermissionGuard permissions="menu:create">
 *   <Button>Add Menu</Button>
 * </PermissionGuard>
 * 
 * @example
 * // Show if user has ALL listed permissions
 * <PermissionGuard permissions={["user:manage", "role:manage"]} requireAll>
 *   <AdminPanel />
 * </PermissionGuard>
 * 
 * @example
 * // Show if user has ANY of the listed permissions
 * <PermissionGuard permissions={["order:view", "order:create"]} requireAll={false}>
 *   <OrdersTab />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permissions,
  requireAll = true,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const perms = Array.isArray(permissions) ? permissions : [permissions]
  const { hasPermission: hasAll, isLoading: loadingAll } = useHasPermission(...perms)
  const { hasPermission: hasAny, isLoading: loadingAny } = useHasAnyPermission(...perms)

  const isLoading = requireAll ? loadingAll : loadingAny
  const hasAccess = requireAll ? hasAll : hasAny

  // Show content immediately if user has permission (from cache or API)
  // Only hide after loading completes and user lacks permission
  // This prevents UI flicker during initial load
  if (isLoading && !hasAccess) {
    // Still loading and no permission yet - hide content
    return <>{fallback}</>
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * Shorthand for PermissionGuard with requireAll=false
 * Shows children if user has ANY of the listed permissions.
 */
export function AnyPermissionGuard({
  permissions,
  children,
  fallback,
}: Omit<PermissionGuardProps, "requireAll">) {
  return (
    <PermissionGuard permissions={permissions} requireAll={false} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}
