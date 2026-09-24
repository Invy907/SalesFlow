import assert from "node:assert/strict";
import test from "node:test";
import { composeGroundedDraft } from "../../../src/lib/ai/estimates/draft-workflow";
import { buildAiEstimateGenerationContext, type AiGeneratedEstimate } from "../../../src/lib/ai/estimates/generation-core";
import type { EstimateExtractionResult } from "../../../src/lib/ai/estimates/batch/extraction-schema";
import { parseLocalDocument } from "../../../src/lib/ai/estimates/local-document-parser";
import { AiGenerationError } from "../../../src/lib/ai/estimates/generation-provider";
import { GeminiBatchError } from "../../../src/lib/ai/estimates/batch/gemini";
import { extractionChecks, generationChecks, redactReport, safeError } from "./checks";
import { buildScenario, evidenceFromExtraction, loadFixtures, type FixtureData } from "./scenarios";
import { runOfflineChecks } from "./offline";

const config = { provider: "gemini" as const, model: "synthetic-mock-only" };
const proposal = (): AiGeneratedEstimate => ({ subject: "Provider title", templateMessage: "", remarks: "", warnings: [], evidenceIndexes: [0],
  lines: [
    { name: "Design", qty: 5, unit: "screen", unitPrice: 50000, taxCategory: "standard_10", confidence: 0.9, reason: "Approved catalogue", quantityReason: "Five distinct screens; PC and mobile are variants of each screen." },
    { name: "Development", qty: 5, unit: "screen", unitPrice: 80000, taxCategory: "standard_10", confidence: 0.9, reason: "Approved catalogue", quantityReason: "Five distinct screens; PC and mobile are variants of each screen." },
  ] });
const pdfExtraction = (): EstimateExtractionResult => ({ schemaVersion: "2.0.0", documentKind: "estimate", workDetails: "", assumptions: "", exclusions: "",
  document: { estimateNumber: "SYN-EST-003", issueDate: "2026-01-15", validUntil: "2026-02-14", currency: "JPY", language: "en" },
  supplier: { name: "Fictional Supplier", businessNumber: null, contactName: null },
  customer: { name: "Fictional Example Client", businessNumber: null, contactName: null },
  totals: { printedSubtotal: 390000, printedDiscount: null, printedTax: 39000, printedTotal: 429000, taxMode: "excluded" },
  lines: [
    { lineNumber: 1, rawItemName: "Design", rawUnit: "screen", quantity: 3, unitPrice: 50000, printedAmount: 150000, printedTaxRatePercent: 10, specification: null, description: null, confidence: 0.9 },
    { lineNumber: 2, rawItemName: "Development", rawUnit: "screen", quantity: 3, unitPrice: 80000, printedAmount: 240000, printedTaxRatePercent: 10, specification: null, description: null, confidence: 0.9 },
  ], confidence: 0.9, tableRecognitionFailed: false, notes: [], warnings: [] });
let cachedFixtures: FixtureData | undefined;
async function fixtures() { return cachedFixtures ??= await loadFixtures(); }
async function validModelResult() {
  const scenario = buildScenario("rate-en", await fixtures());
  const raw = proposal();
  const result = await composeGroundedDraft({ ...scenario, priceAnchors: [], minimumSamples: 3, retrievalMode: "local", allowExternalProcessing: true,
    generate: async () => ({ generated: raw, ...config }) });
  return { scenario, raw, result };
}

test("fixture loading and the entire offline preflight perform no external requests", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; throw new Error("NETWORK_FORBIDDEN_IN_TEST"); });
  const data = await fixtures();
  assert.equal(data.pdf.subarray(0, 5).toString(), "%PDF-");
  assert.match(data.hashes["estimate.pdf"], /^[a-f0-9]{64}$/);
  assert.equal(data.evidence["design-ja.md"].documentKind, "design");
  const checks = await runOfflineChecks(data);
  assert.equal(requests, 0);
  assert.ok(checks.length >= 40, "preflight includes fixture, parser, policy and grounding checks");
  assert.deepEqual(checks.filter(item => !item.passed), []);
});

