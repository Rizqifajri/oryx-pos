import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { AppError } from "../../common/errors/app-error";
import { SessionEventsService } from "../../common/realtime/session-events.service";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { DRIZZLE } from "../../database/database.module";
import { CustomerRepository } from "../customer/customer.repository";
import { MenuRepository } from "../menu/menu.repository";
import { TableRepository } from "../table/table.repository";
import { TableSessionRepository } from "../table-session/table-session.repository";
import { OrderRepository } from "./order.repository";
import type {
  CreateOrderInput,
  OrderStatus,
  UpdateOrderStatusInput,
} from "./order.schema";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["PROCESSING", "CANCELED"],
  PROCESSING: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};

@Injectable()
export class OrderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly orderRepo: OrderRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly menuRepo: MenuRepository,
    private readonly tableRepo: TableRepository,
    private readonly sessionRepo: TableSessionRepository,
    private readonly events: SessionEventsService,
  ) {}

  async listOrders(
    ctx: UserContext,
    filters?: { tenantId?: string; status?: OrderStatus; tableId?: string },
  ) {
    // Permission check now handled by route middleware

    // For TENANT scope: always use their tenant (ignore any provided tenantId)
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      return await this.orderRepo.findOrdersByTenantId(ctx.tenantId, filters);
    }

    // For GLOBAL scope: use filter tenantId if provided
    if (filters?.tenantId) {
      return await this.orderRepo.findOrdersByTenantId(
        filters.tenantId,
        filters,
      );
    }

    return await this.orderRepo.findAllOrders();
  }

  async getOrder(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware

    const order = await this.orderRepo.findOrderById(id);
    if (!order) throw new AppError("Order not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, order.tenantId);

    return order;
  }

  // Helper function to find or create customer
  private async findOrCreateCustomer(
    tenantId: string,
    customerName: string,
    customerPhone?: string,
  ): Promise<string | null> {
    let customer = null;

    if (customerPhone) {
      customer = await this.customerRepo.findCustomerByPhoneAndTenant(
        customerPhone,
        tenantId,
      );
    }

    if (!customer) {
      customer = await this.customerRepo.createCustomer({
        tenantId,
        name: customerName,
        phone: customerPhone ?? null,
        email: null,
      });
    }

    return customer?.id ?? null;
  }

  async createOrder(ctx: UserContext, input: CreateOrderInput) {
    // Permission check now handled by route middleware

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      if (input.tenantId !== ctx.tenantId)
        throw new AppError(
          "You can only create orders in your own tenant",
          403,
        );
    }

    // A dine-in order joins the table's session (opening one if needed), so
    // POS rounds and guest QR rounds share one bill that is settled once from
    // Tables. Takeout/walk-in orders (no table) keep the per-order payment flow.
    let sessionId: string | null = null;
    if (input.tableId) {
      const table = await this.tableRepo.findTableById(input.tableId);
      if (!table) throw new AppError("Table not found", 404);
      if (table.tenantId !== input.tenantId)
        throw new AppError("Table does not belong to this tenant", 400);
      const { session } = await this.sessionRepo.findOrOpenSession(table);
      if (session.status !== "open") {
        throw new AppError(
          "This table's bill is being paid. Unlock it from Tables before adding orders.",
          409,
          { code: "BILL_LOCKED" },
        );
      }
      sessionId = session.id;
    }

    // Handle customer - support both customerId and customerName
    let customerId: string | null = null;

    if (input.customerId) {
      const customer = await this.customerRepo.findCustomerById(
        input.customerId,
      );
      if (!customer) throw new AppError("Customer not found", 404);
      if (customer.tenantId !== input.tenantId)
        throw new AppError("Customer does not belong to this tenant", 400);
      customerId = input.customerId;
    } else if (input.customerName) {
      // If customerName provided, find or create customer
      customerId = await this.findOrCreateCustomer(
        input.tenantId,
        input.customerName,
        input.customerPhone,
      );
    }

    const resolvedItems = await Promise.all(
      input.items.map(async (item) => {
        const menu = await this.menuRepo.findMenuById(item.menuId);
        if (!menu) throw new AppError(`Menu item ${item.menuId} not found`, 404);
        if (menu.tenantId !== input.tenantId)
          throw new AppError(
            `Menu item ${item.menuId} does not belong to this tenant`,
            400,
          );
        if (!menu.isAvailable)
          throw new AppError(`Menu item "${menu.name}" is not available`, 400);
        return { ...item, price: menu.price };
      }),
    );

    const totalPrice = resolvedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = await this.db.transaction(async (tx) => {
      if (sessionId) {
        // Re-check under the row lock: the bill may have been locked meanwhile.
        const session = await this.sessionRepo.lockSession(sessionId, tx);
        if (session?.status !== "open") {
          throw new AppError(
            "This table's bill is being paid. Unlock it from Tables before adding orders.",
            409,
            { code: "BILL_LOCKED" },
          );
        }
      }
      return await this.orderRepo.createOrderWithItems(
        {
          tenantId: input.tenantId,
          tableId: input.tableId ?? null,
          customerId: customerId,
          totalPrice,
          paymentMethod: input.paymentMethod ?? null,
          sessionId,
        },
        resolvedItems,
        tx,
      );
    });

    // Guests at the table see the staff-added round on their bill.
    if (sessionId) {
      this.events.emit({
        type: "order.updated",
        tenantId: order.tenantId,
        sessionId,
        data: { orderId: order.id },
      });
    }
    return { ...order, sessionId };
  }

  async updateOrderStatus(
    ctx: UserContext,
    id: string,
    input: UpdateOrderStatusInput,
  ) {
    // Permission check now handled by route middleware

    const order = await this.orderRepo.findOrderById(id);
    if (!order) throw new AppError("Order not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, order.tenantId);

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        `Cannot transition order from ${order.status} to ${input.status}`,
        400,
      );
    }

    const updated = await this.orderRepo.updateOrderStatus(id, input.status);

    // Only free the table on CANCELED — COMPLETED orders still need payment (transaction)
    // And only if the order has a table assigned. A guest session keeps its
    // table until the session closes, whatever happens to one of its orders.
    if (input.status === "CANCELED" && order.tableId && !order.sessionId) {
      await this.tableRepo.updateTable(order.tableId, { status: "AVAILABLE" });
    }

    // Push the kitchen progress to the guests' phones.
    if (order.sessionId) {
      this.events.emit({
        type: "order.updated",
        tenantId: order.tenantId,
        sessionId: order.sessionId,
        data: { orderId: id, status: input.status },
      });
    }

    return updated;
  }

  async deleteOrder(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware

    const order = await this.orderRepo.findOrderById(id);
    if (!order) throw new AppError("Order not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, order.tenantId);

    if (order.status !== "NEW") {
      throw new AppError("Only NEW orders can be deleted", 400);
    }

    if (order.sessionId) {
      throw new AppError("Guest table orders are canceled, not deleted", 400);
    }

    await this.orderRepo.deleteOrder(id);

    // Free the table now that the order is gone (only if order has a table)
    if (order.tableId) {
      await this.tableRepo.updateTable(order.tableId, { status: "AVAILABLE" });
    }

    return order;
  }
}
