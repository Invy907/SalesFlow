/** Run with: npx tsx --env-file=.env.local scripts/ai-estimate/qa-api-smoke.ts
 * Restricted to the disposable local QA API at port 58321. No provider requests.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { manualReviewScaffold } from "../../src/lib/ai/estimates/lifecycle";

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const endpoint = new URL(configuredUrl);
assert.ok(["localhost", "127.0.0.1"].includes(endpoint.hostname) && endpoint.port === "58321" && endpoint.protocol === "http:", "Only the local QA API on port 58321 is permitted");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(publishableKey && serviceKey, "Local QA API credentials must be configured");
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(configuredUrl, serviceKey, options);
const actorIds: string[] = [];
const organizationIds: string[] = [];
const storagePaths: string[] = [];
const fixtureSources: string[] = [];
const runId = randomUUID();

function checked(error: { code?: string; message?: string } | null, stage: string) {
  if (error) throw new Error(`${stage}: ${error.code ?? "API_ERROR"}`);
}
function rows<T>(value: T | T[] | null): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}
async function actor(label: string) {
  const email = `qa-ai-${label}-${runId}@example.invalid`;
  const password = `Qa-AI-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  checked(error, "Create synthetic account");
  assert.ok(data.user, "Synthetic account must be returned");
  actorIds.push(data.user.id);
  const client = createClient(configuredUrl, publishableKey!, options);
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  checked(loginError, "Sign in synthetic account");
  const { data: membership, error: memberError } = await admin.from("organization_members").select("organization_id")
    .eq("user_id", data.user.id).eq("role", "owner").single();
  checked(memberError, "Load synthetic organization");
  assert.ok(membership);
  organizationIds.push(membership.organization_id);
  return { id: data.user.id, client, orgId: String(membership.organization_id) };
}
function syntheticPdf(): Buffer {
  const content = "BT /F1 12 Tf 12 48 Td (Synthetic QA estimate) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=", "base64");
const review = {
  ...manualReviewScaffold("Synthetic approved estimate"), taxMode: "excluded", confidence: 1,
  clientName: "Synthetic customer", warnings: [],
  lines: [{ name: "Synthetic design work", qty: 2, unit: "hour", unitPrice: 1000, taxCategory: "standard_10", confidence: 1, reason: "Manually confirmed synthetic fixture" }],
};

type Detail = {
  id: string; status: string; updated_at: string;
  ai_estimate_extractions: { extracted_data: unknown; source_of_truth: string } | Array<{ extracted_data: unknown; source_of_truth: string }> | null;
  ai_estimate_jobs: { status: string } | Array<{ status: string }> | null;
};
async function detail(client: SupabaseClient, sourceId: string): Promise<Detail> {
  const { data, error } = await client.from("ai_estimate_sources")
    .select("id,status,updated_at,ai_estimate_extractions(extracted_data,source_of_truth),ai_estimate_jobs!ai_estimate_jobs_source_id_fkey(status)")
    .eq("id", sourceId).single();
  checked(error, "Read explicit source/job relationship");
  assert.ok(data);
  return data as unknown as Detail;
}
async function upload(owner: Awaited<ReturnType<typeof actor>>, bytes: Buffer, mimeType: string, visibility: "organization" | "private") {
  const sourceId = randomUUID();
  const extension = mimeType === "application/pdf" ? "pdf" : "png";
  const path = `${owner.orgId}/${sourceId}/original.${extension}`;
  const { error: sourceError } = await owner.client.from("ai_estimate_sources").insert({ id: sourceId,
    organization_id: owner.orgId, source_type: "upload", title: `Synthetic ${extension} ${visibility}`,
    original_file_name: `qa.${extension}`, storage_path: path, mime_type: mimeType, file_size: bytes.length,
    file_hash: createHash("sha256").update(bytes).digest("hex"), visibility, status: "uploaded", uploaded_by: owner.id });
  checked(sourceError, "Register synthetic source");
  fixtureSources.push(sourceId);
  // A ticket is not a completed upload: maintenance must not consume it.
  const { data: pending, error: pendingError } = await admin.rpc("ai_estimate_pending_sources", { p_limit: 3 });
  checked(pendingError, "Read maintenance queue");
  assert.ok(!(pending ?? []).some((candidate: { source_id: string }) => candidate.source_id === sourceId), "Incomplete upload ticket must not be processed");
  const bucket = owner.client.storage.from("ai-estimate-sources");
  const { data: signed, error: signError } = await bucket.createSignedUploadUrl(path);
  checked(signError, "Create signed upload URL");
  assert.ok(signed);
  storagePaths.push(path);
  const { error: uploadError } = await bucket.uploadToSignedUrl(path, signed.token, bytes, { contentType: mimeType });
  checked(uploadError, "Upload synthetic bytes through Storage API");
  const { data: objects, error: listError } = await bucket.list(`${owner.orgId}/${sourceId}`, { limit: 10 });
  checked(listError, "Inspect uploaded object metadata");
  const object = objects?.find((item) => item.name === `original.${extension}`);
  assert.equal(Number(object?.metadata?.size), bytes.length, "Uploaded byte size must match completion validation");
  assert.equal(object?.metadata?.mimetype, mimeType, "Uploaded MIME must match completion validation");
  const { data: download, error: downloadError } = await bucket.createSignedUrl(path, 60);
  checked(downloadError, "Create authorized original preview");
  assert.ok(download);
  const response = await fetch(download.signedUrl);
  assert.equal(response.status, 200, "Signed original preview must load");
  assert.ok(Buffer.from(await response.arrayBuffer()).equals(bytes), "Storage must preserve fixture bytes");
  const { error: processingError } = await owner.client.from("ai_estimate_sources").update({ status: "processing" }).eq("id", sourceId);
  checked(processingError, "Mark verified upload complete");
  const { error: scaffoldError } = await admin.rpc("ai_estimate_prepare_manual_review", {
    p_source_id: sourceId, p_extraction: manualReviewScaffold("Synthetic upload review"),
  });
  checked(scaffoldError, "Prepare manual review without external provider");
  const prepared = await detail(owner.client, sourceId);
  assert.equal(prepared.status, "review_required");
  assert.equal(rows(prepared.ai_estimate_jobs)[0]?.status, "needs_review");
  assert.equal(rows(prepared.ai_estimate_extractions).length, 1);
  const { data: savedReview, error: reviewError } = await owner.client.rpc("ai_estimate_save_review", {
    p_source_id: sourceId, p_extraction: review, p_expected_updated_at: prepared.updated_at,
  });
  checked(reviewError, "Save human review over PostgREST");
  const reviewed = await detail(owner.client, sourceId);
  assert.equal(rows(reviewed.ai_estimate_extractions)[0]?.source_of_truth, "human");
  assert.equal(savedReview?.updatedAt, reviewed.updated_at, "Review RPC must return its own atomic source revision");
  const { data: exampleId, error: approvalError } = await owner.client.rpc("ai_estimate_approve_source", {
    p_source_id: sourceId, p_extraction: review, p_expected_updated_at: savedReview.updatedAt,
  });
  checked(approvalError, "Approve human review over PostgREST");
  assert.ok(exampleId);
  const approved = await detail(owner.client, sourceId);
  assert.equal(approved.status, "approved");
  assert.equal(rows(approved.ai_estimate_jobs)[0]?.status, "approved");
  return { sourceId, exampleId: String(exampleId), path };
}

async function main() {
  const owner = await actor("owner");
  const member = await actor("member");
  const outsider = await actor("outsider");
  const { error: membershipError } = await admin.from("organization_members").insert({ organization_id: owner.orgId, user_id: member.id, role: "member" });
  checked(membershipError, "Add synthetic organization member");
  const { error: settingsError } = await owner.client.from("ai_estimate_settings").upsert({ organization_id: owner.orgId,
    enabled: true, allow_private_sources: true, allow_external_processing: false });
  checked(settingsError, "Configure manual-only organization policy");
  const shared = await upload(owner, syntheticPdf(), "application/pdf", "organization");
  const privateSource = await upload(owner, png, "image/png", "private");
  const { error: forgedPathError } = await owner.client.from("ai_estimate_sources")
    .update({ storage_path: `${outsider.orgId}/${shared.sourceId}/original.pdf` }).eq("id", shared.sourceId).select("id");
  assert.ok(forgedPathError, "Direct source PATCH cannot point a service worker at another organization's file");
  const { data: preservedPath, error: pathReadError } = await owner.client.from("ai_estimate_sources").select("storage_path").eq("id", shared.sourceId).single();
  checked(pathReadError, "Verify forged path was not stored");
  assert.equal(preservedPath?.storage_path, shared.path);
  const memberDetail = await detail(member.client, shared.sourceId);
  assert.equal(memberDetail.status, "approved", "Member can read shared approved source");
  assert.equal(rows(memberDetail.ai_estimate_extractions).length, 0, "Member cannot read another person's editable extraction");
  const { data: evidence, error: evidenceError } = await member.client.from("ai_estimate_examples")
    .select("id,ai_estimate_example_lines(name,qty,unit_price)").eq("source_id", shared.sourceId).single();
  checked(evidenceError, "Member reads shared approved evidence and lines");
  assert.equal(evidence?.ai_estimate_example_lines.length, 1);
  for (const client of [member.client, outsider.client]) {
    const { data, error } = await client.from("ai_estimate_sources").select("id").eq("id", privateSource.sourceId);
    checked(error, "Query private-source boundary");
    assert.equal(data?.length, 0, "Other accounts must not see a private source");
    const { error: fileError } = await client.storage.from("ai-estimate-sources").createSignedUrl(privateSource.path, 60);
    assert.ok(fileError, "Other accounts must not obtain the private original URL");
  }
  const { error: unauthorizedApproval } = await member.client.rpc("ai_estimate_approve_source", {
    p_source_id: shared.sourceId, p_extraction: review, p_expected_updated_at: memberDetail.updated_at,
  });
  assert.equal(unauthorizedApproval?.code, "42501", "Member cannot approve sources");
  const { error: excludedError } = await owner.client.from("ai_estimate_sources").update({ status: "excluded" }).eq("id", shared.sourceId);
  checked(excludedError, "Exclude approved source");
  const excluded = await detail(owner.client, shared.sourceId);
  assert.equal(rows(excluded.ai_estimate_jobs)[0]?.status, "rejected");
  const { data: removed, error: removedError } = await member.client.from("ai_estimate_examples").select("id").eq("source_id", shared.sourceId);
  checked(removedError, "Verify exclusion invalidates shared evidence");
  assert.equal(removed?.length, 0);
  const { error: restoredError } = await owner.client.from("ai_estimate_sources").update({ status: "review_required" }).eq("id", shared.sourceId);
  checked(restoredError, "Restore excluded source for review");
  const restored = await detail(owner.client, shared.sourceId);
  assert.equal(restored.status, "review_required");
  assert.equal(rows(restored.ai_estimate_jobs)[0]?.status, "needs_review");
  assert.equal(rows(restored.ai_estimate_extractions)[0]?.source_of_truth, "human", "Restoring must retain reviewed input");
  const { error: reapprovalError } = await owner.client.rpc("ai_estimate_approve_source", {
    p_source_id: shared.sourceId, p_extraction: review, p_expected_updated_at: restored.updated_at,
  });
  checked(reapprovalError, "Reapprove restored source");
  process.stdout.write("QA API smoke passed: PDF + PNG upload/preview, manual review, approval, explicit relationships, forged-path rejection, member/private boundaries, exclude/restore/reapprove.\n");
}

async function cleanup() {
  const failures: string[] = [];
  if (storagePaths.length) {
    const { error } = await admin.storage.from("ai-estimate-sources").remove(storagePaths);
    if (error) failures.push("storage");
  }
  if (fixtureSources.length) {
    const { error } = await admin.from("ai_estimate_sources").delete().in("id", fixtureSources);
    if (error) failures.push("sources");
  }
  for (const orgId of organizationIds) {
    const { error } = await admin.from("organizations").delete().eq("id", orgId);
    if (error) failures.push("organizations");
  }
  for (const userId of actorIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) failures.push("accounts");
  }
  assert.equal(failures.length, 0, `Synthetic fixture cleanup failed: ${[...new Set(failures)].join(", ")}`);
  process.stdout.write("Synthetic accounts, organizations, sources, and storage objects cleaned up.\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "QA API smoke failed"}\n`);
  process.exitCode = 1;
}).finally(cleanup).catch(() => {
  process.stderr.write("Synthetic fixture cleanup needs attention.\n");
  process.exitCode = 1;
});
