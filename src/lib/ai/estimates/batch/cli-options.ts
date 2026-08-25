export const CLI_COMMANDS = [
  "dry-run",
  "smoke",
  "pilot",
  "ingest",
  "retry",
  "verify",
  "reindex",
  "report",
] as const;

export type CliCommand = (typeof CLI_COMMANDS)[number];

export interface CliOptions {
  command: CliCommand;
  limit: number | null;
  all: boolean;
  confirm: boolean;
  resume: boolean;
  sourceId?: string;
  runId?: string;
}

function positiveInt(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name}은 1 이상의 정수여야 합니다.`);
  return parsed;
}

export function parseCliOptions(argv: string[]): CliOptions {
  const command = argv[0] as CliCommand | undefined;
  if (!command || !CLI_COMMANDS.includes(command)) {
    throw new Error(`명령이 필요합니다: ${CLI_COMMANDS.join(", ")}`);
  }

  const options: CliOptions = {
    command,
    limit: null,
    all: false,
    confirm: false,
    resume: false,
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--limit") options.limit = positiveInt(argv[++index], "--limit");
    else if (argument === "--all") options.all = true;
    else if (argument === "--confirm") options.confirm = true;
    else if (argument === "--resume") options.resume = true;
    else if (argument === "--source-id") options.sourceId = argv[++index];
    else if (argument === "--run-id") options.runId = argv[++index];
    else throw new Error(`알 수 없는 옵션: ${argument}`);
  }

  if (options.all && !options.confirm) throw new Error("--all은 --confirm과 함께 사용해야 합니다.");
  if (command === "smoke") {
    options.limit = Math.min(options.limit ?? 3, 3);
    options.all = false;
  }
  if (command === "pilot") options.limit = Math.min(options.limit ?? 100, 300);
  if (command === "retry") options.limit ??= 100;
  if (command === "reindex") options.limit ??= 100;
  if (command === "ingest" && !options.all && options.limit === null) {
    throw new Error("ingest에는 --limit N 또는 --all --confirm이 필요합니다.");
  }
  if (command === "report" && !options.runId) throw new Error("report에는 --run-id가 필요합니다.");
  return options;
}
