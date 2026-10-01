import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { BillService } from "./bill.service";
import { PublicOrderController } from "./public-order.controller";
import { PublicOrderService } from "./public-order.service";
import {
  ServiceRequestController,
  StaffSessionController,
} from "./staff-session.controller";
import { SplitService } from "./split.service";
import { StaffSessionService } from "./staff-session.service";

/** QR table ordering: guest sessions, table bills and service requests. */
@Module({
  imports: [RepositoriesModule],
  controllers: [
    PublicOrderController,
    StaffSessionController,
    ServiceRequestController,
  ],
  providers: [BillService, SplitService, PublicOrderService, StaffSessionService],
  // PaymentService routes Midtrans webhooks for bill/share payments here.
  exports: [BillService, SplitService],
})
export class TableSessionModule {}
