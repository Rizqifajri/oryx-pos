import { z } from "zod";

export const menuRatingItemSchema = z.object({
  menuId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(300).trim().optional(),
});

export const createFeedbackSchema = z.object({
  tenantId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  tableId: z.string().uuid().optional(),
  customerName: z.string().max(100).trim().optional(),
  overallRating: z.number().int().min(1).max(5),
  comment: z.string().max(500).trim().optional(),
  items: z.array(menuRatingItemSchema).default([]),
});

export const feedbackQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  overallRating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type MenuRatingItem = z.infer<typeof menuRatingItemSchema>;
export type FeedbackQueryInput = z.infer<typeof feedbackQuerySchema>;

