import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
