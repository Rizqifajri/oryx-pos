import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./category";
import { tenants } from "./tenant";

export const menus = pgTable("menus", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  categoryId: uuid("category_id")
    .references(() => categories.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
  // Soft delete: non-null means the menu is deleted and hidden from listings,
  // while the row stays so order history can still resolve its name.
  deletedAt: timestamp("deleted_at"),
});
