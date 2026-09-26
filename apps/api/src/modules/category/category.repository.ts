import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { categories } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

@Injectable()
export class CategoryRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllCategories() {
    return await this.db.select().from(categories);
  }

  async findCategoriesByTenantId(tenantId: string) {
    return await this.db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId));
  }

  async findCategoryById(id: string) {
    const result = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return result[0] || null;
  }

  async createCategory(data: { tenantId: string; name: string }) {
    const result = await this.db.insert(categories).values(data).returning();
    return result[0];
  }

  async updateCategory(id: string, data: { name?: string }) {
    const result = await this.db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteCategory(id: string) {
    const result = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    return result[0] || null;
  }
}
