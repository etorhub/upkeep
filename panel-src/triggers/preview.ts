import { html, nothing, TemplateResult } from 'lit';
import { formatPart, StatusPart } from '../../src/status-format';
import type { HomeAssistant } from 'custom-card-helpers';

export interface PreviewResult {
  progress?: number | null;
  urgency?: string;
  status?: StatusPart | null;
  rule?: StatusPart | null;
  done_effect?: StatusPart | null;
  meters?: {
    progress?: number | null;
    leading?: boolean;
    status_key?: string;
    status_vars?: Record<string, string | number>;
  }[];
}

export function renderPreview(options: {
  preview: PreviewResult | null;
  editing: boolean;
  label: (key: string, vars?: Record<string, string | number>) => string;
  locale?: string;
  hass?: HomeAssistant;
}): TemplateResult {
  const preview = options.preview;
  if (!preview?.status) return nothing as unknown as TemplateResult;
  const phrase = formatPart(preview.status, options.locale, options.hass);
  const done = formatPart(preview.done_effect, options.locale, options.hass);
  const progress = typeof preview.progress === 'number' ? preview.progress : 0;
  return html`
    <div class="schedule-preview">
      <div>
        ${options.editing
          ? options.label('panel.trigger.preview_edit')
          : options.label('panel.trigger.preview_add')}
      </div>
      <div>${phrase}</div>
      <div
        class="meter"
        role="meter"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow=${Math.round(progress)}
      >
        <span class="meter-fill" style="width:${Math.min(100, Math.max(0, progress))}%"></span>
      </div>
      ${done ? html`<div>${options.label('panel.trigger.after_done')} ${done}</div>` : nothing}
    </div>
  `;
}
