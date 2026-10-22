#!/usr/bin/env node
/**
 * Точка входа для обычного Node-сервера (не serverless).
 * Запуск: npm start (после npm run build) или node src/server/index.js
 */
import http from 'node:http';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp({ config });

const server = http.createServer(app);

server.listen(config.port, config.host, () => {
  const url = `http://localhost:${config.port}`;
  console.log('');
  console.log('  РЯДОМ · Севастополь');
  console.log(`  Приложение: ${url}/app`);
  console.log(`  Сайт:       ${url}/`);
  console.log(`  API:        ${url}/api/health`);
  console.log(`  База:       ${config.dbFile}`);
  console.log(`  Режим:      ${config.isServerless ? 'serverless' : config.nodeEnv}`);
  console.log('');
});

// Держим keep-alive дольше прокси/Cloudflare — иначе возможны 502/520.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown(signal) {
  console.log(`\n${signal}: останавливаемся, сохраняем данные…`);
  app.close?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
