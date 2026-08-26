import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDocumentOutputLocale } from "./documents/output-locale";
import { getDocumentPreviewCopy } from "./documents/preview-copy";

test("문서 출력 언어는 지원하는 세 언어만 허용한다", () => {
  assert.equal(normalizeDocumentOutputLocale("ko"), "ko");
  assert.equal(normalizeDocumentOutputLocale("ja"), "ja");
  assert.equal(normalizeDocumentOutputLocale("en"), "en");
  assert.equal(normalizeDocumentOutputLocale("fr", "ko"), "ko");
  assert.equal(normalizeDocumentOutputLocale(undefined), "ja");
});

test("미리보기 공통 라벨이 출력 언어별로 바뀐다", () => {
  assert.equal(getDocumentPreviewCopy("ko").itemName, "품번·품명");
  assert.equal(getDocumentPreviewCopy("ja").itemName, "品番・品名");
  assert.equal(getDocumentPreviewCopy("en").itemName, "Item no. / name");
});
