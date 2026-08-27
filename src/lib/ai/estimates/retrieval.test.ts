import assert from "node:assert/strict";
import test from "node:test";
import {
  HYBRID_WEIGHTS,
  KEYWORD_ONLY_WEIGHTS,
  SAME_CLIENT_BONUS,
  computeHybridScore,
  distanceToSimilarity,
  mergeChannelScores,
  rankRetrievalCandidates,
  tokenScore,
  vectorLiteral,
} from "./retrieval";

test("토큰 겹침 비율로 키워드 점수를 낸다", () => {
  assert.equal(tokenScore("홈페이지 리뉴얼", "A사 홈페이지 리뉴얼 견적"), 1);
  assert.equal(tokenScore("홈페이지 리뉴얼", "홈페이지 유지보수"), 0.5);
  assert.equal(tokenScore("홈페이지", "서버 구축"), 0);
  assert.equal(tokenScore("", "무엇이든"), 0);
});

test("코사인 거리를 0~1 유사도로 바꾼다", () => {
  assert.equal(distanceToSimilarity(0), 1);
  assert.equal(distanceToSimilarity(1), 0.5);
  assert.equal(distanceToSimilarity(2), 0);
  assert.equal(distanceToSimilarity(Number.NaN), 0);
  assert.equal(distanceToSimilarity(-1), 1);
  assert.equal(distanceToSimilarity(5), 0);
});

test("하이브리드 점수는 채널 가중치와 거래처 가산을 합산한다", () => {
  const keywordOnlyChannel = computeHybridScore({
    keywordScore: 1,
    vectorScore: 0,
    sameClient: false,
    weights: HYBRID_WEIGHTS,
  });
  assert.equal(keywordOnlyChannel, HYBRID_WEIGHTS.keyword);

  const vectorOnlyChannel = computeHybridScore({
    keywordScore: 0,
    vectorScore: 1,
    sameClient: false,
    weights: HYBRID_WEIGHTS,
  });
  assert.equal(vectorOnlyChannel, HYBRID_WEIGHTS.vector);

  const withBonus = computeHybridScore({
    keywordScore: 0.5,
    vectorScore: 0.5,
    sameClient: true,
    weights: HYBRID_WEIGHTS,
  });
  assert.equal(withBonus, 0.5 + SAME_CLIENT_BONUS);
});

test("하이브리드 점수는 1을 넘지 않는다", () => {
  const score = computeHybridScore({
    keywordScore: 1,
    vectorScore: 1,
    sameClient: true,
    weights: HYBRID_WEIGHTS,
  });
  assert.equal(score, 1);
});

test("벡터 채널이 없으면 하이브리드 도입 전과 같은 점수를 낸다", () => {
  for (const keywordScore of [0.25, 0.5, 1]) {
    for (const sameClient of [false, true]) {
      const legacy = Math.min(1, keywordScore + (sameClient ? SAME_CLIENT_BONUS : 0));
      const current = computeHybridScore({
        keywordScore,
        vectorScore: 0,
        sameClient,
        weights: KEYWORD_ONLY_WEIGHTS,
      });
      assert.equal(current, legacy);
    }
  }
});

test("두 채널 결과를 example 단위로 합치고 청크 중 가장 가까운 값만 남긴다", () => {
  const merged = mergeChannelScores(
    [{ exampleId: "a", score: 0.6 }],
    [
      { exampleId: "a", similarity: 0.4 },
      { exampleId: "a", similarity: 0.9 },
      { exampleId: "b", similarity: 0.7 },
    ],
  );

  const byId = new Map(merged.map((row) => [row.exampleId, row]));
  assert.equal(merged.length, 2);
  assert.deepEqual(byId.get("a"), { exampleId: "a", keywordScore: 0.6, vectorScore: 0.9 });
  assert.deepEqual(byId.get("b"), { exampleId: "b", keywordScore: 0, vectorScore: 0.7 });
});

test("한쪽 채널에만 있는 후보도 랭킹에 포함한다", () => {
  const ranked = rankRetrievalCandidates({
    candidates: [
      { exampleId: "keyword-only", keywordScore: 0.9, vectorScore: 0 },
      { exampleId: "vector-only", keywordScore: 0, vectorScore: 0.9 },
      { exampleId: "no-match", keywordScore: 0, vectorScore: 0 },
    ],
    weights: HYBRID_WEIGHTS,
    limit: 10,
  });

  assert.deepEqual(ranked.map((row) => row.exampleId), ["vector-only", "keyword-only"]);
});

test("점수 내림차순으로 정렬하고 limit 까지만 남긴다", () => {
  const ranked = rankRetrievalCandidates({
    candidates: [
      { exampleId: "low", keywordScore: 0.1, vectorScore: 0.1 },
      { exampleId: "high", keywordScore: 0.9, vectorScore: 0.9 },
      { exampleId: "mid", keywordScore: 0.5, vectorScore: 0.5 },
    ],
    weights: HYBRID_WEIGHTS,
    limit: 2,
  });

  assert.deepEqual(ranked.map((row) => row.exampleId), ["high", "mid"]);
});

test("거래처가 같으면 키워드 점수가 낮아도 앞으로 올라온다", () => {
  const ranked = rankRetrievalCandidates({
    candidates: [
      { exampleId: "other-client", keywordScore: 0.6, vectorScore: 0.6, sameClient: false },
      { exampleId: "same-client", keywordScore: 0.4, vectorScore: 0.4, sameClient: true },
    ],
    weights: HYBRID_WEIGHTS,
    limit: 2,
  });

  assert.equal(ranked[0].exampleId, "same-client");
});

test("벡터 리터럴은 배치 저장 형식과 같다", () => {
  assert.equal(vectorLiteral([0.1, -0.2, 0]), "[0.1,-0.2,0]");
});
