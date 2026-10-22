import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/server/config.js';

test('на Vercel данные пишутся в /tmp', () => {
  const config = loadConfig({ VERCEL: '1' });
  assert.equal(config.isServerless, true);
  assert.equal(config.dataDir, '/tmp/ryadom-data');
});

test('DATA_DIR из окружения имеет приоритет', () => {
  const config = loadConfig({ VERCEL: '1', DATA_DIR: '/var/data/ryadom' });
  assert.equal(config.dataDir, '/var/data/ryadom');
  assert.equal(config.dbFile, '/var/data/ryadom/db.json');
});

test('порт и лимит тела приводятся к числам', () => {
  const config = loadConfig({ PORT: '8080', DATA_DIR: '/tmp/x' });
  assert.equal(config.port, 8080);
  assert.equal(config.maxBodyBytes, 2 * 1024 * 1024);
});
