import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import { StaffSessionService } from "./staff-session.service";
import {
  type CloseSessionInput,
  closeSessionSchema,
  type SettleSessionInput,
  settleSessionSchema,
} from "./table-session.schema";

@Controller("sessions")
export class StaffSessionController {
  constructor(private readonly service: StaffSessionService) {}

  @Get("active")
  @RequirePermissions("table:list")
  async listActive(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
  ) {
    const data = await this.service.listActive(user, tenantId);
    return { success: true, data };
  }

  @Get(":id")
  @RequirePermissions("table:view")
  async getSession(
    @CurrentUser() user: UserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const data = await this.service.getSession(user, id);
    return { success: true, data };
  }

  @Post(":id/settle")
  @RequirePermissions("transaction:manage", "transaction:create")
  async settle(
    @CurrentUser() user: UserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(settleSessionSchema)) body: SettleSessionInput,
  ) {
    const data = await this.service.settle(user, id, body.paymentMethod);
    return { success: true, data };
  }

  @Post(":id/unlock-bill")
  @RequirePermissions("table:manage", "table:update")
  async unlockBill(
    @CurrentUser() user: UserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const data = await this.service.unlockBill(user, id);
    return { success: true, data };
  }

  @Post(":id/close")
  @RequirePermissions("table:manage", "table:update")
  async close(
    @CurrentUser() user: UserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(closeSessionSchema)) body: CloseSessionInput,
  ) {
    const data = await this.service.close(user, id, body);
    return { success: true, data };
  }
}

@Controller("service-requests")
export class ServiceRequestController {
  constructor(private readonly service: StaffSessionService) {}

  @Get()
  @RequirePermissions("order:list")
  async list(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
  ) {
    const data = await this.service.listServiceRequests(user, tenantId);
    return { success: true, data };
  }

  @Patch(":id/handle")
  @RequirePermissions("order:manage", "order:update")
  async handle(
    @CurrentUser() user: UserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const data = await this.service.handleServiceRequest(user, id);
    return { success: true, data };
  }
}
