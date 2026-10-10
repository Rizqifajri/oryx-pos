import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a route as unauthenticated: both JwtAuthGuard and PermissionsGuard skip
 * it. This reproduces the Express layout where the public routes were declared
 * *before* `router.use(authenticate)` and therefore never saw the middleware.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
