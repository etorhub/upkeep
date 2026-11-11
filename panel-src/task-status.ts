import type { Task } from './types';
import {
  addPlainInterval,
  calendarDaysUntil,
  plainDateFrom,
  plainDateToDate,
  subtractPlainInterval,
  systemTimeZone,
  type PlainDate,
} from '../src/calendar';

export type PanelTaskUrgency = 'on_track' | 'due_soon' | 'overdue' | 'snoozed' | 'unknown';

export interface PanelTaskStatus {
  urgency: PanelTaskUrgency;
  days_remaining: number;
  progress: number;
}

function zoneOf(timeZone?: string): string {
  return timeZone || systemTimeZone();
}

function asPlain(value: string | Date, timeZone: string): PlainDate | null {
  try {
    return plainDateFrom(value, timeZone);
  } catch {
    return null;
  }
}

export function addInterval(
  last: Date,
  intervalValue: number,
  intervalType: string,
  timeZone?: string
): Date {
  const zone = zoneOf(timeZone);
  const start = asPlain(last, zone);
  if (!start) return last;
  return plainDateToDate(addPlainInterval(start, intervalValue, intervalType), zone);
}

export function computePanelTaskStatus(
  task: Task,
  dueSoonDays = 7,
  now: Date = new Date(),
  timeZone?: string
): PanelTaskStatus {
  if (!task.enabled) {
    return { urgency: 'snoozed', days_remaining: 0, progress: 0 };
  }

  const trigger = task.trigger;
  if (
    trigger &&
    trigger.type !== 'interval' &&
    trigger.type !== 'cycle' &&
    task.task_type !== 'frequency'
  ) {
    return { urgency: 'unknown', days_remaining: 0, progress: 0 };
  }

  if (task.task_type === 'frequency' || trigger?.type === 'cycle') {
    const target = trigger?.target ?? task.frequency_target ?? 1;
    const current = task.state?.count ?? task.current_count ?? 0;
    const progress = target > 0 ? Math.round((current / target) * 100) : 0;
    const usesRemaining = Math.max(0, target - current);
    let urgency: PanelTaskUrgency;
    if (current >= target) {
      urgency = 'overdue';
    } else if (usesRemaining <= 1) {
      urgency = 'due_soon';
    } else {
      urgency = 'on_track';
    }
    return { urgency, days_remaining: usesRemaining, progress };
  }

  const lastStr =
    trigger?.type === 'interval'
      ? (task.state?.last_performed ?? task.last_performed)
      : task.last_performed;
  if (!lastStr) {
    return { urgency: 'overdue', days_remaining: 0, progress: 100 };
  }

  const zone = zoneOf(timeZone);
  const last = asPlain(lastStr, zone);
  const today = asPlain(now, zone);
  if (!last || !today) {
    return { urgency: 'overdue', days_remaining: 0, progress: 100 };
  }

  const intervalValue =
    trigger?.type === 'interval'
      ? (trigger.every ?? task.interval_value ?? 30)
      : (task.interval_value ?? 30);
  const intervalType =
    trigger?.type === 'interval'
      ? (trigger.unit ?? task.interval_type ?? 'days')
      : (task.interval_type ?? 'days');
  const due = addPlainInterval(last, intervalValue, intervalType);
  const totalDays = Math.max(1, calendarDaysUntil(last, due));
  const elapsedDays = calendarDaysUntil(last, today);
  const progress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  const daysRemaining = calendarDaysUntil(today, due);

  let urgency: PanelTaskUrgency;
  if (progress >= 100 || daysRemaining < 0) {
    urgency = 'overdue';
  } else if (daysRemaining <= dueSoonDays) {
    urgency = 'due_soon';
  } else {
    urgency = 'on_track';
  }

  return { urgency, days_remaining: daysRemaining, progress };
}

export function subtractInterval(due: Date, value: number, unit: string, timeZone?: string): Date {
  const zone = zoneOf(timeZone);
  const start = asPlain(due, zone);
  if (!start) return due;
  return plainDateToDate(subtractPlainInterval(start, value, unit), zone);
}

/** A lead that reaches the completion date would notify the morning after the task is done. */
export function advanceNoticeSkipped(
  lastPerformed: Date,
  intervalValue: number,
  intervalType: string,
  leadValue: number,
  leadUnit: string,
  timeZone?: string
): boolean {
  const zone = zoneOf(timeZone);
  const last = asPlain(lastPerformed, zone);
  if (!last) return false;
  const due = addPlainInterval(last, intervalValue, intervalType);
  const windowStart = subtractPlainInterval(due, leadValue, leadUnit);
  return TemporalCompare(windowStart, last) <= 0;
}

function TemporalCompare(left: PlainDate, right: PlainDate): number {
  return calendarDaysUntil(right, left);
}

export function scheduledDueDate(
  lastPerformed: Date,
  intervalValue: number,
  intervalType: string,
  timeZone?: string
): Date {
  const zone = zoneOf(timeZone);
  const last = asPlain(lastPerformed, zone);
  if (!last) return lastPerformed;
  return plainDateToDate(addPlainInterval(last, intervalValue, intervalType), zone);
}
