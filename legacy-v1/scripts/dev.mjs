#!/usr/bin/env node
/* Режим разработки: пересборка статики при изменениях + автоперезапуск сервера. */
import { context } from 'esbuild';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

const staticCtx = await context({
  entryPoints: [path.join(root, 'src/client/app.js')],
  outfile: path.join(root, 'public/assets/app.js'),
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  sourcemap: 'inline',
  logLevel: 'info'
});

const cssCtx = await context({
  entryPoints: [path.join(root, 'src/client/styles/index.css')],
  outfile: path.join(root, 'public/assets/app.css'),
  bundle: true,
  sourcemap: 'inline',
  logLevel: 'info'
});

await staticCtx.watch();
await cssCtx.watch();

const server = spawn(process.execPath, ['--watch', 'src/server/index.js'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

const shutdown = async () => {
  server.kill('SIGTERM');
  await staticCtx.dispose();
  await cssCtx.dispose();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', (code) => shutdown().then(() => process.exit(code ?? 0)));
