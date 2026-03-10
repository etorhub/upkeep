import {
  ActionConfig,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceCardEditor,
} from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'home-maintenance-card-editor': LovelaceCardEditor;
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
  filter?: 'all' | 'overdue' | 'due_soon' | 'on_track';
  due_soon_days?: number;
  show_header?: boolean;
  show_filter_bar?: boolean;
  columns?: number;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
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
  urgency: 'on_track' | 'due_soon' | 'overdue';
}
