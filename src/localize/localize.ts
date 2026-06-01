import * as en from './languages/en.json';
import * as es from './languages/es.json';
import * as ca from './languages/ca.json';
import * as fr from './languages/fr.json';
import * as de from './languages/de.json';
import * as it from './languages/it.json';
import * as pt from './languages/pt.json';
import * as nl from './languages/nl.json';

const languages: Record<string, unknown> = { en, es, ca, fr, de, it, pt, nl };

function resolveLanguageCode(language?: string): string {
  if (typeof language === 'string' && language.length > 0) {
    return language.replace(/['"]+/g, '').replaceAll('-', '_');
  }
  const stored = localStorage.getItem('selectedLanguage');
  if (typeof stored === 'string' && stored.length > 0) {
    return stored.replace(/['"]+/g, '').replaceAll('-', '_');
  }
  return 'en';
}

function getLanguageRoot(pack: unknown): unknown {
  if (pack == null || typeof pack !== 'object') return pack;
  const record = pack as Record<string, unknown>;
  if (record.default != null && typeof record.default === 'object') {
    return record.default;
  }
  return pack;
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = getLanguageRoot(obj);
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function localize(
  key: string,
  search?: string,
  replace?: string,
  language?: string
): string {
  const lang = resolveLanguageCode(language);

  let translated = getNestedValue(languages[lang], key);

  if (!translated) {
    const baseLang = lang.split('_')[0];
    translated = getNestedValue(languages[baseLang], key);
  }

  if (!translated) {
    translated = getNestedValue(languages.en, key);
  }

  if (translated && search && replace) {
    translated = translated.replace(search, replace);
  }

  return translated ?? key;
}
