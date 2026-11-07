import assert from "node:assert/strict";
import test from "node:test";
import {
  formatVoteDateTime,
  formatVoteDateTimeInput,
  parseVoteDateTimeInput,
  VOTE_TIME_ZONES,
  voteTimeZoneForLocale,
} from "../src/lib/voteDateTime.ts";

test("Chinese UI uses Asia/Taipei and formats UTC instants across a date boundary", () => {
  assert.equal(VOTE_TIME_ZONES.zh, "Asia/Taipei");
  assert.equal(voteTimeZoneForLocale("zh-TW"), "Asia/Taipei");
  assert.equal(formatVoteDateTimeInput("2026-01-01T16:20:00.000Z", "zh-TW"), "2026-01-02T00:20");
});

test("Taipei midnight converts to the previous UTC calendar day without shifting the intended time", () => {
  assert.equal(
    parseVoteDateTimeInput("2026-01-01T00:20", "zh-TW")?.toISOString(),
    "2025-12-31T16:20:00.000Z",
  );
});

test("English UI uses Europe/Paris and applies winter time across a date boundary", () => {
  assert.equal(VOTE_TIME_ZONES.en, "Europe/Paris");
  assert.equal(voteTimeZoneForLocale("en-US"), "Europe/Paris");
  assert.equal(formatVoteDateTimeInput("2026-01-01T23:30:00.000Z", "en-US"), "2026-01-02T00:30");
  assert.equal(
    parseVoteDateTimeInput("2026-01-01T00:30", "en-US")?.toISOString(),
    "2025-12-31T23:30:00.000Z",
  );
});

test("Paris summer time uses UTC+2 and round-trips the selected local time", () => {
  const localValue = "2026-07-18T15:45";
  const utcInstant = parseVoteDateTimeInput(localValue, "en-US");
  assert.equal(utcInstant?.toISOString(), "2026-07-18T13:45:00.000Z");
  assert.equal(formatVoteDateTimeInput(utcInstant, "en-US"), localValue);
});

test("Paris spring DST gap rejects nonexistent wall times and accepts the first valid time", () => {
  assert.equal(parseVoteDateTimeInput("2026-03-29T02:30", "en-US"), null);
  assert.equal(
    parseVoteDateTimeInput("2026-03-29T03:30", "en-US")?.toISOString(),
    "2026-03-29T01:30:00.000Z",
  );
});

test("Paris autumn DST fold resolves the repeated local time to standard time", () => {
  assert.equal(
    parseVoteDateTimeInput("2026-10-25T02:30", "en-US")?.toISOString(),
    "2026-10-25T01:30:00.000Z",
  );
  assert.equal(formatVoteDateTimeInput("2026-10-25T01:30:00.000Z", "en-US"), "2026-10-25T02:30");
});

test("display labels respect the selected UI time zone", () => {
  const instant = "2026-05-30T16:20:00.000Z";
  assert.match(formatVoteDateTime(instant, "zh-TW"), /00:20/);
  assert.match(formatVoteDateTime(instant, "en-GB"), /18:20/);
  assert.doesNotMatch(formatVoteDateTime(instant, "en-GB"), /16:20/);
});

test("invalid and impossible calendar values are rejected", () => {
  assert.equal(parseVoteDateTimeInput("2026-02-30T12:00", "zh-TW"), null);
  assert.equal(parseVoteDateTimeInput("not-a-date", "en-US"), null);
  assert.equal(formatVoteDateTimeInput("not-a-date", "en-US"), "");
});
