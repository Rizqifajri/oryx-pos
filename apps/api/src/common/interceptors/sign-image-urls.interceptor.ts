import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { mergeMap, type Observable } from "rxjs";
import { isR2Configured, signImageUrl } from "../lib/r2";

const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** Replaces every `imageUrl` string in the payload (in place) with a presigned GET URL. */
async function signImageUrls(value: unknown): Promise<void> {
  if (Array.isArray(value)) {
    await Promise.all(value.map(signImageUrls));
    return;
  }
  if (!isPlainObject(value)) return;
  await Promise.all(
    Object.entries(value).map(async ([key, child]) => {
      if (key === "imageUrl" && typeof child === "string") {
        value[key] = await signImageUrl(child);
      } else {
        await signImageUrls(child);
      }
    }),
  );
}

/**
 * Images are stored as R2 object keys. Signing them here, where every response
 * leaves the API, means no service has to remember to do it and no `*.r2.dev`
 * URL is ever handed to a browser.
 */
@Injectable()
export class SignImageUrlsInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      mergeMap(async (body: unknown) => {
        if (isR2Configured()) await signImageUrls(body);
        return body;
      }),
    );
  }
}
