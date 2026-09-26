import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import { AuthService } from "./auth.service";
import {
  type LoginInput,
  loginSchema,
  type RefreshTokenInput,
  refreshTokenSchema,
  type RegisterInput,
  registerSchema,
} from "./auth.schema";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // register/login/refresh are unauthenticated: the Express router applied
  // `authenticate` only to /logout and /me.
  @Public()
  @Post("register")
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ) {
    const result = await this.authService.register(body);
    return {
      success: true,
      data: result,
      message: "Registration successful",
    };
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    const result = await this.authService.login(body);
    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput,
  ) {
    const result = await this.authService.refreshAccessToken(body);
    return {
      success: true,
      data: result,
    };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@CurrentUser() user: UserContext) {
    await this.authService.logout(user.userId);
    return { success: true, message: "Logged out successfully" };
  }

  @Get("me")
  async getCurrentUser(@CurrentUser() user: UserContext) {
    const result = await this.authService.getCurrentUserWithPermissions(
      user.userId,
    );
    return {
      success: true,
      data: result,
    };
  }
}
