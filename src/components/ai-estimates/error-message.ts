import type { AppLocaleCode } from "@/lib/locale";

const messages = {
  ja: { permission: "この操作を行う権限がありません。組織の管理者に確認してください。", disabled: "組織設定でAI見積アシストが無効になっています。", private: "個人資料の利用は組織設定で許可されていません。", duplicate: "この資料はすでに登録されています。AI資料一覧で確認してください。", conflict: "別の操作で資料が更新されました。入力内容を控え、最新の資料を読み直してから確認してください。", original: "原本ファイルが見つかりません。アップロードの状態を確認してください。", manual: "手動で保存した確認内容があります。確認画面で確認を続けてください。", state: "現在の資料の状態では操作できません。資料一覧で状態を確認してください。", validation: "入力内容と資料の状態を確認してください。数量は0より大きい値、単価は0以外、税区分は明示的に指定してください。", file: "ファイルの形式・サイズ・資料名を確認してください。PDF・JPG・PNG・CSV・XLSX・TXT・MD、最大20MBです。", extraction: "自動抽出を利用できません。原本と照合して手動で入力・確認してください。", missing: "資料が見つかりません。資料一覧で確認してください。" },
  ko: { permission: "이 작업을 수행할 권한이 없습니다. 조직 관리자에게 확인해 주세요.", disabled: "조직 설정에서 AI 견적 도우미가 꺼져 있습니다.", private: "조직 설정에서 개인 자료 사용을 허용하지 않았습니다.", duplicate: "이미 등록된 자료입니다. AI 자료함에서 확인해 주세요.", conflict: "다른 작업으로 자료가 변경되었습니다. 입력 내용을 보관하고 최신 자료를 다시 불러와 확인해 주세요.", original: "원본 파일을 찾을 수 없습니다. 업로드 상태를 확인해 주세요.", manual: "수동 저장한 검수 내용이 있습니다. 검수 화면에서 이어서 확인해 주세요.", state: "현재 자료 상태에서는 처리할 수 없습니다. 자료함에서 상태를 확인해 주세요.", validation: "입력 내용과 자료 상태를 확인해 주세요. 수량은 0보다 크게, 단가는 0이 아닌 값으로 입력하고 세금 구분을 확정해 주세요.", file: "파일 형식·크기·자료명을 확인해 주세요. PDF·JPG·PNG·CSV·XLSX·TXT·MD, 최대 20MB까지 지원합니다.", extraction: "자동 추출을 사용할 수 없습니다. 원본과 대조해 직접 입력하고 검수해 주세요.", missing: "자료를 찾을 수 없습니다. 자료함에서 확인해 주세요." },
  en: { permission: "You do not have permission for this action. Contact your organization administrator.", disabled: "The estimate assistant is disabled in organization settings.", private: "Private sources are not allowed in organization settings.", duplicate: "This source is already registered. Find it in the AI source library.", conflict: "Another operation changed this source. Keep a copy of your edits, then reload the latest source and review it again.", original: "The original file was not found. Check the upload status.", manual: "A manually reviewed version is already saved. Continue from the review page.", state: "This action is unavailable in the current source state. Check its status in the library.", validation: "Check the input and source state. Quantities must be positive, prices must be nonzero, and tax categories must be explicit.", file: "Check the file type, size, and source name. Supported: PDF, JPG, PNG, CSV, XLSX, TXT and MD, up to 20MB.", extraction: "Automatic extraction is unavailable. Enter and review the data against the original manually.", missing: "The source was not found. Check the AI source library." },
} as const;

// These are complete, safe generation messages. Match them before the broad review
// categories: e.g. "単価 / 단가" alone does not imply an invalid price input.
const generationMessages = {
  noPriceEvidence: {
    ja: "作業資料はありますが、単価候補がありません。承認済み単価表を追加するか、外部AI接続を確認してください。",
    ko: "작업 자료는 있지만 단가 후보가 없습니다. 승인된 단가표를 추가하거나 외부 AI 연결을 확인해 주세요.",
    en: "Work references are available, but no price candidates could be prepared. Add an approved rate card or check the AI connection.",
  },
  referenceUnavailable: {
    ja: "選択資料の承認状態・有効期間・取引先の適用条件を確認してください。",
    ko: "선택한 자료의 승인 상태·유효기간·거래처 적용 조건을 확인해 주세요.",
    en: "Check the selected references' approval, validity dates and client applicability.",
  },
  noEvidence: {
    ja: "関連する承認済み資料がありません。作業内容を具体的にするか、AI資料庫に見積を登録して承認してください。",
    ko: "관련된 승인 자료가 없습니다. 작업 내용을 구체적으로 입력하거나 AI 자료함에 견적을 등록하고 승인해 주세요.",
    en: "No related approved documents were found. Describe the work more specifically or upload and approve an estimate in the AI library.",
  },
  referenceChanged: {
    ja: "参考資料が変更されたか、現在は利用できません。新しい下書きを作成してください。",
    ko: "참고 자료가 변경되었거나 유효하지 않습니다. 새 초안을 만들어 주세요.",
    en: "Reference sources changed or are no longer eligible. Generate a new draft.",
  },
} as const;

export function isAiReviewConflict(message: string) { return /변경되었습니다|다른 작업|40001/.test(message); }
/** Keep localized action messages, translate expected source errors, and avoid exposing raw provider/SQL diagnostics. */
export function aiEstimateErrorMessage(message: string, lang: AppLocaleCode, fallback: string): string {
  const ui = messages[lang];
  for (const localized of Object.values(generationMessages)) {
    if (Object.values(localized).some(value => value === message)) return localized[lang];
  }
  if (message === "AI_REFERENCE_UNAVAILABLE" || message === "선택한 자료가 승인 상태·유효기간·거래처 조건에 맞는지 확인해 주세요.") return generationMessages.referenceUnavailable[lang];
  if (/\b(?:sql|supabase|postgres(?:ql)?)\b|PGRST\d+|SQLSTATE/i.test(message)) return fallback;
  if (isAiReviewConflict(message)) return ui.conflict;
  if (/같은 파일|이미 등록|23505/.test(message)) return ui.duplicate;
  if (/개인 자료.*허용/.test(message)) return ui.private;
  if (/기능이 꺼|비활성화/.test(message)) return ui.disabled;
  if (/권한|관리자만|Unauthorized|permission required|42501/i.test(message)) return ui.permission;
  if (/수동 검수.*저장|human/i.test(message)) return ui.manual;
  if (/원본.*(?:찾|없습니다)/.test(message)) return ui.original;
  if (/자료.*찾|올바르지 않은 자료/.test(message)) return ui.missing;
  if (/세금|품목명|수량|단가|검수 내용|입력과 자료/.test(message)) return ui.validation;
  if (/파일 형식|형식과 크기|파일.*크기/.test(message)) return ui.file;
  if (/현재 상태|제외된 자료|상태에서는/.test(message)) return ui.state;
  if (/자동 추출|외부 AI/.test(message)) return ui.extraction;
  if (/[가-힣]/.test(message)) return lang === "ko" ? message : fallback;
  if (/invalid|too (?:big|small)|expected|fetch|network|sql|supabase|postgres|AI_[A-Z_]+/i.test(message)) return fallback;
  return message || fallback;
}
