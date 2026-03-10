/**
 * Mock Home Assistant object for Storybook.
 * Entity shape matches HassEntity from home-assistant-js-websocket.
 */

import type { HassEntity } from 'home-assistant-js-websocket';
import type { HomeAssistant } from 'custom-card-helpers';

const now = new Date();

function mockHassEntity(
  entityId: string,
  overrides: Partial<{
    friendly_name: string;
    icon: string;
    last_performed: string;
    next_due: string;
    interval_value: number;
    interval_type: string;
  }> = {}
): HassEntity {
  const defaults = {
    friendly_name: entityId.replace('binary_sensor.', '').replace(/_/g, ' '),
    icon: 'mdi:calendar-check',
    last_performed: '2025-01-01T00:00:00Z',
    next_due: '2025-04-01T00:00:00Z',
    interval_value: 90,
    interval_type: 'days',
  };
  const attrs = { ...defaults, ...overrides };
  const nowIso = new Date().toISOString();
  return {
    entity_id: entityId,
    state: 'off',
    attributes: attrs,
    last_changed: nowIso,
    last_updated: nowIso,
    context: { id: '', parent_id: null, user_id: null },
  };
}

export const mockEntitiesMixed: Record<string, HassEntity> = {
  'binary_sensor.hvac_filter': mockHassEntity('binary_sensor.hvac_filter', {
    friendly_name: 'HVAC Filter',
    icon: 'mdi:air-filter',
    last_performed: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    next_due: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    interval_value: 90,
    interval_type: 'days',
  }),
  'binary_sensor.smoke_detector': mockHassEntity('binary_sensor.smoke_detector', {
    friendly_name: 'Smoke Detector Battery',
    icon: 'mdi:smoke-detector',
    last_performed: new Date(now.getTime() - 350 * 24 * 60 * 60 * 1000).toISOString(),
    next_due: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    interval_value: 365,
    interval_type: 'days',
  }),
  'binary_sensor.water_heater': mockHassEntity('binary_sensor.water_heater', {
    friendly_name: 'Water Heater Flush',
    icon: 'mdi:water-thermometer',
    last_performed: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    next_due: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    interval_value: 180,
    interval_type: 'days',
  }),
  'binary_sensor.gutter_clean': mockHassEntity('binary_sensor.gutter_clean', {
    friendly_name: 'Gutter Cleaning',
    icon: 'mdi:home-roof',
    last_performed: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    next_due: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000).toISOString(),
    interval_value: 365,
    interval_type: 'days',
  }),
};

export const mockEntitiesOverdue: Record<string, HassEntity> = {
  'binary_sensor.overdue_1': mockHassEntity('binary_sensor.overdue_1', {
    friendly_name: 'Overdue Task 1',
    last_performed: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    next_due: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    interval_value: 90,
    interval_type: 'days',
  }),
  'binary_sensor.overdue_2': mockHassEntity('binary_sensor.overdue_2', {
    friendly_name: 'Overdue Task 2',
    last_performed: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    next_due: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    interval_value: 180,
    interval_type: 'days',
  }),
};

export const mockEntitiesEmpty: Record<string, HassEntity> = {};

export function createMockHass(
  states: Record<string, HassEntity> = mockEntitiesMixed
): HomeAssistant {
  return {
    states,
    locale: { language: 'en' },
    language: 'en',
    callService: () => Promise.resolve(),
    connection: {
      subscribeMessage: () => Promise.resolve(() => {}),
    },
  } as unknown as HomeAssistant;
}

export const mockHass = createMockHass(mockEntitiesMixed);
export const mockHassOverdue = createMockHass(mockEntitiesOverdue);
export const mockHassEmpty = createMockHass(mockEntitiesEmpty);