test("preflight detects altered raw fixture amounts with literal expectations", async () => {
  const tampered = structuredClone(await fixtures());
  tampered.extractions["rate-card-ja.csv"].lines[0].unitPrice = 55000;
  const checks = await runOfflineChecks(tampered);
  assert.equal(checks.find(item => item.name === "local.rate-card-ja.csv.raw_values")?.passed, false);
  assert.equal(checks.find(item => item.name === "local.rate-card-ja.csv.independent_totals")?.passed, false);
});

test("generation validator accepts the genuine grounded fixture result", async () => {
  const { scenario, raw, result } = await validModelResult();
  assert.deepEqual(generationChecks(scenario, result, raw, config).filter(item => !item.passed), []);
});

test("a successful local fallback is a failed LIVE provider check", async () => {
  const scenario = buildScenario("rate-en", await fixtures());
  const result = await composeGroundedDraft({ ...scenario, priceAnchors: [], minimumSamples: 3, retrievalMode: "local", allowExternalProcessing: true,
    generate: async () => { throw new AiGenerationError("network"); } });
  assert.equal(result.generationMode, "local");
  assert.deepEqual(result.draft.lines.map(line => line.qty), [1, 1]);
  assert.equal(generationChecks(scenario, result, undefined, config).find(item => item.name === "provider.actual_model_success")?.passed, false);
});

test("generation validator rejects another provider/model and historical quantity reused as current scope", async () => {
  const { scenario, raw, result } = await validModelResult();
  result.provider = "unexpected-provider";
  result.model = "unexpected-model";
  result.draft.lines[0].qty = 3;
  const checks = generationChecks(scenario, result, raw, config);
  assert.equal(checks.find(item => item.name === "provider.actual_model_success")?.passed, false);
  assert.equal(checks.find(item => item.name === "line.Design.values")?.passed, false);
  assert.equal(checks.find(item => item.name === "draft.totals")?.passed, false);
});

test("generation validator rejects forged price and context source citations", async () => {
  const { scenario, raw, result } = await validModelResult();
  result.draft.evidence[0].sourceId = "00000000-0000-4000-8000-000000009991";
  assert.ok(generationChecks(scenario, result, raw, config).some(item => !item.passed), "forged price source must fail");
  const second = await validModelResult();
  second.result.draft.contextEvidence![0].sourceId = "00000000-0000-4000-8000-000000009992";
  assert.ok(generationChecks(second.scenario, second.result, second.raw, config).some(item => !item.passed), "forged scope source must fail");
});

test("generation validator rejects a price line attributed to another selected example", async () => {
  const { scenario, raw, result } = await validModelResult();
  const other = structuredClone(scenario.evidence[0]);
  other.sourceId = "00000000-0000-4000-8000-000000009993";
  other.exampleId = "00000000-0000-4000-8000-000000009994";
  other.lines.forEach((line, index) => { line.id = `00000000-0000-4000-8000-00000000999${index + 5}`; });
  scenario.evidence.push(other);
  result.draft.lines[0].evidenceExampleIds = [other.exampleId];
  assert.equal(generationChecks(scenario, result, raw, config).find(item => item.name === "line.Design.provenance")?.passed, false);
});

test("generation validator rejects unrequested priced items even when expected totals would otherwise match", async () => {
  const { scenario, raw, result } = await validModelResult();
  result.draft.lines.push({ ...structuredClone(result.draft.lines[0]), name: "Hosting", qty: 1, unitPrice: 999999 });
  assert.equal(generationChecks(scenario, result, raw, config).find(item => item.name === "draft.no_unrequested_priced_items")?.passed, false);
});

test("PDF extraction checks independently reject changed line values, tax mode and printed total", () => {
  const value = pdfExtraction();
  assert.deepEqual(extractionChecks(value).filter(item => !item.passed), []);
  value.lines[0].quantity = 5;
  value.totals.taxMode = "included";
  value.totals.printedTotal = 1;
  const checks = extractionChecks(value);
  for (const name of ["pdf.line_values", "pdf.tax_mode", "pdf.printed_totals"]) assert.equal(checks.find(item => item.name === name)?.passed, false);
});

