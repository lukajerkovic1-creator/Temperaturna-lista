const crypto = require('crypto');

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function assertSemVer(value) {
  const version = String(value || '').trim();
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(`Invalid SemVer: ${version || '(empty)'}`);
  }
  return version;
}

function normalizeBuildText(value) {
  return String(value || '').replace(/\r\n?/g, '\n');
}

function normalizeBuildContent(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(normalizeBuildText(value), 'utf8');
}

function calculateBuildSha({ version, entries }) {
  const safeVersion = assertSemVer(version);
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error('Build fingerprint requires at least one source entry.');
  }

  const normalizedEntries = entries.map((entry) => {
    const relativePath = String(entry?.path || '').replace(/\\/g, '/').trim();
    if (!relativePath || relativePath.startsWith('/') || relativePath.includes('../')) {
      throw new Error(`Invalid build source path: ${relativePath || '(empty)'}`);
    }
    return {
      path: relativePath,
      content: normalizeBuildContent(entry?.content)
    };
  }).sort((left, right) => left.path < right.path ? -1 : (left.path > right.path ? 1 : 0));

  const uniquePaths = new Set(normalizedEntries.map(entry => entry.path));
  if (uniquePaths.size !== normalizedEntries.length) {
    throw new Error('Build fingerprint source paths must be unique.');
  }

  const digest = crypto.createHash('sha256');
  digest.update(`version:${safeVersion}\n`);
  normalizedEntries.forEach((entry) => {
    digest.update(`${entry.path}\n`);
    digest.update(entry.content);
    digest.update('\n');
  });
  return digest.digest('hex').slice(0, 12);
}

module.exports = {
  SEMVER_PATTERN,
  assertSemVer,
  calculateBuildSha,
  normalizeBuildContent,
  normalizeBuildText
};
