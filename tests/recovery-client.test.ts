import { afterEach, expect, it, vi } from "vitest";
import { recoverRequest } from "@/lib/recovery-client";

afterEach(() => vi.unstubAllGlobals());
const result = {
  ok: true,
  data: {
    operation: { id: "operation", status: "complete", actualCredits: 1 },
    data: { subject: "alice" },
  },
};
function setup() {
  const options = {
    operationId: "operation",
    pending: { current: false },
    setBusy: vi.fn(),
    isCurrent: vi.fn(() => true),
    onBegin: vi.fn(),
    onResult: vi.fn(),
    onError: vi.fn(),
  };
  const fetch = vi.fn().mockResolvedValue(Response.json(result));
  vi.stubGlobal("fetch", fetch);
  return { options, fetch };
}

it("loads recovered data and releases the shared gate for subsequent requests", async () => {
  const { options, fetch } = setup();
  await recoverRequest(options);
  expect(options.onResult).toHaveBeenCalledWith(result);
  expect(options.pending.current).toBe(false);
  expect(options.setBusy.mock.calls).toEqual([[true], [false]]);
  fetch.mockResolvedValue(Response.json(result));
  await recoverRequest(options);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each(["http", "network", "json", "render"])(
  "releases the gate after %s failure",
  async (failure) => {
    const { options, fetch } = setup();
    if (failure === "http")
      fetch.mockResolvedValue(
        Response.json(
          { ok: false, error: { message: "Failed" } },
          { status: 503 },
        ),
      );
    if (failure === "network") fetch.mockRejectedValue(new Error("Offline"));
    if (failure === "json")
      fetch.mockResolvedValue(new Response("invalid JSON"));
    if (failure === "render")
      options.onResult.mockImplementationOnce(() => {
        throw Error("Invalid result");
      });
    await recoverRequest(options);
    expect(options.onError).toHaveBeenCalledOnce();
    expect(options.pending.current).toBe(false);
    expect(options.setBusy).toHaveBeenLastCalledWith(false);
    fetch.mockResolvedValue(Response.json(result));
    await recoverRequest(options);
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);

it.each([true, false])(
  "ignores delayed results and errors after selection changes (ok=%s)",
  async (ok) => {
    const { options, fetch } = setup();
    let resolve!: (response: Response) => void;
    fetch.mockReturnValue(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    const recovery = recoverRequest(options);
    expect(options.pending.current).toBe(true);
    await recoverRequest(options);
    expect(fetch).toHaveBeenCalledTimes(1);
    options.isCurrent.mockReturnValue(false);
    resolve(
      Response.json(
        ok ? result : { ok: false, error: { message: "Old failure" } },
        { status: ok ? 200 : 503 },
      ),
    );
    await recovery;
    expect(options.onResult).not.toHaveBeenCalled();
    expect(options.onError).not.toHaveBeenCalled();
    expect(options.pending.current).toBe(false);
    expect(options.setBusy).toHaveBeenLastCalledWith(false);
    options.isCurrent.mockReturnValue(true);
    fetch.mockResolvedValue(Response.json(result));
    await recoverRequest(options);
    expect(options.onResult).toHaveBeenCalledOnce();
  },
);

it("does not apply recovery for a selection already stale before recovery begins", async () => {
  const { options } = setup();
  options.isCurrent.mockReturnValue(false);
  await recoverRequest(options);
  expect(options.onResult).not.toHaveBeenCalled();
  expect(options.pending.current).toBe(false);
});

it("does not dispatch an already stale recovery", async () => {
  const { options, fetch } = setup();
  options.isCurrent.mockReturnValue(false);
  await recoverRequest(options);
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects a different operation identity", async () => {
  const { options, fetch } = setup();
  fetch.mockResolvedValue(
    Response.json({
      ...result,
      data: { ...result.data, operation: { id: "other" } },
    }),
  );
  await recoverRequest(options);
  expect(options.onResult).not.toHaveBeenCalled();
  expect(options.onError).toHaveBeenCalledOnce();
  expect(options.pending.current).toBe(false);
});
it("awaits asynchronous application failures before releasing the gate", async () => {
  const { options } = setup();
  options.onResult.mockImplementation(async () => {
    throw Error("application failure");
  });
  await recoverRequest(options);
  expect(options.onError).toHaveBeenCalledWith("application failure");
  expect(options.pending.current).toBe(false);
});
