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
  // Listed under the virtual "Populer" category on the public menu.
  isPopular: boolean("is_popular").notNull().default(false),
  // Optional image badge: chef_pick | best_seller | new | spicy.
  badge: text("badge"),
  createdAt: date("created_at").notNull().defaultNow(),
  // Soft delete: non-null means the menu is deleted and hidden from listings,
  // while the row stays so order history can still resolve its name.
  deletedAt: timestamp("deleted_at"),
});
