import { Injectable } from "@nestjs/common";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { TenantRepository } from "../tenant/tenant.repository";
import { CustomerRepository } from "./customer.repository";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "./customer.schema";

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly tenantRepo: TenantRepository,
  ) {}

  async listCustomers(ctx: UserContext, filters?: { tenantId?: string }) {
    // Permission check now handled by route middleware

    // For TENANT scope: always use their tenant (ignore any provided tenantId)
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      return await this.customerRepo.findCustomersByTenantId(ctx.tenantId);
    }

    // For GLOBAL scope: use filter tenantId if provided
    if (filters?.tenantId) {
      return await this.customerRepo.findCustomersByTenantId(filters.tenantId);
    }

    return await this.customerRepo.findAllCustomers();
  }

  async getCustomersByTenant(ctx: UserContext, tenantId: string) {
    // Permission check now handled by route middleware

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      if (ctx.tenantId !== tenantId)
        throw new AppError("You do not have access to this tenant", 403);
    }

    const tenant = await this.tenantRepo.findTenantById(tenantId);
    if (!tenant) throw new AppError("Tenant not found", 404);

    return await this.customerRepo.findCustomersByTenantId(tenantId);
  }

  async getCustomer(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware

    const customer = await this.customerRepo.findCustomerById(id);
    if (!customer) throw new AppError("Customer not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, customer.tenantId);

    return customer;
  }

  async createCustomer(ctx: UserContext, input: CreateCustomerInput) {
    // Permission check now handled by route middleware

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      if (input.tenantId !== ctx.tenantId)
        throw new AppError(
          "You can only create customers in your own tenant",
          403,
        );
    }

    const tenant = await this.tenantRepo.findTenantById(input.tenantId);
    if (!tenant) throw new AppError("Tenant not found", 404);

    return await this.customerRepo.createCustomer({
      tenantId: input.tenantId,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
    });
  }

  async updateCustomer(
    ctx: UserContext,
    id: string,
    input: UpdateCustomerInput,
  ) {
    // Permission check now handled by route middleware

    const customer = await this.customerRepo.findCustomerById(id);
    if (!customer) throw new AppError("Customer not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, customer.tenantId);

    return await this.customerRepo.updateCustomer(id, {
      name: input.name,
      phone: input.phone ?? undefined,
      email: input.email ?? undefined,
    });
  }

  async deleteCustomer(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware

    const customer = await this.customerRepo.findCustomerById(id);
    if (!customer) throw new AppError("Customer not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, customer.tenantId);

    return await this.customerRepo.deleteCustomer(id);
  }
}
