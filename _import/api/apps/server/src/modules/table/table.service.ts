import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertTenantMatch } from "@/utils/assert-permission";
import * as orderRepo from "../order/order.repository";
import * as tenantRepo from "../tenant/tenant.repository";
import * as tableRepo from "./table.repository";
import type {
  CreateTableInput,
  TableStatus,
  UpdateTableInput,
} from "./table.schema";

export const listTables = async (
  ctx: UserContext,
  filters?: { tenantId?: string; status?: TableStatus },
) => {
  // Permission check now handled by route middleware

  // For TENANT scope: always use their tenant (ignore any provided tenantId)
  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }
    if (filters?.status) {
      return await tableRepo.findTablesByTenantAndStatus(
        ctx.tenantId,
        filters.status,
      );
    }
    return await tableRepo.findTablesByTenantId(ctx.tenantId);
  }

  // For GLOBAL scope: use filter tenantId if provided
  if (filters?.tenantId) {
    if (filters?.status) {
      return await tableRepo.findTablesByTenantAndStatus(
        filters.tenantId,
        filters.status,
      );
    }
    return await tableRepo.findTablesByTenantId(filters.tenantId);
  }

  return await tableRepo.findAllTables();
};

export const getTablesByTenant = async (ctx: UserContext, tenantId: string) => {
  // Permission check now handled by route middleware

  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }
    if (ctx.tenantId !== tenantId) {
      throw new AppError("You do not have access to this tenant", 403);
    }
  }

  const tenant = await tenantRepo.findTenantById(tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return await tableRepo.findTablesByTenantId(tenantId);
};

export const getTable = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware

  const table = await tableRepo.findTableById(id);
  if (!table) {
    throw new AppError("Table not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, table.tenantId);
  }

  return table;
};

export const createTable = async (
  ctx: UserContext,
  input: CreateTableInput,
) => {
  // Permission check now handled by route middleware

  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }
    if (input.tenantId !== ctx.tenantId) {
      throw new AppError("You can only create tables in your own tenant", 403);
    }
  }

  const tenant = await tenantRepo.findTenantById(input.tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return await tableRepo.createTable({
    tenantId: input.tenantId,
    name: input.name,
    capacity: input.capacity,
    status: input.status,
  });
};

export const updateTable = async (
  ctx: UserContext,
  id: string,
  input: UpdateTableInput,
) => {
  // Permission check now handled by route middleware

  const table = await tableRepo.findTableById(id);
  if (!table) {
    throw new AppError("Table not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, table.tenantId);
  }

  return await tableRepo.updateTable(id, input);
};

export const updateTableStatus = async (
  ctx: UserContext,
  id: string,
  status: TableStatus,
) => {
  // Permission check now handled by route middleware

  const table = await tableRepo.findTableById(id);
  if (!table) {
    throw new AppError("Table not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, table.tenantId);
  }

  return await tableRepo.updateTable(id, { status });
};

export const deleteTable = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware

  const table = await tableRepo.findTableById(id);
  if (!table) {
    throw new AppError("Table not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, table.tenantId);
  }

  const activeOrders = await orderRepo.findActiveOrdersByTableId(id);
  if (activeOrders.length > 0) {
    throw new AppError("Cannot delete a table with active orders", 400);
  }

  return await tableRepo.deleteTable(id);
};
