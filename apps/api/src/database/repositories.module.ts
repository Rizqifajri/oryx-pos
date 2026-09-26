import { Module } from "@nestjs/common";
import { AuthRepository } from "../modules/auth/auth.repository";
import { CategoryRepository } from "../modules/category/category.repository";
import { CustomerRepository } from "../modules/customer/customer.repository";
import { MenuRepository } from "../modules/menu/menu.repository";
import { OrderRepository } from "../modules/order/order.repository";
import { PaymentRepository } from "../modules/payment/payment.repository";
import { PermissionRepository } from "../modules/permission/permission.repository";
import { RoleRepository } from "../modules/role/role.repository";
import { TableRepository } from "../modules/table/table.repository";
import { TenantRepository } from "../modules/tenant/tenant.repository";
import { TransactionRepository } from "../modules/transaction/transaction.repository";
import { UserRepository } from "../modules/user/user.repository";

const repositories = [
  AuthRepository,
  CategoryRepository,
  CustomerRepository,
  MenuRepository,
  OrderRepository,
  PaymentRepository,
  PermissionRepository,
  RoleRepository,
  TableRepository,
  TenantRepository,
  TransactionRepository,
  UserRepository,
];

/**
 * Every repository in one module, which each feature module imports.
 *
 * Services read across feature boundaries in both directions — OrderService uses
 * the table/tenant/category/customer/menu repositories while TableService uses
 * the order repository — so wiring repositories into their own feature modules
 * would make TableModule and OrderModule import each other and force
 * `forwardRef()` on both. Repositories only depend on the Drizzle connection and
 * never on each other, so collecting them here keeps the module graph acyclic.
 */
@Module({
  providers: repositories,
  exports: repositories,
})
export class RepositoriesModule {}
