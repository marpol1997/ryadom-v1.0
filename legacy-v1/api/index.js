/**
 * Serverless-адаптер для Vercel: один Node-handler на все /api/* запросы.
 * Файл лежит в /api, поэтому Vercel сам делает его функцией.
 *
 * Важно: статика (public/) раздаётся CDN Vercel, сюда попадают только /api/*.
 * Данные в /tmp живут до перезапуска инстанса — см. README, раздел «Хранение».
 */
import { createApp } from '../src/server/app.js';
import { loadConfig } from '../src/server/config.js';

const app = createApp({ config: loadConfig() });

export default function handler(req, res) {
  return app(req, res);
}
