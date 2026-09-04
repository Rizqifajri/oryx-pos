import type { RequestHandler } from "express";
import * as menuService from "./menu.service";
import type {
  BulkUpdateAvailabilityInput,
  CreateMenuInput,
  ToggleAvailabilityInput,
  UpdateMenuInput,
} from "./menu.schema";

export const listMenus: RequestHandler = async (req, res) => {
  const { tenantId, categoryId, isAvailable } = req.query;

  const filters: { tenantId?: string; categoryId?: string; isAvailable?: boolean } = {};

  if (tenantId && typeof tenantId === "string") {
    filters.tenantId = tenantId;
  }

  if (categoryId && typeof categoryId === "string") {
    filters.categoryId = categoryId;
  }

  if (isAvailable !== undefined) {
    filters.isAvailable = isAvailable === "true";
  }

  const menus = await menuService.listMenus(req.user!, filters);
  res.json({
    success: true,
    data: menus,
  });
};

export const getMenusByTenant: RequestHandler<{
  tenantId: string;
}> = async (req, res) => {
  const { tenantId } = req.params;
  const menus = await menuService.getMenusByTenant(req.user!, tenantId);
  res.json({
    success: true,
    data: menus,
  });
};

export const getMenusByCategory: RequestHandler<{
  categoryId: string;
}> = async (req, res) => {
  const { categoryId } = req.params;
  const menus = await menuService.getMenusByCategory(req.user!, categoryId);
  res.json({
    success: true,
    data: menus,
  });
};

export const getMenu: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  const menu = await menuService.getMenu(req.user!, id);
  res.json({
    success: true,
    data: menu,
  });
};

export const createMenu: RequestHandler<
  object,
  object,
  CreateMenuInput
> = async (req, res) => {
  const menu = await menuService.createMenu(req.user!, req.body);
  res.status(201).json({
    success: true,
    data: menu,
  });
};

export const updateMenu: RequestHandler<
  { id: string },
  object,
  UpdateMenuInput
> = async (req, res) => {
  const { id } = req.params;
  const menu = await menuService.updateMenu(req.user!, id, req.body);
  res.json({
    success: true,
    data: menu,
  });
};

export const toggleAvailability: RequestHandler<
  { id: string },
  object,
  ToggleAvailabilityInput
> = async (req, res) => {
  const { id } = req.params;
  const menu = await menuService.toggleAvailability(
    req.user!,
    id,
    req.body.isAvailable,
  );
  res.json({
    success: true,
    data: menu,
  });
};

export const bulkUpdateAvailability: RequestHandler<
  object,
  object,
  BulkUpdateAvailabilityInput
> = async (req, res) => {
  const menus = await menuService.bulkUpdateAvailability(req.user!, req.body);
  res.json({
    success: true,
    data: menus,
  });
};

export const deleteMenu: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  await menuService.deleteMenu(req.user!, id);
  res.json({
    success: true,
    message: "Menu deleted successfully",
  });
};
