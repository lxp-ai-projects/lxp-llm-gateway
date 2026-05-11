import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const runtimePackages = new Set([
  '@lxp/gateway-api',
  '@lxp/admin-api',
  '@lxp/admin-web',
]);

async function findPackageJsonFiles(baseDir) {
  const entries = await readdir(baseDir, { withFileTypes: true });
  const packageJsonFiles = [];

  for (const entry of entries) {
    const entryPath = path.join(baseDir, entry.name);

    if (entry.isDirectory()) {
      packageJsonFiles.push(...(await findPackageJsonFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name === 'package.json') {
      packageJsonFiles.push(entryPath);
    }
  }

  return packageJsonFiles;
}

function toRelativePath(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function printSection(title, packages) {
  console.log(`${title} (${packages.length})`);
  for (const entry of packages) {
    console.log(`- ${entry.name} :: ${entry.path}`);
  }
  console.log('');
}

const packageJsonFiles = await findPackageJsonFiles(path.join(rootDir, 'apps'));
packageJsonFiles.push(...(await findPackageJsonFiles(path.join(rootDir, 'packages'))));

const packagesWithDev = [];

for (const filePath of packageJsonFiles) {
  const packageJson = JSON.parse(await readFile(filePath, 'utf8'));
  if (!packageJson.scripts?.dev) {
    continue;
  }

  packagesWithDev.push({
    name: packageJson.name ?? toRelativePath(filePath),
    path: toRelativePath(filePath),
  });
}

packagesWithDev.sort((left, right) => left.name.localeCompare(right.name));

const runtime = packagesWithDev.filter((entry) => runtimePackages.has(entry.name));
const shared = packagesWithDev.filter((entry) => !runtimePackages.has(entry.name));

printSection('Runtime apps with dev scripts', runtime);
printSection('Shared packages with dev scripts', shared);

console.log(
  `Root dev startup targets only: ${Array.from(runtimePackages).join(', ')}`,
);
