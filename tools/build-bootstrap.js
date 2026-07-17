const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bundlePath = path.join(root, 'src', 'app', 'bootstrap.js');

const modules = [
  'src/app/00-core-ui-state.js',
  'src/clinical/10-therapy-validation.js',
  'src/parser/20-ohbp-parser.js',
  'src/parser/30-parser-tests.js',
  'src/ui/40-rendering-ui.js',
  'src/print/50-print-layout.js',
  'src/ui/60-speech-ui-and-events.js',
];

function readModule(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing module source: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function buildBundle() {
  const bundle = modules.map(readModule).join('');
  if (!bundle.includes('(() => {')) {
    throw new Error('Bootstrap bundle is missing its application wrapper.');
  }
  if (!bundle.trimEnd().endsWith('})();')) {
    throw new Error('Bootstrap bundle is missing its closing application wrapper.');
  }
  return bundle;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const nextBundle = buildBundle();

  if (checkOnly) {
    const currentBundle = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath, 'utf8') : '';
    if (currentBundle !== nextBundle) {
      console.error('src/app/bootstrap.js is not in sync with the module sources.');
      console.error('Run: npm run build:bootstrap');
      process.exit(1);
    }
    console.log('Bootstrap bundle is in sync with module sources.');
    return;
  }

  fs.writeFileSync(bundlePath, nextBundle, 'utf8');
  console.log(`Wrote ${path.relative(root, bundlePath)} from ${modules.length} module sources.`);
}

main();
