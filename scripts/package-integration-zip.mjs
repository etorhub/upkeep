import { createWriteStream, cpSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
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

const stagingDir = mkdtempSync(join(tmpdir(), 'upkeep-zip-'));

try {
  const packagedIntegrationDir = join(stagingDir, 'custom_components', 'upkeep');
  cpSync(integrationDir, packagedIntegrationDir, { recursive: true });

  rmSync(zipPath, { force: true });
  await createZip(stagingDir, zipPath);
  console.log(`Created ${zipPath}`);
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}

function createZip(sourceDir, destination) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destination);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(join(sourceDir, 'custom_components'), 'custom_components');
    void archive.finalize();
  });
}
