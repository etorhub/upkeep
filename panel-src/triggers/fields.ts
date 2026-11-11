import { html, nothing, TemplateResult } from 'lit';
import type { HomeAssistant } from 'custom-card-helpers';
import { defaultTrigger, eitherMeterTypes } from './catalog';

type Trigger = Record<string, unknown>;
type Label = (key: string) => string;

export function validateDraft(trigger: Trigger, editingId: string | null): string | null {
  const kind = String(trigger.type || '');
  if (kind === 'interval') {
    return numberValue(trigger.every) >= 1 ? null : 'trigger.errors.every';
  }
  if (kind === 'cycle') {
    if (numberValue(trigger.target) < 1) return 'trigger.errors.target';
    if (trigger.mode === 'run' || trigger.mode === 'counter') {
      if (!trigger.entity_id) return 'trigger.errors.entity';
    }
    if (trigger.mode === 'counter' && !trigger.attribute) return 'trigger.errors.attribute';
    return null;
  }
  if (kind === 'usage') {
    if (!trigger.entity_id) return 'trigger.errors.entity';
    if (numberValue(trigger.threshold) <= 0) return 'trigger.errors.threshold';
    if (!trigger.unit) return 'trigger.errors.unit';
    return null;
  }
  if (kind === 'calendar') return null;
  if (kind === 'idle') {
    if (!trigger.entity_id) return 'trigger.errors.entity';
    const limit = (trigger.limit as Trigger) || {};
    return numberValue(limit.value) >= 1 ? null : 'trigger.errors.limit';
  }
  if (kind === 'device_life') {
    if (!trigger.entity_id) return 'trigger.errors.entity';
    const reset = trigger.reset_entity_id;
    if (reset && !String(reset).startsWith('button.')) return 'trigger.errors.reset_button';
    return null;
  }
  if (kind === 'condition') {
    if (!trigger.entity_id) return 'trigger.errors.entity';
    const duration = (trigger.duration as Trigger) || {};
    return numberValue(duration.value) >= 1 ? null : 'trigger.errors.duration';
  }
  if (kind === 'event') {
    if (trigger.source === 'event') {
      return trigger.event_type ? null : 'trigger.errors.event_type';
    }
    if (!trigger.entity_id) return 'trigger.errors.entity';
    return trigger.to_state ? null : 'trigger.errors.to_state';
  }
  if (kind === 'after_task') {
    if (!trigger.task_id) return 'trigger.errors.task';
    if (editingId && trigger.task_id === editingId) return 'trigger.errors.cycle';
    return numberValue(trigger.every) >= 1 ? null : 'trigger.errors.every';
  }
  if (kind === 'either') {
    const meters = Array.isArray(trigger.meters) ? trigger.meters : [];
    if (meters.length !== 2) return 'trigger.errors.meters';
    for (const meter of meters) {
      if (!meter || typeof meter !== 'object') return 'trigger.errors.meter_type';
      const nested = validateDraft(meter as Trigger, editingId);
      if (nested) return nested;
    }
  }
  return null;
}

export function renderTriggerFields(options: {
  trigger: Trigger;
  hass?: HomeAssistant;
  label: Label;
  tasks: { id: string; title: string }[];
  onChange: (trigger: Trigger) => void;
}): TemplateResult {
  const trigger = options.trigger;
  const kind = String(trigger.type || 'interval');
  return html` <div class="trigger-fields">${renderKind(kind, trigger, options)}</div> `;
}

function renderKind(
  kind: string,
  trigger: Trigger,
  options: {
    hass?: HomeAssistant;
    label: Label;
    tasks: { id: string; title: string }[];
    onChange: (trigger: Trigger) => void;
  }
): TemplateResult {
  const set = (patch: Trigger) => options.onChange({ ...trigger, ...patch });
  if (kind === 'interval') return renderInterval(trigger, options.label, set);
  if (kind === 'cycle') return renderCycle(trigger, options.label, options.hass, set);
  if (kind === 'usage') return renderUsage(trigger, options.label, options.hass, set);
  if (kind === 'calendar') return renderCalendar(trigger, options.label, set);
  if (kind === 'idle') return renderIdle(trigger, options.label, options.hass, set);
  if (kind === 'device_life') return renderLife(trigger, options.label, options.hass, set);
  if (kind === 'condition') return renderCondition(trigger, options.label, options.hass, set);
  if (kind === 'event') return renderEvent(trigger, options.label, options.hass, set);
  if (kind === 'after_task') return renderAfter(trigger, options.label, options.tasks, set);
  if (kind === 'either') return renderEither(trigger, options);
  return nothing as unknown as TemplateResult;
}

