import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
