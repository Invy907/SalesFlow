export function normalizeShowClientHonorific(value: unknown): boolean {
  return value !== false;
}

export function formatClientNameWithHonorific(
  clientName: string,
  honorific: string | null | undefined,
  showClientHonorific: boolean,
): string {
  const suffix = honorific?.trim() ?? "";
  const suffixes = [suffix, "님", "様", "御中"].filter(
    (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index,
  );

  let name = clientName.trim();
  for (const candidate of suffixes) {
    if (name.endsWith(candidate)) {
      name = name.slice(0, -candidate.length).trimEnd();
      break;
    }
  }

  if (!name || !showClientHonorific || !suffix) return name;
  return `${name} ${suffix}`;
}
