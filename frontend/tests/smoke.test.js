import test from "node:test";
import assert from "node:assert/strict";

test("FTMS frontend test runner is configured", () => {
  assert.equal(typeof test, "function");
});
