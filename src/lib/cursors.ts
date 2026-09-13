import "server-only";
import { z } from "zod";
import { keyed, equal } from "./crypto";
import { config } from "./config";
import { AppError } from "./errors";
const schema = z.object({
  cursor: z.string(),
  binding: z.string(),
  expires: z.number(),
});
export function signCursor(cursor: string, binding: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ cursor, binding, expires: now + 15 * 60000 }),
  ).toString("base64url");
  return payload + "." + keyed(config().CURSOR_SECRET, payload);
}
export function readCursor(value: string, binding: string, now = Date.now()) {
  try {
    const [payload, signature] = value.split(".");
    if (!signature || !equal(signature, keyed(config().CURSOR_SECRET, payload)))
      throw new Error();
    const data = schema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString()),
    );
    if (data.binding !== binding) throw new Error();
    if (data.expires <= now)
      throw new AppError(
        "cursor_expired",
        "This page cursor expired. Start a new search explicitly.",
        410,
      );
    return data.cursor;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      "cursor_invalid",
      "This cursor does not belong to this request.",
      400,
    );
  }
}
