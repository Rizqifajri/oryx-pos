import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "@/utils/app-error";
import * as uploadService from "./upload.service";

const presignSchema = z.object({
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export const createMenuImageUpload: RequestHandler = async (req, res) => {
  const parsed = presignSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError("contentType and size are required", 400);
  }

  const data = await uploadService.createMenuImageUpload(req.user!, parsed.data);
  res.status(201).json({ success: true, data });
};
