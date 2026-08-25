import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTransition,
  canTransition,
  InvalidStatusTransitionError,
  toLegacySourceStatus,
} from "./status";

test("허용된 배치 상태 전이를 통과시킨다", () => {
  assert.equal(canTransition("uploaded", "queued"), true);
  assert.equal(canTransition("queued", "extracting"), true);
  assert.doesNotThrow(() => assertTransition("validating", "needs_review"));
  assert.doesNotThrow(() => assertTransition("extracted", "failed_retryable"));
});

test("허용되지 않은 상태 전이를 거부한다", () => {
  assert.throws(
    () => assertTransition("uploaded", "indexed"),
    InvalidStatusTransitionError,
  );
});

test("상세 상태를 기존 UI 상태로 매핑한다", () => {
  assert.equal(toLegacySourceStatus("extracting"), "processing");
  assert.equal(toLegacySourceStatus("needs_review"), "review_required");
  assert.equal(toLegacySourceStatus("indexed"), "approved");
});
