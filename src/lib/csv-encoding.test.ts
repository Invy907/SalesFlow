import assert from "node:assert/strict";
import test from "node:test";
import { decodeCsvBytes } from "./csv";

test("CSV decoding preserves Japanese in UTF-8 and Shift-JIS files", () => {
  assert.equal(decodeCsvBytes(new TextEncoder().encode("品目,name\n").buffer), "品目,name\n");
  assert.equal(decodeCsvBytes(new Uint8Array([0x95, 0x69, 0x96, 0xda, 0x2c, 0x41]).buffer), "品目,A");
});
