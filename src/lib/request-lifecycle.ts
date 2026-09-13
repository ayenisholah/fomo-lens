// Shared by ordinary requests and explicit recovery. The gate covers result application.
export async function withResearchRequest(options: {
  pending: { current: boolean };
  setBusy: (value: boolean) => void;
  isCurrent: () => boolean;
  onBegin: () => void;
  execute: () => Promise<void>;
  onError: (message: string) => void;
}) {
  if (options.pending.current || !options.isCurrent()) return;
  options.pending.current = true;
  try {
    options.setBusy(true);
    options.onBegin();
    await options.execute();
  } catch (error) {
    if (options.isCurrent())
      options.onError(
        error instanceof Error ? error.message : "Research unavailable.",
      );
  } finally {
    options.pending.current = false;
    options.setBusy(false);
  }
}
