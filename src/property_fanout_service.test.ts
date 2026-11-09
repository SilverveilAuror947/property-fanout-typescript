import test from "node:test";
import assert from "node:assert/strict";
import { buildFanout } from "./property_fanout_service.js";

test("inspection reminders produce one notification per subscriber", () => {
  const result = buildFanout({ propertyId: "p-4", kind: "inspection", message: "Tomorrow at 09:00", subscribers: ["a@example.com", "b@example.com"] });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((item) => item.subscriber), ["a@example.com", "b@example.com"]);
  assert.equal(result[0].kind, "inspection");
});

test("invalid subscriber addresses are rejected at the request boundary", () => {
  assert.throws(() => buildFanout({ propertyId: "p-4", kind: "maintenance", message: "Leak reported", subscribers: ["not-an-email"] }));
});
