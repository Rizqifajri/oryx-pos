import type { RequestHandler } from "express";
import * as categoryService from "./category.service";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.schema";

export const listCategories: RequestHandler = async (req, res) => {
  const { tenantId } = req.query;

  const filters: { tenantId?: string } = {};

  if (tenantId && typeof tenantId === "string") {
    filters.tenantId = tenantId;
  }

  const categories = await categoryService.listCategories(req.user!, filters);
  res.json({
    success: true,
    data: categories,
  });
};

export const getCategoriesByTenant: RequestHandler<{
  tenantId: string;
}> = async (req, res) => {
  const { tenantId } = req.params;
  const categories = await categoryService.getCategoriesByTenant(
    req.user!,
    tenantId,
  );
  res.json({
    success: true,
    data: categories,
  });
};

export const getCategory: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  const category = await categoryService.getCategory(req.user!, id);
  res.json({
    success: true,
    data: category,
  });
};

export const createCategory: RequestHandler<
  object,
  object,
  CreateCategoryInput
> = async (req, res) => {
  const category = await categoryService.createCategory(req.user!, req.body);
  res.status(201).json({
    success: true,
    data: category,
  });
};

export const updateCategory: RequestHandler<
  { id: string },
  object,
  UpdateCategoryInput
> = async (req, res) => {
  const { id } = req.params;
  const category = await categoryService.updateCategory(
    req.user!,
    id,
    req.body,
  );
  res.json({
    success: true,
    data: category,
  });
};

export const deleteCategory: RequestHandler<{ id: string }> = async (
  req,
  res,
) => {
  const { id } = req.params;
  await categoryService.deleteCategory(req.user!, id);
  res.json({
    success: true,
    message: "Category deleted successfully",
  });
};
