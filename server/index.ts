import { createApp } from './app';
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const server = createApp({ token: process.env.ELECTRICITYMAPS_KEY }).listen(
  port,
  host,
  () => console.log(`Green Meter API listening on ${host}:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close());
