import { boolean, date, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Shown on the public table menu under the restaurant name.
  tagline: text("tagline"),
  // When false the public menu stays browsable but guests cannot order.
  isOpen: boolean("is_open").notNull().default(true),
  // Business profile captured at registration; nullable for pre-existing tenants.
  address: text("address"),
  businessType: text("business_type"),
  country: text("country"), // ISO 3166-1 alpha-2
  province: text("province"),
  city: text("city"),
  plan: text("plan"),
  createdAt: date("created_at").notNull().defaultNow(),
});
