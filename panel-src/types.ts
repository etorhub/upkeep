export interface Task {
  id: string;
  entity_id?: string | null;
  title: string;
  description?: string;
  task_type: string;
  interval_value: number;
  interval_type: string;
  last_performed?: string;
  frequency_target?: number;
  current_count?: number;
  watched_entity?: string;
  assigned_user?: string;
  icon?: string;
  tag_id?: string;
  enabled: boolean;
  snoozed_until?: string;
  notify_when_due?: boolean;
}
