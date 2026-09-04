import type { RequestHandler } from "express";
import * as roleService from "./role.service";
import type { CreateRoleInput, UpdateRoleInput } from "./role.schema";

export const listRoles: RequestHandler = async (req, res) => {
  const roles = await roleService.listRoles(req.user!);
  res.json({
    success: true,
    data: roles,
  });
};

export const getRolesByTenant: RequestHandler<{ tenantId: string }> = async (
  req,
  res,
) => {
  const { tenantId } = req.params;
  const roles = await roleService.getRolesByTenant(req.user!, tenantId);
  res.json({
    success: true,
    data: roles,
  });
};

export const getRole: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  const role = await roleService.getRole(req.user!, id);
  res.json({
    success: true,
    data: role,
  });
};

export const createRole: RequestHandler<
  object,
  object,
  CreateRoleInput
> = async (req, res) => {
  const role = await roleService.createRole(req.user!, req.body);
  res.status(201).json({
    success: true,
    data: role,
  });
};

export const updateRole: RequestHandler<
  { id: string },
  object,
  UpdateRoleInput
> = async (req, res) => {
  const { id } = req.params;
  const role = await roleService.updateRole(req.user!, id, req.body);
  res.json({
    success: true,
    data: role,
  });
};

export const deleteRole: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  await roleService.deleteRole(req.user!, id);
  res.json({
    success: true,
    message: "Role deleted successfully",
  });
};
