import { integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { menus } from "./menu";
import { orders } from "./order";

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  menuId: uuid("menu_id")
    .references(() => menus.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
});
