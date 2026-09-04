/**
 * Permission Guard Components
 * 
 * These components help control access to UI elements and pages based on user permissions.
 * They work in conjunction with the backend RBAC (Role-Based Access Control) system.
 */

export { PermissionGuard, AnyPermissionGuard } from "./permission-guard"
export { RequirePermission } from "./require-permission"
export { AccessDenied } from "./access-denied"
