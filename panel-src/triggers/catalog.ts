export interface TriggerChoice {
  id: string;
  group: 'time' | 'usage' | 'device' | 'conditions' | 'combined';
  icon: string;
}

export const TRIGGER_CHOICES: TriggerChoice[] = [
  { id: 'interval', group: 'time', icon: 'mdi:calendar-refresh' },
  { id: 'calendar', group: 'time', icon: 'mdi:calendar-star' },
  { id: 'cycle', group: 'usage', icon: 'mdi:counter' },
  { id: 'usage', group: 'usage', icon: 'mdi:gauge' },
  { id: 'after_task', group: 'usage', icon: 'mdi:link-variant' },
  { id: 'idle', group: 'device', icon: 'mdi:timer-sand' },
  { id: 'device_life', group: 'device', icon: 'mdi:water-percent' },
  { id: 'condition', group: 'conditions', icon: 'mdi:thermometer-check' },
  { id: 'event', group: 'conditions', icon: 'mdi:flash' },
  { id: 'either', group: 'combined', icon: 'mdi:call-split' },
];

export const TRIGGER_GROUPS = ['time', 'usage', 'device', 'conditions', 'combined'] as const;

const EITHER_TYPES = new Set(['interval', 'cycle', 'usage', 'calendar', 'idle']);

export function eitherMeterTypes(): string[] {
  return TRIGGER_CHOICES.filter((choice) => EITHER_TYPES.has(choice.id)).map((choice) => choice.id);
}

export function defaultTrigger(type: string): Record<string, unknown> {
  switch (type) {
    case 'cycle':
      return { type, mode: 'manual', target: 10 };
    case 'usage':
      return { type, entity_id: '', attribute: '', threshold: 10, unit: 'kWh' };
    case 'calendar':
      return { type, rule: 'season_spring', hemisphere: 'north' };
    case 'idle':
      return {
        type,
        entity_id: '',
        running_state: 'on',
        limit: { value: 14, unit: 'days' },
      };
    case 'device_life':
      return { type, entity_id: '', attribute: '', scale: 'left' };
    case 'condition':
      return {
        type,
        entity_id: '',
        operator: 'gt',
        threshold: 0,
        duration: { value: 3, unit: 'days' },
      };
    case 'event':
      return { type, source: 'state', entity_id: '', to_state: 'on' };
    case 'after_task':
      return { type, task_id: '', every: 1 };
    case 'either':
      return {
        type,
        meters: [
          { ...defaultTrigger('interval'), id: 'a' },
          { ...defaultTrigger('cycle'), id: 'b' },
        ],
      };
    default:
      return { type: 'interval', every: 90, unit: 'days' };
  }
}
