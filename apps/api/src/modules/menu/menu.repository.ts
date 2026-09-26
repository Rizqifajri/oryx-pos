import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { menus } from "@dio-sys-be/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

// Soft-deleted menus (deletedAt set) are hidden from every menu lookup.
const notDeleted = isNull(menus.deletedAt);

@Injectable()
export class MenuRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllMenus() {
    return await this.db.select().from(menus).where(notDeleted);
  }

  async findMenusByTenantId(tenantId: string) {
    return await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.tenantId, tenantId), notDeleted));
  }

  async findMenusByCategoryId(categoryId: string) {
    return await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.categoryId, categoryId), notDeleted));
  }

  async findMenusByFilters(filters: {
    tenantId?: string;
    categoryId?: string;
    isAvailable?: boolean;
  }) {
    const conditions = [notDeleted];

    if (filters.tenantId) {
      conditions.push(eq(menus.tenantId, filters.tenantId));
    }
    if (filters.categoryId) {
      conditions.push(eq(menus.categoryId, filters.categoryId));
    }
    if (filters.isAvailable !== undefined) {
      conditions.push(eq(menus.isAvailable, filters.isAvailable));
    }

    return await this.db
      .select()
      .from(menus)
      .where(and(...conditions));
  }

  async findMenuById(id: string) {
    const result = await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.id, id), notDeleted))
      .limit(1);
    return result[0] || null;
  }

  async findMenusByIds(ids: string[]) {
    return await this.db
      .select()
      .from(menus)
      .where(and(inArray(menus.id, ids), notDeleted));
  }

  async createMenu(data: {
    tenantId: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    isAvailable: boolean;
  }) {
    const result = await this.db.insert(menus).values(data).returning();
    return result[0];
  }

  async updateMenu(
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      isAvailable?: boolean;
    },
  ) {
    const result = await this.db
      .update(menus)
      .set(data)
      .where(eq(menus.id, id))
      .returning();
    return result[0] || null;
  }

  async bulkUpdateAvailability(menuIds: string[], isAvailable: boolean) {
    const result = await this.db
      .update(menus)
      .set({ isAvailable })
      .where(inArray(menus.id, menuIds))
      .returning();
    return result;
  }

  /** Soft-deletes a menu by stamping deletedAt; the row is preserved. */
  async deleteMenu(id: string) {
    const result = await this.db
      .update(menus)
      .set({ deletedAt: new Date() })
      .where(and(eq(menus.id, id), isNull(menus.deletedAt)))
      .returning();
    return result[0] || null;
  }
}
