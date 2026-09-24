import assert from "node:assert/strict";
import test from "node:test";
import { localizedRequestUrl } from "./locale";

test("locale rewriting preserves document conversion and list filters", () => {
  for (const path of [
    "/invoices/new?fromEstimate=estimate-id&clientId=client-id",
    "/invoices/new?copyFrom=invoice-id",
    "/estimates?q=QA%20%E5%89%B2%E5%BC%95&page=2&tab=1&issueFlag=1",
    "/auth/reset-password?code=test-code",
  ]) {
    const source = new URL(path, "http://localhost:33100");
    const rewritten = localizedRequestUrl(source.href, "ko");
    assert.equal(rewritten.pathname, `/ko${source.pathname}`);
    assert.equal(rewritten.search, source.search);
    assert.equal(rewritten.origin, source.origin);
  }
});

test("home rewrite retains query parameters without an extra slash", () => {
  assert.equal(localizedRequestUrl("https://example.test/?from=home", "ja").href, "https://example.test/ja?from=home");
});
