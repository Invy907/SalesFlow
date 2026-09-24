import assert from "node:assert/strict";
import test from "node:test";
import { canWriteOrganizationBusinessData } from "./organization-permissions";

test("service-backed mutations allow existing writer roles and deny viewer or missing membership", () => {
  for (const role of ["owner", "admin", "member"]) {
    assert.equal(canWriteOrganizationBusinessData(role), true, role);
  }
  for (const role of ["viewer", "", "service_role", "unknown", undefined, null]) {
    assert.equal(canWriteOrganizationBusinessData(role), false, String(role));
  }
});
