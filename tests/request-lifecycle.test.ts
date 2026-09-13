import { it, expect, vi } from "vitest";
import { withResearchRequest } from "@/lib/request-lifecycle";
function setup() {
  return {
    pending: { current: false },
    setBusy: vi.fn(),
    isCurrent: vi.fn(() => true),
    onBegin: vi.fn(),
    onError: vi.fn(),
    execute: vi.fn(async () => {}),
  };
}
it.each(["http", "network", "decoding", "application", "begin"])(
  "ordinary request releases the shared gate after %s failure and permits a subsequent request",
  async (failure) => {
    const options = setup();
    if (failure === "begin")
      options.onBegin.mockImplementationOnce(() => {
        throw Error(failure);
      });
    else options.execute.mockRejectedValueOnce(Error(failure));
    await withResearchRequest(options);
    expect(options.onError).toHaveBeenCalledWith(failure);
    expect(options.pending.current).toBe(false);
    await withResearchRequest(options);
    expect(options.setBusy.mock.calls).toEqual([
      [true],
      [false],
      [true],
      [false],
    ]);
  },
);
it("suppresses delayed errors and refuses overlapping ordinary/recovery attempts", async () => {
  const options = setup();
  let reject!: (error: Error) => void;
  options.execute.mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const first = withResearchRequest(options);
  await withResearchRequest(options);
  expect(options.execute).toHaveBeenCalledOnce();
  options.isCurrent.mockReturnValue(false);
  reject(Error("stale"));
  await first;
  expect(options.onError).not.toHaveBeenCalled();
  expect(options.pending.current).toBe(false);
});
