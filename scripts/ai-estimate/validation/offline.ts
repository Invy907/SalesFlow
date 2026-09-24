import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { parseLocalDocument, LocalDocumentParseError } from "../../../src/lib/ai/estimates/local-document-parser";
import { normalizeExtraction, toReviewExtraction } from "../../../src/lib/ai/estimates/batch/normalize";
import { validateExtraction } from "../../../src/lib/ai/estimates/batch/validate";
import { AiDraftWorkflowError, composeGroundedDraft } from "../../../src/lib/ai/estimates/draft-workflow";
import { buildAiEstimateGenerationContext, type AiGeneratedEstimate } from "../../../src/lib/ai/estimates/generation-core";
import { AiGenerationError, requestGeneratedEstimate } from "../../../src/lib/ai/estimates/generation-provider";
import { KEYWORD_ONLY_WEIGHTS, rankRetrievalCandidates, tokenScore } from "../../../src/lib/ai/estimates/retrieval";
import { computeDocumentTotals } from "../../../src/lib/tax";
import { buildScenario, FIXTURE_DIR, type FixtureData, type Scenario } from "./scenarios";
import { check, type Check } from "./checks";

const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const modelOutput = (names = ["Design", "Development"], unit = "screen"): AiGeneratedEstimate => ({
  subject: "Synthetic provider title", templateMessage: "Never copy this old commitment", remarks: "Old contractual terms",
  lines: names.map((name, index) => ({ name, unit, qty: 5, unitPrice: index ? 654321 : 123456,
    taxCategory: "standard_10", confidence: 0.9, reason: "Synthetic model proposal",
    quantityReason: "Five distinct screens; desktop and mobile are variants of each screen." })),
  evidenceIndexes: [0], warnings: [],
});
const composition = (scenario: Scenario) => ({
  subject: scenario.subject, workDescription: scenario.workDescription, requirements: scenario.requirements,
  assumptions: scenario.assumptions, exclusions: scenario.exclusions, locale: scenario.locale, taxMode: scenario.taxMode,
  evidence: scenario.evidence, priceAnchors: [], minimumSamples: 3, retrievalMode: "local" as const, allowExternalProcessing: false,
});

