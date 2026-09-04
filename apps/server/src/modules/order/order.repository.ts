import { db } from "@dio-sys-be/db";
import { customers, menus, orderItems, orders, tables } from "@dio-sys-be/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { OrderItemInput, OrderStatus } from "./order.schema";

type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = {
  id: string;
  orderId: string;
  menuId: string;
  menuName: string;
  quantity: number;
  price: number;
};

const attachItems = async (
  orderList: OrderRow[],
): Promise<(OrderRow & { items: OrderItemRow[] })[]> => {
  if (orderList.length === 0) return [];
  const orderIds = orderList.map((o) => o.id);
  const allItems = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      menuId: orderItems.menuId,
      menuName: menus.name,
      quantity: orderItems.quantity,
      price: orderItems.price,
    })
    .from(orderItems)
    .innerJoin(menus, eq(orderItems.menuId, menus.id))
    .where(inArray(orderItems.orderId, orderIds));

  return orderList.map((order) => ({
    ...order,
    items: allItems.filter((item) => item.orderId === order.id),
  }));
};

export const findAllOrders = async () => {
  const orderList = await db
    .select({
      id: orders.id,
      tenantId: orders.tenantId,
      tableId: orders.tableId,
      customerId: orders.customerId,
      status: orders.status,
      totalPrice: orders.totalPrice,
      createdAt: orders.createdAt,
      customerName: customers.name,
      tableName: tables.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(tables, eq(orders.tableId, tables.id));
  return attachItems(orderList as any);
};

export const findOrdersByTenantId = async (
  tenantId: string,
  filters?: { status?: OrderStatus; tableId?: string },
) => {
  const conditions = [eq(orders.tenantId, tenantId)];

  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status));
  }
  if (filters?.tableId) {
    conditions.push(eq(orders.tableId, filters.tableId));
  }

  const orderList = await db
    .select({
      id: orders.id,
      tenantId: orders.tenantId,
      tableId: orders.tableId,
      customerId: orders.customerId,
      status: orders.status,
      totalPrice: orders.totalPrice,
      createdAt: orders.createdAt,
      customerName: customers.name,
      tableName: tables.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(tables, eq(orders.tableId, tables.id))
    .where(and(...conditions));
  return attachItems(orderList as any);
};

export const findOrderById = async (id: string) => {
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order[0]) return null;

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      menuId: orderItems.menuId,
      menuName: menus.name,
      quantity: orderItems.quantity,
      price: orderItems.price,
    })
    .from(orderItems)
    .innerJoin(menus, eq(orderItems.menuId, menus.id))
    .where(eq(orderItems.orderId, id));

  return { ...order[0], items };
};

export const findOrdersByTableId = async (tableId: string) => {
  return await db.select().from(orders).where(eq(orders.tableId, tableId));
};

export const findActiveOrdersByTableId = async (tableId: string) => {
  const activeStatuses: OrderStatus[] = ["NEW", "PROCESSING"];
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.tableId, tableId),
        inArray(orders.status, activeStatuses),
      ),
    );
};

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const createOrderWithItems = async (
  orderData: {
    tenantId: string;
    tableId: string | null;
    customerId?: string | null;
    totalPrice: number;
  },
  items: (OrderItemInput & { price: number })[],
  tx: Transaction,
) => {
  const [order] = await tx
    .insert(orders)
    .values({
      tenantId: orderData.tenantId,
      tableId: orderData.tableId,
      customerId: orderData.customerId ?? null,
      totalPrice: orderData.totalPrice,
      status: "NEW",
    })
    .returning();

  if (!order) throw new Error("Failed to create order");

  let createdItems: OrderItemRow[] = [];

  if (items.length > 0) {
    const itemRows = items.map((item) => ({
      orderId: order.id,
      menuId: item.menuId,
      quantity: item.quantity,
      price: item.price,
    }));
    await tx.insert(orderItems).values(itemRows);

    createdItems = await tx
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        menuId: orderItems.menuId,
        menuName: menus.name,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .innerJoin(menus, eq(orderItems.menuId, menus.id))
      .where(eq(orderItems.orderId, order.id));
  }

  return { ...order, items: createdItems };
};

export const updateOrderStatus = async (id: string, status: OrderStatus) => {
  const result = await db
    .update(orders)
    .set({ status })
    .where(eq(orders.id, id))
    .returning();
  return result[0] || null;
};

export const deleteOrder = async (id: string) => {
  const result = await db.delete(orders).where(eq(orders.id, id)).returning();
  return result[0] || null;
};
