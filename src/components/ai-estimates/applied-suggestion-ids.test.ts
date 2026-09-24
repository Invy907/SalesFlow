import test from "node:test";
import assert from "node:assert/strict";
import { nextAppliedSuggestionIds } from "./applied-suggestion-ids";

test("appends unique evidence but replaces provenance with replaced lines", () => {
  assert.deepEqual(nextAppliedSuggestionIds(["a"], "b", { mode: "append", lineIndexes: [0] }), ["a", "b"]);
  assert.deepEqual(nextAppliedSuggestionIds(["a"], "a", { mode: "append", lineIndexes: [1] }), ["a"]);
  assert.deepEqual(nextAppliedSuggestionIds(["a"], "b", { mode: "replace", lineIndexes: [0] }), ["b"]);
  assert.deepEqual(nextAppliedSuggestionIds(["a"], "b", { mode: "replace", lineIndexes: [] }), ["a", "b"]);
});
test("twenty evidence records are bounded without blocking replacement or duplicates", () => {
  const ids = Array.from({ length: 20 }, (_, i) => String(i));
  assert.equal(nextAppliedSuggestionIds(ids, "new", { mode: "append", lineIndexes: [0] }), null);
  assert.deepEqual(nextAppliedSuggestionIds(ids, "new", { mode: "replace", lineIndexes: [0] }), ["new"]);
  assert.deepEqual(nextAppliedSuggestionIds(ids, "0", { mode: "append", lineIndexes: [] }), ids);
});