/** No provider key or database is read. Every provider interaction below uses an injected in-memory transport. */
export async function runOfflineChecks(fixtures: FixtureData): Promise<Check[]> {
  const checks: Check[] = [];
  const record = (name: string, actual: unknown, expected: unknown) => checks.push(check(name, equal(actual, expected), expected, actual));
  const expectedFiles = ["rate-card-ja.csv", "history-ja.csv", "conflicting-rate-card-ja.csv", "invalid-tax.csv", "rate-card-en.csv",
    "design-ja.md", "work-scope-ja.md", "prompt-injection.md", "estimate.pdf"];
  const manifest = JSON.parse(await readFile(resolve(FIXTURE_DIR, "manifest.json"), "utf8")) as {
    schemaVersion: string; fictional: boolean; files: Array<{ file: string; bytes: number; sha256: string }>;
  };
  record("fixtures.manifest_file_set", manifest.files.map(file => file.file).sort(), [...expectedFiles].sort());
  record("fixtures.synthetic_manifest_version", [manifest.schemaVersion, manifest.fictional], ["1.0.0", true]);
  for (const file of expectedFiles) {
    const bytes = await readFile(resolve(FIXTURE_DIR, file));
    const entry = manifest.files.find(item => item.file === file);
    const hash = createHash("sha256").update(bytes).digest("hex");
    record(`fixtures.${file}.bytes_and_sha256`, [bytes.length, hash], [entry?.bytes, entry?.sha256]);
    if (fixtures.hashes[file]) record(`fixtures.${file}.loader_hash`, fixtures.hashes[file], hash);
  }
  for (const [file, expected] of [
    ["rate-card-ja.csv", [["画面設計", 1, "画面", 50000, 10], ["開発", 1, "画面", 80000, 10]]],
    ["rate-card-en.csv", [["Design", 1, "screen", 50000, 10], ["Development", 1, "screen", 80000, 10]]],
    ["history-ja.csv", [["画面設計", 3, "画面", 45000, 10], ["開発", 3, "画面", 70000, 10]]],
  ] as const) {
    const raw = fixtures.extractions[file];
    record(`local.${file}.raw_values`, raw.lines.map(line => [line.rawItemName, line.quantity, line.rawUnit, line.unitPrice, line.printedTaxRatePercent]), expected);
    record(`local.${file}.currency_tax`, [raw.document.currency, raw.totals.taxMode], ["JPY", "excluded"]);
    const normalized = normalizeExtraction(raw);
    const review = toReviewExtraction(normalized, file);
    record(`local.${file}.review_values`, review.lines.map(line => [line.name, line.qty, line.unit, line.unitPrice, line.taxCategory]),
      expected.map(([name, qty, unit, price]) => [name, qty, unit, price, "standard_10"]));
    record(`local.${file}.normalized_amounts`, normalized.lines.map(line => line.computedAmount), file === "history-ja.csv" ? [135000, 210000] : [50000, 80000]);
    const totals = computeDocumentTotals(review.lines, "round_down", { documentType: "estimate", taxDisplay: "separate", withholdingType: "none" });
    record(`local.${file}.independent_totals`, [totals.subtotal, totals.tax, totals.total], file === "history-ja.csv" ? [345000, 34500, 379500] : [130000, 13000, 143000]);
  }
  for (const [file, kind, requiredText] of [
    ["design-ja.md", "design", "今回の見積数量は、画面設計5画面、開発5画面です。"],
    ["work-scope-ja.md", "work_scope", "同一画面のPC・モバイル対応は1画面として数えます。"],
  ] as const) {
    const raw = fixtures.extractions[file];
    const validation = validateExtraction(raw, { confidenceThreshold: 0.8, totalToleranceMinorUnits: 1 });
    const review = toReviewExtraction(validation.normalized, file);
    record(`local.${file}.context_without_prices`, [raw.documentKind, raw.lines.length, review.lines.length, review.taxMode], [kind, 0, 0, "unknown"]);
    checks.push(check(`local.${file}.scope_preserved`, Boolean(raw.workDetails?.includes(requiredText)) && review.workDetails === raw.workDetails));
    record(`local.${file}.structurally_valid`, [validation.isStructurallyValid, validation.reviewReasons], [true, []]);
  }
  const invalidTax = await readFile(resolve(FIXTURE_DIR, "invalid-tax.csv"));
  let taxFailure: unknown;
  try { await parseLocalDocument({ data: new Blob([new Uint8Array(invalidTax)]), mimeType: "text/csv", documentKind: "price_list" }); }
  catch (error) { taxFailure = error; }
  checks.push(check("local.ambiguous_8_percent_rejected", taxFailure instanceof LocalDocumentParseError && taxFailure.code === "LOCAL_AMBIGUOUS_TAX",
    "LOCAL_AMBIGUOUS_TAX", taxFailure instanceof LocalDocumentParseError ? taxFailure.code : taxFailure ? "UNEXPECTED_ERROR" : "ACCEPTED"));

  const scenario = buildScenario("rate-en", fixtures);
  const input = composition(scenario);
  let consentCalls = 0;
  const local = await composeGroundedDraft({ ...input, generate: async () => { consentCalls++; return { generated: modelOutput(), provider: "mock", model: "mock" }; } });
  record("policy.no_external_consent_zero_calls", consentCalls, 0);
  record("local.rate_card_quantities_are_provisional", local.draft.lines.map(line => [line.name, line.qty, line.unitPrice]),
    [["Design", 1, 50000], ["Development", 1, 80000]]);
  record("local.provider_is_honest", [local.generationMode, local.provider, local.model], ["local", "salesflow-approved-retrieval", "grounded-draft-v2"]);
  checks.push(check("local.quantities_require_review", local.draft.lines.every(line => Boolean(line.quantityReason?.trim()))));
  let missingCalls = 0, missingError: unknown;
  try { await composeGroundedDraft({ ...input, evidence: [], allowExternalProcessing: true,
    generate: async () => { missingCalls++; return { generated: modelOutput(), provider: "mock", model: "mock" }; } }); }
  catch (error) { missingError = error; }
  checks.push(check("policy.no_evidence_stops_before_provider", missingError instanceof AiDraftWorkflowError && missingError.code === "no_evidence" && missingCalls === 0,
    { code: "no_evidence", calls: 0 }, { code: missingError instanceof AiDraftWorkflowError ? missingError.code : missingError ? "UNEXPECTED_ERROR" : "ACCEPTED", calls: missingCalls }));
  let fallbackCalls = 0;
  const fallback = await composeGroundedDraft({ ...input, allowExternalProcessing: true, generate: async () => { fallbackCalls++; throw new AiGenerationError("network"); } });
  record("policy.failed_provider_is_local_not_live_success", [fallbackCalls, fallback.generationMode, fallback.provider], [1, "local", "salesflow-approved-retrieval"]);

  const context = { ...buildAiEstimateGenerationContext({ ...scenario, clientName: "Synthetic client", priceAnchors: [] }), language: "en", currency: "JPY", targetTaxMode: "excluded" };
  const config = { provider: "gemini" as const, model: "offline-model", apiKey: "offline-transport-only" };
  let mockCalls = 0, wireContext: unknown;
  const transport: typeof fetch = async (_url, init) => {
    mockCalls++;
    const body = JSON.parse(String(init?.body));
    wireContext = JSON.parse(body.contents[0].parts[0].text);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(modelOutput()) }] } }] });
  };
  const model = await composeGroundedDraft({ ...input, allowExternalProcessing: true, generate: () => requestGeneratedEstimate(config, context, transport) });
  record("mock.provider_called_once_with_app_context", [mockCalls, wireContext], [1, context]);
  record("mock.fabricated_prices_replaced_by_rate_card", model.draft.lines.map(line => [line.name, line.qty, line.unitPrice, line.priceEvidence]),
    [["Design", 5, 50000, "price_list"], ["Development", 5, 80000, "price_list"]]);
  record("mock.no_old_contract_copy", [model.draft.subject, model.draft.templateMessage, model.draft.remarks], [scenario.subject, "", ""]);
  const modelTotals = computeDocumentTotals(model.draft.lines, "round_down", { documentType: "estimate", taxDisplay: "separate", withholdingType: "none" });
  record("mock.five_screen_totals", [modelTotals.subtotal, modelTotals.tax, modelTotals.total], [650000, 65000, 715000]);
  const historicalScenario = buildScenario("rate-ja", fixtures);
  const history = await composeGroundedDraft({ ...composition(historicalScenario), evidence: [fixtures.evidence["history-ja.csv"]] });
  record("local.historical_quantities_are_not_current_scope", history.draft.lines.map(line => [line.qty, line.unitPrice]), [[3, 45000], [3, 70000]]);
  const priority = await composeGroundedDraft({ ...composition(historicalScenario),
    evidence: [fixtures.evidence["history-ja.csv"], ...historicalScenario.evidence], allowExternalProcessing: true,
    generate: async () => ({ generated: modelOutput(["画面設計", "開発"], "画面"), provider: "mock", model: "offline-model" }) });
  record("grounding.current_rate_card_precedes_lower_historical_prices", priority.draft.lines.map(line => [line.qty, line.unitPrice, line.priceEvidence]),
    [[5, 50000, "price_list"], [5, 80000, "price_list"]]);
  const unsupported = await composeGroundedDraft({ ...input, allowExternalProcessing: true,
    generate: async () => ({ generated: modelOutput(["Design", "Unlisted hosting"]), provider: "mock", model: "offline-model" }) });
  record("grounding.unsupported_item_never_gets_a_guessed_price", unsupported.draft.lines.map(line => [line.unitPrice, line.priceEvidence]),
    [[50000, "price_list"], [0, "insufficient"]]);
  const conflict = await composeGroundedDraft({ ...composition(buildScenario("rate-conflict", fixtures)), allowExternalProcessing: true,
    generate: async () => ({ generated: modelOutput(["画面設計", "開発"], "画面"), provider: "mock", model: "offline-model" }) });
  record("grounding.conflicting_rates_not_averaged", conflict.draft.lines.map(line => [line.name, line.unitPrice, line.priceEvidence]),
    [["画面設計", 0, "insufficient"], ["開発", 80000, "price_list"]]);
  for (const [label, evidence, taxMode] of [
    ["unknown_source_tax", input.evidence.map(item => ({ ...item, taxMode: "unknown" as const })), "excluded"],
    ["tax_mode_mismatch", input.evidence, "included"],
  ] as const) {
    const result = await composeGroundedDraft({ ...input, evidence: [...evidence], taxMode, allowExternalProcessing: true,
      generate: async () => ({ generated: modelOutput(), provider: "mock", model: "offline-model" }) });
    record(`grounding.${label}_cannot_supply_prices`, result.draft.lines.map(line => [line.unitPrice, line.priceEvidence, line.confidence, line.evidenceLineIds.length]),
      [[0, "insufficient", 0, 0], [0, "insufficient", 0, 0]]);
  }
  const privateName = "Synthetic Private Client";
  const redacted = buildAiEstimateGenerationContext({ clientName: privateName, subject: `${privateName} website`,
    workDescription: "Contact private@example.invalid at 03-1234-5678", requirements: "Exactly five screens", assumptions: "Supplied copy", exclusions: "No hosting",
    evidence: scenario.evidence.map(item => ({ ...item, clientName: privateName, workDetails: `${privateName} scope`,
      lines: item.lines.map(line => ({ ...line, name: `${privateName} ${line.name}` })) })), priceAnchors: [] });
  const serialized = JSON.stringify(redacted);
  checks.push(check("context.private_names_contacts_and_internal_ids_removed", [privateName, "private@example.invalid", "03-1234-5678",
    ...scenario.evidence.flatMap(item => [item.sourceId, item.exampleId, ...item.lines.map(line => line.id)])].every(secret => !serialized.includes(secret))));
  record("context.user_scope_fields_preserved", [redacted.request.requirements, redacted.request.assumptions, redacted.request.exclusions], ["Exactly five screens", "Supplied copy", "No hosting"]);
  const ranked = rankRetrievalCandidates({ candidates: [
    { exampleId: "ordinary", keywordScore: 0.7, vectorScore: 0 }, { exampleId: "same-client", keywordScore: 0.7, vectorScore: 0, sameClient: true },
    { exampleId: "unrelated", keywordScore: 0.24, vectorScore: 0.99 },
  ], weights: KEYWORD_ONLY_WEIGHTS, limit: 3 });
  record("retrieval.keyword_threshold_and_client_bonus", ranked.map(item => item.exampleId), ["same-client", "ordinary"]);
  record("retrieval.short_cjk_item_coverage", tokenScore("開発", "画面設計と開発"), 1);
  return checks;
}
