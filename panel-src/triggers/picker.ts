import { html, nothing, TemplateResult } from 'lit';
import { TRIGGER_CHOICES, TRIGGER_GROUPS, TriggerChoice } from './catalog';

export function renderTriggerPicker(options: {
  open: boolean;
  selected: string;
  label: (key: string) => string;
  onToggle: () => void;
  onSelect: (id: string, commit: boolean) => void;
}): TemplateResult {
  const current = TRIGGER_CHOICES.find((choice) => choice.id === options.selected);
  return html`
    <div class="when-due">
      <span class="field-caption" id="when-due-label"
        >${options.label('panel.trigger.question')}</span
      >
      <button
        type="button"
        class="btn btn-secondary trigger-picker"
        aria-haspopup="listbox"
        aria-expanded=${options.open}
        aria-labelledby="when-due-label"
        @click=${options.onToggle}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!options.open) options.onToggle();
          }
        }}
      >
        <ha-icon .icon=${current?.icon || 'mdi:calendar-refresh'}></ha-icon>
        ${options.label(`panel.trigger.${options.selected}`)}
      </button>
      ${options.open
        ? html`
            <div
              class="trigger-list"
              role="listbox"
              tabindex="0"
              aria-labelledby="when-due-label"
              @keydown=${(event: KeyboardEvent) => onListKey(event, options)}
            >
              ${TRIGGER_GROUPS.map((group) => renderGroup(group, options))}
            </div>
          `
        : nothing}
      <p class="field-help">${options.label(`panel.trigger.${options.selected}_help`)}</p>
      <p class="field-help">${options.label(`panel.trigger.${options.selected}_example`)}</p>
    </div>
  `;
}

function renderGroup(
  group: (typeof TRIGGER_GROUPS)[number],
  options: {
    selected: string;
    label: (key: string) => string;
    onSelect: (id: string, commit: boolean) => void;
  }
): TemplateResult {
  const choices = TRIGGER_CHOICES.filter((choice) => choice.group === group);
  return html`
    <div class="trigger-group">
      <div class="field-caption">${options.label(`panel.trigger.group_${group}`)}</div>
      ${choices.map((choice) => renderOption(choice, options))}
    </div>
  `;
}

function renderOption(
  choice: TriggerChoice,
  options: {
    selected: string;
    label: (key: string) => string;
    onSelect: (id: string, commit: boolean) => void;
  }
): TemplateResult {
  const selected = choice.id === options.selected;
  return html`
    <button
      type="button"
      role="option"
      aria-selected=${selected}
      class="trigger-option ${selected ? 'active' : ''}"
      @click=${() => options.onSelect(choice.id, true)}
    >
      <ha-icon .icon=${choice.icon}></ha-icon>
      <span>
        <strong>${options.label(`panel.trigger.${choice.id}`)}</strong>
        <small>${options.label(`panel.trigger.${choice.id}_help`)}</small>
      </span>
    </button>
  `;
}

function onListKey(
  event: KeyboardEvent,
  options: {
    selected: string;
    onSelect: (id: string, commit: boolean) => void;
    onToggle: () => void;
  }
): void {
  const ids = TRIGGER_CHOICES.map((choice) => choice.id);
  const index = Math.max(0, ids.indexOf(options.selected));
  if (event.key === 'Escape') {
    event.preventDefault();
    options.onToggle();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    options.onSelect(options.selected, true);
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const next =
    event.key === 'ArrowDown' ? (index + 1) % ids.length : (index - 1 + ids.length) % ids.length;
  options.onSelect(ids[next], false);
}