function renderInterval(
  trigger: Trigger,
  label: Label,
  set: (patch: Trigger) => void
): TemplateResult {
  return html`
    ${numberField('every', label('panel.every'), trigger.every, (every) => set({ every }))}
    ${selectField(
      'unit',
      label('panel.period'),
      String(trigger.unit || 'days'),
      ['days', 'weeks', 'months'],
      label,
      (unit) => set({ unit })
    )}
  `;
}

function renderCycle(
  trigger: Trigger,
  label: Label,
  hass: HomeAssistant | undefined,
  set: (patch: Trigger) => void
): TemplateResult {
  return html`
    ${selectField(
      'mode',
      label('panel.field.mode'),
      String(trigger.mode || 'manual'),
      ['manual', 'run', 'counter'],
      label,
      (mode) => set(mode === 'manual' ? { mode, entity_id: undefined } : { mode })
    )}
    ${numberField('target', label('panel.field.target'), trigger.target, (target) =>
      set({ target })
    )}
    ${trigger.mode === 'run' || trigger.mode === 'counter'
      ? entityField(
          label('panel.field.entity'),
          String(trigger.entity_id || ''),
          hass,
          (entity_id) => set({ entity_id })
        )
      : nothing}
    ${trigger.mode === 'counter'
      ? textField(
          'attribute',
          label('panel.field.attribute'),
          String(trigger.attribute || ''),
          (attribute) => set({ attribute })
        )
      : nothing}
    ${trigger.mode === 'run'
      ? textField(
          'running_state',
          label('panel.field.running_state'),
          String(trigger.running_state || 'on'),
          (running_state) => set({ running_state })
        )
      : nothing}
  `;
}

function renderUsage(
  trigger: Trigger,
  label: Label,
  hass: HomeAssistant | undefined,
  set: (patch: Trigger) => void
): TemplateResult {
  return html`
    ${entityField(label('panel.field.entity'), String(trigger.entity_id || ''), hass, (entity_id) =>
      set({ entity_id })
    )}
    ${textField(
      'attribute',
      label('panel.field.attribute'),
      String(trigger.attribute || ''),
      (attribute) => set({ attribute })
    )}
    ${numberField('threshold', label('panel.field.threshold'), trigger.threshold, (threshold) =>
      set({ threshold })
    )}
    ${textField('unit', label('panel.field.unit'), String(trigger.unit || ''), (unit) =>
      set({ unit })
    )}
  `;
}

function renderCalendar(
  trigger: Trigger,
  label: Label,
  set: (patch: Trigger) => void
): TemplateResult {
  const presets = [
    'season_spring',
    'season_summer',
    'season_autumn',
    'season_winter',
    'dst_forward',
    'dst_back',
    'monthly',
    'yearly',
  ];
  const selected =
    trigger.repeat === 'month'
      ? 'monthly'
      : trigger.repeat === 'year'
        ? 'yearly'
        : String(trigger.rule || 'season_spring');
  return html`
    ${selectField('preset', label('panel.field.preset'), selected, presets, label, (value) => {
      if (value === 'monthly') set({ rule: undefined, repeat: 'month', day: trigger.day || 1 });
      else if (value === 'yearly')
        set({ rule: undefined, repeat: 'year', month: trigger.month || 1, day: trigger.day || 1 });
      else set({ rule: value, repeat: undefined, hemisphere: trigger.hemisphere || 'north' });
    })}
    ${String(selected).startsWith('season')
      ? selectField(
          'hemisphere',
          label('panel.field.hemisphere'),
          String(trigger.hemisphere || 'north'),
          ['north', 'south'],
          label,
          (hemisphere) => set({ hemisphere })
        )
      : nothing}
    ${trigger.repeat === 'year'
      ? numberField('month', label('panel.field.month'), trigger.month, (month) => set({ month }))
      : nothing}
    ${trigger.repeat === 'month' || trigger.repeat === 'year'
      ? numberField('day', label('panel.field.day'), trigger.day, (day) => set({ day }))
      : nothing}
  `;
}

