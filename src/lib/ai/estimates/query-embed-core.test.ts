import assert from "node:assert/strict";
import test from "node:test";
import { embedQueryWithConsent, normalizeQueryEmbedding, QUERY_EMBEDDING_DIM } from "./query-embed-core";

test("외부처리 동의 없거나 공급자 미설정이면 네트워크 콜백을 호출하지 않는다", async () => {
  let calls = 0;
  const request = async () => { calls++; return Array(1536).fill(1); };
  assert.equal(await embedQueryWithConsent({ text: "기밀 견적", allowExternalProcessing: false, configured: true, request }), null);
  assert.equal(await embedQueryWithConsent({ text: "기밀 견적", allowExternalProcessing: true, configured: false, request }), null);
  assert.equal(calls, 0);
});
test("검색 임베딩은 1536차원 유한 벡터를 단위 길이로 정규화한다", async () => {
  const result = await embedQueryWithConsent({ text: "검색", allowExternalProcessing: true, configured: true,
    request: async () => Array(QUERY_EMBEDDING_DIM).fill(2) });
  assert.ok(result);
  assert.ok(Math.abs(Math.hypot(...result) - 1) < 1e-12);
  for (const bad of [undefined, [], [1, 2], Array(1536).fill(0), Array(1536).fill(NaN)]) assert.equal(normalizeQueryEmbedding(bad), null);
});
test("공급자 오류는 로컬 검색으로 안전하게 전환할 수 있다", async () => {
  assert.equal(await embedQueryWithConsent({ text: "검색", allowExternalProcessing: true, configured: true,
    request: async () => { throw new Error("provider timeout"); } }), null);
});
