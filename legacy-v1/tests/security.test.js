import assert from 'node:assert/strict';
import test from 'node:test';
import { RateLimiter, bearerToken, hashPassword, verifyPassword } from '../src/server/security.js';

test('пароль хешируется и проверяется', () => {
  const hash = hashPassword('secret123', 'abc123');
  assert.notEqual(hash, 'secret123');
  assert.equal(verifyPassword('secret123', { hash, salt: 'abc123' }), true);
  assert.equal(verifyPassword('secret124', { hash, salt: 'abc123' }), false);
});

test('bearerToken читает заголовок', () => {
  assert.equal(bearerToken({ headers: { authorization: 'Bearer abc' } }), 'abc');
  assert.equal(bearerToken({ headers: {} }), '');
});

test('RateLimiter блокирует после лимита', () => {
  const limiter = new RateLimiter({ limit: 2, windowMs: 60_000 });
  limiter.hit('ip');
  limiter.hit('ip');
  assert.equal(limiter.isBlocked('ip'), true);
  assert.equal(limiter.isBlocked('other'), false);
});
