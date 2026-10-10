import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
