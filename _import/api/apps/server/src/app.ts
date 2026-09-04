import { env } from "@dio-sys-be/env/server";
import cors from "cors";
import express from "express";
import { errorHandler } from "./middlewares/error.middleware";
import authRoute from "./modules/auth/auth.routes";
import categoryRoute from "./modules/category/category.routes";
import customerRoute from "./modules/customer/customer.routes";
import menuRoute from "./modules/menu/menu.routes";
import orderRoute from "./modules/order/order.routes";
import permissionRoute from "./modules/permission/permission.routes";
import roleRoute from "./modules/role/role.routes";
import tableRoute from "./modules/table/table.routes";
import tenantRoute from "./modules/tenant/tenant.routes";
import transactionRoute from "./modules/transaction/transaction.routes";
import userRoute from "./modules/user/user.route";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ success: true, message: "dio-sys-be is running" });
});

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/tenants", tenantRoute);
app.use("/api/v1/roles", roleRoute);
app.use("/api/v1/permissions", permissionRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/menus", menuRoute);
app.use("/api/v1/tables", tableRoute);
app.use("/api/v1/customers", customerRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/transactions", transactionRoute);

app.use(errorHandler);

export default app;
