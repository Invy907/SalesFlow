import test from "node:test";
import assert from "node:assert/strict";
import { aiEstimateErrorMessage, isAiReviewConflict } from "../../../components/ai-estimates/error-message";

test("review conflicts preserve actionable recovery in every UI language", () => {
  const message = "다른 작업으로 자료가 변경되었습니다. 새로고침 후 다시 시도해 주세요.";
  assert.equal(isAiReviewConflict(message), true);
  assert.match(aiEstimateErrorMessage(message, "en", "Failed"), /copy of your edits/);
  assert.doesNotMatch(aiEstimateErrorMessage(message, "ja", "Failed"), /[가-힣]/);
});
test("duplicate and permission failures stay useful without Korean leakage", () => {
  assert.match(aiEstimateErrorMessage("같은 파일이 이미 AI 자료함에 있습니다.", "en", "Failed"), /already registered/);
  assert.match(aiEstimateErrorMessage("조직 관리자만 승인할 수 있습니다.", "en", "Failed"), /permission/);
  assert.equal(aiEstimateErrorMessage("AI_SETTINGS_UNAVAILABLE", "ja", "再試行してください。"), "再試行してください。");
  assert.equal(aiEstimateErrorMessage("sql: secret provider detail", "en", "Try again"), "Try again");
});

test("manual scaffold localization never changes document text from an extraction provider", async () => {
  const { localizeManualScaffold } = await import("../../../components/ai-estimates/presentation");
  const value = { lines: [{ name: "확인 필요", reason: "원본 견적의 품목명, 수량, 단가와 세금 구분을 입력해 주세요." }, { name: "사용자 원본", reason: "사용자 메모" }], warnings: ["원본의 한국어 경고"] };
  assert.equal(localizeManualScaffold(value, "manual-review", "en").lines[0].name, "Review required");
  assert.deepEqual(localizeManualScaffold(value, "manual-review", "ja").lines[1], value.lines[1]);
  assert.equal(localizeManualScaffold(value, "gemini", "en"), value);
});

test("context-only generation preserves its actionable no-price guidance in every language", () => {
  const values = {
    ja: "作業資料はありますが、単価候補がありません。承認済み単価表を追加するか、外部AI接続を確認してください。",
    ko: "작업 자료는 있지만 단가 후보가 없습니다. 승인된 단가표를 추가하거나 외부 AI 연결을 확인해 주세요.",
    en: "Work references are available, but no price candidates could be prepared. Add an approved rate card or check the AI connection.",
  } as const;
  for (const lang of ["ja", "ko", "en"] as const) {
    assert.equal(aiEstimateErrorMessage(values[lang], lang, "Failed"), values[lang]);
    assert.equal(aiEstimateErrorMessage(values.ko, lang, "Failed"), values[lang]);
  }
});

test("missing or ineligible generation references are not classified as review-field errors", () => {
  const missing = {
    ja: "関連する承認済み資料がありません。作業内容を具体的にするか、AI資料庫に見積を登録して承認してください。",
    ko: "관련된 승인 자료가 없습니다. 작업 내용을 구체적으로 입력하거나 AI 자료함에 견적을 등록하고 승인해 주세요.",
    en: "No related approved documents were found. Describe the work more specifically or upload and approve an estimate in the AI library.",
  } as const;
  const unavailable = {
    ja: "選択資料の承認状態・有効期間・取引先の適用条件を確認してください。",
    ko: "선택한 자료의 승인 상태·유효기간·거래처 적용 조건을 확인해 주세요.",
    en: "Check the selected references' approval, validity dates and client applicability.",
  } as const;
  for (const lang of ["ja", "ko", "en"] as const) {
    assert.equal(aiEstimateErrorMessage(missing[lang], lang, "Failed"), missing[lang]);
    assert.equal(aiEstimateErrorMessage(unavailable[lang], lang, "Failed"), unavailable[lang]);
    assert.equal(aiEstimateErrorMessage("AI_REFERENCE_UNAVAILABLE", lang, "Failed"), unavailable[lang]);
  }
  assert.match(aiEstimateErrorMessage("참고 자료가 변경되었거나 유효하지 않습니다. 새 초안을 만들어 주세요.", "en", "Failed"), /Generate a new draft/);
});

test("review validation and seven supported file types stay accurate; SQL details remain hidden", () => {
  assert.match(aiEstimateErrorMessage("모든 품목의 수량·단가를 확인해 주세요.", "en", "Failed"), /Quantities must be positive/);
  for (const lang of ["ja", "ko", "en"] as const) {
    const file = aiEstimateErrorMessage("파일 형식, 크기와 제목을 확인해 주세요.", lang, "Failed");
    for (const format of ["PDF", "JPG", "PNG", "CSV", "XLSX", "TXT", "MD"]) assert.ok(file.includes(format));
    assert.equal(aiEstimateErrorMessage("SQLSTATE 42703: 단가 column secret_internal_field missing", lang, "Failed"), "Failed");
    assert.equal(aiEstimateErrorMessage("PGRST201 ambiguous relationship secret_table", lang, "Failed"), "Failed");
  }
});
