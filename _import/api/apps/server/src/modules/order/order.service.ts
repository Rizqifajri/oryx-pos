import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertTenantMatch } from "@/utils/assert-permission";
import { db } from "@dio-sys-be/db";
import { tables } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";
import * as categoryRepo from "../category/category.repository";
import * as customerRepo from "../customer/customer.repository";
import * as menuRepo from "../menu/menu.repository";
import * as tableRepo from "../table/table.repository";
import * as orderRepo from "./order.repository";
import type {
  CreateOrderInput,
  OrderStatus,
  PublicCreateOrderInput,
  UpdateOrderStatusInput,
} from "./order.schema";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["PROCESSING", "CANCELED"],
  PROCESSING: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};

export const listOrders = async (
  ctx: UserContext,
  filters?: { tenantId?: string; status?: OrderStatus; tableId?: string },
) => {
  // Permission check now handled by route middleware

  // For TENANT scope: always use their tenant (ignore any provided tenantId)
  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
    return await orderRepo.findOrdersByTenantId(ctx.tenantId, filters);
  }

  // For GLOBAL scope: use filter tenantId if provided
  if (filters?.tenantId) {
    return await orderRepo.findOrdersByTenantId(filters.tenantId, filters);
  }

  return await orderRepo.findAllOrders();
};

export const getOrder = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware

  const order = await orderRepo.findOrderById(id);
  if (!order) throw new AppError("Order not found", 404);

  if (ctx.scope === "TENANT") assertTenantMatch(ctx, order.tenantId);

  return order;
};

// Helper function to find or create customer
const findOrCreateCustomer = async (
  tenantId: string,
  customerName: string,
  customerPhone?: string,
): Promise<string | null> => {
  let customer = null;

  if (customerPhone) {
    customer = await customerRepo.findCustomerByPhoneAndTenant(
      customerPhone,
      tenantId,
    );
  }

  if (!customer) {
    customer = await customerRepo.createCustomer({
      tenantId,
      name: customerName,
      phone: customerPhone ?? null,
      email: null,
    });
  }

  return customer?.id ?? null;
};

export const createOrder = async (
  ctx: UserContext,
  input: CreateOrderInput,
) => {
  // Permission check now handled by route middleware

  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
    if (input.tenantId !== ctx.tenantId)
      throw new AppError("You can only create orders in your own tenant", 403);
  }

  // Only validate table if tableId is provided
  if (input.tableId) {
    const table = await tableRepo.findTableById(input.tableId);
    if (!table) throw new AppError("Table not found", 404);
    if (table.tenantId !== input.tenantId)
      throw new AppError("Table does not belong to this tenant", 400);
    if (table.status === "OCCUPIED")
      throw new AppError("Table is already occupied with an active order", 409);
  }

  // Handle customer - support both customerId and customerName
  let customerId: string | null = null;

  if (input.customerId) {
    const customer = await customerRepo.findCustomerById(input.customerId);
    if (!customer) throw new AppError("Customer not found", 404);
    if (customer.tenantId !== input.tenantId)
      throw new AppError("Customer does not belong to this tenant", 400);
    customerId = input.customerId;
  } else if (input.customerName) {
    // If customerName provided, find or create customer
    customerId = await findOrCreateCustomer(
      input.tenantId,
      input.customerName,
      input.customerPhone,
    );
  }

  const resolvedItems = await Promise.all(
    input.items.map(async (item) => {
      const menu = await menuRepo.findMenuById(item.menuId);
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

  return await db.transaction(async (tx) => {
    const order = await orderRepo.createOrderWithItems(
      {
        tenantId: input.tenantId,
        tableId: input.tableId ?? null,
        customerId: customerId,
        totalPrice,
      },
      resolvedItems,
      tx,
    );

    // Only update table status if tableId is provided
    if (input.tableId) {
      await tx
        .update(tables)
        .set({ status: "OCCUPIED" })
        .where(eq(tables.id, input.tableId));
    }

    return order;
  });
};

export const updateOrderStatus = async (
  ctx: UserContext,
  id: string,
  input: UpdateOrderStatusInput,
) => {
  // Permission check now handled by route middleware

  const order = await orderRepo.findOrderById(id);
  if (!order) throw new AppError("Order not found", 404);

  if (ctx.scope === "TENANT") assertTenantMatch(ctx, order.tenantId);

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(input.status)) {
    throw new AppError(
      `Cannot transition order from ${order.status} to ${input.status}`,
      400,
    );
  }

  const updated = await orderRepo.updateOrderStatus(id, input.status);

  // Only free the table on CANCELED — COMPLETED orders still need payment (transaction)
  // And only if the order has a table assigned
  if (input.status === "CANCELED" && order.tableId) {
    await tableRepo.updateTable(order.tableId, { status: "AVAILABLE" });
  }

  return updated;
};

export const deleteOrder = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware

  const order = await orderRepo.findOrderById(id);
  if (!order) throw new AppError("Order not found", 404);

  if (ctx.scope === "TENANT") assertTenantMatch(ctx, order.tenantId);

  if (order.status !== "NEW") {
    throw new AppError("Only NEW orders can be deleted", 400);
  }

  await orderRepo.deleteOrder(id);

  // Free the table now that the order is gone (only if order has a table)
  if (order.tableId) {
    await tableRepo.updateTable(order.tableId, { status: "AVAILABLE" });
  }

  return order;
};

