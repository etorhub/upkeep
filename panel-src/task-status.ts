import type { Task } from './types';

export type PanelTaskUrgency = 'on_track' | 'due_soon' | 'overdue' | 'snoozed';

export interface PanelTaskStatus {
  urgency: PanelTaskUrgency;
  days_remaining: number;
  progress: number;
}

function midnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addInterval(last: Date, intervalValue: number, intervalType: string): Date {
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

  if (task.task_type === 'frequency') {
    const target = task.frequency_target ?? 1;
    const current = task.current_count ?? 0;
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

  const lastStr = task.last_performed;
  if (!lastStr) {
    return { urgency: 'overdue', days_remaining: 0, progress: 100 };
  }

  const last = midnight(new Date(lastStr));
  const intervalValue = task.interval_value ?? 30;
  const intervalType = task.interval_type ?? 'days';
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
