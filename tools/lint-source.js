const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourceRoots = ['src', 'tests', 'tools', 'assets'];
const explicitFiles = ['playwright.config.js'];
const applicationFragments = [
  'src/app/00-core-ui-state.js',
  'src/clinical/10-therapy-validation.js',
  'src/parser/20-ohbp-parser.js',
  'src/parser/30-parser-tests.js',
  'src/ui/40-rendering-ui.js',
  'src/print/50-print-layout.js',
  'src/ui/60-speech-ui-and-events.js'
];
const failures = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(absolutePath);
      return [absolutePath];
    });
}

const javascriptFiles = sourceRoots
  .flatMap(relativePath => walk(path.join(root, relativePath)))
  .filter(filePath => /\.(?:c?js|mjs)$/.test(filePath))
  .filter(filePath => !applicationFragments.includes(path.relative(root, filePath).replace(/\\/g, '/')));

for (const relativePath of explicitFiles) {
  javascriptFiles.push(path.join(root, relativePath));
}

for (const filePath of javascriptFiles.sort()) {
  const result = spawnSync(process.execPath, ['--check', filePath], {
    cwd: root,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    failures.push(`${path.relative(root, filePath)}: ${String(result.stderr || result.stdout).trim()}`);
  }
}

try {
  const applicationSource = applicationFragments
    .map(relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n?/g, '\n'))
    .join('');
  new vm.Script(applicationSource, { filename: 'application-module-fragments.js' });
} catch (error) {
  failures.push(`application module fragments: ${error.message}`);
}

const jsonFiles = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'firebase.json',
  'tests/clinical-fixtures/synthetic-patients.v1.json',
  'docs/integration/fhir-profile-manifest.v1.json'
];

for (const relativePath of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    failures.push(`${relativePath}: invalid JSON (${error.message})`);
  }
}

if (failures.length) {
  console.error('Source lint failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Source lint passed (${javascriptFiles.length} standalone JavaScript files, ${applicationFragments.length} ordered application fragments, ${jsonFiles.length} JSON files).`);
