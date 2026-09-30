import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { TableSessionModule } from "../table-session/table-session.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

@Module({
  imports: [RepositoriesModule, TableSessionModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
