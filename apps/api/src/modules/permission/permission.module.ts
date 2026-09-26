import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { PermissionController } from "./permission.controller";
import { PermissionService } from "./permission.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [PermissionController],
  providers: [PermissionService],
})
export class PermissionModule {}
