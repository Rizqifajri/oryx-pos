import type { Request } from "express";
import type { UserContext } from "./user-context";

export interface RequestWithUser extends Request {
  user?: UserContext;
}
