import type { RequestHandler } from "express";
import * as tableService from "./table.service";
import type {
  CreateTableInput,
  TableStatus,
  UpdateTableInput,
  UpdateTableStatusInput,
} from "./table.schema";

export const listTables: RequestHandler = async (req, res) => {
  const { tenantId, status } = req.query;

  const filters: { tenantId?: string; status?: TableStatus } = {};

  if (tenantId && typeof tenantId === "string") {
    filters.tenantId = tenantId;
  }

  if (status === "AVAILABLE" || status === "OCCUPIED") {
    filters.status = status;
  }

  const tableList = await tableService.listTables(req.user!, filters);
  res.json({
    success: true,
    data: tableList,
  });
};

export const getTablesByTenant: RequestHandler<{
  tenantId: string;
}> = async (req, res) => {
  const { tenantId } = req.params;
  const tableList = await tableService.getTablesByTenant(req.user!, tenantId);
  res.json({
    success: true,
    data: tableList,
  });
};

export const getTable: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  const table = await tableService.getTable(req.user!, id);
  res.json({
    success: true,
    data: table,
  });
};

export const createTable: RequestHandler<
  object,
  object,
  CreateTableInput
> = async (req, res) => {
  const table = await tableService.createTable(req.user!, req.body);
  res.status(201).json({
    success: true,
    data: table,
  });
};

export const updateTable: RequestHandler<
  { id: string },
  object,
  UpdateTableInput
> = async (req, res) => {
  const { id } = req.params;
  const table = await tableService.updateTable(req.user!, id, req.body);
  res.json({
    success: true,
    data: table,
  });
};

export const updateTableStatus: RequestHandler<
  { id: string },
  object,
  UpdateTableStatusInput
> = async (req, res) => {
  const { id } = req.params;
  const table = await tableService.updateTableStatus(
    req.user!,
    id,
    req.body.status,
  );
  res.json({
    success: true,
    data: table,
  });
};

export const deleteTable: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  await tableService.deleteTable(req.user!, id);
  res.json({
    success: true,
    message: "Table deleted successfully",
  });
};
