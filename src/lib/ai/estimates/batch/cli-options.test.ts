import assert from "node:assert/strict";
import test from "node:test";
import { parseCliOptions } from "./cli-options";

test("smoke는 최대 3건으로 제한한다", () => {
  assert.equal(parseCliOptions(["smoke", "--limit", "100"]).limit, 3);
});

test("pilot는 최대 300건으로 제한한다", () => {
  assert.equal(parseCliOptions(["pilot", "--limit", "1000"]).limit, 300);
});

test("제한 없는 ingest를 거부한다", () => {
  assert.throws(() => parseCliOptions(["ingest"]), /--limit/);
  assert.throws(() => parseCliOptions(["ingest", "--all"]), /--confirm/);
});

test("전체 실행은 명시적 확인이 있어야 한다", () => {
  const parsed = parseCliOptions(["ingest", "--all", "--confirm"]);
  assert.equal(parsed.all, true);
  assert.equal(parsed.confirm, true);
});

test("report는 run id를 요구한다", () => {
  assert.throws(() => parseCliOptions(["report"]), /--run-id/);
});
