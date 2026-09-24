import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "../../..");
const syntheticKey = "sk-ant-syntheticvalidation000000000000000000";
const preloader = `
import { appendFileSync } from "node:fs";
// All requests are served in memory; never call the host's original fetch.
globalThis.fetch = async (url, init) => {
  if (String(url) !== "https://api.anthropic.com/v1/messages") throw new Error("Unexpected network destination");
  const body = JSON.parse(init.body);
  const extraction = body.messages[0].content.some(part => part.type === "document");
  appendFileSync(process.env.QA_CALLS_FILE, JSON.stringify({ extraction, model: body.model }) + "\\n");
  if (process.env.QA_MODE === "http401") return Response.json({ message: process.env.ANTHROPIC_API_KEY }, { status: 401 });
  const qty = process.env.QA_MODE === "wrong-quantity" ? 3 : 5;
  let output = { subject: "Synthetic proposal", templateMessage: "", remarks: "", evidenceIndexes: [0], warnings: [],
    lines: ["Design", "Development"].map((name, index) => ({ name, qty, unit: "screen", unitPrice: index ? 80000 : 50000,
      taxCategory: "standard_10", confidence: 0.9, reason: "Approved evidence", quantityReason: "Five distinct screens, with PC and mobile variants included." })) };
  if (extraction) output = { schemaVersion: "2.0.0", documentKind: "estimate", workDetails: "Historical three-screen project", assumptions: "", exclusions: "",
    document: { estimateNumber: "SYN-EST-003", issueDate: "2026-01-15", validUntil: "2026-02-14", currency: "JPY", language: "en" },
    supplier: { name: "Fictional Supplier", businessNumber: null, contactName: null },
    customer: { name: "Fictional Example Client", businessNumber: null, contactName: null },
    totals: { printedSubtotal: 390000, printedDiscount: null, printedTax: 39000, printedTotal: 429000, taxMode: "excluded" },
    lines: ["Design", "Development"].map((rawItemName, index) => ({ lineNumber: index + 1, rawItemName, specification: null, quantity: 3,
      rawUnit: "screen", unitPrice: process.env.QA_MODE === "bad-extraction" ? 1 : index ? 80000 : 50000,
      printedAmount: index ? 240000 : 150000, printedTaxRatePercent: 10, description: null, confidence: 0.99 })),
    tableRecognitionFailed: false, confidence: 0.99, notes: [], warnings: [] };
  return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(output) }], usage: { input_tokens: 100, output_tokens: 100 } });
};
`;

async function execute(args: string[], mode = "success", key = syntheticKey) {
  const directory = await mkdtemp(join(tmpdir(), "salesflow-api-validation-test-"));
  try {
    const preload = join(directory, "mock.mjs"), callsPath = join(directory, "calls.jsonl");
    await writeFile(preload, preloader);
    await writeFile(callsPath, "");
    await writeFile(join(directory, ".env.ai-validation.local"), `ANTHROPIC_API_KEY=${key}\n`);
    // Remove inherited provider settings. No real credentials or model configuration reach the child.
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
      !/GEMINI|ANTHROPIC|OPENAI|AI_ESTIMATE|NODE_OPTIONS|QA_/i.test(name)));
    let code = 0, stdout = "", stderr = "";
    try {
      const result = await exec(process.execPath, ["--import", resolve(root, "node_modules/tsx/dist/loader.mjs"), "--import", preload,
        resolve(root, "scripts/ai-estimate/validate.ts"), ...args], { cwd: directory,
        env: { ...env, NODE_ENV: "test", QA_MODE: mode, QA_CALLS_FILE: callsPath }, timeout: 30000, maxBuffer: 1024 * 1024 });
      stdout = result.stdout; stderr = result.stderr;
    } catch (error) {
      const failed = error as { code: number | string; stdout?: string; stderr?: string };
      assert.equal(typeof failed.code, "number", "CLI must exit itself, not time out or crash by signal");
      code = Number(failed.code); stdout = failed.stdout ?? ""; stderr = failed.stderr ?? "";
    }
    const calls = (await readFile(callsPath, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
    const reportsRoot = join(directory, "artifacts/ai-estimate-validation");
    const runs = await readdir(reportsRoot).catch(() => []);
    const reportText = runs.length ? await readFile(join(reportsRoot, runs[0], "report.json"), "utf8") : "";
    assert.ok(![stdout, stderr, reportText].some(text => text.includes(syntheticKey)), "Credentials must not appear in CLI output or reports");
    return { code, stdout, stderr, calls, report: reportText ? JSON.parse(reportText) : null };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test("CLI remains offline even when its environment file has a key", async () => {
  const result = await execute([]);
  assert.equal(result.code, 0);
  assert.deepEqual(result.calls, []);
  assert.equal(result.report.status, "OFFLINE_PASS_LIVE_NOT_RUN");
  assert.equal(result.report.modelOperationsStarted, 0);
  assert.ok(result.report.cases.every((item: { status: string }) => item.status === "SKIPPED_NOT_RUN"));
});

test("CLI live smoke links actual extraction to generation and detects failed extraction dependency", async () => {
  const result = await execute(["--live", "--provider", "anthropic"]);
  assert.equal(result.code, 0, result.stdout + result.stderr + JSON.stringify(result.report));
  assert.equal(result.report.status, "PASS");
  assert.deepEqual(result.calls.map(call => call.extraction), [true, false]);
  const generation = result.report.cases[1].output;
  assert.deepEqual(generation.input.approvedEvidence[0].lines.map((line: { qty: number }) => line.qty), [3, 3]);
  assert.deepEqual(generation.result.draft.lines.map((line: { qty: number }) => line.qty), [5, 5]);
  assert.equal(generation.selectedSourceSnapshots[0].label, "estimate.pdf");
  assert.ok(generation.selectedSourceSnapshots.every((source: { documentKind: string }) => source.documentKind !== "price_list"));

  const failed = await execute(["--live", "--provider", "anthropic", "--case", "pdf-to-estimate"], "bad-extraction");
  assert.equal(failed.code, 1);
  assert.deepEqual(failed.report.cases.map((item: { status: string }) => item.status), ["FAIL", "BLOCKED"]);
  assert.deepEqual(failed.calls.map(call => call.extraction), [true]);
});

test("CLI fails wrong quantities and provider fallback instead of reporting live success", async () => {
  const quantity = await execute(["--live", "--provider", "anthropic", "--case", "rate-en"], "wrong-quantity");
  assert.equal(quantity.code, 1);
  assert.equal(quantity.report.cases[0].status, "FAIL");
  assert.ok(quantity.report.cases[0].checks.some((item: { name: string; passed: boolean }) => item.name.endsWith(".values") && !item.passed));
  const auth = await execute(["--live", "--provider", "anthropic", "--case", "rate-en"], "http401");
  assert.equal(auth.code, 1);
  assert.equal(auth.report.cases[0].diagnostics.generationMode, "local");
  assert.deepEqual(auth.report.cases[0].diagnostics.httpStatuses, [401]);
  assert.equal(auth.report.cases[0].error.code, "AI_GENERATION_PROVIDER");
  assert.equal(auth.calls.length, 1);
});

test("CLI option errors and all-provider missing keys stop before network", async () => {
  for (const args of [["--live", "--provider", "anthropic"], ["--live", "--provider", "all"], ["--case", "not-a-case"]]) {
    const result = await execute(args, "success", "");
    assert.equal(result.code, 2);
    assert.deepEqual(result.calls, []);
    assert.equal(result.report, null);
  }
});
