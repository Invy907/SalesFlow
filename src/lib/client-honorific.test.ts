import test from "node:test";
import assert from "node:assert/strict";
import {
  clientHonorificSuffix,
  formatClientNameWithHonorific,
  normalizeClientHonorific,
  normalizeShowClientHonorific,
} from "./documents/client-honorific";

test("honorific visibility defaults to the existing enabled behavior", () => {
  assert.equal(normalizeShowClientHonorific(undefined), true);
  assert.equal(normalizeShowClientHonorific(null), true);
  assert.equal(normalizeShowClientHonorific(true), true);
  assert.equal(normalizeShowClientHonorific(false), false);
});

test("client honorific can be added or removed without duplication", () => {
  assert.equal(formatClientNameWithHonorific("샘플 주식회사", "님", true), "샘플 주식회사 님");
  assert.equal(formatClientNameWithHonorific("샘플 주식회사 님", "님", true), "샘플 주식회사 님");
  assert.equal(formatClientNameWithHonorific("サンプル株式会社 様", "様", false), "サンプル株式会社");
  assert.equal(formatClientNameWithHonorific("Sample Inc.", "", true), "Sample Inc.");
});

test("경칭 종류는 기본이 御中이고 알 수 없는 값은 기본으로 떨어진다", () => {
  assert.equal(normalizeClientHonorific("onchu"), "onchu");
  assert.equal(normalizeClientHonorific("sama"), "sama");
  assert.equal(normalizeClientHonorific("none"), "none");
  assert.equal(normalizeClientHonorific(undefined), "onchu");
  assert.equal(normalizeClientHonorific(null), "onchu");
  assert.equal(normalizeClientHonorific("様"), "onchu");
  assert.equal(normalizeClientHonorific("", "sama"), "sama");
});

test("실제로 붙는 경칭은 문서 출력 언어를 따른다", () => {
  assert.equal(clientHonorificSuffix("onchu", "ja"), "御中");
  assert.equal(clientHonorificSuffix("sama", "ja"), "様");
  assert.equal(clientHonorificSuffix("none", "ja"), "");
  assert.equal(clientHonorificSuffix("onchu", "ko"), "귀중");
  assert.equal(clientHonorificSuffix("sama", "ko"), "님");
  assert.equal(clientHonorificSuffix("onchu", "en"), "");
  // 알 수 없는 언어는 일본어 기준으로 떨어진다.
  assert.equal(clientHonorificSuffix("onchu", "zh"), "御中");
});

test("御中 로 바꿔도 이름에 붙어 있던 다른 경칭은 중복되지 않는다", () => {
  assert.equal(
    formatClientNameWithHonorific("サンプル株式会社 様", clientHonorificSuffix("onchu", "ja"), true),
    "サンプル株式会社 御中",
  );
  assert.equal(
    formatClientNameWithHonorific("샘플 주식회사 귀중", clientHonorificSuffix("sama", "ko"), true),
    "샘플 주식회사 님",
  );
});
