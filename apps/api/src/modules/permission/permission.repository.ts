import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { permissions } from "@dio-sys-be/db/schema";
import { eq, inArray } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

@Injectable()
export class PermissionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllPermissions() {
    return await this.db.select().from(permissions);
  }

  async findPermissionById(id: string) {
    const result = await this.db
      .select()
      .from(permissions)
      .where(eq(permissions.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findPermissionsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return await this.db
      .select()
      .from(permissions)
      .where(inArray(permissions.id, ids));
  }

  async findPermissionByName(name: string) {
    const result = await this.db
      .select()
      .from(permissions)
      .where(eq(permissions.name, name))
      .limit(1);
    return result[0] || null;
  }

  async createPermission(data: { name: string }) {
    const result = await this.db.insert(permissions).values(data).returning();
    return result[0];
  }

  async updatePermission(id: string, data: { name?: string }) {
    const result = await this.db
      .update(permissions)
      .set(data)
      .where(eq(permissions.id, id))
      .returning();
    return result[0] || null;
  }

  async deletePermission(id: string) {
    const result = await this.db
      .delete(permissions)
      .where(eq(permissions.id, id))
      .returning();
    return result[0] || null;
  }
}
