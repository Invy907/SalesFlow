import assert from "node:assert/strict";
import test from "node:test";
import { applyTemplateVars, documentTemplateVars, emailTemplateVars } from "./template-vars";

test("{month}/{year} 는 청구일 기준으로 치환된다", () => {
  const vars = documentTemplateVars("2026-08-27");
  assert.deepEqual(vars, { year: "2026", month: "8" });
  assert.equal(applyTemplateVars("{year}年{month}月分 保守料", vars), "2026年8月分 保守料");
});

test("월은 0 을 채우지 않는다", () => {
  assert.equal(applyTemplateVars("{month}월분", documentTemplateVars("2026-01-05")), "1월분");
  assert.equal(applyTemplateVars("{month}월분", documentTemplateVars("2026-12-05")), "12월분");
});

test("같은 토큰이 여러 번 나와도 모두 치환된다", () => {
  assert.equal(
    applyTemplateVars("{year}/{month} ~ {year}/{month}", documentTemplateVars("2026-03-01")),
    "2026/3 ~ 2026/3",
  );
});

test("정의되지 않은 토큰은 원문 그대로 남는다", () => {
  assert.equal(
    applyTemplateVars("{month}월 {unknown}", documentTemplateVars("2026-05-01")),
    "5월 {unknown}",
  );
});

test("빈 템플릿은 빈 문자열", () => {
  assert.equal(applyTemplateVars(null, {}), "");
  assert.equal(applyTemplateVars(undefined, {}), "");
  assert.equal(applyTemplateVars("", {}), "");
});

test("메일 토큰은 문서 토큰을 포함한다", () => {
  const vars = emailTemplateVars({
    issueDate: "2026-08-01",
    clientName: "라온 주식회사",
    invoiceNumber: "20260801-001",
    shareUrl: "https://example.com/salesflow/invoices/shared/abc",
  });

  assert.equal(
    applyTemplateVars("{client_name} 님, {month}월분 청구서({invoice_number})", vars),
    "라온 주식회사 님, 8월분 청구서(20260801-001)",
  );
  assert.equal(
    applyTemplateVars("확인: {share_url}", vars),
    "확인: https://example.com/salesflow/invoices/shared/abc",
  );
});

test("대소문자를 섞어 써도 같은 토큰으로 본다", () => {
  assert.equal(applyTemplateVars("{Month}/{YEAR}", documentTemplateVars("2026-07-01")), "7/2026");
});
