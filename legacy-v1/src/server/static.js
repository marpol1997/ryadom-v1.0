/** Раздача статики с gzip и защитой от path traversal. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fail } from './http.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function serveFile(req, res, filePath, status = 200) {
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) return fail(res, 404, 'Файл не найден');

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const isText = /^(text\/|application\/(javascript|json|manifest))/.test(type);
    const headers = {
      'Content-Type': type,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Content-Length': stat.size
    };

    if (isText && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      const { 'Content-Length': _length, ...rest } = headers;
      res.writeHead(status, { ...rest, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
      return;
    }

    res.writeHead(status, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

/** @returns {boolean} false — путь не статический, отдаём 404 */
export function serveStatic(req, res, url, config) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    fail(res, 400, 'Плохой путь');
    return true;
  }

  if (pathname === '/app' || pathname === '/app/' || pathname.startsWith('/app/')) {
    if (pathname !== '/app') {
      res.writeHead(301, { Location: '/app' });
      res.end();
      return true;
    }
    serveFile(req, res, path.join(config.publicDir, 'app.html'));
    return true;
  }

  if (pathname === '/') pathname = '/index.html';

  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(config.publicDir, safe);
  if (!file.startsWith(config.publicDir)) {
    fail(res, 403, 'Запрещено');
    return true;
  }

  serveFile(req, res, file);
  return true;
}