function renderIdle(
  trigger: Trigger,
  label: Label,
  hass: HomeAssistant | undefined,
  set: (patch: Trigger) => void
): TemplateResult {
  const limit = (trigger.limit as Trigger) || { value: 14, unit: 'days' };
  return html`
    ${entityField(label('panel.field.entity'), String(trigger.entity_id || ''), hass, (entity_id) =>
      set({ entity_id })
    )}
    ${textField(
      'running_state',
      label('panel.field.running_state'),
      String(trigger.running_state || 'on'),
      (running_state) => set({ running_state })
    )}
    ${numberField('limit', label('panel.field.limit'), limit.value, (value) =>
      set({ limit: { ...limit, value } })
    )}
    ${selectField(
      'limit_unit',
      label('panel.field.unit'),
      String(limit.unit || 'days'),
      ['days', 'weeks', 'months'],
      label,
      (unit) => set({ limit: { ...limit, unit } })
    )}
  `;
}

function renderLife(
  trigger: Trigger,
  label: Label,
  hass: HomeAssistant | undefined,
  set: (patch: Trigger) => void
): TemplateResult {
  return html`
    ${entityField(label('panel.field.entity'), String(trigger.entity_id || ''), hass, (entity_id) =>
      set({ entity_id })
    )}
    ${textField(
      'attribute',
      label('panel.field.attribute'),
      String(trigger.attribute || ''),
      (attribute) => set({ attribute })
    )}
    ${selectField(
      'scale',
      label('panel.field.scale'),
      String(trigger.scale || 'left'),
      ['left', 'used'],
      label,
      (scale) => set({ scale })
    )}
    ${entityField(
      label('panel.field.reset'),
      String(trigger.reset_entity_id || ''),
      hass,
      (reset_entity_id) => set({ reset_entity_id: reset_entity_id || undefined }),
      'button'
    )}
  `;
}

function renderCondition(
  trigger: Trigger,
  label: Label,
  hass: HomeAssistant | undefined,
  set: (patch: Trigger) => void
): TemplateResult {
  const duration = (trigger.duration as Trigger) || { value: 3, unit: 'days' };
  return html`
    ${entityField(label('panel.field.entity'), String(trigger.entity_id || ''), hass, (entity_id) =>
      set({ entity_id })
    )}
    ${selectField(
      'operator',
      label('panel.field.operator'),
      String(trigger.operator || 'gt'),
      ['gt', 'gte', 'lt', 'lte', 'eq', 'neq'],
      label,
      (operator) => set({ operator })
    )}
    ${numberField('threshold', label('panel.field.threshold'), trigger.threshold, (threshold) =>
      set({ threshold })
    )}
    ${numberField('duration', label('panel.field.duration'), duration.value, (value) =>
      set({ duration: { ...duration, value } })
    )}
    ${selectField(
      'duration_unit',
      label('panel.field.unit'),
      String(duration.unit || 'days'),
      ['minutes', 'hours', 'days'],
      label,
      (unit) => set({ duration: { ...duration, unit } })
    )}
  `;
}

function renderEvent(
  trigger: Trigger,
  label: Label,
  hass: HomeAssistant | undefined,
  set: (patch: Trigger) => void
): TemplateResult {
  const source = String(trigger.source || 'state');
  return html`
    ${selectField('source', label('panel.field.mode'), source, ['state', 'event'], label, (next) =>
      set({ source: next })
    )}
    ${source === 'event'
      ? textField(
          'event_type',
          label('panel.field.event_type'),
          String(trigger.event_type || ''),
          (event_type) => set({ event_type })
        )
      : html`
          ${entityField(
            label('panel.field.entity'),
            String(trigger.entity_id || ''),
            hass,
            (entity_id) => set({ entity_id })
          )}
          ${textField(
            'to_state',
            label('panel.field.to_state'),
            String(trigger.to_state || ''),
            (to_state) => set({ to_state })
          )}
        `}
  `;
}

function renderAfter(
  trigger: Trigger,
  label: Label,
  tasks: { id: string; title: string }[],
  set: (patch: Trigger) => void
): TemplateResult {
  return html`
    <label class="form-field-label" for="after-task">
      <span>${label('panel.field.task')}</span>
      <select
        id="after-task"
        .value=${String(trigger.task_id || '')}
        @change=${(event: Event) => set({ task_id: (event.target as HTMLSelectElement).value })}
      >
        <option value=""></option>
        ${tasks.map(
          (task) =>
            html`<option value=${task.id} ?selected=${task.id === trigger.task_id}>
              ${task.title}
            </option>`
        )}
      </select>
    </label>
    ${numberField('every', label('panel.field.target'), trigger.every, (every) => set({ every }))}
  `;
}

