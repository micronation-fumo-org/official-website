export const VOTE_TIME_ZONES = {
  zh: "Asia/Taipei",
  en: "Europe/Paris",
} as const;

export type VoteTimeZone = typeof VOTE_TIME_ZONES[keyof typeof VOTE_TIME_ZONES];

type DateTimeFields = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

export function voteTimeZoneForLocale(locale = "zh-TW"): VoteTimeZone {
  return locale.toLowerCase().startsWith("en") ? VOTE_TIME_ZONES.en : VOTE_TIME_ZONES.zh;
}

function withTimeZoneLabel(value: string, timeZone: VoteTimeZone): string {
  return timeZone === VOTE_TIME_ZONES.zh ? `${value}（UTC+8）` : value;
}

function formatterForTimeZone(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function getDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function fieldsInTimeZone(date: Date, timeZone: string): DateTimeFields {
  const parts = new Map(formatterForTimeZone(timeZone).formatToParts(date).map(({ type, value }) => [type, value]));
  const read = (key: "year" | "month" | "day" | "hour" | "minute" | "second") => Number(parts.get(key));
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function asUtcMilliseconds({ year, month, day, hour, minute, second }: DateTimeFields): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

function getTimeZoneOffsetAt(date: Date, timeZone: string): number {
  const wallClockAsUtc = asUtcMilliseconds(fieldsInTimeZone(date, timeZone));
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Display an API UTC instant as datetime-local wall time for the current UI language. */
export function formatVoteDateTimeInput(value: string | Date, locale = "zh-TW"): string {
  const date = getDate(value);
  if (!date) return "";
  const { year, month, day, hour, minute } = fieldsInTimeZone(date, voteTimeZoneForLocale(locale));
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/** Convert datetime-local wall time for the current UI language into its UTC instant. */
export function parseVoteDateTimeInput(value: string, locale = "zh-TW"): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const requested: DateTimeFields = { year, month, day, hour, minute, second };
  const wallClockAsUtc = asUtcMilliseconds(requested);
  const normalizedWallClock = new Date(wallClockAsUtc);
  if (
    normalizedWallClock.getUTCFullYear() !== year
    || normalizedWallClock.getUTCMonth() + 1 !== month
    || normalizedWallClock.getUTCDate() !== day
    || normalizedWallClock.getUTCHours() !== hour
    || normalizedWallClock.getUTCMinutes() !== minute
    || normalizedWallClock.getUTCSeconds() !== second
  ) return null;

  const timeZone = voteTimeZoneForLocale(locale);
  const instant = new Date(wallClockAsUtc - getTimeZoneOffsetAt(new Date(wallClockAsUtc), timeZone));
  const actual = fieldsInTimeZone(instant, timeZone);
  if (
    actual.year !== year
    || actual.month !== month
    || actual.day !== day
    || actual.hour !== hour
    || actual.minute !== minute
    || actual.second !== second
  ) return null;
  return instant;
}

/** Format an API UTC instant in the requested locale's vote time zone. */
export function formatVoteDateTime(value: string | Date, locale = "zh-TW"): string {
  const date = getDate(value);
  if (!date) return "";
  const timeZone = voteTimeZoneForLocale(locale);
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return withTimeZoneLabel(formatted, timeZone);
}

/** Format a vote timestamp's time-of-day in the requested locale's vote time zone. */
export function formatVoteTime(value: string | Date, locale = "zh-TW"): string {
  const date = getDate(value);
  if (!date) return "";
  const timeZone = voteTimeZoneForLocale(locale);
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return withTimeZoneLabel(formatted, timeZone);
}
