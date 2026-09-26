import { Inject, Injectable } from "@nestjs/common";
import type { Db, DbOrTx } from "@dio-sys-be/db";
import { tables } from "@dio-sys-be/db/schema";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";
import type { TableStatus } from "./table.schema";

@Injectable()
export class TableRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllTables() {
    return await this.db.select().from(tables);
  }

  async findTablesByTenantId(tenantId: string) {
    return await this.db
      .select()
      .from(tables)
      .where(eq(tables.tenantId, tenantId));
  }

  async findTablesByTenantAndStatus(tenantId: string, status: TableStatus) {
    return await this.db
      .select()
      .from(tables)
      .where(and(eq(tables.tenantId, tenantId), eq(tables.status, status)));
  }

  async findTableById(id: string) {
    const result = await this.db
      .select()
      .from(tables)
      .where(eq(tables.id, id))
      .limit(1);
    return result[0] || null;
  }

  async createTable(data: {
    tenantId: string;
    name: string;
    capacity: number;
    status: TableStatus;
  }) {
    const result = await this.db.insert(tables).values(data).returning();
    return result[0];
  }

  async updateTable(
    id: string,
    data: {
      name?: string;
      capacity?: number;
      status?: TableStatus;
    },
    tx: DbOrTx = this.db,
  ) {
    const result = await tx
      .update(tables)
      .set(data)
      .where(eq(tables.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteTable(id: string) {
    const result = await this.db
      .delete(tables)
      .where(eq(tables.id, id))
      .returning();
    return result[0] || null;
  }
}
