import assert from "node:assert/strict";
import test from "node:test";
import { isCanonicalEstimateSourcePath } from "./source-path";

const org = "00000000-0000-4000-8000-000000003591";
const id = "00000000-0000-4000-8000-000000003592";
const foreignOrg = "00000000-0000-4000-8000-000000003593";
const source = { id, organization_id: org, storage_path: `${org}/${id}/original.pdf`, mime_type: "application/pdf" };

test("등록 자료의 조직·자료ID·MIME에 정확히 맞는 원본 경로만 허용한다", () => {
  assert.equal(isCanonicalEstimateSourcePath(org, source), true);
  assert.equal(isCanonicalEstimateSourcePath(org, { ...source, storage_path: `${org}/${id}/original.png`, mime_type: "image/png" }), true);
  for (const extension of ["jpg", "jpeg"]) {
    assert.equal(isCanonicalEstimateSourcePath(org, { ...source, storage_path: `${org}/${id}/original.${extension}`, mime_type: "image/jpeg" }), true);
  }
});

test("위조한 다른 조직/자료 경로나 우회 문자열로 service Storage를 읽지 못한다", () => {
  for (const storage_path of [
    `${foreignOrg}/${id}/original.pdf`, `${org}/${foreignOrg}/original.pdf`,
    `${org}/${id}/../original.pdf`, `${org}/${id}/nested/original.pdf`,
    `${org}/${id}/original.pdf/extra`, `${org}/${id}/original.png`,
    `${org}/${id}/%2E%2E%2Foriginal.pdf`, `${org}/${id}/original.pdf?download=1`,
    `https://example.invalid/${org}/${id}/original.pdf`, null,
  ]) assert.equal(isCanonicalEstimateSourcePath(org, { ...source, storage_path }), false);
  assert.equal(isCanonicalEstimateSourcePath(org, { ...source, organization_id: foreignOrg }), false);
  assert.equal(isCanonicalEstimateSourcePath(foreignOrg, source), false);
});
