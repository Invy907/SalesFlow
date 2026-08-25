import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export interface LocalEstimateFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  size: number;
}

async function walk(root: string, current: string, output: LocalEstimateFile[]): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(root, absolutePath, output);
      continue;
    }
    if (!entry.isFile()) continue;
    const mimeType = MIME_BY_EXTENSION[path.extname(entry.name).toLocaleLowerCase()];
    if (!mimeType) continue;
    const info = await stat(absolutePath);
    output.push({
      absolutePath,
      relativePath: path.relative(root, absolutePath),
      fileName: entry.name,
      mimeType,
      size: info.size,
    });
  }
}

export async function discoverLocalEstimateFiles(root: string): Promise<LocalEstimateFile[]> {
  const info = await stat(root);
  if (!info.isDirectory()) throw new Error(`AI_ESTIMATE_SOURCE_DIR가 폴더가 아닙니다: ${root}`);
  const files: LocalEstimateFile[] = [];
  await walk(root, root, files);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function readAndHashLocalFile(file: LocalEstimateFile): Promise<{
  bytes: Buffer;
  sha256: string;
}> {
  const bytes = await readFile(file.absolutePath);
  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
