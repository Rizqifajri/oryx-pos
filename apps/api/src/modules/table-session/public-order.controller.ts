import {
  Body,
  Controller,
  Get,
  Headers,
  type MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { interval, map, merge, type Observable } from "rxjs";
import {
  CurrentGuest,
  GuestSessionGuard,
} from "../../common/guards/guest-session.guard";
import { Public } from "../../common/decorators/public.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SessionEventsService } from "../../common/realtime/session-events.service";
import type { GuestContext } from "../../common/utils/guest-token";
import { PublicOrderService } from "./public-order.service";
import {
  type CreateBillPaymentInput,
  createBillPaymentSchema,
  type CreateServiceRequestInput,
  createServiceRequestSchema,
  type CreateSessionOrderInput,
  createSessionOrderSchema,
  type LockBillInput,
  lockBillSchema,
  type SplitBillInput,
  splitBillSchema,
} from "./table-session.schema";

/**
 * Guest (QR table) ordering API. Every route is @Public() for the staff guards;
 * everything except opening a session and reading the menu additionally
 * requires a guest token via GuestSessionGuard.
 */
@Public()
@Controller("public")
export class PublicOrderController {
  constructor(
    private readonly service: PublicOrderService,
    private readonly events: SessionEventsService,
  ) {}

  @Post("tables/:qrToken/session")
  async openSession(@Param("qrToken") qrToken: string) {
    const data = await this.service.openSession(qrToken);
    return { success: true, data };
  }

  @Get("tenants/:tenantId/menu")
  async getMenu(@Param("tenantId", ParseUUIDPipe) tenantId: string) {
    const data = await this.service.getMenu(tenantId);
    return { success: true, data };
  }

  @Get("sessions/:sessionId")
  @UseGuards(GuestSessionGuard)
  async getSession(@CurrentGuest() guest: GuestContext) {
    const data = await this.service.getSessionView(guest);
    return { success: true, data };
  }

  @Post("sessions/:sessionId/orders")
  @UseGuards(GuestSessionGuard)
  async createOrder(
    @CurrentGuest() guest: GuestContext,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(createSessionOrderSchema))
    body: CreateSessionOrderInput,
  ) {
    const data = await this.service.createOrder(guest, body, idempotencyKey);
    return { success: true, data };
  }

  @Post("orders/:orderId/cancel")
  @UseGuards(GuestSessionGuard)
  async cancelOrder(
    @CurrentGuest() guest: GuestContext,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
    const data = await this.service.cancelOrder(guest, orderId);
    return { success: true, data };
  }

  @Get("sessions/:sessionId/bill")
  @UseGuards(GuestSessionGuard)
  async getBill(@CurrentGuest() guest: GuestContext) {
    const data = (await this.service.getSessionView(guest)).bill;
    return { success: true, data };
  }

  @Post("sessions/:sessionId/bill/lock")
  @UseGuards(GuestSessionGuard)
  async lockBill(
    @CurrentGuest() guest: GuestContext,
    @Body(new ZodValidationPipe(lockBillSchema)) body: LockBillInput,
  ) {
    const data = await this.service.lockBill(guest, body.method);
    return { success: true, data };
  }

  // Idempotent by design: a pending, unexpired payment for the same amount is
  // reused rather than creating a second charge.
  @Post("bills/:billId/payments")
  @UseGuards(GuestSessionGuard)
  async createPayment(
    @CurrentGuest() guest: GuestContext,
    @Param("billId", ParseUUIDPipe) billId: string,
    @Body(new ZodValidationPipe(createBillPaymentSchema))
    body: CreateBillPaymentInput,
  ) {
    const data = await this.service.createPayment(guest, billId, body.method);
    return { success: true, data };
  }

  @Post("bills/:billId/cancel-payment")
  @UseGuards(GuestSessionGuard)
  async cancelPayment(
    @CurrentGuest() guest: GuestContext,
    @Param("billId", ParseUUIDPipe) billId: string,
  ) {
    const data = await this.service.cancelPayment(guest, billId);
    return { success: true, data };
  }

  @Get("payments/:paymentId")
  @UseGuards(GuestSessionGuard)
  async getPayment(
    @CurrentGuest() guest: GuestContext,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
  ) {
    const data = await this.service.getPayment(guest, paymentId);
    return { success: true, data };
  }

  @Post("sessions/:sessionId/service-requests")
  @UseGuards(GuestSessionGuard)
  async createServiceRequest(
    @CurrentGuest() guest: GuestContext,
    @Body(new ZodValidationPipe(createServiceRequestSchema))
    body: CreateServiceRequestInput,
  ) {
    const data = await this.service.createServiceRequest(guest, body.type, body.note);
    return { success: true, data };
  }

  @Post("sessions/:sessionId/bill/split")
  @UseGuards(GuestSessionGuard)
  async splitBill(
    @CurrentGuest() guest: GuestContext,
    @Body(new ZodValidationPipe(splitBillSchema)) body: SplitBillInput,
  ) {
    const data = await this.service.splitBill(guest, body);
    return { success: true, data };
  }

  @Post("sessions/:sessionId/bill/split/cancel")
  @UseGuards(GuestSessionGuard)
  async cancelSplit(@CurrentGuest() guest: GuestContext) {
    const data = await this.service.cancelSplit(guest);
    return { success: true, data };
  }

  // Idempotent: a pending, unexpired payment for the share is reused.
  @Post("bills/:billId/shares/:shareId/payments")
  @UseGuards(GuestSessionGuard)
  async payShare(
    @CurrentGuest() guest: GuestContext,
    @Param("billId", ParseUUIDPipe) billId: string,
    @Param("shareId", ParseUUIDPipe) shareId: string,
  ) {
    const data = await this.service.payShare(guest, billId, shareId);
    return { success: true, data };
  }

  @Post("sessions/:sessionId/follow")
  @UseGuards(GuestSessionGuard)
  async follow(@CurrentGuest() guest: GuestContext) {
    const data = await this.service.followMergedSession(guest);
    return { success: true, data };
  }

  /**
   * SSE stream of session changes (`order.updated`, `bill.updated`,
   * `payment.updated`, `session.closed`, `service_request.created`). The
   * payload is only a hint — clients refetch the session on each event. A
   * heartbeat every 25s keeps proxies from closing the idle connection.
   */
  @Sse("sessions/:sessionId/events")
  @UseGuards(GuestSessionGuard)
  streamEvents(@CurrentGuest() guest: GuestContext): Observable<MessageEvent> {
    // Unnamed events with the type inside the payload, so the browser needs a
    // single `onmessage` handler.
    const updates = this.events.forGuest(guest.sessionId, guest.tenantId).pipe(
      map((event) => ({ data: { type: event.type, ...event.data } })),
    );
    const heartbeat = interval(25_000).pipe(
      map(() => ({ data: { type: "ping" } })),
    );
    return merge(updates, heartbeat);
  }
}
