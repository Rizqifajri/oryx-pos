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
  ORDER_CANCEL: "order:cancel",
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

  // ─── Payment ─────────────────────────────────────────────────────────────
  PAYMENT_LIST: "payment:list",
  PAYMENT_VIEW: "payment:view",
  PAYMENT_CREATE: "payment:create",
  PAYMENT_UPDATE: "payment:update",
  PAYMENT_DELETE: "payment:delete",
  PAYMENT_MANAGE: "payment:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role → Permission mapping ────────────────────────────────────────────────
// Mirrors what the backend actually grants each scope.
// SUPER_ADMIN (GLOBAL scope) → full access to everything.
// ADMIN (TENANT scope) → manages their own tenant's menu, inventory, orders only.
// Users / Roles / Tenants require GLOBAL scope; backend rejects TENANT scope for those.

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS) as Permission[],

  ADMIN: [
    // User & Role management (tenant-scoped)
    PERMISSIONS.USER_LIST,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ROLE_LIST,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_MANAGE,
    // Tenant info (view own tenant)
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.TENANT_MANAGE,
    PERMISSIONS.PERMISSION_LIST,
    PERMISSIONS.PERMISSION_VIEW,
    // Resource management
    PERMISSIONS.CATEGORY_LIST,
    PERMISSIONS.CATEGORY_VIEW,
    PERMISSIONS.CATEGORY_MANAGE,
    PERMISSIONS.MENU_LIST,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_MANAGE,
    PERMISSIONS.TABLE_LIST,
    PERMISSIONS.TABLE_VIEW,
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.ORDER_LIST,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_MANAGE,
    PERMISSIONS.PAYMENT_LIST,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_MANAGE,
  ],

  CASHIER: [
    PERMISSIONS.MENU_LIST,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.TABLE_LIST,
    PERMISSIONS.TABLE_VIEW,
    PERMISSIONS.ORDER_LIST,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.PAYMENT_LIST,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_CREATE,
  ],

  CUSTOMER: [
    PERMISSIONS.MENU_LIST,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.ORDER_LIST,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.PAYMENT_CREATE,
  ],
};

// Maps API scope → frontend role.
// GLOBAL = Super Admin (full access). TENANT = Admin (tenant-scoped access).
export const SCOPE_ROLE_MAP: Record<"GLOBAL" | "TENANT", Role> = {
  GLOBAL: ROLES.SUPER_ADMIN,
  TENANT: ROLES.ADMIN,
};
