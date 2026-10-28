import { operationDescription, operationIdentity } from "@/lib/virtualAccountOperation";
import type { useVirtualAccountOperation } from "@/hooks/useVirtualAccountOperation";

export function VirtualAccountLifecycleStatus({ lifecycle }: { lifecycle: ReturnType<typeof useVirtualAccountOperation> }) {
  const { state, pollingPaused } = lifecycle;
  return (
    <section aria-label="Virtual account request status" className="my-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 dark:border-white/15 dark:bg-[#151b24] dark:text-gray-200">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">Request status</p>
        <button type="button" className="font-semibold underline underline-offset-4" disabled={state?.checking || state?.submitting}
          onClick={() => { void lifecycle.refresh(); }}>Check status</button>
      </div>
      {!state?.scope && !state?.error && <p role="status">Loading saved requests…</p>}
      {state?.error && <p role="alert">{state.error}</p>}
      {pollingPaused && <p role="status">{pollingPaused}</p>}
      {state?.scope?.legacy.map((item) => (
        <p key={item.sourceKey} role="alert">An earlier saved request{item.operationId ? ` (${item.operationId})` : ""} lacks verified API and account identity. It remains saved. Contact support before another assignment.</p>
      ))}
      {state?.scope?.operations.map((operation) => (
        <div key={operationIdentity(operation.providerAccountId, operation.operationId)}>
          <p className="font-medium">{operation.server?.currency ?? operation.request?.currency ?? "VA"} request · {operation.operationId} · Account {operation.providerAccountId}</p>
          <p>{operationDescription(operation)}</p>
        </div>
      ))}
      {state?.ready && !state.scope?.operations.length && !state.scope?.legacy.length && <p>No unresolved requests were found.</p>}
    </section>
  );
}
