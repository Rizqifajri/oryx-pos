import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreatePaymentInput,
  createPaymentSchema,
  type MidtransWebhookPayload,
  midtransWebhookSchema,
} from "./payment.schema";
import { PaymentService } from "./payment.service";

@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── Public routes - no auth required ────────────────────────────────────────
  // Declared first so "webhook" and "public" are not captured by GET :id.

  // Midtrans reads this response, not the frontend, so it is deliberately the
  // one endpoint that is not wrapped in the { success, data } envelope.
  @Public()
  @Post("webhook")
  @HttpCode(200)
  async handleWebhook(
    @Body(new ZodValidationPipe(midtransWebhookSchema))
    body: MidtransWebhookPayload,
  ) {
    return await this.paymentService.handleWebhook(body);
  }

  // Public payment creation for customers
  @Public()
  @Post("public/create")
  async createPublicPayment(
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentInput,
  ) {
    const data = await this.paymentService.createPublicSnapToken(body.orderId);
    return { success: true, data };
  }

  // ── Protected routes - require authentication ───────────────────────────────

  // Create payment request for an order
  @Post("create")
  @RequirePermissions("transaction:create", "transaction:manage")
  async createPayment(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentInput,
  ) {
    const data = await this.paymentService.createSnapToken(user, body.orderId);
    return { success: true, data };
  }

  // Get payment request by order ID
  @Get("order/:orderId")
  @RequirePermissions("transaction:view")
  async getPaymentRequestByOrder(
    @CurrentUser() user: UserContext,
    @Param("orderId") orderId: string,
  ) {
    const data = await this.paymentService.getPaymentRequestByOrder(
      user,
      orderId,
    );
    return { success: true, data };
  }

  // List payment requests
  @Get()
  @RequirePermissions("transaction:list")
  async listPaymentRequests(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
  ) {
    const data = await this.paymentService.listPaymentRequests(user, {
      tenantId,
    });
    return { success: true, data };
  }

  // Get payment request by ID
  @Get(":id")
  @RequirePermissions("transaction:view")
  async getPaymentRequest(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    const data = await this.paymentService.getPaymentRequest(user, id);
    return { success: true, data };
  }
}
