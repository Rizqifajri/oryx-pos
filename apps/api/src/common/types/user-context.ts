export interface UserContext {
  userId: string;
  tenantId: string | null;
  scope: "GLOBAL" | "TENANT";
  roles: string[];
  permissions: string[];
}
