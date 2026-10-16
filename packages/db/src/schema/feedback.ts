import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { menus } from "./menu";
import { tables } from "./table";
import { tableSessions } from "./table-session";
import { tenants } from "./tenant";

/**
 * Customer feedback for dining experience at a table.
 * Overall rating: 1 (very sad 😡/😞), 2 (sad 🙁), 3 (neutral 😐), 4 (happy 🙂), 5 (very happy/love 😍/😄).
 */
export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  sessionId: uuid("session_id").references(() => tableSessions.id),
  tableId: uuid("table_id").references(() => tables.id),
  customerName: text("customer_name"),
  overallRating: integer("overall_rating").notNull(), // 1 to 5
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Itemized rating per menu ordered in this dining session.
 * Rating: 1 (very sad) to 5 (very happy)
 */
export const feedbackMenuRatings = pgTable("feedback_menu_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  feedbackId: uuid("feedback_id")
    .references(() => feedbacks.id, { onDelete: "cascade" })
    .notNull(),
  menuId: uuid("menu_id")
    .references(() => menus.id)
    .notNull(),
  rating: integer("rating").notNull(), // 1 to 5
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

