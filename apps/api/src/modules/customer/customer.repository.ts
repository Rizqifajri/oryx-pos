import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { customers } from "@dio-sys-be/db/schema";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

@Injectable()
export class CustomerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllCustomers() {
    return await this.db.select().from(customers);
  }

  async findCustomersByTenantId(tenantId: string) {
    return await this.db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId));
  }

  async findCustomerById(id: string) {
    const result = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findCustomerByPhoneAndTenant(phone: string, tenantId: string) {
    const result = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.phone, phone), eq(customers.tenantId, tenantId)))
      .limit(1);
    return result[0] || null;
  }

  async createCustomer(data: {
    tenantId: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  }) {
    const result = await this.db.insert(customers).values(data).returning();
    return result[0];
  }

  async updateCustomer(
    id: string,
    data: { name?: string; phone?: string | null; email?: string | null },
  ) {
    const result = await this.db
      .update(customers)
      .set(data)
      .where(eq(customers.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteCustomer(id: string) {
    const result = await this.db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning();
    return result[0] || null;
  }
}
