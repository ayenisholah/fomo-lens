import type { ClientOperation } from "./research-client";
import { withResearchRequest } from "./request-lifecycle";
type RecoveryResponse = { data: { operation: ClientOperation; data: unknown } };
export async function recoverRequest(options: {
  operationId: string;
  pending: { current: boolean };
  setBusy: (busy: boolean) => void;
  isCurrent: () => boolean;
  onBegin: () => void;
  onResult: (result: RecoveryResponse) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  await withResearchRequest({
    ...options,
    execute: async () => {
      const response = await fetch(
        `/api/research/${options.operationId}/recover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: AbortSignal.timeout(90000),
        },
      );
      const json = await response.json();
      if (!options.isCurrent()) return;
      if (!response.ok || !json.ok)
        throw Error(json.error?.message ?? "Recovery unavailable.");
      if (json.data?.operation?.id !== options.operationId)
        throw Error("Recovery operation does not match request.");
      await options.onResult(json);
    },
  });
}
