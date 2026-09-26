import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
