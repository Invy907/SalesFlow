import assert from "node:assert/strict";
import test from "node:test";
import { runExtractionBatch } from "./runner";
import type { AiEstimateBatchRepository, BatchSource, ExtractionPersistence } from "./repository";
import type { BatchEnv } from "./env";
import { makeExtractionProvider } from "../extraction-provider";
const env: BatchEnv = { organizationId: "synthetic-org", actorUserId: "synthetic-user", sourceDir: null, storageBucket: "synthetic", supabaseUrl: "https://example.invalid",
  supabaseServiceRoleKey: "synthetic", concurrency: 1, maxRetry: 3, confidenceThreshold: 0.8, totalToleranceMinorUnits: 1, inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 };
const modelEnv = { apiKey: "", extractionModel: "local", retryModel: "local", embeddingModel: "unused" };
function repositoryFor(text: string) {
  let claimed = false, saved: ExtractionPersistence | null = null, failureCode = "", manual = "";
  const permissions: boolean[] = [];
  const source: BatchSource = { id: "synthetic-source", organization_id: env.organizationId, title: "Rates", document_kind: "price_list", storage_path: null,
    mime_type: "text/csv", page_count: null, status: "processing", visibility: "organization", uploaded_by: env.actorUserId! };
  const repository = {
    assertProcessingAllowed: async (_source?: BatchSource, requiresExternal = false) => { permissions.push(requiresExternal); if (requiresExternal) throw new Error("External processing disabled"); },
    createRun: async () => "synthetic-run", queueJobs: async () => 1,
    claimJobs: async () => { if (claimed) return []; claimed = true; return [{ id: "job", organization_id: env.organizationId, source_id: source.id, status: "extracting", attempt: 1, max_attempt: 3, last_run_id: "synthetic-run" }]; },
    getSource: async () => source, downloadSource: async () => new Blob([text]),
    advanceJobStatus: async (job: object, status: string) => ({ ...job, status }),
    recordExtraction: async (value: ExtractionPersistence) => { saved = value; return true; },
    recordFailure: async (value: { error: { code: string } }) => { failureCode = value.error.code; },
    prepareManualReview: async (_source: BatchSource, warning: string) => { manual = warning; },
    finishRun: async () => undefined,
  } as unknown as AiEstimateBatchRepository;
  return { repository, permissions, saved: () => saved, failure: () => failureCode, manual: () => manual };
}
test("키·외부 동의 없는 CSV도 durable job에서 local provenance로 검수까지 처리한다", async () => {
  const fake = repositoryFor("Item,Unit,Unit price,Tax rate\nScreen,page,10000,10%");
  const result = await runExtractionBatch(fake.repository, makeExtractionProvider(null), env, modelEnv, { command: "ingest", limit: 1, all: false, resume: false, sourceId: "synthetic-source" });
  assert.equal(result.succeeded, 1); assert.ok(fake.permissions.every((external) => external === false));
  assert.equal(fake.saved()?.provider, "local"); assert.equal(fake.saved()?.reviewExtraction.documentKind, "price_list");
  assert.equal(fake.saved()?.reviewExtraction.lines[0].unitPrice, 10000);
  assert.equal(fake.saved()?.inputTokens, 0);
});
test("CSV 실패는 부분 추출을 저장하지 않고 수동 검수 안내로 전환한다", async () => {
  const fake = repositoryFor("Item,Unit,Unit price,Tax rate\nScreen,page,0,10%");
  const result = await runExtractionBatch(fake.repository, makeExtractionProvider(null), env, modelEnv, { command: "ingest", limit: 1, all: false, resume: false, sourceId: "synthetic-source" });
  assert.equal(result.failed, 1); assert.equal(fake.saved(), null); assert.equal(fake.failure(), "LOCAL_INVALID_NUMBER");
  assert.match(fake.manual(), /직접 입력/);
});
