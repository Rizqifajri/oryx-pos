import { authenticate } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/middlewares/async.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as categoryController from "./category.controller";
import { createCategorySchema, updateCategorySchema } from "./category.schema";

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.get(
  "/",
  requirePermission("category:list"),
  asyncHandler(categoryController.listCategories),
);
router.get(
  "/tenant/:tenantId",
  requirePermission("category:list"),
  asyncHandler(categoryController.getCategoriesByTenant),
);
router.get(
  "/:id",
  requirePermission("category:view"),
  asyncHandler(categoryController.getCategory),
);
router.post(
  "/",
  requirePermission("category:manage", "category:create"),
  validate(createCategorySchema),
  asyncHandler(categoryController.createCategory),
);
router.patch(
  "/:id",
  requirePermission("category:manage", "category:update"),
  validate(updateCategorySchema),
  asyncHandler(categoryController.updateCategory),
);
router.delete(
  "/:id",
  requirePermission("category:manage", "category:delete"),
  asyncHandler(categoryController.deleteCategory),
);

export default router;
