import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { TableController } from "./table.controller";
import { TableService } from "./table.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [TableController],
  providers: [TableService],
})
export class TableModule {}
