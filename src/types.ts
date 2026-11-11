import {
  ActionConfig,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceCardEditor,
} from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'upkeep-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}

export interface HomeMaintenanceCardConfig extends LovelaceCardConfig {
  type: string;
  title?: string;
  entities?: string[];
  exclude_entities?: string[];
  view_mode?: 'grid' | 'list' | 'compact';
  progress_type?: 'ring' | 'bar';
  sort_by?: 'urgency' | 'name' | 'due_date';
  filter?: 'all' | 'overdue' | 'due_soon' | 'on_track' | 'snoozed' | 'unknown';
  due_soon_days?: number;
  show_header?: boolean;
  show_filter_bar?: boolean;
  columns?: number;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export type TaskUrgency = 'on_track' | 'due_soon' | 'overdue' | 'snoozed' | 'unknown';

export interface TaskMeter {
  id?: string;
  progress: number | null;
  leading?: boolean;
  status_key?: string;
  status_vars?: Record<string, string | number>;
}

export interface TaskData {
  entity_id: string;
  name: string;
  icon: string;
  state: string;
  last_performed: Date;
  next_due: Date;
  interval_value: number;
  interval_type: string;
  progress: number;
  days_remaining: number;
  urgency: TaskUrgency;
  task_type?: string;
  trigger_type?: string;
  status_key?: string;
  status_vars?: Record<string, string | number>;
  rule_key?: string;
  rule_vars?: Record<string, string | number>;
  tag_key?: string | null;
  done_enabled?: boolean;
  meters?: TaskMeter[];
  assigned_user?: string;
}
