import type { Task } from './types';

export type PanelTaskUrgency = 'on_track' | 'due_soon' | 'overdue' | 'snoozed' | 'unknown';

export interface PanelTaskStatus {
  urgency: PanelTaskUrgency;
  days_remaining: number;
  progress: number;
}

function midnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addInterval(last: Date, intervalValue: number, intervalType: string): Date {
  const due = new Date(last);
  if (intervalType === 'weeks') {
    due.setDate(due.getDate() + intervalValue * 7);
  } else if (intervalType === 'months') {
    due.setMonth(due.getMonth() + intervalValue);
  } else {
    due.setDate(due.getDate() + intervalValue);
  }
  return due;
}

export function computePanelTaskStatus(
  task: Task,
  dueSoonDays = 7,
  now: Date = new Date()
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

  const last = midnight(new Date(lastStr));
  const intervalValue =
    trigger?.type === 'interval'
      ? (trigger.every ?? task.interval_value ?? 30)
      : (task.interval_value ?? 30);
  const intervalType =
    trigger?.type === 'interval'
      ? (trigger.unit ?? task.interval_type ?? 'days')
      : (task.interval_type ?? 'days');
  const due = midnight(addInterval(last, intervalValue, intervalType));
  const nowMid = midnight(now);

  const totalMs = due.getTime() - last.getTime();
  const elapsedMs = nowMid.getTime() - last.getTime();
  const progress = totalMs > 0 ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : 100;
  const daysRemaining = Math.floor((due.getTime() - nowMid.getTime()) / (1000 * 60 * 60 * 24));

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

export function subtractInterval(due: Date, value: number, unit: string): Date {
  const start = new Date(due);
  if (unit === 'weeks') {
    start.setDate(start.getDate() - value * 7);
  } else if (unit === 'months') {
    start.setMonth(start.getMonth() - value);
  } else {
    start.setDate(start.getDate() - value);
  }
  return start;
}

/** A lead that reaches the completion date would notify the morning after the task is done. */
export function advanceNoticeSkipped(
  lastPerformed: Date,
  intervalValue: number,
  intervalType: string,
  leadValue: number,
  leadUnit: string
): boolean {
  const last = midnight(lastPerformed);
  const due = midnight(addInterval(last, intervalValue, intervalType));
  const windowStart = midnight(subtractInterval(due, leadValue, leadUnit));
  return windowStart.getTime() <= last.getTime();
}

export function scheduledDueDate(
  lastPerformed: Date,
  intervalValue: number,
  intervalType: string
): Date {
  return midnight(addInterval(midnight(lastPerformed), intervalValue, intervalType));
}
