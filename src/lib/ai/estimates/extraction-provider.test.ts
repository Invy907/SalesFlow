import assert from "node:assert/strict";
import test from "node:test";
import { AnthropicEstimateProvider, anthropicExtractionSchema, extractionConfig } from "./extraction-provider";
import { GEMINI_EXTRACTION_RESPONSE_SCHEMA } from "./batch/extraction-schema";
import { GeminiBatchError } from "./batch/gemini";
const config = { provider: "anthropic" as const, model: "claude-opus-5-5", apiKey: "sk-ant-synthetic-offline-key-only" };
const input = { data: new Blob(["%PDF-synthetic"]), mimeType: "application/pdf", displayName: "Synthetic", pageCount: 1, model: config.model, documentKind: "design" as const };
const extracted = { schemaVersion: "2.0.0", documentKind: "design", workDetails: "Build three screens.", assumptions: "Desktop only", exclusions: "Hosting",
  document: { estimateNumber: "", issueDate: "", validUntil: "", currency: "JPY", language: "en" },
  supplier: { name: "", businessNumber: "", contactName: "" }, customer: { name: "", businessNumber: "", contactName: "" },
  totals: { printedSubtotal: null, printedDiscount: null, printedTax: null, printedTotal: null, taxMode: "unknown" },
  lines: [], tableRecognitionFailed: false, confidence: 0.9, notes: [], warnings: [] };
const response = (stop_reason = "end_turn", value: unknown = extracted) => ({ stop_reason, content: [{ type: "text", text: JSON.stringify(value) }], usage: { input_tokens: 10, output_tokens: 20 } });

test("추출 공급자 선택은 명시값을 존중하고 Claude/Gemini 설정을 분리한다", () => {
  assert.equal(extractionConfig({ ANTHROPIC_API_KEY: config.apiKey })?.provider, "anthropic");
  assert.equal(extractionConfig({ ANTHROPIC_API_KEY: config.apiKey, AI_ESTIMATE_EXTRACTION_PROVIDER: "gemini" }), null);
  assert.equal(extractionConfig({ GEMINI_API_KEY: "AIza-synthetic-offline-key-value", AI_ESTIMATE_GENERATION_PROVIDER: "openai" })?.provider, "gemini");
  assert.equal(extractionConfig({ ANTHROPIC_API_KEY: "placeholder" }), null);
});
test("Claude 추출 schema는 nullable union 상한을 넘지 않고 모든 객체를 닫는다", () => {
  const schema = anthropicExtractionSchema(GEMINI_EXTRACTION_RESPONSE_SCHEMA);
  let unions = 0;
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const node = value as Record<string, unknown>;
    if (Array.isArray(node.type)) unions++;
    if (node.type === "object") assert.equal(node.additionalProperties, false);
    assert.equal(node.nullable, undefined); assert.equal(node.propertyOrdering, undefined);
    Object.values(node).forEach(visit);
  };
  visit(schema); assert.ok(unions <= 16); assert.ok(unions > 0);
});
test("Claude PDF Messages 요청과 unknown-text 변환·원본·사용량을 검증한다", async () => {
  let calls = 0;
  const provider = new AnthropicEstimateProvider(config, async (url, init) => {
    calls++; assert.equal(url, "https://api.anthropic.com/v1/messages"); assert.ok(init?.signal);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.messages[0].content[0].type, "document");
    assert.equal(body.messages[0].content[0].source.media_type, "application/pdf");
    assert.equal(Buffer.from(body.messages[0].content[0].source.data, "base64").toString(), "%PDF-synthetic");
    assert.equal(body.messages[0].content[0].citations, undefined);
    assert.equal(body.output_config.format.type, "json_schema");
    assert.match(body.system, /untrusted/);
    return Response.json(response());
  });
  const result = await provider.extract(input);
  assert.equal(calls, 1); assert.equal(result.result.document.issueDate, null);
  assert.deepEqual(result.rawOutput, extracted); assert.equal(result.inputTokens, 10);
  assert.equal(result.result.workDetails, "Build three screens.");
});
test("Claude 이미지는 image 블록, 불완전·거절·오류응답은 결과로 저장하지 않는다", async () => {
  const provider = new AnthropicEstimateProvider(config, async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).messages[0].content[0].type, "image");
    return Response.json(response());
  });
  await provider.extract({ ...input, mimeType: "image/png" });
  for (const stop of ["refusal", "max_tokens", "tool_use"]) await assert.rejects(new AnthropicEstimateProvider(config, async () => Response.json(response(stop))).extract(input),
    (error: unknown) => error instanceof GeminiBatchError && error.code === (stop === "refusal" ? "extraction_refused" : "incomplete_response"));
  await assert.rejects(new AnthropicEstimateProvider(config, async () => Response.json({ secret: config.apiKey }, { status: 401 })).extract(input),
    (error: unknown) => error instanceof GeminiBatchError && !error.retryable && !error.message.includes(config.apiKey));
  await assert.rejects(new AnthropicEstimateProvider(config, async () => Response.json(response("end_turn", { ...extracted, workDetails: "a".repeat(16001) }))).extract(input),
    (error: unknown) => error instanceof GeminiBatchError && error.code === "schema_failed");
});

test("Claude 인코딩 이미지10MiB 경계는 초과시 네트워크 호출 전에 수동검수 오류로 반환한다", async () => {
  let calls = 0;
  const provider = new AnthropicEstimateProvider(config, async () => { calls++; return Response.json(response()); });
  const rawBoundary = (10 * 1024 * 1024 / 4) * 3;
  await provider.extract({ ...input, mimeType: "image/png", data: new Blob([new Uint8Array(rawBoundary)]) });
  assert.equal(calls, 1);
  await assert.rejects(provider.extract({ ...input, mimeType: "image/png", data: new Blob([new Uint8Array(rawBoundary + 1)]) }),
    (error: unknown) => error instanceof GeminiBatchError && error.code === "image_size_limit" && !error.retryable && /PDF/.test(error.message));
  assert.equal(calls, 1);
});