test("PDF-to-generation evidence is built from actual extraction, never substituted with golden fixture prices", async () => {
  const actual = pdfExtraction();
  actual.lines[0].quantity = 7;
  actual.lines[0].unitPrice = 51001;
  actual.lines[1].quantity = 9;
  actual.lines[1].unitPrice = 81003;
  const scenario = buildScenario("pdf-to-estimate", await fixtures(), actual);
  const historical = scenario.evidence.filter(item => item.documentKind === "estimate");
  assert.equal(historical.length, 1);
  assert.equal(historical[0].label, "estimate.pdf");
  assert.equal(scenario.evidence.some(item => item.documentKind === "price_list"), false);
  assert.deepEqual(historical[0].lines.map(line => [line.qty, line.unitPrice]), [[7, 51001], [9, 81003]]);
  const context = buildAiEstimateGenerationContext({ ...scenario, clientName: "Fictional Example Client", priceAnchors: [] });
  assert.deepEqual(context.approvedEvidence.find(item => item.documentKind === "estimate")?.lines.map(line => [line.qty, line.unitPrice]), [[7, 51001], [9, 81003]]);
  assert.deepEqual(scenario.expected.map(line => [line.qty, line.unitPrice]), [[5, 50000], [5, 80000]], "expected assertions stay independent from supplied evidence");
  const composed = await composeGroundedDraft({ ...scenario, priceAnchors: [], minimumSamples: 3, retrievalMode: "local", allowExternalProcessing: true,
    generate: async () => ({ generated: proposal(), ...config }) });
  assert.deepEqual(composed.draft.lines.map(line => line.unitPrice), [51001, 81003]);
  assert.ok(generationChecks(scenario, composed, proposal(), config).some(item => !item.passed), "bad PDF facts must fail the downstream expected-price check");
});

test("PDF-to-generation requires extraction rather than silently falling back to CSV", async () => {
  const data = await fixtures();
  assert.throws(() => buildScenario("pdf-to-estimate", data), /PDF_EXTRACTION_REQUIRED/);
});

test("local explicit 8-percent categories survive the evidence mapping", async () => {
  const raw = await parseLocalDocument({ documentKind: "price_list", mimeType: "text/csv", data: new Blob([
    "Item,Unit,Unit price,Tax rate,Tax mode\nReduced,screen,100,reduced_8,excluded\nStandard,screen,200,standard_8,excluded\n",
  ]) });
  assert.deepEqual(evidenceFromExtraction(raw, "local-explicit-tax.csv", "price_list").lines.map(line => line.taxCategory), ["reduced_8", "standard_8"]);
});

test("report redaction covers nested credentials, known nonstandard secrets and unlisted provider-key patterns", () => {
  const gemini = "AIzaSyntheticValidationSecret0123456789";
  const anthropic = "sk-ant-SyntheticValidationSecret0123456789";
  const openai = "sk-proj-SyntheticValidationSecret0123456789";
  const nonstandard = "validation-secret-without-provider-prefix";
  const report = { config: { apiKey: gemini }, body: [anthropic, { note: `Bearer ${openai}; ${nonstandard}` }], ordinary: "Synthetic five-screen input" };
  const redacted = JSON.stringify(redactReport(report, [nonstandard]));
  for (const secret of [gemini, anthropic, openai, nonstandard]) assert.equal(redacted.includes(secret), false);
  assert.match(redacted, /Synthetic five-screen input/);
  assert.match(redacted, /REDACTED/);
  assert.equal(report.config.apiKey, gemini, "redaction does not mutate caller data");
  for (const error of [new Error(nonstandard), new GeminiBatchError(nonstandard, "auth", false, "http_401")])
    assert.equal(JSON.stringify(safeError(error)).includes(nonstandard), false);
});
