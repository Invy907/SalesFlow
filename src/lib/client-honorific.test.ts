import test from "node:test";
import assert from "node:assert/strict";
import {
  formatClientNameWithHonorific,
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
