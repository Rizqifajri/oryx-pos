import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
