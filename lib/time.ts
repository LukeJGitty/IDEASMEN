// New Zealand time helpers. Everything is stored in UTC and shown in Pacific/Auckland,
// so daylight saving (NZST UTC+12 / NZDT UTC+13) is handled in one place.
export const TIME_ZONE = "Pacific/Auckland";

/** Offset of `zone` from UTC, in ms, at the given instant. */
function zoneOffsetMs(instant: number, zone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** "2026-09-30" + "08:30" in New Zealand -> ISO timestamp. */
export function nzLocalToIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const first = guess - zoneOffsetMs(guess, TIME_ZONE);
  return new Date(guess - zoneOffsetMs(first, TIME_ZONE)).toISOString();
}

/** Calendar date (YYYY-MM-DD) in New Zealand for an instant. */
export const nzDay = (instant: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(instant);

/** The next `count` New Zealand calendar dates starting today. */
export function nzDays(count: number, now = new Date()) {
  const days: string[] = [];
  for (let i = 0; days.length < count && i < count + 2; i++) {
    const day = nzDay(new Date(now.getTime() + i * 86_400_000));
    if (!days.includes(day)) days.push(day);
  }
  return days;
}

export const formatNzTime = (iso: string) =>
  new Intl.DateTimeFormat("en-NZ", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const formatNzDay = (day: string) =>
  new Intl.DateTimeFormat("en-NZ", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" }).format(
    new Date(`${day}T12:00:00Z`),
  );
