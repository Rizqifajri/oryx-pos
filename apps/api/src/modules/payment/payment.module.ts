import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
