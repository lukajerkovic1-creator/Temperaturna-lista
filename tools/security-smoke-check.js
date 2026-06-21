const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'playwright-report', 'test-results']);
const ignoredFiles = new Set(['tools/security-smoke-check.js']);
const scannedExtensions = new Set([
  '.html',
  '.js',
  '.json',
  '.md',
  '.ts',
  '.yml',
  '.yaml',
  '.rules',
]);

const forbiddenPatterns = [
  {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/i,
    description: 'private key material',
  },
  {
    pattern: /"private_key"\s*:/i,
    description: 'service account private_key field',
  },
  {
    pattern: /"client_secret"\s*:/i,
    description: 'OAuth client_secret field',
  },
  {
    pattern: /firebase_admin|GOOGLE_APPLICATION_CREDENTIALS/i,
    description: 'server-side Firebase admin credential reference',
  },
  {
    pattern: /hardcodedPassphrase|defaultPassphrase|recoveryPassphrase/i,
    description: 'hardcoded local recovery passphrase',
  },
];

const findings = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name));
      }
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    const extension = path.extname(entry.name);
    if (!scannedExtensions.has(extension)) {
      continue;
    }

    const relativePath = path.relative(root, absolutePath).replace(/\\/g, '/');
    if (ignoredFiles.has(relativePath)) {
      continue;
    }

    const contents = fs.readFileSync(absolutePath, 'utf8');

    for (const check of forbiddenPatterns) {
      if (check.pattern.test(contents)) {
        findings.push(`${relativePath}: possible ${check.description}`);
      }
    }
  }
}

walk(root);

if (findings.length) {
  console.error('Security smoke check failed:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('Security smoke check passed.');
