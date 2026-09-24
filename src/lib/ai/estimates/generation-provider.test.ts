import assert from "node:assert/strict";
import test from "node:test";
import { AiGenerationError, generationConfig, requestGeneratedEstimate, type GenerationConfig } from "./generation-provider";
import { aiDraftRequestSchema, aiEstimateExtractionSchema, aiEstimateLineSchema, aiMarketResearchItemSchema } from "./schemas";

const generated = { subject: "ウェブサイト制作", lines: [{ name: "デザイン", qty: 2, unit: "ページ", unitPrice: 20000,
  taxCategory: "standard_10", confidence: 0.8, reason: "過去実績" }], templateMessage: "", remarks: "", evidenceIndexes: [0], warnings: [] };
const config: GenerationConfig = { provider: "openai", apiKey: "sk-synthetic-key-for-offline-contract", model: "gpt-5.4-mini" };
const response = (value: unknown, status = 200): typeof fetch => async () => Response.json(value, { status });
const openai = (value: unknown = generated) => ({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] });

test("provider selection is explicit, placeholder-safe and deterministic", () => {
  assert.equal(generationConfig({ OPENAI_API_KEY: "your-key" }), null);
  assert.equal(generationConfig({ GEMINI_API_KEY: "AIza" }), null);
  assert.equal(generationConfig({ AI_ESTIMATE_GENERATION_PROVIDER: "unknown", OPENAI_API_KEY: config.apiKey }), null);
  assert.equal(generationConfig({ AI_ESTIMATE_GENERATION_PROVIDER: "gemini", OPENAI_API_KEY: config.apiKey }), null);
  assert.equal(generationConfig({ OPENAI_API_KEY: config.apiKey })?.provider, "openai");
  assert.equal(generationConfig({ GEMINI_API_KEY: "AIza-synthetic-offline-test-value", OPENAI_API_KEY: config.apiKey })?.provider, "gemini");
  assert.equal(generationConfig({ AI_ESTIMATE_GENERATION_PROVIDER: "openai", GEMINI_API_KEY: "AIza-synthetic-offline-test-value", OPENAI_API_KEY: config.apiKey })?.provider, "openai");
});
test("OpenAI Responses contract uses strict schema, no response storage and bounded request", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${config.apiKey}`);
    assert.ok(init?.signal);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.match(body.instructions, /untrusted/);
    assert.equal(body.input, JSON.stringify({ request: "デザイン" }));
    return Response.json(openai());
  };
  assert.deepEqual((await requestGeneratedEstimate(config, { request: "デザイン" }, transport)).generated, generated);
  assert.equal(calls, 1);
});
test("Gemini contract keeps credentials out of URLs and ignores thought parts", async () => {
  const gemini = { ...config, provider: "gemini" as const, apiKey: "AIza-synthetic-offline-test-value", model: "gemini-3.8-flash" };
  const transport: typeof fetch = async (url, init) => {
    assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
    assert.equal(String(url).includes(gemini.apiKey), false);
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), gemini.apiKey);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.generationConfig.responseFormat.text.mimeType, "application/json");
    assert.equal(body.generationConfig.responseFormat.text.schema.additionalProperties, false);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "ignore" }, { text: JSON.stringify(generated) }] } }] });
  };
  assert.deepEqual((await requestGeneratedEstimate(gemini, {}, transport)).generated, generated);
});
test("explicit Anthropic selection never switches provider and preserves existing OpenAI configuration", () => {
  const env = { GEMINI_API_KEY: "AIza-synthetic-offline-test-value", ANTHROPIC_API_KEY: "sk-ant-synthetic-offline-contract-value", OPENAI_API_KEY: config.apiKey };
  assert.equal(generationConfig(env, "anthropic")?.provider, "anthropic");
  assert.equal(generationConfig({ GEMINI_API_KEY: env.GEMINI_API_KEY }, "anthropic"), null);
  assert.equal(generationConfig({ ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY }, "gemini"), null);
  assert.equal(generationConfig({ ...env, AI_ESTIMATE_GENERATION_PROVIDER: "openai" }, "auto")?.provider, "openai");
});
test("Anthropic Messages contract projects supported schema and retains application validation", async () => {
  const anthropic: GenerationConfig = { provider: "anthropic", model: "claude-opus-5-5", apiKey: "sk-ant-synthetic-offline-contract-value", workspaceId: "wrkspc_synthetic" };
  const transport: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(new Headers(init?.headers).get("anthropic-version"), "2023-06-01");
    assert.equal(new Headers(init?.headers).get("anthropic-workspace-id"), "wrkspc_synthetic");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.output_config.format.type, "json_schema");
    assert.equal(body.output_config.format.schema.properties.lines.items.properties.qty.maximum, undefined);
    assert.equal(body.output_config.format.schema.properties.subject.maxLength, undefined);
    assert.equal(body.output_config.format.schema.properties.lines.maxItems, undefined);
    assert.equal(body.output_config.format.schema.additionalProperties, false);
    assert.equal(body.temperature, undefined);
    assert.equal(body.messages[0].content[0].text, "{}");
    return Response.json({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "hidden" }, { type: "text", text: JSON.stringify(generated) }] });
  };
  assert.deepEqual((await requestGeneratedEstimate(anthropic, {}, transport)).generated, generated);
  for (const [stop_reason, code] of [["refusal", "refused"], ["max_tokens", "incomplete"], ["tool_use", "incomplete"]] as const) {
    await assert.rejects(requestGeneratedEstimate(anthropic, {}, response({ stop_reason, content: [] })), (error: unknown) => error instanceof AiGenerationError && error.code === code);
  }
  await assert.rejects(requestGeneratedEstimate(anthropic, {}, response({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ ...generated, subject: "a".repeat(71) }) }] })), { code: "invalid_output" });
});
for (const [name, payload, code] of [
  ["refusal", { status: "completed", output: [{ content: [{ type: "refusal", refusal: "No" }] }] }, "refused"],
  ["partial response", { status: "incomplete", output: [] }, "incomplete"],
  ["malformed output collection", { status: "completed", output: {} }, "invalid_output"],
  ["empty text", { status: "completed", output: [{ content: [null, 42] }] }, "invalid_output"],
  ["null payload", null, "invalid_output"],
  ["invalid line quantity", openai({ ...generated, lines: [{ ...generated.lines[0], qty: 0 }] }), "invalid_output"],
  ["invented tax enum", openai({ ...generated, lines: [{ ...generated.lines[0], taxCategory: "vat_20" }] }), "invalid_output"],
] as const) test(`provider rejects ${name} without leaking payload`, async () => {
  await assert.rejects(requestGeneratedEstimate(config, {}, response(payload)), (err: unknown) => err instanceof AiGenerationError && err.code === code);
});
test("provider errors never leak upstream response bodies or keys", async () => {
  await assert.rejects(requestGeneratedEstimate(config, {}, response({ secret: config.apiKey }, 429)), { message: "AI_GENERATION_RATE_LIMIT" });
  await assert.rejects(requestGeneratedEstimate(config, {}, response({ internal: "provider-detail" }, 500)), { message: "AI_GENERATION_PROVIDER" });
  await assert.rejects(requestGeneratedEstimate(config, {}, async () => { throw new Error(config.apiKey); }), { message: "AI_GENERATION_NETWORK" });
});
test("oversized model context is rejected before any transport call", async () => {
  let called = false;
  await assert.rejects(requestGeneratedEstimate(config, { value: "x".repeat(120001) }, async () => { called = true; return Response.json({}); }),
    (error: unknown) => error instanceof AiGenerationError && error.code === "context_limit");
  assert.equal(called, false);
});
test("strict numeric inputs reject empty, null and booleans but preserve signed discount prices", () => {
  const line = generated.lines[0];
  for (const value of ["", " ", null, true, false, NaN, Infinity]) assert.equal(aiEstimateLineSchema.safeParse({ ...line, unitPrice: value }).success, false);
  assert.equal(aiEstimateLineSchema.parse({ ...line, unitPrice: "-500", qty: "1.125" }).unitPrice, -500);
  assert.equal(aiEstimateLineSchema.safeParse({ ...line, qty: 1.12345 }).success, false);
  assert.equal(aiEstimateLineSchema.safeParse({ ...line, qty: 1000000 }).success, false);
});
test("requests need work context and an explicit public query for market research", () => {
  const request = { clientId: null, clientName: "Example Co.", subject: "", workDescription: "" };
  assert.equal(aiDraftRequestSchema.safeParse(request).success, false);
  assert.equal(aiDraftRequestSchema.safeParse({ ...request, workDescription: "デザイン", useWebMarketResearch: true }).success, false);
  assert.equal(aiDraftRequestSchema.safeParse({ ...request, workDescription: "デザイン", useWebMarketResearch: true, publicSearchQuery: "ウェブ制作 価格" }).success, true);
});
test("foreign currency source and reversed market ranges are not silently accepted", () => {
  const extraction = { ...generated, clientName: "", issueDate: null, rawText: "", confidence: 1, currency: "USD", taxMode: "excluded" };
  assert.equal(aiEstimateExtractionSchema.safeParse(extraction).success, false);
  assert.equal(aiMarketResearchItemSchema.safeParse({ name: "Design", unit: "page", lowPrice: 300, medianPrice: 100, highPrice: 200, basis: "" }).success, false);
});
