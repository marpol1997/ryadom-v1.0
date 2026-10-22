/**
 * Схемы валидации (zod). Одна схема на запрос — используется на сервере,
 * типы выводятся из неё, поэтому клиент и сервер не расходятся.
 */
import { z } from 'zod';

const NAME = z
  .string()
  .trim()
  .min(2, 'Имя: минимум 2 символа')
  .max(60, 'Имя: максимум 60 символов');

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export const loginField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Укажите e-mail или телефон')
  .max(120, 'Слишком длинный логин')
  .refine(
    (value) => EMAIL_RE.test(value) || /^\+?[\d\s()-]{10,20}$/.test(value),
    'Укажите корректный e-mail или телефон'
  );

export const passwordField = z
  .string()
  .min(8, 'Пароль должен быть не короче 8 символов')
  .max(200, 'Слишком длинный пароль');

export const registerSchema = z.object({
  name: NAME,
  login: loginField,
  password: passwordField,
  buildingId: z.string().uuid('Выберите дом или СНТ из списка')
});

export const loginSchema = z.object({
  login: z.string().trim().toLowerCase().min(1, 'Укажите e-mail или телефон'),
  password: z.string().min(1, 'Укажите пароль').max(200)
});

export const updateMeSchema = z
  .object({
    name: NAME.optional(),
    buildingId: z.string().uuid('Некорректный дом').optional()
  })
  .refine((value) => value.name !== undefined || value.buildingId !== undefined, {
    message: 'Нечего обновлять'
  });

export const messageSchema = z.object({
  text: z.string().trim().min(1, 'Пустое сообщение').max(1500, 'Сообщение — до 1500 символов')
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, 'Пустой комментарий').max(1000, 'Комментарий — до 1000 символов')
});

export const REQUEST_STATUSES = ['new', 'in_progress', 'done', 'rejected'] as const;

export const updateStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES, { message: 'Неизвестный статус' }),
  comment: z.string().trim().max(300, 'Комментарий — до 300 символов').optional()
});

export const createRequestSchema = z.object({
  categoryId: z.string().trim().min(1, 'Выберите категорию'),
  title: z
    .string()
    .trim()
    .min(3, 'Опишите проблему коротко в заголовке')
    .max(120, 'Заголовок — до 120 символов'),
  description: z.string().trim().max(2000, 'Описание слишком длинное').default(''),
  address: z
    .string()
    .trim()
    .min(1, 'Укажите адрес')
    .max(200, 'Адрес слишком длинный'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional()
});

export const specialistSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя или название').max(60),
  role: z.string().trim().min(2).max(40).default('handyman'),
  about: z.string().trim().max(1000, 'Описание — до 1000 символов').default(''),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[^\d+]/g, ''))
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Укажите телефон для связи')
    .refine((value) => value.replace(/\D/g, '').length <= 15, 'Телефон слишком длинный'),
  hours: z.string().trim().max(80).default('')
});

/** Логин → пара email/phone для поиска пользователя. */
export function splitLogin(login: string): { email?: string; phone?: string } {
  const value = login.trim().toLowerCase();
  if (EMAIL_RE.test(value)) return { email: value };
  return { phone: value };
}

/** Нормализация телефона: только цифры и ведущий «+». */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return '+' + digits;
}
