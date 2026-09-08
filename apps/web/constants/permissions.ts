// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  CASHIER: "CASHIER",
  CUSTOMER: "CUSTOMER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ─── Permissions ──────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  // ─── Tenant (Super Admin only) ───────────────────────────────────────────
  TENANT_LIST: "tenant:list",
  TENANT_VIEW: "tenant:view",
  TENANT_CREATE: "tenant:create",
  TENANT_UPDATE: "tenant:update",
  TENANT_DELETE: "tenant:delete",
  TENANT_MANAGE: "tenant:manage",

  // ─── Role ────────────────────────────────────────────────────────────────
  ROLE_LIST: "role:list",
  ROLE_VIEW: "role:view",
  ROLE_CREATE: "role:create",
  ROLE_UPDATE: "role:update",
  ROLE_DELETE: "role:delete",
  ROLE_MANAGE: "role:manage",

  // ─── User ────────────────────────────────────────────────────────────────
  USER_LIST: "user:list",
  USER_VIEW: "user:view",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_MANAGE: "user:manage",

  // ─── Permission (Super Admin only) ───────────────────────────────────────
  PERMISSION_LIST: "permission:list",
  PERMISSION_VIEW: "permission:view",
  PERMISSION_CREATE: "permission:create",
  PERMISSION_UPDATE: "permission:update",
  PERMISSION_DELETE: "permission:delete",
  PERMISSION_MANAGE: "permission:manage",

  // ─── Category ────────────────────────────────────────────────────────────
  CATEGORY_LIST: "category:list",
  CATEGORY_VIEW: "category:view",
  CATEGORY_CREATE: "category:create",
  CATEGORY_UPDATE: "category:update",
  CATEGORY_DELETE: "category:delete",
  CATEGORY_MANAGE: "category:manage",

  // ─── Menu ────────────────────────────────────────────────────────────────
  MENU_LIST: "menu:list",
  MENU_VIEW: "menu:view",
  MENU_CREATE: "menu:create",
  MENU_UPDATE: "menu:update",
  MENU_DELETE: "menu:delete",
  MENU_MANAGE: "menu:manage",

  // ─── Table ───────────────────────────────────────────────────────────────
  TABLE_LIST: "table:list",
  TABLE_VIEW: "table:view",
  TABLE_CREATE: "table:create",
  TABLE_UPDATE: "table:update",
  TABLE_DELETE: "table:delete",
  TABLE_MANAGE: "table:manage",

  // ─── Order ───────────────────────────────────────────────────────────────
  ORDER_LIST: "order:list",
  ORDER_VIEW: "order:view",
  ORDER_CREATE: "order:create",
  ORDER_UPDATE: "order:update",
  ORDER_DELETE: "order:delete",
  ORDER_MANAGE: "order:manage",

  // ─── Customer ────────────────────────────────────────────────────────────
  CUSTOMER_LIST: "customer:list",
  CUSTOMER_VIEW: "customer:view",
  CUSTOMER_CREATE: "customer:create",
  CUSTOMER_UPDATE: "customer:update",
  CUSTOMER_DELETE: "customer:delete",
  CUSTOMER_MANAGE: "customer:manage",

  // ─── Transaction ─────────────────────────────────────────────────────────
  TRANSACTION_LIST: "transaction:list",
  TRANSACTION_VIEW: "transaction:view",
  TRANSACTION_CREATE: "transaction:create",
  TRANSACTION_UPDATE: "transaction:update",
  TRANSACTION_DELETE: "transaction:delete",
  TRANSACTION_MANAGE: "transaction:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Maps API scope → frontend role.
// GLOBAL = Super Admin (full access). TENANT = Admin (tenant-scoped access).
export const SCOPE_ROLE_MAP: Record<"GLOBAL" | "TENANT", Role> = {
  GLOBAL: ROLES.SUPER_ADMIN,
  TENANT: ROLES.ADMIN,
};
