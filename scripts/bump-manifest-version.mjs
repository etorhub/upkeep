import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/bump-manifest-version.mjs <version>');
  process.exit(1);
}

const manifestPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'custom_components',
  'upkeep',
  'manifest.json',
);

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Updated ${manifestPath} to version ${version}`);
