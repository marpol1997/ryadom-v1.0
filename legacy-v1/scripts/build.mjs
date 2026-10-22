#!/usr/bin/env node
/* Сборка статики: JS-бандл приложения, CSS и landing-стили в public/assets. */
import { build } from 'esbuild';
import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outdir = path.join(root, 'public', 'assets');
const production = process.env.NODE_ENV !== 'development';

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await build({
  entryPoints: [path.join(root, 'src/client/app.js')],
  outfile: path.join(outdir, 'app.js'),
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: production,
  sourcemap: production ? false : 'inline',
  legalComments: 'none',
  logLevel: 'info'
});

for (const [entry, outfile] of [
  ['src/client/styles/index.css', 'app.css'],
  ['src/client/landing/landing.css', 'landing.css']
]) {
  await build({
    entryPoints: [path.join(root, entry)],
    outfile: path.join(outdir, outfile),
    bundle: true,
    minify: production,
    loader: { '.png': 'dataurl', '.svg': 'dataurl' },
    logLevel: 'info'
  });
}

console.log('✓ статика собрана в public/assets');
