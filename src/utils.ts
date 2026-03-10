import { HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import { TaskData } from './types';
import { HOME_MAINTENANCE_ATTRIBUTES, PROGRESS_THRESHOLDS } from './const';

export function isMaintenanceEntity(stateObj: HassEntity): boolean {
  if (!stateObj.entity_id.startsWith('binary_sensor.')) return false;
  return HOME_MAINTENANCE_ATTRIBUTES.every((attr) => attr in stateObj.attributes);
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
  const lastPerformed = new Date(stateObj.attributes.last_performed);
  const nextDue = new Date(stateObj.attributes.next_due);

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
    name: stateObj.attributes.friendly_name ?? stateObj.entity_id,
    icon: stateObj.attributes.icon ?? 'mdi:calendar-check',
    state: stateObj.state,
    last_performed: lastPerformed,
    next_due: nextDue,
    interval_value: stateObj.attributes.interval_value,
    interval_type: stateObj.attributes.interval_type,
    progress: Math.max(0, progress),
    days_remaining: daysRemaining,
    urgency,
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
  filter: 'all' | 'overdue' | 'due_soon' | 'on_track'
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
    case 'on_track':
      return 'var(--success-color, #4caf50)';
  }
}

export function formatDaysRemaining(days: number, locale: string): string {
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
