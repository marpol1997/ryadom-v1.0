/* Заглушка вместо service worker из версии 1.0.
 *
 * Зачем: у части пользователей в браузере остался SW от v1 — он кэшировал
 * /app и /assets/* (файлов v2 уже нет) и отдавал старую оболочку приложения.
 * Браузер сам запрашивает /sw.js при каждой навигации: раньше этот запрос
 * отдавал 404, теперь он вернёт этот файл, SW обновится, снесёт старые кэши
 * и снимет регистрацию. Приложение v2 service worker не использует.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
    })()
  );
});
