import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { config } from "./config";
import { AppError } from "./errors";
export function origin(req: Request) {
  if (req.headers.get("origin") !== new URL(config().APP_URL).origin)
    throw new AppError("origin", "Request origin is not allowed.", 403);
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 8192)
    throw new AppError("validation", "Request is too large.", 413);
  const text = await req.text();
  if (text.length > 8192)
    throw new AppError("validation", "Request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("validation", "Invalid JSON.", 400);
  }
}
export const success = (data: unknown, mode?: string, status = 200) =>
  NextResponse.json(
    { ok: true, ...(mode ? { mode } : {}), data },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
export async function route(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    const err =
      e instanceof AppError
        ? e
        : e instanceof ZodError
          ? new AppError("validation", "Check the submitted fields.", 400)
          : new AppError(
              "unavailable",
              "The service is temporarily unavailable.",
              503,
            );
    // Deliberately exclude exception text, request bodies, and credentials from logs.
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.retryAfter ? { retryAfter: err.retryAfter } : {}),
        },
      },
      {
        status: err.status,
        headers: {
          "Cache-Control": "private, no-store",
          ...(err.retryAfter ? { "Retry-After": String(err.retryAfter) } : {}),
        },
      },
    );
  }
}
