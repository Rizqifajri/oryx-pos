import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { tenants } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

@Injectable()
export class TenantRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllTenants() {
    return await this.db.select().from(tenants);
  }

  async findTenantById(id: string) {
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findTenantBySlug(slug: string) {
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    return result[0] || null;
  }

  async createTenant(data: { name: string; slug: string }) {
    const result = await this.db.insert(tenants).values(data).returning();
    return result[0];
  }

  async updateTenant(id: string, data: { name?: string; slug?: string }) {
    const result = await this.db
      .update(tenants)
      .set(data)
      .where(eq(tenants.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteTenant(id: string) {
    const result = await this.db
      .delete(tenants)
      .where(eq(tenants.id, id))
      .returning();
    return result[0] || null;
  }
}
