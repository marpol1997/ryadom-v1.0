import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword } from '../lib/auth/password.ts';

test('хеш пароля не содержит сам пароль', async () => {
  const hash = await hashPassword('more2026');
  assert.ok(hash.startsWith('scrypt$'));
  assert.ok(!hash.includes('more2026'));
});

test('верный пароль проходит проверку', async () => {
  const hash = await hashPassword('правильный-пароль');
  assert.equal(await verifyPassword('правильный-пароль', hash), true);
});

test('неверный пароль не проходит', async () => {
  const hash = await hashPassword('правильный-пароль');
  assert.equal(await verifyPassword('неправильный', hash), false);
});

test('два хеша одного пароля различаются (соль)', async () => {
  const [first, second] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('same-password', first), true);
  assert.equal(await verifyPassword('same-password', second), true);
});

test('битый хеш не ломает проверку', async () => {
  assert.equal(await verifyPassword('x', ''), false);
  assert.equal(await verifyPassword('x', 'plain-text'), false);
  assert.equal(await verifyPassword('x', 'scrypt$1$2$3$zz$zz'), false);
});
