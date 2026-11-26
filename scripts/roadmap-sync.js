'use strict';
// Дорожная карта Базовода из GitHub: этапы (milestones) и задачи (issues) репозитория.
// Репозиторий закрытый, поэтому страница показывает только названия и строку «Кратко:»
// из описания задачи, без ссылок на сами задачи.
//
//   node scripts/roadmap-sync.js   (нужен вошедший gh)
//
// Результат: public/bazovod/assets/roadmap.json. После него — публикация сайта.
// Если в gh активен другой аккаунт: GH_TOKEN=$(gh auth token --user qazdefense) node scripts/roadmap-sync.js

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repo = 'qazdefense/bazovod';
const api = (p) => JSON.parse(execFileSync('gh', ['api', '--paginate', p], { encoding: 'utf8', maxBuffer: 1 << 24 }));

const ms = api(`repos/${repo}/milestones?state=all&per_page=100`);
const issues = api(`repos/${repo}/issues?state=all&per_page=100`).filter((i) => !i.pull_request && i.milestone);

const short = (body) => {
  const m = /^Кратко:\s*(.+)$/m.exec(body || '');
  return m ? m[1].trim() : '';
};
const order = (t) => t.split(' ')[0].split('.').map(Number);
ms.sort((a, b) => { const x = order(a.title), y = order(b.title); return x[0] - y[0] || x[1] - y[1]; });

let nextTaken = false;
const milestones = ms.map((m) => {
  const items = issues
    .filter((i) => i.milestone.number === m.number)
    .sort((a, b) => a.number - b.number)
    .map((i) => ({ title: i.title, note: short(i.body), done: i.state === 'closed' }));
  const done = items.filter((i) => i.done).length;
  let status = 'plan';
  if (m.state === 'closed') status = 'done';
  // В работе: первый открытый этап и любой открытый, где уже закрыта хоть одна задача.
  else if (!nextTaken || done > 0) { status = 'next'; nextTaken = true; }
  const sp = m.title.indexOf(' ');
  return {
    version: m.title.slice(0, sp),
    title: m.title.slice(sp + 1),
    note: m.description || '',
    status,
    done,
    total: items.length,
    closedAt: m.closed_at ? m.closed_at.slice(0, 10) : '',
    items,
  };
});

const d = new Date();
const out = { updated: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, milestones };
// Формат движка сайта Кабинета сотрудника (public/bazovod/assets/roadmap.json)
const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const monthOf = (iso) => { const [y, mo] = iso.split('-'); return `${months[+mo - 1]} ${y}`; };
const deck = {
  updated: `${out.updated.slice(8, 10)}.${out.updated.slice(5, 7)}.${out.updated.slice(0, 4)}`,
  milestones: milestones.map((m, i) => {
    const due = ms[i].due_on;
    return {
      id: 'v' + m.version.replace('.', ''),
      date: m.closedAt ? monthOf(m.closedAt) : due ? monthOf(due.slice(0, 10)) : '',
      approx: !m.closedAt && !!due,
      version: m.version,
      status: m.status,
      title: m.title,
      short: m.status === 'done' ? '' : m.title.split(':')[0],
      // Третий элемент 1: задача закрыта на GitHub.
      items: m.items.map((it) => (it.done ? [it.title, it.note, 1] : [it.title, it.note])),
    };
  }),
};
fs.writeFileSync(path.join(__dirname, '..', 'public', 'bazovod', 'assets', 'roadmap.json'), JSON.stringify(deck, null, 2) + '\n');

const all = milestones.reduce((n, m) => n + m.total, 0);
const fin = milestones.reduce((n, m) => n + m.done, 0);
console.log(`${milestones.length} этапов, ${fin} из ${all} задач сделано → public/bazovod/assets/roadmap.json`);
