import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { AiEstimateBatchRepository, type BatchSource } from "./repository";
import type { BatchEnv } from "./env";

const env: BatchEnv = {
  supabaseUrl: "https://fixture.invalid", supabaseServiceRoleKey: "synthetic-test-key",
  organizationId: "fixture-org", actorUserId: "fixture-owner", sourceDir: null,
  storageBucket: "ai-estimate-sources", concurrency: 1, maxRetry: 3,
  confidenceThreshold: 0.8, totalToleranceMinorUnits: 1, inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0,
};
const source: BatchSource = {
  id: "fixture-source", organization_id: env.organizationId, uploaded_by: env.actorUserId!,
  title: "Synthetic rate card", status: "processing", visibility: "organization",
  storage_path: null, mime_type: "text/csv", page_count: null, document_kind: "price_list",
};
type Settings = { enabled: boolean; allow_external_processing: boolean; allow_private_sources: boolean };
function repositoryWithSettings(t: TestContext, settings: Settings | null, options: { role?: string; settingsError?: boolean } = {}) {
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.origin, env.supabaseUrl);
    assert.equal(url.searchParams.get("organization_id"), `eq.${env.organizationId}`);
    if (url.pathname === "/rest/v1/organization_members") {
      assert.equal(url.searchParams.get("user_id"), `eq.${env.actorUserId}`);
      return Response.json([{ role: options.role ?? "owner" }]);
    }
    assert.equal(url.pathname, "/rest/v1/ai_estimate_settings");
    return options.settingsError ? Response.json({ message: "Synthetic read failure" }, { status: 403 })
      : Response.json(settings ? [settings] : []);
  });
  return new AiEstimateBatchRepository(env);
}

test("new organizations without settings may process organization-local documents", async (t) => {
  const repository = repositoryWithSettings(t, null);
  await assert.doesNotReject(repository.assertProcessingAllowed());
  await assert.doesNotReject(repository.assertProcessingAllowed(source, false));
});

test("missing settings never grant external processing or private-source access", async (t) => {
  const repository = repositoryWithSettings(t, null);
  await assert.rejects(repository.assertExternalProcessingAllowed(source), /조직 자료 처리 설정/);
  await assert.rejects(repository.assertProcessingAllowed({ ...source, visibility: "private" }), /개인 자료/);
});

test("an explicitly disabled organization cannot process even local documents", async (t) => {
  const repository = repositoryWithSettings(t, { enabled: false, allow_external_processing: true, allow_private_sources: true });
  await assert.rejects(repository.assertProcessingAllowed(source), /조직 자료 처리 설정/);
});

test("external processing still requires an explicit opt-in", async (t) => {
  const repository = repositoryWithSettings(t, { enabled: true, allow_external_processing: false, allow_private_sources: false });
  await assert.doesNotReject(repository.assertProcessingAllowed(source));
  await assert.rejects(repository.assertExternalProcessingAllowed(source), /조직 자료 처리 설정/);
});

test("private processing remains limited to the original uploader after opt-in", async (t) => {
  const repository = repositoryWithSettings(t, { enabled: true, allow_external_processing: true, allow_private_sources: true });
  await assert.doesNotReject(repository.assertExternalProcessingAllowed({ ...source, visibility: "private" }));
  await assert.rejects(repository.assertProcessingAllowed({ ...source, visibility: "private", uploaded_by: "other-owner" }), /개인 자료/);
  await assert.rejects(repository.assertProcessingAllowed({ ...source, organization_id: "other-org" }), /개인 자료/);
});

test("a viewer cannot process documents even when settings have not been created", async (t) => {
  const repository = repositoryWithSettings(t, null, { role: "viewer" });
  await assert.rejects(repository.assertProcessingAllowed(source), /조직 자료 처리 권한/);
});

test("settings lookup failures do not silently use the defaults", async (t) => {
  const repository = repositoryWithSettings(t, null, { settingsError: true });
  await assert.rejects(repository.assertProcessingAllowed(source), /조직 자료 처리 설정/);
});
