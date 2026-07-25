const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertSemVer,
  calculateBuildSha,
  normalizeBuildContent,
  normalizeBuildText
} = require('../../tools/lib/build-metadata');

test('accepts SemVer and rejects legacy dated labels', () => {
  assert.equal(assertSemVer('0.4.0'), '0.4.0');
  assert.equal(assertSemVer('1.2.3-rc.1'), '1.2.3-rc.1');
  assert.throws(() => assertSemVer('v321_login_user_profiles_2026_06_20'), /Invalid SemVer/);
  assert.throws(() => assertSemVer(''), /Invalid SemVer/);
});

test('normalizes line endings before hashing', () => {
  assert.equal(normalizeBuildText('one\r\ntwo\rthree'), 'one\ntwo\nthree');
  assert.deepEqual(normalizeBuildContent(Buffer.from([0, 255, 1])), Buffer.from([0, 255, 1]));
});

test('build fingerprint is deterministic across entry order and line endings', () => {
  const first = calculateBuildSha({
    version: '0.4.0',
    entries: [
      { path: 'src/b.js', content: 'two\r\n' },
      { path: 'src/a.js', content: 'one\n' }
    ]
  });
  const second = calculateBuildSha({
    version: '0.4.0',
    entries: [
      { path: 'src/a.js', content: 'one\r\n' },
      { path: 'src/b.js', content: 'two\n' }
    ]
  });

  assert.match(first, /^[a-f0-9]{12}$/);
  assert.equal(first, second);
});

test('build fingerprint changes with version or source content', () => {
  const base = calculateBuildSha({
    version: '0.4.0',
    entries: [{ path: 'src/app.js', content: 'const value = 1;\n' }]
  });
  const versionChange = calculateBuildSha({
    version: '0.4.1',
    entries: [{ path: 'src/app.js', content: 'const value = 1;\n' }]
  });
  const sourceChange = calculateBuildSha({
    version: '0.4.0',
    entries: [{ path: 'src/app.js', content: 'const value = 2;\n' }]
  });

  assert.notEqual(base, versionChange);
  assert.notEqual(base, sourceChange);
});

test('build fingerprint includes binary assets without text coercion', () => {
  const first = calculateBuildSha({
    version: '0.4.0',
    entries: [{ path: 'assets/icon.png', content: Buffer.from([0, 255, 1]) }]
  });
  const sameBytes = calculateBuildSha({
    version: '0.4.0',
    entries: [{ path: 'assets/icon.png', content: new Uint8Array([0, 255, 1]) }]
  });
  const changed = calculateBuildSha({
    version: '0.4.0',
    entries: [{ path: 'assets/icon.png', content: Buffer.from([0, 255, 2]) }]
  });

  assert.equal(first, sameBytes);
  assert.notEqual(first, changed);
});

test('rejects duplicate or unsafe source paths', () => {
  assert.throws(() => calculateBuildSha({
    version: '0.4.0',
    entries: [
      { path: 'src/app.js', content: 'one' },
      { path: 'src/app.js', content: 'two' }
    ]
  }), /unique/);
  assert.throws(() => calculateBuildSha({
    version: '0.4.0',
    entries: [{ path: '../secret', content: 'value' }]
  }), /Invalid build source path/);
});
