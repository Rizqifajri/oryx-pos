import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "requiredPermissions";

/**
 * Requires at least ONE of the listed permissions (OR logic), matching the old
 * `requirePermission(...)` middleware. A route with no decorator is not
 * permission-gated at all.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
