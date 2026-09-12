import { build as viteBuild } from 'vite';
import { build } from 'esbuild';
await viteBuild();
await build({
  entryPoints: ['src/background/index.ts'],
  bundle: true,
  outfile: 'dist/background.js',
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  minify: true,
});
await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  outfile: 'dist-api/index.js',
  format: 'esm',
  platform: 'node',
  target: 'node22',
  packages: 'external',
});
