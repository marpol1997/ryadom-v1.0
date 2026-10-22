# История изменений

## 1.1.0 — 2026-10-22

- Проект разбит на модули: сервер (`config`, `db`, `router`, `http`, `security`, `views`, `static`, `routes`)
  и клиент (`core`, `features`, `ui`, `styles`).
- Добавлена сборка esbuild (`npm run build`) и режим разработки (`npm run dev`).
- Добавлены ESLint 9, Prettier, `node:test` (15 тестов), GitHub Actions.
- Добавлены конфигурация Vercel (`vercel.json`, `api/index.js`), Dockerfile и `.env.example`.
- Исправлено: обработка ошибок статики, сохранение сессии при входе, отсутствующие
  помощники клиента после разбиения на модули.
- Обновлён service worker: кешируются собранные `assets`, версия `ryadom-v1.1.0`.

## 1.0.3

- Первая опубликованная версия: лендинг, SPA, JSON‑API, локальный режим.
