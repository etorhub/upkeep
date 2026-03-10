import * as en from './languages/en.json';
import * as es from './languages/es.json';
import * as ca from './languages/ca.json';
import * as fr from './languages/fr.json';
import * as de from './languages/de.json';
import * as it from './languages/it.json';
import * as pt from './languages/pt.json';
import * as nl from './languages/nl.json';

const languages: Record<string, unknown> = { en, es, ca, fr, de, it, pt, nl };

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function localize(key: string, search?: string, replace?: string): string {
  let lang = (localStorage.getItem('selectedLanguage') || 'en')
    .replace(/['"]+/g, '')
    .replace('-', '_');

  let translated = getNestedValue(languages[lang], key);

  if (!translated) {
    const baseLang = lang.split('_')[0];
    translated = getNestedValue(languages[baseLang], key);
  }

  if (!translated) {
    translated = getNestedValue(languages['en'], key);
  }

  if (translated && search && replace) {
    translated = translated.replace(search, replace);
  }

  return translated ?? key;
}
