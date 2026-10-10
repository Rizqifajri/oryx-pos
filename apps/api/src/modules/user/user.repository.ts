import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { users } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

/**
 * Projection used by every read and every `returning()` in this repository so a
 * password hash or refresh token can never leak into an API response.
 */
const safeUserFields = {
  id: users.id,
  tenantId: users.tenantId,
  roleId: users.roleId,
  name: users.name,
  email: users.email,
  createdAt: users.createdAt,
};

@Injectable()
export class UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllUsers() {
    return await this.db.select(safeUserFields).from(users);
  }

  async findUsersByTenantId(tenantId: string) {
    return await this.db
      .select(safeUserFields)
      .from(users)
      .where(eq(users.tenantId, tenantId));
  }

  async findUserById(id: string) {
    const result = await this.db
      .select(safeUserFields)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findUserByEmail(email: string) {
    const result = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  }

  async createUser(data: {
    tenantId: string;
    roleId: string;
    name: string;
    email: string;
    password: string;
  }) {
    const result = await this.db
      .insert(users)
      .values(data)
      .returning(safeUserFields);
    return result[0];
  }

  async updateUser(
    id: string,
    data: { name?: string; email?: string; password?: string; roleId?: string },
  ) {
    const result = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning(safeUserFields);
    return result[0] || null;
  }

  async deleteUser(id: string) {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id, name: users.name, email: users.email });
    return result[0] || null;
  }
}
