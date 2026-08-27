/**
 * 정기 청구 예약의 가변 문자열 치환.
 *
 * 예약은 "매월 같은 내용"을 반복 생성하므로, 제목·비고·품명에 `{month}` `{year}`
 * 같은 토큰을 넣어 두면 생성 시점(청구일)에 맞춰 자동으로 바뀐다.
 * 자동 메일 제목·본문에서는 `{client_name}` `{invoice_number}` `{share_url}` 도 쓸 수 있다.
 *
 * 정의되지 않은 토큰은 치환하지 않고 원문 그대로 남긴다.
 * (오타 때문에 문구가 사라지는 것보다 눈에 띄는 편이 낫다.)
 */

export type TemplateVars = Record<string, string>;

const TOKEN_RE = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

export function applyTemplateVars(
  template: string | null | undefined,
  vars: TemplateVars,
): string {
  if (!template) return "";
  return template.replace(TOKEN_RE, (match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

/** 청구일(YYYY-MM-DD) 기준 문서용 토큰. */
export function documentTemplateVars(issueDate: string): TemplateVars {
  const [year, month] = issueDate.split("-");
  const monthNumber = Number(month);
  return {
    year: year ?? "",
    // 「8月分」처럼 쓰이므로 0 을 채우지 않는다.
    month: Number.isFinite(monthNumber) && monthNumber > 0 ? String(monthNumber) : "",
  };
}

/** 자동 메일용 토큰. 문서용 토큰을 그대로 포함한다. */
export function emailTemplateVars(input: {
  issueDate: string;
  clientName: string;
  invoiceNumber: string;
  shareUrl: string;
}): TemplateVars {
  return {
    ...documentTemplateVars(input.issueDate),
    client_name: input.clientName,
    invoice_number: input.invoiceNumber,
    share_url: input.shareUrl,
  };
}
