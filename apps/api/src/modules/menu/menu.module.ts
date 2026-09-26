import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { MenuController } from "./menu.controller";
import { MenuService } from "./menu.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
