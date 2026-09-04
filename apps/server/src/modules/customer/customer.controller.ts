import type { RequestHandler } from "express";
import * as customerService from "./customer.service";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "./customer.schema";

export const listCustomers: RequestHandler = async (req, res) => {
  const { tenantId } = req.query;

  const filters: { tenantId?: string } = {};

  if (tenantId && typeof tenantId === "string") {
    filters.tenantId = tenantId;
  }

  const data = await customerService.listCustomers(req.user!, filters);
  res.json({ success: true, data });
};

export const getCustomersByTenant: RequestHandler<{
  tenantId: string;
}> = async (req, res) => {
  const data = await customerService.getCustomersByTenant(
    req.user!,
    req.params.tenantId,
  );
  res.json({ success: true, data });
};

export const getCustomer: RequestHandler<{ id: string }> = async (req, res) => {
  const data = await customerService.getCustomer(req.user!, req.params.id);
  res.json({ success: true, data });
};

export const createCustomer: RequestHandler<
  object,
  object,
  CreateCustomerInput
> = async (req, res) => {
  const data = await customerService.createCustomer(req.user!, req.body);
  res.status(201).json({ success: true, data });
};

export const updateCustomer: RequestHandler<
  { id: string },
  object,
  UpdateCustomerInput
> = async (req, res) => {
  const data = await customerService.updateCustomer(
    req.user!,
    req.params.id,
    req.body,
  );
  res.json({ success: true, data });
};

export const deleteCustomer: RequestHandler<{ id: string }> = async (
  req,
  res,
) => {
  await customerService.deleteCustomer(req.user!, req.params.id);
  res.json({ success: true, message: "Customer deleted successfully" });
};
