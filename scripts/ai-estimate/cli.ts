import { loadBatchEnv, requireGeminiEnv } from "../../src/lib/ai/estimates/batch/env";
import { parseCliOptions } from "../../src/lib/ai/estimates/batch/cli-options";
import { GeminiEstimateProvider } from "../../src/lib/ai/estimates/batch/gemini";
import { AiEstimateBatchRepository } from "../../src/lib/ai/estimates/batch/repository";
import { extractionConfig, makeExtractionProvider } from "../../src/lib/ai/estimates/extraction-provider";
import {
  dryRunSummary,
  reindexApprovedSources,
  runExtractionBatch,
} from "../../src/lib/ai/estimates/batch/runner";

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const env = loadBatchEnv();
  const repository = new AiEstimateBatchRepository(env);

  if (options.command === "dry-run") {
    print(await dryRunSummary(repository, env));
    return;
  }
  if (options.command === "verify") {
    print({
      organizationId: env.organizationId,
      pending: await repository.pendingSummary(),
      duplicateHashes: await repository.duplicateHashSummary(),
    });
    return;
  }
  if (options.command === "report") {
    print(await repository.getRunReport(options.runId ?? ""));
    return;
  }

  if (options.command === "reindex") {
    const geminiEnv = requireGeminiEnv();
    const provider = new GeminiEstimateProvider(geminiEnv);
    print(await reindexApprovedSources(repository, provider, geminiEnv, options.limit ?? 100));
    return;
  }
  const configuration = extractionConfig(process.env);
  const model = configuration?.model ?? "salesflow-file-parser-v1";
  const providerEnv = { apiKey: configuration?.apiKey ?? "", extractionModel: model,
    retryModel: configuration?.provider === "gemini" ? process.env.GEMINI_RETRY_MODEL?.trim() || "gemini-3.8-flash" : model,
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001" };
  print(await runExtractionBatch(repository, makeExtractionProvider(configuration), env, providerEnv, {
    command: options.command,
    limit: options.limit,
    all: options.all,
    resume: options.resume,
    sourceId: options.sourceId,
  }));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "알 수 없는 배치 오류";
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
