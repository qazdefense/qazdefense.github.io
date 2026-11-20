'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { openDb, createRepo, slugify } = require('../src/db');
const { seed } = require('../src/seed');
const { createApp } = require('../src/app');

const ADMIN = { user: 'admin', password: 'test-pass', secret: 'x'.repeat(32) };

async function startApp() {
  const repo = createRepo(openDb(':memory:'));
  seed(repo);
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qd-up-'));
  const app = createApp({ repo, uploadsDir, admin: ADMIN, contacts: { phone: '[телефон]', telegram: '[Telegram]', email: '[e-mail]', geography: 'Весь Казахстан' }, siteUrl: 'http://x' });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { repo, base, close: () => server.close() };
}

async function login(base) {
  const res = await fetch(`${base}/admin/login`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ login: 'admin', password: 'test-pass' }),
  });
  assert.equal(res.status, 302);
  return res.headers.get('set-cookie').split(';')[0];
}

test('slugify транслитерирует кириллицу', () => {
  assert.equal(slugify('Переход на 1С 8.3'), 'perehod-na-1s-8-3');
  assert.equal(slugify('!!!'), 'item');
});

test('уникальный slug при одинаковых заголовках', () => {
  const repo = createRepo(openDb(':memory:'));
  const a = repo.saveCase({ title: 'Кейс', status: 'published' });
  const b = repo.saveCase({ title: 'Кейс', status: 'published' });
  assert.equal(repo.getCase(a).slug, 'keys');
  assert.equal(repo.getCase(b).slug, 'keys-2');
  // пересохранение не меняет slug
  repo.saveCase({ title: 'Кейс', slug: 'keys' }, a);
  assert.equal(repo.getCase(a).slug, 'keys');
});

test('пустой заголовок не сохраняется', () => {
  const repo = createRepo(openDb(':memory:'));
  assert.throws(() => repo.saveCase({ title: '  ' }), /заголовок/);
});

test('публичные страницы открываются', async () => {
  const { base, close } = await startApp();
  try {
    for (const p of ['/', '/services', '/services/1c', '/services/it', '/services/web', '/services/ai', '/services/design',
      '/industries', '/cases', '/cases/primer-perehod-na-8-3', '/news', '/news/primer-novosti', '/audit', '/contacts', '/kz']) {
      const res = await fetch(base + p);
      assert.equal(res.status, 200, p);
    }
    assert.equal((await fetch(base + '/services/nope')).status, 404);
  } finally { close(); }
});

test('черновик не виден на сайте', async () => {
  const { base, repo, close } = await startApp();
  try {
    repo.saveCase({ title: 'Секретный черновик', status: 'draft' });
    repo.saveNews({ title: 'Черновая новость', status: 'draft' });
    const list = await (await fetch(base + '/cases')).text();
    assert.ok(!list.includes('Секретный черновик'));
    assert.equal((await fetch(base + '/cases/sekretnyy-chernovik')).status, 404);
    assert.equal((await fetch(base + '/news/chernovaya-novost')).status, 404);
  } finally { close(); }
});

test('фильтр кейсов по отрасли и направлению вместе', async () => {
  const { base, repo, close } = await startApp();
  try {
    const log = repo.listIndustries().find((i) => i.name === 'Логистика');
    const html = await (await fetch(`${base}/cases?industry=${log.slug}&direction=it`)).text();
    assert.ok(html.includes('ИТ-инфраструктура и резервные копии'));
    assert.ok(!html.includes('переход на 1С 8.3 в рознице'));
    const empty = await (await fetch(`${base}/cases?industry=${log.slug}&direction=design`)).text();
    assert.ok(empty.includes('кейсов пока нет'));
  } finally { close(); }
});

test('кейс без картинок и решений отображается', async () => {
  const { base, repo, close } = await startApp();
  try {
    repo.saveCase({ title: 'Голый кейс', status: 'published' });
    assert.equal((await fetch(base + '/cases/golyy-keys')).status, 200);
    assert.ok((await (await fetch(base + '/cases')).text()).includes('Голый кейс'));
  } finally { close(); }
});

test('админка требует вход, неверный пароль не пускает', async () => {
  const { base, close } = await startApp();
  try {
    const r = await fetch(base + '/admin/cases', { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/admin/login');
    const bad = await fetch(`${base}/admin/login`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ login: 'admin', password: 'wrong' }),
    });
    assert.equal(bad.status, 401);
    const forged = await fetch(base + '/admin/cases', { redirect: 'manual', headers: { cookie: 'qd_admin=admin.99999999999999.fake' } });
    assert.equal(forged.status, 302);
  } finally { close(); }
});

test('кейс из админки с картинкой появляется в списке', async () => {
  const { base, repo, close } = await startApp();
  try {
    const cookie = await login(base);
    const fd = new FormData();
    fd.set('title', 'Новый кейс из админки');
    fd.set('status', 'published');
    fd.set('industry_id', String(repo.listIndustries()[0].id));
    fd.append('directions', '1c');
    fd.append('directions', 'ai');
    fd.set('solutions', '1С:УТ, Kaspi Pay');
    fd.set('result_line', 'проверочный результат');
    fd.set('task', 'Задача **жирно**');
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
    fd.set('cover_file', new Blob([png], { type: 'image/png' }), 'c.png');
    const res = await fetch(base + '/admin/cases/new', { method: 'POST', body: fd, headers: { cookie }, redirect: 'manual' });
    assert.equal(res.status, 302);
    const list = await (await fetch(base + '/cases?direction=ai')).text();
    assert.ok(list.includes('Новый кейс из админки'));
    assert.ok(list.includes('→ проверочный результат'));
    const page = await (await fetch(base + '/cases/novyy-keys-iz-adminki')).text();
    assert.ok(page.includes('<strong>жирно</strong>'));
    const cover = /src="(\/uploads\/[^"]+)"/.exec(page)[1];
    assert.equal((await fetch(base + cover)).status, 200);
  } finally { close(); }
});

test('новость из админки появляется в списке', async () => {
  const { base, close } = await startApp();
  try {
    const cookie = await login(base);
    const fd = new FormData();
    fd.set('title', 'Свежая новость');
    fd.set('status', 'published');
    fd.set('date', '2026-11-20');
    fd.set('body', 'Текст');
    const res = await fetch(base + '/admin/news/new', { method: 'POST', body: fd, headers: { cookie }, redirect: 'manual' });
    assert.equal(res.status, 302);
    const html = await (await fetch(base + '/news')).text();
    assert.ok(html.includes('Свежая новость'));
    assert.ok(html.includes('20 ноября 2026'));
  } finally { close(); }
});

test('заявка сохраняется, пустые поля — ошибка', async () => {
  const { base, repo, close } = await startApp();
  try {
    const post = (body) => fetch(base + '/contacts', {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body),
    });
    const bad = await post({ name: '', phone: '12' });
    assert.equal(bad.status, 422);
    assert.ok((await bad.text()).includes('Укажите имя'));
    const ok = await post({ name: 'Айдар', phone: '+7 701 000 00 00', message: 'Нужен аудит' });
    assert.equal(ok.status, 302);
    assert.equal(repo.listLeads().length, 1);
    await post({ name: 'Бот', phone: '+7 701 000 00 00', website: 'spam' });
    assert.equal(repo.listLeads().length, 1);
  } finally { close(); }
});
