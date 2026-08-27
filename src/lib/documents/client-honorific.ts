/**
 * 거래처 경칭.
 *
 * 문서마다 「御中」(법인 기본) / 「様」(개인) / 표시 안 함 중에서 고른다.
 * 실제로 붙는 문자열은 문서의 출력 언어에 따라 달라지므로 여기서 한 곳에 모아 둔다.
 */

export const CLIENT_HONORIFICS = ["onchu", "sama", "none"] as const;
export type ClientHonorific = (typeof CLIENT_HONORIFICS)[number];

/** 신규 문서 기본값. 법인 거래가 대부분이라 「御中」. */
export const DEFAULT_CLIENT_HONORIFIC: ClientHonorific = "onchu";

const SUFFIXES: Record<string, Record<ClientHonorific, string>> = {
  ja: { onchu: "御中", sama: "様", none: "" },
  ko: { onchu: "귀중", sama: "님", none: "" },
  en: { onchu: "", sama: "", none: "" },
};

export function normalizeClientHonorific(
  value: unknown,
  fallback: ClientHonorific = DEFAULT_CLIENT_HONORIFIC,
): ClientHonorific {
  return CLIENT_HONORIFICS.includes(value as ClientHonorific)
    ? (value as ClientHonorific)
    : fallback;
}

/** 출력 언어 기준으로 실제 붙일 경칭 문자열. 표시하지 않으면 빈 문자열. */
export function clientHonorificSuffix(honorific: ClientHonorific, outputLocale: string): string {
  return (SUFFIXES[outputLocale] ?? SUFFIXES.ja)[honorific] ?? "";
}

export function normalizeShowClientHonorific(value: unknown): boolean {
  return value !== false;
}

export function formatClientNameWithHonorific(
  clientName: string,
  honorific: string | null | undefined,
  showClientHonorific: boolean,
): string {
  const suffix = honorific?.trim() ?? "";
  const suffixes = [suffix, "님", "귀중", "様", "御中"].filter(
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
