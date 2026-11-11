import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REQUIRED = ['ca', 'de', 'en', 'es', 'fr', 'it', 'nl', 'pt'];
const CATALOGS = ['src/localize/languages', 'custom_components/upkeep/translations'];
const SOURCE_ROOTS = ['src', 'panel-src'];
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${path}: ${error.message}`);
    return null;
  }
}

function flatten(value, prefix, path) {
  if (typeof value === 'string') return { [prefix]: value };
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${path}: ${prefix || '(root)'} must be a string or object`);
    return {};
  }
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    Object.assign(out, flatten(child, next, path));
  }
  return out;
}

function placeholders(value) {
  return [...value.matchAll(/\{([a-z_]+)\}/g)].map((match) => match[1]).sort();
}

function languageFiles(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
}

function checkCatalog(dir) {
  const found = languageFiles(dir);
  if (found.join() !== REQUIRED.join()) {
    fail(`${dir}: expected ${REQUIRED.join(', ')}; found ${found.join(', ') || '(none)'}`);
  }
  const englishPath = join(dir, 'en.json');
  const english = readJson(englishPath);
  if (!english) return;
  const englishFlat = flatten(english, '', englishPath);
  for (const [key, value] of Object.entries(englishFlat)) {
    if (value.trim() === '') fail(`${englishPath}: ${key} is empty`);
  }

  for (const code of found.filter((item) => item !== 'en')) {
    const path = join(dir, `${code}.json`);
    const data = readJson(path);
    if (!data) continue;
    const flat = flatten(data, '', path);
    const englishKeys = Object.keys(englishFlat).sort();
    const keys = Object.keys(flat).sort();
    const missing = englishKeys.filter((key) => !Object.hasOwn(flat, key));
    const extra = keys.filter((key) => !Object.hasOwn(englishFlat, key));
    if (missing.length > 0) fail(`${path}: missing ${missing.join(', ')}`);
    if (extra.length > 0) fail(`${path}: extra ${extra.join(', ')}`);
    for (const key of englishKeys) {
      if (!Object.hasOwn(flat, key)) continue;
      if (flat[key].trim() === '') fail(`${path}: ${key} is empty`);
      const expected = placeholders(englishFlat[key]).join(',');
      const actual = placeholders(flat[key]).join(',');
      if (expected !== actual) {
        fail(`${path}: ${key} placeholders [${actual}] do not match English [${expected}]`);
      }
    }
  }
}

function walk(dir, files) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (name.endsWith('.ts')) files.push(path);
  }
}

function checkCalls() {
  const english = readJson('src/localize/languages/en.json');
  if (!english) return;
  const keys = new Set(Object.keys(flatten(english, '', 'src/localize/languages/en.json')));
  const files = [];
  for (const root of SOURCE_ROOTS) walk(root, files);
  const call = /(?:localize|_t)\(\s*['"]([a-z0-9_.]+)['"]/g;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(call)) {
      const key = match[1];
      if (!keys.has(key)) fail(`${relative('.', file)}: missing translation key ${key}`);
    }
  }
}

for (const dir of CATALOGS) checkCatalog(dir);
checkCalls();

if (errors.length > 0) {
  for (const error of errors) console.error(`::error::${error}`);
  process.exit(1);
}

console.log(`Translations are complete for ${REQUIRED.join(', ')}.`);
