import { env } from "@dio-sys-be/env/server";
import midtransClient from "midtrans-client";

/**
 * Midtrans Snap client for creating payment transactions.
 * Initialized with credentials from environment variables.
 */
export const snapClient = new midtransClient.Snap({
  isProduction: env.MIDTRANS_IS_PRODUCTION,
  serverKey: env.MIDTRANS_SERVER_KEY,
  clientKey: env.MIDTRANS_CLIENT_KEY,
});

/**
 * Midtrans Core API client for checking transaction status.
 * Used for manual status checks and verification.
 */
export const coreApiClient = new midtransClient.CoreApi({
  isProduction: env.MIDTRANS_IS_PRODUCTION,
  serverKey: env.MIDTRANS_SERVER_KEY,
  clientKey: env.MIDTRANS_CLIENT_KEY,
});
