import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
