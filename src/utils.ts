import { HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import {
  HOME_MAINTENANCE_ATTRIBUTES,
  HOME_MAINTENANCE_ATTRIBUTES_ALT,
  PROGRESS_THRESHOLDS,
} from './const';
import { localize } from './localize/localize';
import { TaskData, TaskUrgency } from './types';

const DATE_TRIGGERS = new Set(['interval', 'calendar', 'idle']);
const URGENCY_RANK: Record<TaskUrgency, number> = {
  overdue: 0,
  due_soon: 1,
  on_track: 2,
  unknown: 3,
  snoozed: 4,
};

export function isMaintenanceEntity(stateObj: HassEntity): boolean {
  if (!stateObj.entity_id.startsWith('binary_sensor.')) return false;
  const attrs = stateObj.attributes || {};
  // Require task_type as Upkeep-specific marker to avoid matching entities from
  // other integrations (e.g. TJPoorman/home_maintenance) that share similar attributes.
  if (!('task_type' in attrs)) return false;
  const hasTimeAttrs = HOME_MAINTENANCE_ATTRIBUTES.every((attr) => attr in attrs);
  const hasAltAttrs = HOME_MAINTENANCE_ATTRIBUTES_ALT.some((attr) => attr in attrs);
  return hasTimeAttrs || hasAltAttrs;
}

export function discoverEntities(
  hass: HomeAssistant,
  manualEntities?: string[],
  excludeEntities?: string[]
): string[] {
  if (manualEntities && manualEntities.length > 0) {
    const excluded = new Set(excludeEntities ?? []);
    return manualEntities.filter((id) => !excluded.has(id) && id in hass.states);
  }

  const excluded = new Set(excludeEntities ?? []);
  return Object.keys(hass.states).filter((entityId) => {
    if (excluded.has(entityId)) return false;
    return isMaintenanceEntity(hass.states[entityId]);
  });
}

export function buildTaskData(
  stateObj: HassEntity,
  dueSoonDays: number,
  now: Date = new Date()
): TaskData {
  const attrs = stateObj.attributes || {};
  const taskType = attrs.task_type as string | undefined;
  const enabled = attrs.enabled !== false;

  if (attrs.upkeep_schema === 2 || typeof attrs.status_key === 'string') {
    return mapPublishedTask(stateObj, attrs, dueSoonDays, enabled);
  }

  if (!enabled) {
    return {
      entity_id: stateObj.entity_id,
      name: attrs.friendly_name ?? stateObj.entity_id,
      icon: attrs.icon ?? 'mdi:calendar-check',
      state: stateObj.state,
      last_performed: new Date(0),
      next_due: new Date(0),
      interval_value: attrs.interval_value ?? 0,
      interval_type: attrs.interval_type ?? 'days',
      progress: 0,
      days_remaining: 0,
      urgency: 'snoozed',
      task_type: (taskType ?? 'time') as 'time' | 'frequency',
      assigned_user: attrs.assigned_user,
    };
  }

  if (taskType === 'frequency') {
    const target = attrs.frequency_target ?? 1;
    const current = attrs.current_count ?? 0;
    const progress = target > 0 ? Math.round((current / target) * 100) : 0;
    let urgency: TaskData['urgency'] =
      progress >= PROGRESS_THRESHOLDS.overdue
        ? 'overdue'
        : progress >= PROGRESS_THRESHOLDS.due_soon
          ? 'due_soon'
          : 'on_track';
    if (attrs.urgency) urgency = attrs.urgency as TaskData['urgency'];

    return {
      entity_id: stateObj.entity_id,
      name: attrs.friendly_name ?? stateObj.entity_id,
      icon: attrs.icon ?? 'mdi:calendar-check',
      state: stateObj.state,
      last_performed: new Date(0),
      next_due: new Date(0),
      interval_value: target,
      interval_type: 'uses',
      progress: Math.min(100, progress),
      days_remaining: Math.max(0, target - current),
      urgency,
      task_type: 'frequency',
      assigned_user: attrs.assigned_user,
    };
  }

  const lastStr = attrs.last_performed;
  const nextStr = attrs.next_due;
  if (!lastStr || !nextStr || nextStr === 'unknown') {
    return {
      entity_id: stateObj.entity_id,
      name: attrs.friendly_name ?? stateObj.entity_id,
      icon: attrs.icon ?? 'mdi:calendar-check',
      state: stateObj.state,
      last_performed: lastStr ? new Date(lastStr) : new Date(0),
      next_due: new Date(0),
      interval_value: attrs.interval_value ?? 0,
      interval_type: attrs.interval_type ?? 'days',
      progress: 100,
      days_remaining: 0,
      urgency: 'overdue',
      task_type: 'time',
      assigned_user: attrs.assigned_user,
    };
  }

  const lastPerformed = new Date(lastStr);
  const nextDue = new Date(nextStr);
  const totalMs = nextDue.getTime() - lastPerformed.getTime();
  const elapsedMs = now.getTime() - lastPerformed.getTime();
  const progress = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 100;
  const diffMs = nextDue.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let urgency: TaskData['urgency'];
  if (progress >= PROGRESS_THRESHOLDS.overdue) {
    urgency = 'overdue';
  } else if (daysRemaining <= dueSoonDays) {
    urgency = 'due_soon';
  } else {
    urgency = 'on_track';
  }

  return {
    entity_id: stateObj.entity_id,
    name: attrs.friendly_name ?? stateObj.entity_id,
    icon: attrs.icon ?? 'mdi:calendar-check',
    state: stateObj.state,
    last_performed: lastPerformed,
    next_due: nextDue,
    interval_value: attrs.interval_value ?? 0,
    interval_type: attrs.interval_type ?? 'days',
    progress: Math.max(0, progress),
    days_remaining: daysRemaining,
    urgency,
    task_type: 'time',
    assigned_user: attrs.assigned_user,
  };
}

function mapPublishedTask(
  stateObj: HassEntity,
  attrs: HassEntity['attributes'],
  dueSoonDays: number,
  enabled: boolean
): TaskData {
  let urgency = (enabled ? attrs.urgency : 'snoozed') as TaskUrgency;
  const daysRemaining = typeof attrs.days_remaining === 'number' ? attrs.days_remaining : 0;
  const trigger = String(attrs.trigger_type || '');
  if (
    enabled &&
    DATE_TRIGGERS.has(trigger) &&
    (urgency === 'on_track' || urgency === 'due_soon') &&
    daysRemaining > 0
  ) {
    urgency = daysRemaining <= dueSoonDays ? 'due_soon' : 'on_track';
  }
  const nextDue = attrs.next_due ? new Date(String(attrs.next_due)) : new Date(0);
  return {
    entity_id: stateObj.entity_id,
    name: attrs.friendly_name ?? stateObj.entity_id,
    icon: attrs.icon ?? 'mdi:calendar-check',
    state: stateObj.state,
    last_performed: attrs.last_performed ? new Date(String(attrs.last_performed)) : new Date(0),
    next_due: Number.isNaN(nextDue.getTime()) ? new Date(0) : nextDue,
    interval_value: attrs.interval_value ?? attrs.frequency_target ?? 0,
    interval_type: attrs.interval_type ?? (trigger === 'cycle' ? 'uses' : 'days'),
    progress: typeof attrs.progress === 'number' ? attrs.progress : 0,
    days_remaining: daysRemaining,
    urgency,
    task_type: taskTypeOf(attrs),
    trigger_type: trigger || undefined,
    status_key: attrs.status_key,
    status_vars: attrs.status_vars,
    rule_key: attrs.rule_key,
    rule_vars: attrs.rule_vars,
    tag_key: attrs.tag_key ?? null,
    done_enabled: attrs.done_enabled !== false,
    meters: Array.isArray(attrs.meters) ? attrs.meters : undefined,
    assigned_user: attrs.assigned_user,
  };
}

function taskTypeOf(attrs: HassEntity['attributes']): string | undefined {
  return typeof attrs.task_type === 'string' ? attrs.task_type : undefined;
}

export function sortTasks(tasks: TaskData[], sortBy: 'urgency' | 'name' | 'due_date'): TaskData[] {
  const sorted = [...tasks];
  switch (sortBy) {
    case 'urgency':
      sorted.sort((a, b) => {
        const rank = (URGENCY_RANK[a.urgency] ?? 2) - (URGENCY_RANK[b.urgency] ?? 2);
        if (rank !== 0) return rank;
        if (b.progress !== a.progress) return b.progress - a.progress;
        return a.name.localeCompare(b.name);
      });
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'due_date':
      sorted.sort((a, b) => dueTime(a) - dueTime(b) || a.name.localeCompare(b.name));
      break;
  }
  return sorted;
}

function dueTime(task: TaskData): number {
  const time = task.next_due?.getTime?.() ?? 0;
  return !time || Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function filterTasks(
  tasks: TaskData[],
  filter: 'all' | 'overdue' | 'due_soon' | 'on_track' | 'snoozed' | 'unknown'
): TaskData[] {
  if (filter === 'all') return tasks;
  return tasks.filter((t) => t.urgency === filter);
}

export function getUrgencyColor(urgency: TaskData['urgency']): string {
  switch (urgency) {
    case 'overdue':
      return 'var(--error-color, #f44336)';
    case 'due_soon':
      return 'var(--warning-color, #ff9800)';
    case 'snoozed':
    case 'unknown':
      return 'var(--secondary-text-color, #9e9e9e)';
    case 'on_track':
    default:
      return 'var(--success-color, #4caf50)';
  }
}

export function formatDaysRemaining(days: number, locale: string, taskType?: string): string {
  if (taskType === 'frequency') {
    if (days <= 0) return localize('card.no_uses_left', undefined, locale);
    if (_isPluralOne(locale, days)) {
      return localize('card.use_left_one', { count: days }, locale);
    }
    return localize('card.use_left_other', { count: days }, locale);
  }
  if (days < 0) {
    const count = Math.abs(days);
    if (_isPluralOne(locale, count)) {
      return localize('card.day_overdue_one', { count }, locale);
    }
    return localize('card.day_overdue_other', { count }, locale);
  }
  if (days === 0) return localize('card.today', undefined, locale);
  if (_isPluralOne(locale, days)) {
    return localize('card.day_left_one', { count: days }, locale);
  }
  return localize('card.day_left_other', { count: days }, locale);
}

function _isPluralOne(locale: string, count: number): boolean {
  const tag = locale.replace(/['"]+/g, '').replaceAll('_', '-');
  try {
    return new Intl.PluralRules(tag).select(count) === 'one';
  } catch {
    const base = tag.split('-')[0] || 'en';
    return new Intl.PluralRules(base).select(count) === 'one';
  }
}
