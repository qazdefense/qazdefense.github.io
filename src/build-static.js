'use strict';
// Сборка статической версии сайта для GitHub Pages.
// Берёт текущее содержимое локальной базы (кейсы, новости), рендерит все публичные
// страницы в папку dist/ и копирует картинки. Форма заявки в статике заменяется
// кнопками связи, фильтр кейсов работает в браузере.
//
//   npm run build      — собрать dist/
//   npm run publish    — собрать и выложить в ветку gh-pages (см. scripts/publish.js)

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

const config = require('./config');
const content = require('./content');
const { openDb, createRepo } = require('./db');
const { seed } = require('./seed');
const { createApp } = require('./app');

const outDir = path.join(root, 'dist');

async function main() {
  const repo = createRepo(openDb(config.dbPath));
  seed(repo);
  const app = createApp({
    repo,
    uploadsDir: config.uploadsDir,
    admin: { user: 'static', password: 'static-build', secret: 'static-build-secret' },
    contacts: config.contacts,
    siteUrl: config.siteUrl,
    staticMode: true,
  });
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  const pages = ['/', '/services', '/industries', '/cases', '/news', '/audit', '/contacts', '/kz', '/solutions', '/solutions/1c', '/solutions/programs'];
  content.directions.forEach((d) => pages.push(`/services/${d.slug}`));
  require('./solutions').solutions.forEach((s) => pages.push(`/solutions/${s.slug}`));
  repo.listCases({ publishedOnly: true }).forEach((c) => pages.push(`/cases/${c.slug}`));
  repo.listNews({ publishedOnly: true }).forEach((n) => pages.push(`/news/${n.slug}`));

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const p of pages) {
    const res = await fetch(base + p);
    if (res.status !== 200) throw new Error(`${p}: HTTP ${res.status}`);
    const file = p === '/' ? path.join(outDir, 'index.html') : path.join(outDir, p, 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, await res.text());
  }
  const notFound = await fetch(base + '/__not_found__');
  fs.writeFileSync(path.join(outDir, '404.html'), await notFound.text());
  server.close();

  fs.cpSync(path.join(root, 'public'), outDir, { recursive: true });
  if (fs.existsSync(config.uploadsDir)) fs.cpSync(config.uploadsDir, path.join(outDir, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

  console.log(`Готово: ${pages.length} страниц и 404 в ${path.relative(root, outDir)}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
