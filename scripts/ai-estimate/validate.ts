/** Key-only synthetic provider validation. No app server, Supabase, or customer data. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { generationConfig, requestGeneratedEstimate } from "../../src/lib/ai/estimates/generation-provider";
import { extractionConfig, makeExtractionProvider } from "../../src/lib/ai/estimates/extraction-provider";
import { buildAiEstimateGenerationContext, type AiGeneratedEstimate } from "../../src/lib/ai/estimates/generation-core";
import { composeGroundedDraft } from "../../src/lib/ai/estimates/draft-workflow";
import { validateExtraction } from "../../src/lib/ai/estimates/batch/validate";
import { normalizeExtraction, toReviewExtraction } from "../../src/lib/ai/estimates/batch/normalize";
import type { EstimateExtractionResult } from "../../src/lib/ai/estimates/batch/extraction-schema";
import { computeDocumentTotals } from "../../src/lib/tax";
import { CASES, buildScenario, loadFixtures, type CaseId } from "./validation/scenarios";
import { check, extractionChecks, generationChecks, redactReport, safeError, type Check } from "./validation/checks";
import { runOfflineChecks } from "./validation/offline";

type Provider = "gemini" | "anthropic";
type Options = { live: boolean; provider: Provider | "auto" | "all"; suite: "smoke" | "full"; caseId?: CaseId;
  envFile: string; explicitEnvFile: boolean; list: boolean; help: boolean };
type CaseResult = { id: string; provider: string; status: "PASS" | "FAIL" | "SKIPPED_NOT_RUN" | "BLOCKED";
  checks: Check[]; durationMs?: number; diagnostics?: unknown; error?: ReturnType<typeof safeError>; output?: unknown };
class UsageError extends Error {}
const HELP = `AI 견적 API 검증 (Node.js 22 권장)

  npm run ai-estimate:validate                         키 없이 사전 검사, API 호출 0회
  npm run ai-estimate:validate -- --list                live 시나리오 목록
  npm run ai-estimate:validate -- --live                설정된 키로 smoke 실행
  npm run ai-estimate:validate -- --live --provider gemini --suite full
  npm run ai-estimate:validate -- --live --provider anthropic --case rate-ko

  --live                 실제 외부 API를 호출하며 사용료가 발생할 수 있습니다.
  --provider auto|gemini|anthropic|all  auto는 Gemini 키 우선, all은 두 키 모두 필요
  --suite smoke|full     기본 smoke: PDF 추출+연결 생성 2개, full: 총 9개 모델 작업/provider
  --case ID              단일 case; pdf-to-estimate는 pdf-extraction도 실행
  --env-file PATH        기본 .env.ai-validation.local (쉘 환경변수가 파일보다 우선)
  --list                 case 목록만 표시
  --help                 도움말

설정: cp scripts/ai-estimate/validation.env.example .env.ai-validation.local
출력: artifacts/ai-estimate-validation/<실행ID>/report.json, report.md
종료코드: 0=선택된 검사 성공, 1=검증 실패, 2=옵션/설정 오류
상세: docs/AI_ESTIMATE_API_VALIDATION.md
`;
function optionsFrom(argv: string[]): Options {
  const options: Options = { live: false, provider: "auto", suite: "smoke", envFile: ".env.ai-validation.local", explicitEnvFile: false, list: false, help: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--live") options.live = true;
    else if (arg === "--list") options.list = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (["--provider", "--suite", "--case", "--env-file"].includes(arg)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new UsageError("옵션 값이 빠졌습니다. --help를 확인하세요.");
      if (arg === "--provider") {
        if (!["auto", "all", "gemini", "anthropic"].includes(value)) throw new UsageError("--provider는 auto, gemini, anthropic, all 중 하나입니다.");
        options.provider = value as Options["provider"];
      } else if (arg === "--suite") {
        if (!["smoke", "full"].includes(value)) throw new UsageError("--suite는 smoke 또는 full입니다.");
        options.suite = value as Options["suite"];
      } else if (arg === "--case") {
        if (!CASES.some(item => item.id === value)) throw new UsageError("알 수 없는 case입니다. --list를 확인하세요.");
        options.caseId = value as CaseId;
      } else { options.envFile = value; options.explicitEnvFile = true; }
    } else throw new UsageError("알 수 없는 옵션입니다. --help를 확인하세요.");
  }
  return options;
}
async function readEnvironment(options: Options) {
  let file: Record<string, string | undefined> = {};
  try { file = parseEnv(await readFile(resolve(options.envFile), "utf8")); }
  catch (error) {
    if (options.explicitEnvFile || !error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT")
      throw new UsageError("환경 파일을 읽을 수 없습니다. --env-file 경로와 파일 형식을 확인하세요.");
  }
  return { ...file, ...process.env };
}
function providerConfigs(options: Options, env: Record<string, string | undefined>) {
  let providers: Provider[];
  if (options.provider === "all") providers = ["gemini", "anthropic"];
  else if (options.provider === "auto") {
    const config = generationConfig({ ...env, AI_ESTIMATE_GENERATION_PROVIDER: "auto", OPENAI_API_KEY: undefined });
    if (!config || config.provider === "openai") throw new UsageError("GEMINI_API_KEY 또는 ANTHROPIC_API_KEY를 .env.ai-validation.local에 설정하세요. --help에 설정 방법이 있습니다.");
    providers = [config.provider];
  } else providers = [options.provider];
  return providers.map(provider => {
    const generation = generationConfig(env, provider);
    const extraction = extractionConfig({ ...env, AI_ESTIMATE_EXTRACTION_PROVIDER: provider });
    if (!generation || !extraction) throw new UsageError(`${provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"}가 없거나 형식이 올바르지 않습니다. 값을 확인하세요.`);
    return { provider, generation, extraction };
  });
}
function selectedCases(options: Options): CaseId[] {
  if (options.caseId) return options.caseId === "pdf-to-estimate" ? ["pdf-extraction", "pdf-to-estimate"] : [options.caseId];
  return CASES.filter(item => options.suite === "full" || item.suite === "smoke").map(item => item.id);
}
async function main() {
  const options = optionsFrom(process.argv.slice(2));
  if (options.help) { process.stdout.write(HELP); return; }
  if (options.list) {
    process.stdout.write(CASES.map(item => `${item.id.padEnd(19)} ${item.suite.padEnd(5)} ${item.title}`).join("\n") + "\n");
    return;
  }
  const env = await readEnvironment(options);
  // Validate all requested credentials before the first paid request.
  const configs = options.live ? providerConfigs(options, env) : [];
  const secrets = Object.entries(env).filter(([name]) => /KEY|TOKEN|SECRET|PASSWORD/i.test(name)).map(([, value]) => value ?? "");
  const ids = selectedCases(options);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const directory = resolve("artifacts/ai-estimate-validation", runId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const cases: CaseResult[] = [];
  const report = { schemaVersion: "1.0.0", runId, startedAt: new Date().toISOString(), finishedAt: null as string | null,
    mode: options.live ? "live" : "offline", suite: options.caseId ? "single-case" : options.suite,
    status: "RUNNING", modelOperationsPlanned: configs.length * ids.length, modelOperationsStarted: 0,
    scope: "Synthetic file parsing, provider extraction/generation and application grounding in memory. No database, approval, RLS, vector index, app UI or saved-estimate validation.",
    providers: configs.map(c => ({ provider: c.provider, generationModel: c.generation.model, extractionModel: c.extraction.model })),
    fixtureHashes: {} as Record<string, string>, offline: [] as Check[], cases };
  for (const provider of options.live ? configs.map(c => c.provider) : [options.provider]) {
    for (const id of ids) cases.push({ id, provider, status: "SKIPPED_NOT_RUN", checks: [] });
  }
  async function save() {
    const safe = redactReport(report, secrets) as typeof report;
    const markdown = ["# AI 견적 검증 결과", "", `- 실행: ${safe.runId}`, `- 모드: ${safe.mode}`, `- 상태: ${safe.status}`,
      `- 모델 작업: ${safe.modelOperationsStarted}/${safe.modelOperationsPlanned} 시작 (HTTP 요청 수와 다름)`,
      `- 사전 검사: ${safe.offline.filter(c => c.passed).length}/${safe.offline.length} 통과`, "",
      "| Case | Provider | 상태 | 검사 |", "| --- | --- | --- | --- |",
      ...safe.cases.map(item => `| ${item.id} | ${item.provider} | ${item.status} | ${item.checks.filter(c => c.passed).length}/${item.checks.length} |`), "",
      ...safe.offline.filter(c => !c.passed).map(c => `- 사전 검사 실패: ${c.name}`),
      ...safe.cases.flatMap(item => [
        ...item.checks.filter(c => !c.passed).map(c => `- ${item.provider}/${item.id}: ${c.name}`),
        ...(item.error ? [`- ${item.provider}/${item.id}: ${item.error.code} — ${item.error.hint}`] : []),
      ]), "", "상세 입력·원본 AI 출력·가격 검증 결과는 report.json을 확인하세요. 공급자 응답의 문장은 합성 입력에 대한 미검수 출력입니다.",
      "키 없는 사전 검사 성공은 실제 API 성공이 아닙니다. SKIPPED_NOT_RUN/BLOCKED는 성공으로 집계하지 않습니다.",
      "이 실행은 DB 승인·권한·벡터 검색·저장·화면을 검증하지 않습니다. 별도 앱 시나리오는 docs/AI_ESTIMATE_API_VALIDATION.md에 있습니다.", ""].join("\n");
    await writeFile(join(directory, "report.json"), JSON.stringify(safe, null, 2) + "\n", { mode: 0o600 });
    await writeFile(join(directory, "report.md"), markdown, { mode: 0o600 });
  }
  await save();
  const originalFetch = globalThis.fetch;
  let offlineNetworkAttempts = 0;
  globalThis.fetch = async () => { offlineNetworkAttempts++; throw new Error("OFFLINE_NETWORK_FORBIDDEN"); };
  let fixtures: Awaited<ReturnType<typeof loadFixtures>>;
  try {
    fixtures = await loadFixtures();
    report.fixtureHashes = fixtures.hashes;
    report.offline.push(...await runOfflineChecks(fixtures));
  } catch (error) {
    report.offline.push(check("preflight.fixtures_and_logic", false));
    report.status = "FAIL";
    cases.forEach(item => { item.status = "BLOCKED"; item.error = safeError(error); });
    report.finishedAt = new Date().toISOString();
    await save();
    process.stderr.write(`사전 검사 실패. 결과: ${directory}\n`);
    process.exitCode = 1;
    return;
  } finally { globalThis.fetch = originalFetch; }
  report.offline.push(check("preflight.zero_network_attempts", offlineNetworkAttempts === 0, 0, offlineNetworkAttempts));
  const preflightPassed = report.offline.every(c => c.passed);
  process.stdout.write(`사전 검사 ${report.offline.filter(c => c.passed).length}/${report.offline.length} 통과.\n`);
  if (!preflightPassed || !options.live) {
    report.status = preflightPassed ? "OFFLINE_PASS_LIVE_NOT_RUN" : "FAIL";
    if (!preflightPassed) cases.forEach(item => { item.status = "BLOCKED"; });
    report.finishedAt = new Date().toISOString();
    await save();
    process.stdout.write(`API 호출 0회. 결과: ${directory}\n`);
    if (!preflightPassed) process.exitCode = 1;
    return;
  }
  process.stdout.write(`실제 API 검증 시작: ${configs.map(c => c.provider).join(", ")}, 최대 ${report.modelOperationsPlanned}개 모델 작업. 자동 재시도 없음.\n`);
  for (const config of configs) {
    let extractedPdf: EstimateExtractionResult | undefined;
    for (const id of ids) {
      const item = cases.find(c => c.id === id && c.provider === config.provider)!;
      if (id === "pdf-to-estimate" && !extractedPdf) {
        item.status = "BLOCKED";
        item.checks.push(check("dependency.pdf_extraction_passed", false));
        await save();
        continue;
      }
      const start = Date.now();
      process.stdout.write(`[${config.provider}] ${id} 실행 중…\n`);
      report.modelOperationsStarted++;
      try {
        if (id === "pdf-extraction") {
          const output = await makeExtractionProvider(config.extraction).extract({ data: new Blob([new Uint8Array(fixtures.pdf)]),
            mimeType: "application/pdf", documentKind: "estimate", displayName: "salesflow-synthetic-validation.pdf", pageCount: 1, model: config.extraction.model });
          item.checks = extractionChecks(output.result);
          const validation = validateExtraction(output.result, { confidenceThreshold: 0.8, totalToleranceMinorUnits: 1 });
          item.checks.push(check("pdf.structurally_valid", validation.isStructurallyValid));
          const review = toReviewExtraction(normalizeExtraction(output.result), "Synthetic estimate.pdf");
          const totals = computeDocumentTotals(review.lines, "round_down", { documentType: "estimate", taxDisplay: "separate", withholdingType: "none" });
          item.checks.push(check("pdf.independent_tax_math", totals.subtotal === 390000 && totals.tax === 39000 && totals.total === 429000,
            { subtotal: 390000, tax: 39000, total: 429000 }, totals));
          item.output = { extracted: output.result, review, validation, independentlyCalculatedTotals: totals };
          item.diagnostics = { model: output.model, inputTokens: output.inputTokens, outputTokens: output.outputTokens, latencyMs: output.latencyMs };
          if (item.checks.every(c => c.passed)) extractedPdf = output.result;
        } else {
          const scenario = buildScenario(id, fixtures, extractedPdf);
          const context = { ...buildAiEstimateGenerationContext({ ...scenario, clientName: "Synthetic QA customer", priceAnchors: [] }),
            language: scenario.locale, currency: "JPY", targetTaxMode: scenario.taxMode };
          let raw: AiGeneratedEstimate | undefined;
          let providerError: unknown;
          let calls = 0;
          const httpStatuses: number[] = [];
          const transport: typeof fetch = async (url, init) => { const response = await originalFetch(url, init); httpStatuses.push(response.status); return response; };
          const result = await composeGroundedDraft({ ...scenario, priceAnchors: [], minimumSamples: 3, retrievalMode: "local", allowExternalProcessing: true,
            generate: async () => {
              calls++;
              try { const output = await requestGeneratedEstimate(config.generation, context, transport); raw = output.generated; return output; }
              catch (error) { providerError = error; throw error; }
            } });
          item.checks = generationChecks(scenario, result, raw, config.generation);
          item.checks.push(check("provider.exactly_one_generation_attempt", calls === 1, 1, calls));
          item.output = { input: context, selectedSourceSnapshots: scenario.evidence, priceAnchorSnapshot: [], rawGenerated: raw ?? null,
            result, expected: scenario.expected };
          item.diagnostics = { generationMode: result.generationMode, provider: result.provider, model: result.model, httpStatuses, attempts: calls };
          if (providerError) item.error = safeError(providerError);
        }
        item.status = item.checks.every(c => c.passed) ? "PASS" : "FAIL";
      } catch (error) { item.status = "FAIL"; item.error = safeError(error); }
      item.durationMs = Date.now() - start;
      process.stdout.write(`[${config.provider}] ${id}: ${item.status} (${item.checks.filter(c => c.passed).length}/${item.checks.length})\n`);
      await save();
    }
  }
  report.status = cases.every(item => item.status === "PASS") ? "PASS" : "FAIL";
  report.finishedAt = new Date().toISOString();
  await save();
  process.stdout.write(`검증 ${report.status}. 결과: ${directory}\n`);
  if (report.status !== "PASS") process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write(error instanceof UsageError ? `${error.message}\n` : `${safeError(error).code}: ${safeError(error).hint}\n`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});
