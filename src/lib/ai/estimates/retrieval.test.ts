import assert from "node:assert/strict";
import test from "node:test";
import { HYBRID_WEIGHTS, KEYWORD_ONLY_WEIGHTS, computeHybridScore, distanceToSimilarity, mergeChannelScores, rankRetrievalCandidates, searchTerms, tokenScore, vectorLiteral } from "./retrieval";

test("일본어 무공백·한국어 조사·전각 문자를 검색한다", () => {
  assert.ok(tokenScore("ホームページ制作の見積もり", "ホームページ制作") >= 0.25);
  assert.ok(tokenScore("홈페이지를 리뉴얼", "홈페이지 리뉴얼 견적") >= 0.5);
  assert.equal(tokenScore("ＷＥＢ DESIGN", "web design"), 1);
  assert.equal(tokenScore("홈페이지", "서버 구축"), 0);
  assert.equal(tokenScore("", "문서"), 0);
  assert.deepEqual(searchTerms("デザイン デザイン"), ["デザ", "ザイ", "イン"]);
});
test("직교·반대 벡터는 관련성으로 처리하지 않는다", () => {
  assert.equal(distanceToSimilarity(0), 1);
  assert.equal(distanceToSimilarity(0.2), 0.8);
  for (const distance of [1, 2, NaN, Infinity]) assert.equal(distanceToSimilarity(distance), 0);
});
test("거래처 보너스만으로 무관한 자료를 채택하지 않는다", () => {
  for (const weights of [HYBRID_WEIGHTS, KEYWORD_ONLY_WEIGHTS]) {
    assert.equal(computeHybridScore({ keywordScore: 0.1, vectorScore: 0.1, sameClient: true, weights }), 0);
  }
  const ranked = rankRetrievalCandidates({ candidates: [
    { exampleId: "relevant", keywordScore: 0.6, vectorScore: 0.7 },
    { exampleId: "same-client", keywordScore: 0.4, vectorScore: 0.4, sameClient: true },
    { exampleId: "unrelated", keywordScore: 0, vectorScore: 0, sameClient: true },
  ], weights: HYBRID_WEIGHTS, limit: 10 });
  assert.deepEqual(ranked.map((row) => row.exampleId), ["relevant", "same-client"]);
});
test("의미 검색은 최소 코사인 유사도를 충족해야 한다", () => {
  const ranked = rankRetrievalCandidates({ candidates: [
    { exampleId: "weak", keywordScore: 0, vectorScore: 0.64 },
    { exampleId: "strong", keywordScore: 0, vectorScore: 0.8 },
    { exampleId: "local", keywordScore: 1, vectorScore: 0 },
  ], weights: HYBRID_WEIGHTS, limit: 10 });
  assert.deepEqual(ranked.map((row) => row.exampleId), ["strong", "local"]);
});
test("청크는 문서로 중복 제거하고 동점 결과는 안정적으로 정렬한다", () => {
  const candidates = mergeChannelScores([{ exampleId: "a", score: 0.6 }], [
    { exampleId: "a", similarity: 0.4 }, { exampleId: "a", similarity: 0.9 }, { exampleId: "b", similarity: 0.9 },
  ]);
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].vectorScore, 0.9);
  assert.deepEqual(rankRetrievalCandidates({ candidates: [
    { exampleId: "b", keywordScore: 1, vectorScore: 0 }, { exampleId: "a", keywordScore: 1, vectorScore: 0 },
  ], weights: KEYWORD_ONLY_WEIGHTS, limit: 1 }).map((row) => row.exampleId), ["a"]);
});
test("벡터 직렬화에 비정상 수치를 허용하지 않는다", () => {
  assert.equal(vectorLiteral([0.1, -0.2, 0]), "[0.1,-0.2,0]");
  assert.throws(() => vectorLiteral([NaN]));
  assert.throws(() => vectorLiteral([]));
});
