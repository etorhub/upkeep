import { createWriteStream, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const { ZipArchive } = await import('archiver');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const integrationDir = join(root, 'custom_components', 'upkeep');
const zipPath = join(root, 'upkeep.zip');

const requiredBundles = ['www/upkeep-card.js', 'panel/dist/main.js'];

for (const relativePath of requiredBundles) {
  const absolutePath = join(integrationDir, relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required bundle: ${absolutePath}`);
    console.error('Run "npm run build" before packaging the integration zip.');
    process.exit(1);
  }
}

rmSync(zipPath, { force: true });
await createZip(integrationDir, zipPath);
console.log(`Created ${zipPath}`);

function createZip(sourceDir, destination) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destination);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    // HACS extracts into config/custom_components/<domain>/ — zip root must be
    // integration files, not another custom_components/upkeep/ prefix.
    archive.directory(sourceDir, false);
    void archive.finalize();
  });
}
