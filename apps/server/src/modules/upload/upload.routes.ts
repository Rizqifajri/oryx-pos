import { asyncHandler } from "@/middlewares/async.middleware";
import { authenticate } from "@/middlewares/auth.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { AppError } from "@/utils/app-error";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer, { MulterError } from "multer";
import * as uploadController from "./upload.controller";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      cb(new AppError("Only JPEG, PNG, WebP, or GIF images are allowed", 400));
      return;
    }
    cb(null, true);
  },
});

// Wraps multer so its errors (e.g. file too large) become clean AppErrors
// instead of surfacing as a generic 500.
const singleImage = (field: string) => {
  const handler = upload.single(field);
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (err instanceof MulterError) {
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? "Image must be 5 MB or smaller"
            : `Upload error: ${err.message}`;
        next(new AppError(message, 400));
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  };
};

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.post(
  "/menu",
  requirePermission("menu:manage", "menu:create", "menu:update"),
  singleImage("file"),
  asyncHandler(uploadController.uploadMenuImage),
);

export default router;
