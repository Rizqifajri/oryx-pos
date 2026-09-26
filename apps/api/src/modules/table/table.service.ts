import { Injectable } from "@nestjs/common";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { OrderRepository } from "../order/order.repository";
import { TenantRepository } from "../tenant/tenant.repository";
import { TableRepository } from "./table.repository";
import type {
  CreateTableInput,
  TableStatus,
  UpdateTableInput,
} from "./table.schema";

@Injectable()
export class TableService {
  constructor(
    private readonly tableRepo: TableRepository,
    private readonly orderRepo: OrderRepository,
    private readonly tenantRepo: TenantRepository,
  ) {}

  async listTables(
    ctx: UserContext,
    filters?: { tenantId?: string; status?: TableStatus },
  ) {
    // Permission check now handled by route middleware

    // For TENANT scope: always use their tenant (ignore any provided tenantId)
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      if (filters?.status) {
        return await this.tableRepo.findTablesByTenantAndStatus(
          ctx.tenantId,
          filters.status,
        );
      }
      return await this.tableRepo.findTablesByTenantId(ctx.tenantId);
    }

    // For GLOBAL scope: use filter tenantId if provided
    if (filters?.tenantId) {
      if (filters?.status) {
        return await this.tableRepo.findTablesByTenantAndStatus(
          filters.tenantId,
          filters.status,
        );
      }
      return await this.tableRepo.findTablesByTenantId(filters.tenantId);
    }

    return await this.tableRepo.findAllTables();
  }

  async getTablesByTenant(ctx: UserContext, tenantId: string) {
    // Permission check now handled by route middleware

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      if (ctx.tenantId !== tenantId) {
        throw new AppError("You do not have access to this tenant", 403);
      }
    }

    const tenant = await this.tenantRepo.findTenantById(tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return await this.tableRepo.findTablesByTenantId(tenantId);
  }

  async getTable(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware

    const table = await this.tableRepo.findTableById(id);
    if (!table) {
      throw new AppError("Table not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, table.tenantId);
    }

    return table;
  }

  async createTable(ctx: UserContext, input: CreateTableInput) {
    // Permission check now handled by route middleware

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      if (input.tenantId !== ctx.tenantId) {
        throw new AppError("You can only create tables in your own tenant", 403);
      }
    }

    const tenant = await this.tenantRepo.findTenantById(input.tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return await this.tableRepo.createTable({
      tenantId: input.tenantId,
      name: input.name,
      capacity: input.capacity,
      status: input.status,
    });
  }

  async updateTable(ctx: UserContext, id: string, input: UpdateTableInput) {
    // Permission check now handled by route middleware

    const table = await this.tableRepo.findTableById(id);
    if (!table) {
      throw new AppError("Table not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, table.tenantId);
    }

    return await this.tableRepo.updateTable(id, input);
  }

  async updateTableStatus(ctx: UserContext, id: string, status: TableStatus) {
    // Permission check now handled by route middleware

    const table = await this.tableRepo.findTableById(id);
    if (!table) {
      throw new AppError("Table not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, table.tenantId);
    }

    return await this.tableRepo.updateTable(id, { status });
  }

  async deleteTable(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware

    const table = await this.tableRepo.findTableById(id);
    if (!table) {
      throw new AppError("Table not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, table.tenantId);
    }

    const activeOrders = await this.orderRepo.findActiveOrdersByTableId(id);
    if (activeOrders.length > 0) {
      throw new AppError("Cannot delete a table with active orders", 400);
    }

    return await this.tableRepo.deleteTable(id);
  }
}
