import { localize } from './localize/localize';

export interface StatusPart {
  key: string;
  vars?: Record<string, string | number>;
}

interface NamedState {
  attributes?: { friendly_name?: string };
}

interface NameLookup {
  states?: Record<string, NamedState>;
}

const PRESETS = new Set([
  'dst_forward',
  'dst_back',
  'season_spring',
  'season_summer',
  'season_autumn',
  'season_winter',
]);

function pluralSuffix(locale: string | undefined, count: number): 'one' | 'other' {
  try {
    const tag = (locale || 'en').replaceAll('_', '-');
    return new Intl.PluralRules(tag).select(count) === 'one' ? 'one' : 'other';
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

function named(hass: NameLookup | undefined, entityId: string): string {
  return hass?.states?.[entityId]?.attributes?.friendly_name || entityId;
}

export function formatPart(
  part: StatusPart | null | undefined,
  locale?: string,
  hass?: NameLookup
): string {
  if (!part?.key) return '';
  const vars: Record<string, string | number> = { ...(part.vars ?? {}) };
  if (typeof vars.entity_id === 'string') vars.entity_id = named(hass, vars.entity_id);
  if (typeof vars.task_id === 'string') vars.task_id = named(hass, vars.task_id);
  if (typeof vars.unit === 'string') {
    const unitKey = `panel.unit_${vars.unit}_other`;
    const unitLabel = localize(unitKey, undefined, locale);
    if (unitLabel !== unitKey) vars.unit = unitLabel;
  }
  if (typeof vars.preset === 'string' && PRESETS.has(vars.preset)) {
    const presetKey = `card.preset.${vars.preset}`;
    const presetLabel = localize(presetKey, undefined, locale);
    if (presetLabel !== presetKey) vars.preset = presetLabel;
  }

  const rawCount = vars.count ?? vars.elapsed;
  const count = typeof rawCount === 'number' ? rawCount : Number(rawCount);
  const base = `card.${part.key}`;
  if (Number.isFinite(count)) {
    const key = `${base}_${pluralSuffix(locale, count)}`;
    const translated = localize(key, vars, locale);
    if (translated !== key) return translated;
  }
  return localize(base, vars, locale);
}
