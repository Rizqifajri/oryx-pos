import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../../database/repositories.module";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
