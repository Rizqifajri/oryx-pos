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
  type CreateOrderInput,
  createOrderSchema,
  type OrderStatus,
  type UpdateOrderStatusInput,
  updateOrderStatusSchema,
} from "./order.schema";
import { OrderService } from "./order.service";

@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ── Protected routes (authentication + permissions required) ────────────────

  @Get()
  @RequirePermissions("order:list")
  async listOrders(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
    @Query("status") status?: string,
    @Query("tableId") tableId?: string,
  ) {
    const filters: {
      tenantId?: string;
      status?: OrderStatus;
      tableId?: string;
    } = {};

    if (tenantId && typeof tenantId === "string") {
      filters.tenantId = tenantId;
    }

    if (
      status === "NEW" ||
      status === "PROCESSING" ||
      status === "COMPLETED" ||
      status === "CANCELED"
    ) {
      filters.status = status as OrderStatus;
    }

    if (tableId && typeof tableId === "string") {
      filters.tableId = tableId;
    }

    const data = await this.orderService.listOrders(user, filters);
    return { success: true, data };
  }

  @Get(":id")
  @RequirePermissions("order:view")
  async getOrder(@CurrentUser() user: UserContext, @Param("id") id: string) {
    const data = await this.orderService.getOrder(user, id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions("order:manage", "order:create")
  async createOrder(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput,
  ) {
    const data = await this.orderService.createOrder(user, body);
    return { success: true, data };
  }

  @Patch(":id/status")
  @RequirePermissions("order:manage", "order:update")
  async updateOrderStatus(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema))
    body: UpdateOrderStatusInput,
  ) {
    const data = await this.orderService.updateOrderStatus(user, id, body);
    return { success: true, data };
  }

  @Delete(":id")
  @RequirePermissions("order:manage", "order:delete")
  async deleteOrder(@CurrentUser() user: UserContext, @Param("id") id: string) {
    await this.orderService.deleteOrder(user, id);
    return { success: true, message: "Order deleted successfully" };
  }
}