function renderEither(
  trigger: Trigger,
  options: {
    hass?: HomeAssistant;
    label: Label;
    tasks: { id: string; title: string }[];
    onChange: (trigger: Trigger) => void;
  }
): TemplateResult {
  const meters = Array.isArray(trigger.meters) ? [...trigger.meters] : [];
  while (meters.length < 2) meters.push(defaultTrigger('interval'));
  const update = (index: number, meter: Trigger) => {
    const next = meters.map((item, itemIndex) => (itemIndex === index ? meter : item));
    options.onChange({ ...trigger, meters: next });
  };
  return html`
    ${[0, 1].map((index) => {
      const meter = (meters[index] || {}) as Trigger;
      const type = String(meter.type || 'interval');
      return html`
        <fieldset class="repeat-fieldset">
          <legend>${options.label('panel.trigger.either')} ${index + 1}</legend>
          ${selectField(
            `meter-${index}`,
            options.label('panel.field.mode'),
            type,
            eitherMeterTypes(),
            options.label,
            (next) =>
              update(index, {
                ...defaultTrigger(next),
                id: String(meter.id || (index === 0 ? 'a' : 'b')),
              })
          )}
          ${renderTriggerFields({
            trigger: meter,
            hass: options.hass,
            label: options.label,
            tasks: options.tasks,
            onChange: (next) =>
              update(index, { ...next, id: meter.id || (index === 0 ? 'a' : 'b') }),
          })}
        </fieldset>
      `;
    })}
  `;
}

function entityField(
  caption: string,
  value: string,
  hass: HomeAssistant | undefined,
  onChange: (value: string) => void,
  domain?: string
): TemplateResult {
  const picker = customElements.get('ha-entity-picker');
  if (picker) {
    return html`
      <label class="form-field-label">
        <span>${caption}</span>
        <ha-entity-picker
          .hass=${hass}
          .value=${value}
          .includeDomains=${domain ? [domain] : undefined}
          @value-changed=${(event: CustomEvent) => onChange(String(event.detail?.value || ''))}
        ></ha-entity-picker>
      </label>
    `;
  }
  const states = hass?.states ?? {};
  const ids = Object.keys(states).filter((id) => (domain ? id.startsWith(`${domain}.`) : true));
  return html`
    <label class="form-field-label">
      <span>${caption}</span>
      <select
        .value=${value}
        @change=${(event: Event) => onChange((event.target as HTMLSelectElement).value)}
      >
        <option value=""></option>
        ${ids.map((id) => html`<option value=${id} ?selected=${id === value}>${id}</option>`)}
      </select>
    </label>
  `;
}

function textField(
  id: string,
  caption: string,
  value: string,
  onChange: (value: string) => void
): TemplateResult {
  return html`
    <label class="form-field-label" for=${`field-${id}`}>
      <span>${caption}</span>
      <input
        id=${`field-${id}`}
        type="text"
        .value=${value}
        @input=${(event: Event) => onChange((event.target as HTMLInputElement).value)}
      />
    </label>
  `;
}

function numberField(
  id: string,
  caption: string,
  value: unknown,
  onChange: (value: number) => void
): TemplateResult {
  return html`
    <label class="form-field-label" for=${`field-${id}`}>
      <span>${caption}</span>
      <input
        id=${`field-${id}`}
        type="number"
        min="0"
        .value=${String(value ?? '')}
        @input=${(event: Event) => onChange(numberValue((event.target as HTMLInputElement).value))}
      />
    </label>
  `;
}

function selectField(
  id: string,
  caption: string,
  value: string,
  values: string[],
  label: Label,
  onChange: (value: string) => void
): TemplateResult {
  return html`
    <label class="form-field-label" for=${`field-${id}`}>
      <span>${caption}</span>
      <select
        id=${`field-${id}`}
        .value=${value}
        @change=${(event: Event) => onChange((event.target as HTMLSelectElement).value)}
      >
        ${values.map((item) => {
          const key = `panel.option.${item}`;
          const text = label(key);
          return html`<option value=${item} ?selected=${item === value}>
            ${text === key ? item : text}
          </option>`;
        })}
      </select>
    </label>
  `;
}

function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
