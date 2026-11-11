import { Temporal as TemporalPolyfill } from 'temporal-polyfill';

type TemporalApi = typeof TemporalPolyfill;
export type PlainDate = TemporalPolyfill.PlainDate;

let api: TemporalApi | null = null;
let pending: Promise<void> | null = null;

function installed(): TemporalApi | null {
  const native = (globalThis as { Temporal?: TemporalApi }).Temporal;
  return native ?? api;
}

export function calendarReady(): boolean {
  return installed() !== null;
}

export function loadCalendar(): Promise<void> {
  if (installed()) return Promise.resolve();
  if (!pending) {
    pending = import('temporal-polyfill').then((mod) => {
      api = mod.Temporal;
      if (typeof (globalThis as { Temporal?: TemporalApi }).Temporal === 'undefined') {
        (globalThis as { Temporal?: TemporalApi }).Temporal = mod.Temporal;
      }
    });
  }
  return pending;
}

function temporal(): TemporalApi {
  const value = installed();
  if (!value) throw new Error('Calendar is not loaded');
  return value;
}

export function systemTimeZone(): string {
  return temporal().Now.timeZoneId();
}

export function plainDateFrom(value: string | Date, timeZone = systemTimeZone()): PlainDate {
  const Temporal = temporal();
  if (value instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(value.getTime())
      .toZonedDateTimeISO(timeZone)
      .toPlainDate();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Temporal.PlainDate.from(value);
  try {
    return Temporal.Instant.from(value).toZonedDateTimeISO(timeZone).toPlainDate();
  } catch {
    return Temporal.PlainDateTime.from(value).toPlainDate();
  }
}

export function plainDateToDate(date: PlainDate, timeZone = systemTimeZone()): Date {
  return new Date(date.toZonedDateTime(timeZone).toInstant().epochMilliseconds);
}

export function addPlainInterval(start: PlainDate, value: number, unit: string): PlainDate {
  if (unit === 'weeks') return start.add({ weeks: value });
  if (unit === 'months') return start.add({ months: value });
  return start.add({ days: value });
}

export function subtractPlainInterval(start: PlainDate, value: number, unit: string): PlainDate {
  if (unit === 'weeks') return start.subtract({ weeks: value });
  if (unit === 'months') return start.subtract({ months: value });
  return start.subtract({ days: value });
}

export function calendarDaysUntil(from: PlainDate, to: PlainDate): number {
  return from.until(to, { largestUnit: 'day' }).days;
}

export function calendarDaysBetween(from: Date, to: Date, timeZone = systemTimeZone()): number {
  return calendarDaysUntil(plainDateFrom(from, timeZone), plainDateFrom(to, timeZone));
}
