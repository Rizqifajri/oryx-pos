import { z } from "zod";

export const PLAN_CODES = ["starter", "pro", "business"] as const;

export const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z
    .string()
    .trim()
    .regex(/^\+62\d{8,13}$/, "Phone must be +62 followed by 8-13 digits"),
  tenantName: z.string().min(2).max(100).trim(),
  address: z.string().min(5).max(255).trim(),
  businessType: z.string().min(1).max(50).trim(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[~!@#$%^&*])/,
      "Password must contain uppercase, lowercase, digit, and symbol (~!@#$%^&*)",
    ),
  country: z.string().regex(/^[A-Z]{2}$/, "Country must be an ISO-2 code"),
  province: z.string().min(1).max(100).trim(),
  city: z.string().min(1).max(100).trim(),
  plan: z.enum(PLAN_CODES),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
