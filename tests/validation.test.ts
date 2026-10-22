import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRequestSchema,
  loginField,
  messageSchema,
  normalizePhone,
  registerSchema,
  splitLogin,
  updateStatusSchema
} from '../lib/validation.ts';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

test('регистрация: валидные данные проходят', () => {
  const parsed = registerSchema.parse({
    name: 'Анна Соколова',
    login: 'Anna@Example.COM',
    password: 'more2026',
    buildingId: VALID_UUID
  });
  assert.equal(parsed.login, 'anna@example.com');
});

test('регистрация: короткий пароль отклоняется', () => {
  const result = registerSchema.safeParse({
    name: 'Анна',
    login: 'a@b.ru',
    password: '123',
    buildingId: VALID_UUID
  });
  assert.equal(result.success, false);
});

test('регистрация: мусорный логин отклоняется', () => {
  assert.equal(loginField.safeParse('не-логин').success, false);
  assert.equal(loginField.safeParse('+7 978 123-45-67').success, true);
  assert.equal(loginField.safeParse('user@mail.ru').success, true);
});

test('логин разделяется на e-mail и телефон', () => {
  assert.deepEqual(splitLogin('USER@Mail.RU'), { email: 'user@mail.ru' });
  assert.deepEqual(splitLogin('+7 978 123-45-67'), { phone: '+7 978 123-45-67' });
});

test('телефон нормализуется', () => {
  assert.equal(normalizePhone('+7 (978) 123-45-67'), '+79781234567');
});

test('заявка: заголовок короче 3 символов отклоняется', () => {
  const result = createRequestSchema.safeParse({
    categoryId: 'water',
    title: 'да',
    address: 'ул. Ленина, 1'
  });
  assert.equal(result.success, false);
});

test('заявка: без адреса отклоняется', () => {
  const result = createRequestSchema.safeParse({
    categoryId: 'water',
    title: 'Нет воды',
    address: ''
  });
  assert.equal(result.success, false);
});

test('заявка: координаты приводятся к числу', () => {
  const parsed = createRequestSchema.parse({
    categoryId: 'water',
    title: 'Нет воды',
    address: 'ул. Ленина, 1',
    lat: '44.61',
    lng: '33.52'
  });
  assert.equal(parsed.lat, 44.61);
  assert.equal(parsed.lng, 33.52);
});

test('сообщение: пустое и слишком длинное отклоняются', () => {
  assert.equal(messageSchema.safeParse({ text: '   ' }).success, false);
  assert.equal(messageSchema.safeParse({ text: 'a'.repeat(1501) }).success, false);
  assert.equal(messageSchema.safeParse({ text: 'Привет, соседи' }).success, true);
});

test('статус заявки: только из перечисления', () => {
  assert.equal(updateStatusSchema.safeParse({ status: 'done' }).success, true);
  assert.equal(updateStatusSchema.safeParse({ status: 'hacked' }).success, false);
});
