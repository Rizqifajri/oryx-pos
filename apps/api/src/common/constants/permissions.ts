export const GLOBAL_ONLY_PERMISSIONS = new Set([
  // Tenant management - GLOBAL only (super admins manage restaurants)
  // "tenant:list" - REMOVED: Allow tenant users to list their own tenant
  "tenant:view",
  "tenant:create",
  "tenant:update",
  "tenant:delete",
  "tenant:manage",
  
  // Permission management - GLOBAL only (system-level permissions)
  // "permission:list" - REMOVED: Allow tenant admins to list permissions for role management
  "permission:view",
  "permission:create",
  "permission:update",
  "permission:delete",
  "permission:manage",
]);
