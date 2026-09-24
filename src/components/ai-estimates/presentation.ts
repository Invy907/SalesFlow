import type { AppLocaleCode } from "@/lib/locale";

export function aiTaxCategoryLabel(category: string | null | undefined, lang: AppLocaleCode) {
  if (category === "standard_10") return "10%";
  if (category === "standard_8") return "8%";
  if (category === "standard_5") return "5%";
  if (category === "reduced_8") return { ja: "軽減8%", ko: "경감 8%", en: "Reduced 8%" }[lang];
  if (category === "exempt") return { ja: "対象外", ko: "대상 외", en: "Exempt" }[lang];
  return { ja: "税率未確認", ko: "세율 미확인", en: "Tax rate unverified" }[lang];
}

const manualScaffold = {
  ja: { name: "確認が必要です", reason: "原本の品目名、数量、単価と税区分を入力してください。", warning: "外部AIによる自動抽出は無効です。原本を見ながら手動で入力・確認してください。" },
  ko: { name: "확인 필요", reason: "원본 견적의 품목명, 수량, 단가와 세금 구분을 입력해 주세요.", warning: "외부 AI 추출이 비활성화되어 있습니다. 자동 추출된 내용이 아니므로 원본을 보며 입력하고 검수해 주세요." },
  en: { name: "Review required", reason: "Enter the item name, quantity, unit price, and tax category from the original.", warning: "External AI extraction is disabled. These are placeholders; enter and review the data against the original manually." },
};

/** Translate only our fixed manual placeholders, never original or model-extracted document content. */
export function localizeManualScaffold<T extends { lines: Array<{ name: string; reason: string }>; warnings: string[] }>(value: T, provider: string | null, lang: AppLocaleCode): T {
  if (provider !== "manual-review") return value;
  const source = manualScaffold.ko;
  const translated = manualScaffold[lang];
  return { ...value, lines: value.lines.map((line) => ({ ...line,
    name: line.name === source.name && line.reason === source.reason ? translated.name : line.name,
    reason: line.reason === source.reason ? translated.reason : line.reason,
  })), warnings: value.warnings.map((warning) => warning === source.warning ? translated.warning : warning) };
}
