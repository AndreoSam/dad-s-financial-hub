const test = require("node:test");
const assert = require("node:assert/strict");
const { reminderReason, subtractCalendarMonth } = require("./reminder-logic");

test("starts reminders one calendar month before maturity", () => {
  assert.equal(subtractCalendarMonth("2026-10-31"), "2026-09-30");
  assert.equal(reminderReason("2026-09-30", "2026-10-31"), "one-month");
});

test("sends every Saturday inside the final month", () => {
  assert.equal(reminderReason("2026-10-03", "2026-10-31"), "saturday");
  assert.equal(reminderReason("2026-10-10", "2026-10-31"), "saturday");
  assert.equal(reminderReason("2026-10-09", "2026-10-31"), null);
});

test("always sends on the maturity date", () => {
  assert.equal(reminderReason("2026-10-12", "2026-10-12"), "matures-today");
});

test("does not remind before the final month or after maturity", () => {
  assert.equal(reminderReason("2026-09-11", "2026-10-12"), null);
  assert.equal(reminderReason("2026-10-13", "2026-10-12"), null);
});

test("ignores invalid maturity dates", () => {
  assert.equal(reminderReason("2026-10-03", "03/10/2026"), null);
});
