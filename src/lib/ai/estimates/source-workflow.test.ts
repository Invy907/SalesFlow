import assert from "node:assert/strict";
import test from "node:test";
import { aiDraftRequestSchema, aiEstimateExtractionSchema, aiEstimateSourceMetadataSchema } from "./schemas";
import { buildAiEstimateGenerationContext, groundAiGeneratedEstimate, type AiEstimateGenerationEvidence, type AiGeneratedEstimate } from "./generation-core";
import { composeGroundedDraft } from "./draft-workflow";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const extraction = { clientName: "", subject: "画面設計", issueDate: null, templateMessage: "", remarks: "", rawText: "", confidence: 1, lines: [], warnings: [] };
const rate: AiEstimateGenerationEvidence = { exampleId: id(1), sourceId: id(2), documentKind: "price_list", currency: "JPY", taxMode: "excluded",
  label: "2026年単価表", similarity: 1, clientName: null, subject: "画面設計", issueDate: "2026-01-01", templateMessage: "", remarks: "",
  lines: [{ id: id(3), name: "画面設計", qty: 10, unit: "画面", unitPrice: 50000, taxCategory: "standard_10" }] };
const scope: AiEstimateGenerationEvidence = { ...rate, exampleId: id(4), sourceId: id(5), documentKind: "design", taxMode: "unknown",
  workDetails: "画面設計は5画面。スマートフォンとPCに対応。", assumptions: "原稿は支給", exclusions: "翻訳は含まない", lines: [] };
const generated: AiGeneratedEstimate = { subject: "新案件", lines: [{ name: "画面設計", qty: 5, unit: "画面", unitPrice: 1,
  taxCategory: "standard_10", confidence: 0.9, reason: "設計内容", quantityReason: "依頼の5画面" }], templateMessage: "", remarks: "", evidenceIndexes: [0], warnings: [] };
const ground = (evidence: AiEstimateGenerationEvidence[]) => groundAiGeneratedEstimate({ generated, evidence, priceAnchors: [], minimumSamples: 3 });

test("scope documents accept no price rows; price documents still require rows", () => {
  assert.equal(aiEstimateExtractionSchema.safeParse(extraction).success, false);
  const document = aiEstimateExtractionSchema.parse({ ...extraction, documentKind: "design", workDetails: "画面設計5画面" });
  assert.equal(document.taxMode, "unknown");
  assert.deepEqual(document.lines, []);
  assert.equal(aiEstimateExtractionSchema.safeParse({ ...document, lines: [{ name: "料金", qty: 1, unit: "式", unitPrice: 1, taxCategory: "standard_10", confidence: 1, reason: "" }] }).success, false);
});
test("metadata rejects reversed dates and keeps project/revision independently", () => {
  assert.equal(aiEstimateSourceMetadataSchema.safeParse({ documentKind: "price_list", validFrom: "2026-10-01", validUntil: "2026-09-01" }).success, false);
  assert.equal(aiEstimateSourceMetadataSchema.parse({ projectName: "A project", revision: "v3" }).revision, "v3");
});
test("selected-reference requests may start from a source, but reject duplicate IDs and arbitrary providers", () => {
  const input = { clientId: null, clientName: "", subject: "", workDescription: "", sourceIds: [id(1)], provider: "anthropic" };
  assert.equal(aiDraftRequestSchema.parse(input).provider, "anthropic");
  assert.equal(aiDraftRequestSchema.safeParse({ ...input, sourceIds: [id(1), id(1)] }).success, false);
  assert.equal(aiDraftRequestSchema.safeParse({ ...input, provider: "untrusted-url" }).success, false);
});
test("rate cards ground unit prices while design references remain separate scope evidence", () => {
  const draft = ground([scope, rate]);
  assert.equal(draft.lines[0].qty, 5);
  assert.equal(draft.lines[0].quantityReason, "依頼の5画面");
  assert.equal(draft.lines[0].unitPrice, 50000);
  assert.equal(draft.lines[0].priceEvidence, "price_list");
  assert.deepEqual(draft.lines[0].evidenceLineIds, [id(3)]);
  assert.equal(draft.contextEvidence?.[0].sourceId, id(5));
});
test("conflicting rate cards require review instead of averaging or choosing an arbitrary revision", () => {
  const conflict = { ...rate, exampleId: id(6), sourceId: id(7), lines: [{ ...rate.lines[0], id: id(8), unitPrice: 60000 }] };
  const draft = ground([rate, conflict]);
  assert.equal(draft.lines[0].unitPrice, 0);
  assert.equal(draft.lines[0].priceEvidence, "insufficient");
  assert.equal(draft.evidence.length, 2);
});
test("an explicit rate card takes priority over historical statistics", () => {
  const draft = groundAiGeneratedEstimate({ generated, evidence: [rate], minimumSamples: 3, priceAnchors: [{
    name: "画面設計", normalizedName: "画面設計", unit: "画面", taxCategory: "standard_10", taxMode: "excluded", currency: "JPY",
    sampleCount: 8, medianPrice: 42000, p25Price: 40000, p75Price: 45000, scope: "company", exampleIds: [id(9)], lineIds: [id(10)],
  }] });
  assert.equal(draft.lines[0].unitPrice, 50000);
  assert.equal(draft.lines[0].priceEvidence, "price_list");
});
test("context data cannot be smuggled into price evidence", () => {
  const draft = ground([{ ...scope, taxMode: "excluded", lines: rate.lines }]);
  assert.equal(draft.lines[0].unitPrice, 0);
  assert.equal(draft.lines[0].priceEvidence, "insufficient");
});
test("the model sees requirements and scope content, without internal IDs or known personal details", () => {
  const serialized = JSON.stringify(buildAiEstimateGenerationContext({ clientName: "ACME", subject: "ACME project", workDescription: "設計",
    requirements: "ACME 5画面 contact@example.com", assumptions: "03-1234-5678", exclusions: "翻訳", evidence: [{ ...scope, workDetails: "ACME 画面設計" }, rate], priceAnchors: [] }));
  assert.match(serialized, /workDetails/);
  assert.match(serialized, /price_list/);
  assert.match(serialized, /5画面/);
  for (const secret of ["ACME", "contact@example.com", "03-1234-5678", id(1), id(2), id(4), id(5)]) assert.equal(serialized.includes(secret), false);
});
test("offline drafts use the priced source even when a design document ranks first", async () => {
  const result = await composeGroundedDraft({ subject: "画面設計", workDescription: "", locale: "ja", taxMode: "excluded", evidence: [scope, rate],
    priceAnchors: [], minimumSamples: 3, retrievalMode: "local", allowExternalProcessing: false });
  assert.equal(result.draft.lines[0].unitPrice, 50000);
  assert.equal(result.draft.lines[0].qty, 1);
  assert.match(result.draft.lines[0].quantityReason ?? "", /参考数量/);
});
test("design-only model drafts show unpriced rows, and offline design-only requests give an actionable failure", async () => {
  const input = { subject: "画面設計", workDescription: "5画面", locale: "ja" as const, taxMode: "excluded" as const,
    evidence: [scope], priceAnchors: [], minimumSamples: 3, retrievalMode: "local" as const, allowExternalProcessing: true };
  const result = await composeGroundedDraft({ ...input, generate: async () => ({ generated, provider: "anthropic", model: "test" }) });
  assert.equal(result.draft.lines[0].unitPrice, 0);
  assert.equal(result.draft.lines[0].priceEvidence, "insufficient");
  await assert.rejects(composeGroundedDraft({ ...input, allowExternalProcessing: false }), /no_price_evidence/);
});
