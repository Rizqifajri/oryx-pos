import type { RequestHandler } from "express";
import type { CreateUserInput, UpdateUserInput } from "./user.schema";
import * as userService from "./user.service";

export const listUsers: RequestHandler = async (req, res) => {
  const users = await userService.listUsers(req.user!);
  res.json({
    success: true,
    data: users,
  });
};

export const getUsersByTenant: RequestHandler<{ tenantId: string }> = async (
  req,
  res,
) => {
  const { tenantId } = req.params;
  const users = await userService.getUsersByTenant(req.user!, tenantId);
  res.json({
    success: true,
    data: users,
  });
};

export const getUser: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  const user = await userService.getUser(req.user!, id);
  res.json({
    success: true,
    data: user,
  });
};

export const createUser: RequestHandler<
  object,
  object,
  CreateUserInput
> = async (req, res) => {
  const user = await userService.createUser(req.user!, req.body);
  res.status(201).json({
    success: true,
    data: user,
  });
};

export const updateUser: RequestHandler<
  { id: string },
  object,
  UpdateUserInput
> = async (req, res) => {
  const { id } = req.params;
  const user = await userService.updateUser(req.user!, id, req.body);
  res.json({
    success: true,
    data: user,
  });
};

export const deleteUser: RequestHandler<{ id: string }> = async (req, res) => {
  const { id } = req.params;
  await userService.deleteUser(req.user!, id);
  res.json({
    success: true,
    message: "User deleted successfully",
  });
};
