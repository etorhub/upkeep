export const CARD_VERSION = '1.0.0';
export const CARD_NAME = 'home-maintenance-card';
export const CARD_EDITOR_NAME = 'home-maintenance-card-editor';

export const DEFAULTS = {
  title: 'Home Maintenance',
  view_mode: 'grid' as const,
  progress_type: 'ring' as const,
  sort_by: 'urgency' as const,
  filter: 'all' as const,
  due_soon_days: 7,
  show_header: true,
  show_filter_bar: false,
};

export const URGENCY_COLORS = {
  on_track: 'var(--success-color, #4caf50)',
  due_soon: 'var(--warning-color, #ff9800)',
  overdue: 'var(--error-color, #f44336)',
};

export const PROGRESS_THRESHOLDS = {
  due_soon: 75,
  overdue: 100,
};

export const HOME_MAINTENANCE_ATTRIBUTES = [
  'last_performed',
  'next_due',
  'interval_value',
  'interval_type',
];
