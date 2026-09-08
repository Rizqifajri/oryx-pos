import type { RequestHandler } from "express";
import * as uploadService from "./upload.service";

export const uploadMenuImage: RequestHandler = async (req, res) => {
  const data = await uploadService.uploadMenuImage(req.user!, req.file);
  res.status(201).json({ success: true, data });
};
