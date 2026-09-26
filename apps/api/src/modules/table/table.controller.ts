import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreateTableInput,
  createTableSchema,
  type TableStatus,
  type UpdateTableInput,
  updateTableSchema,
  type UpdateTableStatusInput,
  updateTableStatusSchema,
} from "./table.schema";
import { TableService } from "./table.service";

@Controller("tables")
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Get()
  @RequirePermissions("table:list")
  async listTables(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
    @Query("status") status?: string,
  ) {
    const filters: { tenantId?: string; status?: TableStatus } = {};

    if (tenantId && typeof tenantId === "string") {
      filters.tenantId = tenantId;
    }

    if (status === "AVAILABLE" || status === "OCCUPIED") {
      filters.status = status;
    }

    const tableList = await this.tableService.listTables(user, filters);
    return {
      success: true,
      data: tableList,
    };
  }

  @Get("tenant/:tenantId")
  @RequirePermissions("table:list")
  async getTablesByTenant(
    @CurrentUser() user: UserContext,
    @Param("tenantId") tenantId: string,
  ) {
    const tableList = await this.tableService.getTablesByTenant(user, tenantId);
    return {
      success: true,
      data: tableList,
    };
  }

  @Get(":id")
  @RequirePermissions("table:view")
  async getTable(@CurrentUser() user: UserContext, @Param("id") id: string) {
    const table = await this.tableService.getTable(user, id);
    return {
      success: true,
      data: table,
    };
  }

  @Post()
  @RequirePermissions("table:manage", "table:create")
  async createTable(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createTableSchema)) body: CreateTableInput,
  ) {
    const table = await this.tableService.createTable(user, body);
    return {
      success: true,
      data: table,
    };
  }

  // Declared before PATCH :id so "status" is not captured as an id segment.
  @Patch(":id/status")
  @RequirePermissions("table:manage", "table:update")
  async updateTableStatus(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTableStatusSchema))
    body: UpdateTableStatusInput,
  ) {
    const table = await this.tableService.updateTableStatus(
      user,
      id,
      body.status,
    );
    return {
      success: true,
      data: table,
    };
  }

  @Patch(":id")
  @RequirePermissions("table:manage", "table:update")
  async updateTable(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTableSchema)) body: UpdateTableInput,
  ) {
    const table = await this.tableService.updateTable(user, id, body);
    return {
      success: true,
      data: table,
    };
  }

  @Delete(":id")
  @RequirePermissions("table:manage", "table:delete")
  async deleteTable(@CurrentUser() user: UserContext, @Param("id") id: string) {
    await this.tableService.deleteTable(user, id);
    return {
      success: true,
      message: "Table deleted successfully",
    };
  }
}
