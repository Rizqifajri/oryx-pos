import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreateTransactionInput,
  createTransactionSchema,
} from "./transaction.schema";
import { TransactionService } from "./transaction.service";

@Controller("transactions")
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @RequirePermissions("transaction:list")
  async listTransactions(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
  ) {
    const filters: { tenantId?: string } = {};

    if (tenantId && typeof tenantId === "string") {
      filters.tenantId = tenantId;
    }

    const data = await this.transactionService.listTransactions(user, filters);
    return { success: true, data };
  }

  @Get("order/:orderId")
  @RequirePermissions("transaction:view")
  async getTransactionByOrder(
    @CurrentUser() user: UserContext,
    @Param("orderId") orderId: string,
  ) {
    const data = await this.transactionService.getTransactionByOrder(
      user,
      orderId,
    );
    return { success: true, data };
  }

  @Get(":id")
  @RequirePermissions("transaction:view")
  async getTransaction(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    const data = await this.transactionService.getTransaction(user, id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions("transaction:manage", "transaction:create")
  async createTransaction(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createTransactionSchema))
    body: CreateTransactionInput,
  ) {
    const data = await this.transactionService.createTransaction(user, body);
    return { success: true, data };
  }

  @Delete(":id")
  @RequirePermissions("transaction:manage", "transaction:delete")
  async deleteTransaction(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    await this.transactionService.deleteTransaction(user, id);
    return { success: true, message: "Transaction deleted successfully" };
  }
}
