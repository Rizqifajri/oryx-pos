import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreateUserInput,
  createUserSchema,
  type UpdateUserInput,
  updateUserSchema,
} from "./user.schema";
import { UserService } from "./user.service";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions("user:list")
  async listUsers(@CurrentUser() user: UserContext) {
    const users = await this.userService.listUsers(user);
    return {
      success: true,
      data: users,
    };
  }

  @Get("tenant/:tenantId")
  @RequirePermissions("user:list")
  async getUsersByTenant(
    @CurrentUser() user: UserContext,
    @Param("tenantId") tenantId: string,
  ) {
    const users = await this.userService.getUsersByTenant(user, tenantId);
    return {
      success: true,
      data: users,
    };
  }

  @Get(":id")
  @RequirePermissions("user:view")
  async getUser(@CurrentUser() user: UserContext, @Param("id") id: string) {
    const result = await this.userService.getUser(user, id);
    return {
      success: true,
      data: result,
    };
  }

  @Post()
  @RequirePermissions("user:manage", "user:create")
  async createUser(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
  ) {
    const result = await this.userService.createUser(user, body);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(":id")
  @RequirePermissions("user:manage", "user:update")
  async updateUser(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    const result = await this.userService.updateUser(user, id, body);
    return {
      success: true,
      data: result,
    };
  }

  @Delete(":id")
  @RequirePermissions("user:manage", "user:delete")
  async deleteUser(@CurrentUser() user: UserContext, @Param("id") id: string) {
    await this.userService.deleteUser(user, id);
    return {
      success: true,
      message: "User deleted successfully",
    };
  }
}
