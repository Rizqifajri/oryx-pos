import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
