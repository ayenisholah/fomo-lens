import { db } from "../../src/db";
import { submit } from "../../src/lib/research";
import { requestSchema } from "../../src/lib/research-contract";
import { verifiedContract } from "../../src/lib/upstream";

if (
  !process.send ||
  !new URL(process.env.DATABASE_URL!).pathname.startsWith("/fomo_lens_test")
)
  throw Error("Isolated worker fixture only");
const user = await db().user.findUniqueOrThrow({
  where: { id: process.argv[2] },
});
const request = requestSchema.parse(JSON.parse(process.argv[3]));
await submit(user, request, verifiedContract, async (url, init) => {
  process.send!({
    url: String(url),
    key: new Headers(init?.headers).get("Idempotency-Key"),
  });
  return new Promise<Response>(() => {});
});
