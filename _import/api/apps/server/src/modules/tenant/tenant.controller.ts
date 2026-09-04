import type { RequestHandler } from "express";
import type { CreateTenantInput, UpdateTenantInput } from "./tenant.schema";
import * as tenantService from "./tenant.service";

export const listTenants: RequestHandler = async (req, res) => {
  const tenants = await tenantService.listTenants(req.user!);
  res.json({
    success: true,
    data: tenants,
  });
};

export const getTenant: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  const tenant = await tenantService.getTenant(req.user!, id);
  res.json({
    success: true,
    data: tenant,
  });
};

export const getMyTenant: RequestHandler = async (req, res) => {
  const tenant = await tenantService.getMyTenant(req.user!);
  res.json({
    success: true,
    data: tenant,
  });
};

export const createTenant: RequestHandler<
  object,
  object,
  CreateTenantInput
> = async (req, res) => {
  const tenant = await tenantService.createTenant(req.user!, req.body);
  res.status(201).json({
    success: true,
    data: tenant,
  });
};

export const updateTenant: RequestHandler<
  { id: string },
  object,
  UpdateTenantInput
> = async (req, res) => {
  const { id } = req.params;
  const tenant = await tenantService.updateTenant(req.user!, id, req.body);
  res.json({
    success: true,
    data: tenant,
  });
};

export const updateMyTenant: RequestHandler<
  object,
  object,
  UpdateTenantInput
> = async (req, res) => {
  const tenant = await tenantService.updateMyTenant(req.user!, req.body);
  res.json({
    success: true,
    data: tenant,
  });
};

export const deleteTenant: RequestHandler<{ id: string }> = async (
  req,
  res,
) => {
  const { id } = req.params;
  await tenantService.deleteTenant(req.user!, id);
  res.json({
    success: true,
    message: "Tenant deleted successfully",
  });
};

export const deleteMyTenant: RequestHandler = async (req, res) => {
  await tenantService.deleteMyTenant(req.user!);
  res.json({
    success: true,
    message: "Tenant deleted successfully",
  });
};
