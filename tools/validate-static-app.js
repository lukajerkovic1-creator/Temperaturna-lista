const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'index.html',
  'package.json',
  'playwright.config.js',
  'firebase.json',
  'firestore.rules',
  'src/app/bootstrap.js',
  'src/styles/app.css',
  'tools/build-bootstrap.js',
];

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(root, relativePath)), `Missing required file: ${relativePath}`);
}

const indexPath = path.join(root, 'index.html');
const indexHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';

assert(/<meta\s+charset=["']?UTF-8["']?/i.test(indexHtml), 'index.html must declare UTF-8 early.');
assert(indexHtml.includes('src/styles/app.css'), 'index.html must load src/styles/app.css.');
assert(indexHtml.includes('src/app/bootstrap.js'), 'index.html must load src/app/bootstrap.js.');
assert(!indexHtml.includes('netlify'), 'index.html should not point to Netlify deployment assets.');

const bootstrapPath = path.join(root, 'src/app/bootstrap.js');
const bootstrap = fs.existsSync(bootstrapPath) ? fs.readFileSync(bootstrapPath, 'utf8') : '';

assert(bootstrap.includes('(() => {'), 'src/app/bootstrap.js must contain the application wrapper.');
assert(bootstrap.trimEnd().endsWith('})();'), 'src/app/bootstrap.js must close the application wrapper.');

if (failures.length) {
  console.error('Static app validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Static app validation passed.');
