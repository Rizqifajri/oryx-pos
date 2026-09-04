"use client"

import { useHasPermission, useHasAnyPermission } from "@/features/auth/hooks/use-permissions"
import type { Permission } from "@/constants/permissions"
import type { ReactNode } from "react"
import { AccessDenied } from "./access-denied"
import { Skeleton } from "@/components/ui/skeleton"

interface RequirePermissionProps {
  /** Single permission or array of permissions required */
  permissions: Permission | Permission[]
  /** If true, user must have ALL permissions. If false, user needs ANY permission. Default: true */
  requireAll?: boolean
  /** Content to show when user has permission */
  children: ReactNode
  /** Optional custom fallback. Defaults to AccessDenied component */
  fallback?: ReactNode
  /** Custom access denied message */
  deniedMessage?: string
}

/**
 * Page-level permission guard. Similar to PermissionGuard but designed for protecting
 * entire pages or major sections. Defaults to showing an AccessDenied screen.
 * 
 * @example
 * // Protect an entire admin page
 * export default function AdminPage() {
 *   return (
 *     <RequirePermission permissions="user:manage">
 *       <UserManagementContent />
 *     </RequirePermission>
 *   )
 * }
 * 
 * @example
 * // Require multiple permissions
 * <RequirePermission 
 *   permissions={["role:manage", "user:manage"]} 
 *   deniedMessage="You need both role and user management permissions to access this page."
 * >
 *   <AdminPanel />
 * </RequirePermission>
 * 
 * @example
 * // Show if user has ANY permission (not all)
 * <RequirePermission 
 *   permissions={["order:view", "order:create"]} 
 *   requireAll={false}
 * >
 *   <OrdersPage />
 * </RequirePermission>
 */
export function RequirePermission({
  permissions,
  requireAll = true,
  children,
  fallback,
  deniedMessage,
}: RequirePermissionProps) {
  const perms = Array.isArray(permissions) ? permissions : [permissions]
  const { hasPermission: hasAll, isLoading: loadingAll } = useHasPermission(...perms)
  const { hasPermission: hasAny, isLoading: loadingAny } = useHasAnyPermission(...perms)

  const isLoading = requireAll ? loadingAll : loadingAny
  const hasAccess = requireAll ? hasAll : hasAny

  // Show loading skeleton while fetching permissions from API
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    )
  }

  // Only show access denied AFTER permissions have loaded
  if (!hasAccess) {
    return fallback !== undefined ? <>{fallback}</> : <AccessDenied message={deniedMessage} />
  }

  return <>{children}</>
}
