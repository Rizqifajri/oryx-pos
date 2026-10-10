import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreateCategoryInput,
  createCategorySchema,
  type UpdateCategoryInput,
  updateCategorySchema,
} from "./category.schema";
import { CategoryService } from "./category.service";

@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @RequirePermissions("category:list")
  async listCategories(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
  ) {
    const filters: { tenantId?: string } = {};

    if (tenantId && typeof tenantId === "string") {
      filters.tenantId = tenantId;
    }

    const categories = await this.categoryService.listCategories(user, filters);
    return {
      success: true,
      data: categories,
    };
  }

  @Get("tenant/:tenantId")
  @RequirePermissions("category:list")
  async getCategoriesByTenant(
    @CurrentUser() user: UserContext,
    @Param("tenantId") tenantId: string,
  ) {
    const categories = await this.categoryService.getCategoriesByTenant(
      user,
      tenantId,
    );
    return {
      success: true,
      data: categories,
    };
  }

  @Get(":id")
  @RequirePermissions("category:view")
  async getCategory(@CurrentUser() user: UserContext, @Param("id") id: string) {
    const category = await this.categoryService.getCategory(user, id);
    return {
      success: true,
      data: category,
    };
  }

  @Post()
  @RequirePermissions("category:manage", "category:create")
  async createCategory(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryInput,
  ) {
    const category = await this.categoryService.createCategory(user, body);
    return {
      success: true,
      data: category,
    };
  }

  @Patch(":id")
  @RequirePermissions("category:manage", "category:update")
  async updateCategory(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryInput,
  ) {
    const category = await this.categoryService.updateCategory(user, id, body);
    return {
      success: true,
      data: category,
    };
  }

  @Delete(":id")
  @RequirePermissions("category:manage", "category:delete")
  async deleteCategory(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    await this.categoryService.deleteCategory(user, id);
    return {
      success: true,
      message: "Category deleted successfully",
    };
  }
}
