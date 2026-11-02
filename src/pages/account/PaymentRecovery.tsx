import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelTransfer, getTransfer, recoverSgdCapturedOutcome, requestSgdRecoveryReview,
  syncTransferStatus, type Transfer } from "@/services/moneyMovementService";
import { canCancelPayment, paymentUncertain, structuredTransfer } from "./paymentSafety";

export default function PaymentRecovery({ userId, token, transfer, onUpdated, onResume }: {
  userId: string; token: string; transfer: Transfer; onUpdated: (transfer: Transfer) => void;
  onResume: (transfer: Transfer) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const workflow = transfer.payout_workflow;
  const act = async (action: "refresh" | "sync" | "review" | "recover" | "cancel" | "resume") => {
    if (running.current) return;
    running.current = true; setBusy(true); setError("");
    const params = { userId, token, transferId: transfer.id };
    try {
      // Capabilities must come from a fresh writer-owned resource, never provider reference guesses.
      const current = await getTransfer(params);
      if (current.id !== transfer.id || current.provider_id !== transfer.provider_id) throw new Error("Saved payment identity changed.");
      onUpdated(current);
      const capabilities = current.payout_workflow;
      if (action === "refresh") return;
      if (action === "resume") {
        if (paymentUncertain(current) || !(current.status === "draft" && capabilities?.can_refresh_review !== false || capabilities?.can_refresh_review === true)) {
          throw new Error("This instruction cannot be reviewed again. Check its saved status.");
        }
        onResume(current); return;
      }
      let updated: Transfer;
      if (action === "sync" && capabilities?.can_reconcile_status === true) updated = (await syncTransferStatus(params)).transfer;
      else if (action === "review" && capabilities?.can_request_recovery_review === true && !capabilities.recovery_review_requested_at) updated = await requestSgdRecoveryReview(params);
      else if (action === "recover" && capabilities?.can_recover_captured_outcome === true) updated = await recoverSgdCapturedOutcome(params);
      else if (action === "cancel" && canCancelPayment(current)) updated = await cancelTransfer(params);
      else throw new Error("This action is no longer authorized. Review the refreshed payment status.");
      onUpdated(updated);
    } catch (failure) {
      const saved = structuredTransfer(failure);
      if (saved && saved.id === transfer.id) onUpdated(saved);
      setError(failure instanceof Error ? failure.message : "Unable to confirm payment status. Do not start another payment.");
    } finally { running.current = false; setBusy(false); }
  };
  return <section aria-label="Saved payment recovery" className="space-y-3 rounded-xl border p-4 text-left">
    <p>Saved payment #{transfer.id}: {transfer.status}{workflow ? ` / ${workflow.state}` : ""}</p>
    {workflow?.blockers?.map((blocker) => <p key={blocker}>{blocker}</p>)}
    {workflow?.recovery_kind && <p>Recovery: {workflow.recovery_kind}</p>}
    {workflow?.recovery_review_requested_at && <p>Recovery review requested: {workflow.recovery_review_requested_at}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={() => void act("refresh")}>Refresh saved status</Button>
      {workflow?.can_reconcile_status === true && <Button disabled={busy} onClick={() => void act("sync")}>Reconcile status</Button>}
      {workflow?.can_request_recovery_review === true && <Button disabled={busy || !!workflow.recovery_review_requested_at} onClick={() => void act("review")}>Request recovery review</Button>}
      {workflow?.can_recover_captured_outcome === true && <Button disabled={busy} onClick={() => void act("recover")}>Recover captured outcome</Button>}
      {!paymentUncertain(transfer) && (transfer.status === "draft" && workflow?.can_refresh_review !== false || workflow?.can_refresh_review === true)
        && <Button disabled={busy} onClick={() => void act("resume")}>Review saved instruction</Button>}
      {canCancelPayment(transfer) && <Button variant="outline" disabled={busy} onClick={() => void act("cancel")}>Cancel saved instruction before editing</Button>}
    </div>
    <p className="text-sm">Recovery uses saved evidence and backend permissions. It does not submit a new payout.</p>
  </section>;
}