export const getPublicMenu = async (tableId: string) => {
  const table = await tableRepo.findTableById(tableId);
  if (!table) throw new AppError("Table not found", 404);

  const categories = await categoryRepo.findCategoriesByTenantId(
    table.tenantId,
  );
  const menus = await menuRepo.findMenusByFilters({
    tenantId: table.tenantId,
    isAvailable: true,
  });

  const menuCategoryIds = new Set(menus.map((m) => m.categoryId));
  const filteredCategories = categories.filter((c) =>
    menuCategoryIds.has(c.id),
  );

  return {
    table: { id: table.id, name: table.name, capacity: table.capacity },
    categories: filteredCategories,
    menus,
  };
};

export const createPublicOrder = async (input: PublicCreateOrderInput) => {
  // Validate table only if tableId is provided
  let tenantId: string;
  
  if (input.tableId) {
    const table = await tableRepo.findTableById(input.tableId);
    if (!table) throw new AppError("Table not found", 404);
    if (table.status === "OCCUPIED")
      throw new AppError("Table is already occupied with an active order", 409);
    tenantId = table.tenantId;
  } else {
    // For orders without table, tenantId must be provided another way
    // This might need adjustment based on your public order flow
    throw new AppError("Table ID is required for public orders", 400);
  }

  const resolvedItems = await Promise.all(
    input.items.map(async (item) => {
      const menu = await menuRepo.findMenuById(item.menuId);
      if (!menu) throw new AppError(`Menu item ${item.menuId} not found`, 404);
      if (menu.tenantId !== tenantId)
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

  let customerId: string | null = null;

  if (input.customerName) {
    let customer = null;

    if (input.customerPhone) {
      customer = await customerRepo.findCustomerByPhoneAndTenant(
        input.customerPhone,
        tenantId,
      );
    }

    if (!customer) {
      customer = await customerRepo.createCustomer({
        tenantId,
        name: input.customerName,
        phone: input.customerPhone ?? null,
        email: input.customerEmail ?? null,
      });
    }

    customerId = customer?.id ?? null;
  }

  return await db.transaction(async (tx) => {
    const order = await orderRepo.createOrderWithItems(
      { tenantId, tableId: input.tableId ?? null, customerId, totalPrice },
      resolvedItems,
      tx,
    );

    // Only update table status if tableId is provided
    if (input.tableId) {
      await tx
        .update(tables)
        .set({ status: "OCCUPIED" })
        .where(eq(tables.id, input.tableId));
    }

    return order;
  });
};
