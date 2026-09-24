import assert from "node:assert/strict";
import test from "node:test";
import { FileState } from "@google/genai";
import { normalizeVector, GeminiBatchError, GeminiEstimateProvider, type GeminiProviderClient } from "./gemini";

test("공급자 벡터의 크기와 유한성을 검증하고 정규화한다", () => {
  assert.throws(() => normalizeVector([1, 2]));
  assert.throws(() => normalizeVector(Array(1536).fill(0)));
  assert.throws(() => normalizeVector(Array(1536).fill(Infinity)));
  const result = normalizeVector(Array(1536).fill(1));
  assert.ok(Math.abs(Math.sqrt(result.reduce((sum, x) => sum + x * x, 0)) - 1) < 1e-10);
});


function hangUntilAborted(signal: AbortSignal | undefined): Promise<never> {
  assert.ok(signal, "Provider request must have a timeout signal");
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error("Provider request was not cancelled")), 1_000);
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
const testEnv = { apiKey: "synthetic-offline-key", extractionModel: "synthetic", retryModel: "synthetic", embeddingModel: "synthetic" };
const testInput = { data: new Blob(["Synthetic"]), mimeType: "application/pdf", displayName: "Synthetic", pageCount: 1, model: "synthetic" };

test("추출 전체 기한을 업로드·조회·생성에 공유하고 정리도 별도 기한으로 종료한다", async () => {
  const requestSignals: AbortSignal[] = [];
  let cleanupSignal: AbortSignal | undefined;
  const client: GeminiProviderClient = {
    files: {
      upload: async ({ config }) => { requestSignals.push(config!.abortSignal!); return { name: "files/synthetic", uri: "https://example.invalid/file", mimeType: "application/pdf", state: FileState.PROCESSING }; },
      get: async ({ config }) => { requestSignals.push(config!.abortSignal!); return { name: "files/synthetic", uri: "https://example.invalid/file", mimeType: "application/pdf", state: FileState.ACTIVE }; },
      delete: async ({ config }) => {
        cleanupSignal = config!.abortSignal;
        assert.equal(cleanupSignal?.aborted, false, "Cleanup receives a fresh deadline after operation timeout");
        return hangUntilAborted(cleanupSignal);
      },
    },
    models: {
      generateContent: async ({ config }) => { requestSignals.push(config!.abortSignal!); return hangUntilAborted(config!.abortSignal); },
      embedContent: async () => { throw new Error("Unexpected embedding request"); },
    },
  };
  const provider = new GeminiEstimateProvider(testEnv, { client, operationTimeoutMs: 50, cleanupTimeoutMs: 10, pollIntervalMs: 1 });
  await assert.rejects(provider.extract(testInput), (error: unknown) => error instanceof GeminiBatchError && error.errorClass === "timeout" && error.retryable);
  assert.equal(requestSignals.length, 3);
  assert.ok(requestSignals.every((signal) => signal.aborted), "All stages share the expired operation deadline");
  assert.ok(cleanupSignal?.aborted, "Hanging file cleanup is bounded independently");
});

test("업로드 정체도 전체 추출 기한에 취소한다", async () => {
  let cleanupCalled = false;
  const client: GeminiProviderClient = {
    files: {
      upload: async ({ config }) => hangUntilAborted(config?.abortSignal),
      get: async () => { throw new Error("Unexpected file poll"); },
      delete: async () => { cleanupCalled = true; return {}; },
    },
    models: {
      generateContent: async () => { throw new Error("Unexpected generation request"); },
      embedContent: async () => { throw new Error("Unexpected embedding request"); },
    },
  };
  await assert.rejects(new GeminiEstimateProvider(testEnv, { client, operationTimeoutMs: 10 }).extract(testInput),
    (error: unknown) => error instanceof GeminiBatchError && error.errorClass === "timeout");
  assert.equal(cleanupCalled, false, "An upload without a returned file name has no file to delete");
});

test("임베딩도 개별 요청 한도보다 짧은 전체 작업 기한을 따른다", async () => {
  const client: GeminiProviderClient = {
    files: {
      upload: async () => { throw new Error("Unexpected upload"); },
      get: async () => { throw new Error("Unexpected poll"); },
      delete: async () => ({}),
    },
    models: {
      generateContent: async () => { throw new Error("Unexpected generation"); },
      embedContent: async ({ config }) => hangUntilAborted(config?.abortSignal),
    },
  };
  const provider = new GeminiEstimateProvider(testEnv, { client });
  await assert.rejects(provider.embed("Synthetic approved text", AbortSignal.timeout(10)),
    (error: unknown) => error instanceof GeminiBatchError && error.errorClass === "timeout");
});

test("완료되지 않은 Gemini 문서 응답은 JSON이 있어도 승인 후보로 반환하지 않는다", async () => {
  for (const finishReason of ["MAX_TOKENS", "SAFETY"] as const) {
    let deleted = false;
    const client: GeminiProviderClient = {
      files: { upload: async () => ({ name: "files/synthetic", uri: "https://example.invalid/file", mimeType: "application/pdf", state: FileState.ACTIVE }),
        get: async () => { throw new Error("Unexpected poll"); }, delete: async () => { deleted = true; return {}; } },
      models: { generateContent: async () => ({ candidates: [{ finishReason }], text: "{}" } as unknown as Awaited<ReturnType<GeminiProviderClient["models"]["generateContent"]>>),
        embedContent: async () => { throw new Error("Unexpected embedding"); } },
    };
    await assert.rejects(new GeminiEstimateProvider(testEnv, { client }).extract(testInput),
      (error: unknown) => error instanceof GeminiBatchError && error.code === (finishReason === "SAFETY" ? "extraction_refused" : "incomplete_response") && error.retryable === (finishReason === "MAX_TOKENS"));
    assert.equal(deleted, true);
  }
});
