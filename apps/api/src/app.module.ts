import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CategoryModule } from "./modules/category/category.module";
import { CustomerModule } from "./modules/customer/customer.module";
import { MenuModule } from "./modules/menu/menu.module";
import { OrderModule } from "./modules/order/order.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { PermissionModule } from "./modules/permission/permission.module";
import { RoleModule } from "./modules/role/role.module";
import { TableModule } from "./modules/table/table.module";
import { TenantModule } from "./modules/tenant/tenant.module";
import { TransactionModule } from "./modules/transaction/transaction.module";
import { UploadModule } from "./modules/upload/upload.module";
import { UserModule } from "./modules/user/user.module";

@Module({
  imports: [
    DatabaseModule,
    // Same order the Express app mounted its routers in.
    AuthModule,
    TenantModule,
    RoleModule,
    PermissionModule,
    UserModule,
    CategoryModule,
    MenuModule,
    TableModule,
    CustomerModule,
    OrderModule,
    TransactionModule,
    PaymentModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    // Order matters: JwtAuthGuard populates request.user, which
    // PermissionsGuard then reads. This mirrors the Express middleware chain
    // `authenticate -> requirePermission(...)`.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
