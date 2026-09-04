import type { RequestHandler } from "express";
import * as permissionService from "./permission.service";
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
} from "./permission.schema";

export const listPermissions: RequestHandler = async (req, res) => {
  const permissions = await permissionService.listPermissions(req.user!);
  res.json({
    success: true,
    data: permissions,
  });
};

export const getPermission: RequestHandler<{ id: string }> = async (
  req,
  res,
) => {
  const { id } = req.params;
  const permission = await permissionService.getPermission(req.user!, id);
  res.json({
    success: true,
    data: permission,
  });
};

export const createPermission: RequestHandler<
  object,
  object,
  CreatePermissionInput
> = async (req, res) => {
  const permission = await permissionService.createPermission(
    req.user!,
    req.body,
  );
  res.status(201).json({
    success: true,
    data: permission,
  });
};

export const updatePermission: RequestHandler<
  { id: string },
  object,
  UpdatePermissionInput
> = async (req, res) => {
  const { id } = req.params;
  const permission = await permissionService.updatePermission(
    req.user!,
    id,
    req.body,
  );
  res.json({
    success: true,
    data: permission,
  });
};

export const deletePermission: RequestHandler<{ id: string }> = async (
  req,
  res,
) => {
  const { id } = req.params;
  await permissionService.deletePermission(req.user!, id);
  res.json({
    success: true,
    message: "Permission deleted successfully",
  });
};
