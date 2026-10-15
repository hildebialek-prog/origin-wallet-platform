import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, MessagesSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { getCustomerRfis, saveCustomerRfiDraft, submitCustomerRfi, uploadCustomerRfiDocument, type CustomerRfiDocument } from "@/services/rfiService";

const AccountRfi = () => {
  const { user, token } = useAuth();
  const client = useQueryClient();
  const [uploaded, setUploaded] = useState<CustomerRfiDocument[]>([]);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["customer-rfis", user?.id, token], enabled: !!user?.id && !!token, queryFn: () => getCustomerRfis(user!.id, token!) });
  const availableDocuments = useMemo(() => {
    const documents = [...uploaded, ...(query.data?.data.flatMap((item) => item.documents || []) || [])];
    return Array.from(new Map(documents.map((document) => [document.id, document])).values());
  }, [query.data, uploaded]);
  const refresh = () => client.invalidateQueries({ queryKey: ["customer-rfis", user?.id] });
  const mutationError = (error: unknown) => setActionError(error instanceof Error ? error.message : "Unable to update this information request.");
  const upload = useMutation({ mutationFn: (file: File) => uploadCustomerRfiDocument(user!.id, token!, file), onMutate: () => setActionError(null), onSuccess: ({ document }) => setUploaded((current) => [...current, document]), onError: mutationError });
  const save = useMutation({ mutationFn: ({ caseId, documentIds, explanation }: { caseId: number; documentIds: number[]; explanation: string }) => saveCustomerRfiDraft(user!.id, caseId, token!, documentIds, explanation), onMutate: () => setActionError(null), onSuccess: refresh, onError: mutationError });
  const submit = useMutation({ mutationFn: (caseId: number) => submitCustomerRfi(user!.id, caseId, token!), onMutate: () => setActionError(null), onSuccess: refresh, onError: mutationError });

  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-7 text-white"><div className="flex items-center gap-3"><MessagesSquare className="h-7 w-7 text-emerald-400" /><h1 className="text-3xl font-semibold">Information requests</h1></div><p className="mt-3 max-w-2xl text-slate-300">Provide documents requested by Nium Compliance. Your submission is reviewed by Origin Wallet before any provider action.</p></div>
    <Card><CardHeader><CardTitle>Supporting document library</CardTitle><CardDescription>Upload once, then explicitly select the same file for multiple requests—for example, one bank statement for both personal source of wealth and source of funds.</CardDescription></CardHeader><CardContent><label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400 bg-emerald-50 p-5 font-medium text-emerald-800"><FileUp className="h-5 w-5" />{upload.isPending ? "Uploading..." : "Upload PDF, JPG or PNG (max 10 MB)"}<input aria-label="Upload Corporate RFI supporting document" className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" disabled={upload.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.currentTarget.value = ""; }} /></label></CardContent></Card>
    {query.isLoading ? <div>Loading requests...</div> : null}
    {query.isError ? <div role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">Unable to load your information requests.</div> : null}
    {actionError ? <div role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">{actionError}</div> : null}
    {query.data?.data.map((item) => {
      const editable = ["sent_to_user", "user_draft", "revision_requested"].includes(item.submission_state);
      const chosen = selected[item.id] ?? item.documents?.map((document) => document.id) ?? [];
      const requestName = item.evidence?.template?.name || `Request #${item.id}`;
      return <Card key={item.id} role="region" aria-label={`${requestName} information request`} className="overflow-hidden rounded-[1.75rem]"><CardHeader className="bg-slate-50"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{requestName}</CardTitle><CardDescription>{item.evidence?.template?.documentType || "Supporting documentation"}</CardDescription></div><Badge>{item.submission_state.replaceAll("_", " ")}</Badge></div></CardHeader><CardContent className="space-y-5 pt-6">
        <div><div className="text-sm font-semibold uppercase tracking-wider text-slate-500">Original Nium instructions</div><div className="mt-2 whitespace-pre-wrap rounded-2xl bg-amber-50 p-4 text-slate-900">{item.evidence?.remarks || "No additional remarks supplied."}</div></div>
        <div>{item.evidence?.template?.requiredFields?.map((field, index) => <div key={index} className="rounded-xl border p-3"><div className="font-medium">{field.fieldLabel || "Required document"}</div><div className="text-sm text-slate-500">{field.type || field.fieldValue}</div></div>)}</div>
        {item.revision_reason ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="font-semibold text-red-800">Revision requested</div><div className="mt-1 text-sm text-red-700">{item.revision_reason}</div></div> : null}
        <div><div className="mb-2 font-medium">Documents for this request</div><div className="grid gap-2 sm:grid-cols-2">{availableDocuments.map((document) => <label key={document.id} className="flex items-center gap-3 rounded-xl border p-3"><Checkbox disabled={!editable} checked={chosen.includes(document.id)} onCheckedChange={(checked) => setSelected((current) => ({ ...current, [item.id]: checked ? [...chosen, document.id] : chosen.filter((id) => id !== document.id) }))} /><span className="min-w-0 truncate">{document.original_name || `Document ${document.id}`}</span></label>)}</div></div>
        <Textarea disabled={!editable} placeholder="Add an explanation for the reviewer" value={explanations[item.id] ?? item.user_explanation ?? ""} onChange={(event) => setExplanations((current) => ({ ...current, [item.id]: event.target.value }))} />
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!editable || save.isPending} onClick={() => save.mutate({ caseId: item.id, documentIds: chosen, explanation: explanations[item.id] ?? item.user_explanation ?? "" })}>Save draft</Button><Button disabled={!editable || chosen.length === 0 || submit.isPending} onClick={async () => { await save.mutateAsync({ caseId: item.id, documentIds: chosen, explanation: explanations[item.id] ?? item.user_explanation ?? "" }); submit.mutate(item.id); }}>Submit to Origin Wallet</Button></div>
        <div className="text-xs text-slate-500">Current processing status: {item.submission_state.replaceAll("_", " ")}. This does not submit anything directly to Nium.</div>
      </CardContent></Card>;
    })}
    {!query.isLoading && !query.data?.data.length ? <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">No information requests have been sent to you.</div> : null}
  </div>;
};

export default AccountRfi;
