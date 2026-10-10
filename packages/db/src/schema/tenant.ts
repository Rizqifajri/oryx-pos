import { boolean, date, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Shown on the public table menu under the restaurant name.
  tagline: text("tagline"),
  // When false the public menu stays browsable but guests cannot order.
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: date("created_at").notNull().defaultNow(),
});
