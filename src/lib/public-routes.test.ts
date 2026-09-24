import assert from "node:assert/strict";
import test from "node:test";
import { isPublicDocumentPath } from "./public-routes";

test("shared estimates and invoices are accessible to recipients in every locale", () => {
  for (const locale of ["ja", "ko", "en"]) {
    for (const type of ["estimates", "invoices"]) {
      assert.equal(isPublicDocumentPath(`/${locale}/${type}/shared/sample-token`), true);
    }
  }
});

test("ordinary and malformed document routes remain protected", () => {
  for (const path of ["/ja/invoices/123", "/ja/invoices/shared/", "/ja/invoices/shared/token/edit", "/ja/estimates", "/ja/receipts/shared/token"]) {
    assert.equal(isPublicDocumentPath(path), false);
  }
});
