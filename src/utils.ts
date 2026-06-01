import { HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import { TaskData } from './types';
import {
  HOME_MAINTENANCE_ATTRIBUTES,
  HOME_MAINTENANCE_ATTRIBUTES_ALT,
  PROGRESS_THRESHOLDS,
} from './const';

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

export function sortTasks(tasks: TaskData[], sortBy: 'urgency' | 'name' | 'due_date'): TaskData[] {
  const sorted = [...tasks];
  switch (sortBy) {
    case 'urgency':
      sorted.sort((a, b) => b.progress - a.progress);
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'due_date':
      sorted.sort((a, b) => a.next_due.getTime() - b.next_due.getTime());
      break;
  }
  return sorted;
}

export function filterTasks(
  tasks: TaskData[],
  filter: 'all' | 'overdue' | 'due_soon' | 'on_track' | 'snoozed'
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
      return 'var(--secondary-text-color, #9e9e9e)';
    case 'on_track':
    default:
      return 'var(--success-color, #4caf50)';
  }
}

export function formatDaysRemaining(
  days: number,
  locale: string,
  taskType?: 'time' | 'frequency'
): string {
  if (taskType === 'frequency') {
    return days <= 0 ? _todayLabel(locale) : `${days} use${days !== 1 ? 's' : ''} left`;
  }
  if (days < 0) {
    const abs = Math.abs(days);
    return _pluralDays(abs, locale, true);
  }
  if (days === 0) {
    return _todayLabel(locale);
  }
  return _pluralDays(days, locale, false);
}

function _todayLabel(locale: string): string {
  if (locale.startsWith('ca')) return 'Avui';
  if (locale.startsWith('es')) return 'Hoy';
  return 'Today';
}

function _pluralDays(count: number, locale: string, overdue: boolean): string {
  if (locale.startsWith('ca')) {
    const unit = count === 1 ? 'dia' : 'dies';
    return overdue ? `${count} ${unit} de retard` : `${count} ${unit} restants`;
  }
  if (locale.startsWith('es')) {
    const unit = count === 1 ? 'día' : 'días';
    return overdue ? `${count} ${unit} de retraso` : `${count} ${unit} restantes`;
  }
  const unit = count === 1 ? 'day' : 'days';
  return overdue ? `${count} ${unit} overdue` : `${count} ${unit} left`;
}
