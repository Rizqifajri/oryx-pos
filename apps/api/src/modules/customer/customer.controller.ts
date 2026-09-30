import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreateCustomerInput,
  createCustomerSchema,
  type UpdateCustomerInput,
  updateCustomerSchema,
} from "./customer.schema";
import { CustomerService } from "./customer.service";

@Controller("customers")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @RequirePermissions("customer:list")
  async listCustomers(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
  ) {
    const filters: { tenantId?: string } = {};

    if (tenantId && typeof tenantId === "string") {
      filters.tenantId = tenantId;
    }

    const data = await this.customerService.listCustomers(user, filters);
    return { success: true, data };
  }

  @Get("tenant/:tenantId")
  @RequirePermissions("customer:list")
  async getCustomersByTenant(
    @CurrentUser() user: UserContext,
    @Param("tenantId") tenantId: string,
  ) {
    const data = await this.customerService.getCustomersByTenant(
      user,
      tenantId,
    );
    return { success: true, data };
  }

  @Get(":id")
  @RequirePermissions("customer:view")
  async getCustomer(@CurrentUser() user: UserContext, @Param("id") id: string) {
    const data = await this.customerService.getCustomer(user, id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions("customer:manage", "customer:create")
  async createCustomer(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerInput,
  ) {
    const data = await this.customerService.createCustomer(user, body);
    return { success: true, data };
  }

  @Patch(":id")
  @RequirePermissions("customer:manage", "customer:update")
  async updateCustomer(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerInput,
  ) {
    const data = await this.customerService.updateCustomer(user, id, body);
    return { success: true, data };
  }

  @Delete(":id")
  @RequirePermissions("customer:manage", "customer:delete")
  async deleteCustomer(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    await this.customerService.deleteCustomer(user, id);
    return { success: true, message: "Customer deleted successfully" };
  }
}
