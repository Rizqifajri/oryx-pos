// midtrans-client ships no type declarations. The two clients we build from it
// (payment.config.ts) are used through their `createTransaction` / status APIs
// only, so an untyped module is enough and keeps `npm run check-types` clean.
declare module "midtrans-client";
