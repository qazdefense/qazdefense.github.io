'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS industries (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 100
);
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  lang TEXT NOT NULL DEFAULT 'ru',
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
  directions TEXT NOT NULL DEFAULT '',
  solutions TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  result_line TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  gallery TEXT NOT NULL DEFAULT '[]',
  sort INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  lang TEXT NOT NULL DEFAULT 'ru',
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ә: 'a', ғ: 'g', қ: 'q', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
};

function slugify(text) {
  const s = String(text || '')
    .toLowerCase()
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return s || 'item';
}

function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

const splitList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const joinList = (v) => (Array.isArray(v) ? v : splitList(v)).map((x) => String(x).trim()).filter(Boolean).join(',');

function hydrateCase(row) {
  if (!row) return null;
  let gallery = [];
  try { gallery = JSON.parse(row.gallery || '[]'); } catch { gallery = []; }
  return { ...row, directions: splitList(row.directions), solutions: splitList(row.solutions), gallery };
}

function createRepo(db) {
  const uniqueSlug = (table, base, exceptId) => {
    const root = slugify(base);
    let slug = root;
    for (let n = 2; ; n++) {
      const row = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug);
      if (!row || row.id === exceptId) return slug;
      slug = `${root}-${n}`;
    }
  };

  const repo = {
    uniqueSlug,

    // --- industries
    listIndustries() {
      return db.prepare('SELECT * FROM industries ORDER BY sort, name').all();
    },
    addIndustry(name, sort = 100) {
      const slug = uniqueSlug('industries', name);
      const r = db.prepare('INSERT INTO industries (slug, name, sort) VALUES (?, ?, ?)').run(slug, name.trim(), sort);
      return Number(r.lastInsertRowid);
    },
    deleteIndustry(id) {
      db.prepare('DELETE FROM industries WHERE id = ?').run(id);
    },

    // --- cases
    listCases({ publishedOnly = false, industry, direction, limit } = {}) {
      const where = [];
      const args = [];
      if (publishedOnly) where.push("c.status = 'published'");
      if (industry) { where.push('i.slug = ?'); args.push(industry); }
      if (direction) { where.push("(',' || c.directions || ',') LIKE ?"); args.push(`%,${direction},%`); }
      const sql = `SELECT c.*, i.name AS industry_name, i.slug AS industry_slug
        FROM cases c LEFT JOIN industries i ON i.id = c.industry_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY c.sort, c.created_at DESC, c.id DESC ${limit ? 'LIMIT ' + Number(limit) : ''}`;
      return db.prepare(sql).all(...args).map(hydrateCase);
    },
    getCase(id) {
      return hydrateCase(db.prepare(`SELECT c.*, i.name AS industry_name, i.slug AS industry_slug
        FROM cases c LEFT JOIN industries i ON i.id = c.industry_id WHERE c.id = ?`).get(id));
    },
    getCaseBySlug(slug, { publishedOnly = true } = {}) {
      const row = db.prepare(`SELECT c.*, i.name AS industry_name, i.slug AS industry_slug
        FROM cases c LEFT JOIN industries i ON i.id = c.industry_id WHERE c.slug = ?`).get(slug);
      if (!row || (publishedOnly && row.status !== 'published')) return null;
      return hydrateCase(row);
    },
    saveCase(data, id) {
      const f = {
        title: String(data.title || '').trim(),
        client: String(data.client || '').trim(),
        status: data.status === 'published' ? 'published' : 'draft',
        industry_id: data.industry_id ? Number(data.industry_id) : null,
        directions: joinList(data.directions),
        solutions: joinList(data.solutions),
        summary: String(data.summary || '').trim(),
        result_line: String(data.result_line || '').trim(),
        task: String(data.task || ''),
        solution: String(data.solution || ''),
        result: String(data.result || ''),
        cover: String(data.cover || ''),
        gallery: JSON.stringify(Array.isArray(data.gallery) ? data.gallery : []),
        sort: Number.isFinite(Number(data.sort)) && data.sort !== '' ? Number(data.sort) : 100,
      };
      if (!f.title) throw new Error('Заполните заголовок');
      const slug = uniqueSlug('cases', data.slug || f.title, id);
      if (id) {
        db.prepare(`UPDATE cases SET slug=?, title=?, client=?, status=?, industry_id=?, directions=?, solutions=?,
          summary=?, result_line=?, task=?, solution=?, result=?, cover=?, gallery=?, sort=?, updated_at=datetime('now')
          WHERE id=?`).run(slug, f.title, f.client, f.status, f.industry_id, f.directions, f.solutions,
          f.summary, f.result_line, f.task, f.solution, f.result, f.cover, f.gallery, f.sort, id);
        return id;
      }
      const r = db.prepare(`INSERT INTO cases (slug, title, client, status, industry_id, directions, solutions,
        summary, result_line, task, solution, result, cover, gallery, sort)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(slug, f.title, f.client, f.status, f.industry_id, f.directions,
        f.solutions, f.summary, f.result_line, f.task, f.solution, f.result, f.cover, f.gallery, f.sort);
      return Number(r.lastInsertRowid);
    },
    deleteCase(id) {
      db.prepare('DELETE FROM cases WHERE id = ?').run(id);
    },

    // --- news
    listNews({ publishedOnly = false, limit } = {}) {
      return db.prepare(`SELECT * FROM news ${publishedOnly ? "WHERE status = 'published'" : ''}
        ORDER BY date DESC, id DESC ${limit ? 'LIMIT ' + Number(limit) : ''}`).all();
    },
    getNews(id) {
      return db.prepare('SELECT * FROM news WHERE id = ?').get(id) || null;
    },
    getNewsBySlug(slug, { publishedOnly = true } = {}) {
      const row = db.prepare('SELECT * FROM news WHERE slug = ?').get(slug);
      if (!row || (publishedOnly && row.status !== 'published')) return null;
      return row;
    },
    saveNews(data, id) {
      const title = String(data.title || '').trim();
      if (!title) throw new Error('Заполните заголовок');
      const status = data.status === 'published' ? 'published' : 'draft';
      const date = /^\d{4}-\d{2}-\d{2}$/.test(data.date || '') ? data.date : new Date().toISOString().slice(0, 10);
      const slug = uniqueSlug('news', data.slug || title, id);
      const vals = [slug, title, status, date, String(data.excerpt || '').trim(), String(data.body || ''), String(data.cover || '')];
      if (id) {
        db.prepare(`UPDATE news SET slug=?, title=?, status=?, date=?, excerpt=?, body=?, cover=?, updated_at=datetime('now')
          WHERE id=?`).run(...vals, id);
        return id;
      }
      const r = db.prepare('INSERT INTO news (slug, title, status, date, excerpt, body, cover) VALUES (?,?,?,?,?,?,?)').run(...vals);
      return Number(r.lastInsertRowid);
    },
    deleteNews(id) {
      db.prepare('DELETE FROM news WHERE id = ?').run(id);
    },

    // --- leads
    addLead({ kind, name, phone, company = '', message = '' }) {
      const r = db.prepare('INSERT INTO leads (kind, name, phone, company, message) VALUES (?,?,?,?,?)')
        .run(kind, name, phone, company, message);
      return Number(r.lastInsertRowid);
    },
    listLeads() {
      return db.prepare('SELECT * FROM leads ORDER BY created_at DESC, id DESC').all();
    },
    countUnreadLeads() {
      return db.prepare('SELECT COUNT(*) AS n FROM leads WHERE is_read = 0').get().n;
    },
    markLead(id, isRead) {
      db.prepare('UPDATE leads SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, id);
    },
    deleteLead(id) {
      db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    },
  };
  return repo;
}

module.exports = { openDb, createRepo, slugify, splitList };
