'use strict';
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const { marked } = require('marked');
const content = require('./content');
const { createAuth } = require('./auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const ASSET_V = Date.now().toString(36);
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

// Каналы связи для страницы контактов и статической версии сайта.
// Ссылка появляется, только когда контакт заполнен настоящим значением.
function buildChannels(contacts) {
  const c = contacts || {};
  const digits = String(c.phone || '').replace(/[^\d+]/g, '');
  const hasPhone = digits.replace('+', '').length >= 10;
  const wa = String(c.whatsapp || '').replace(/\D/g, '') || (hasPhone ? digits.replace('+', '') : '');
  const tg = String(c.telegram || '');
  const hasTg = /^@?[A-Za-z0-9_]{5,}$/.test(tg);
  const hasMail = /@.+\./.test(String(c.email || ''));
  return [
    { cls: 'ch-wa', label: 'WhatsApp', value: c.phone, href: wa ? 'https://wa.me/' + wa : '' },
    { cls: 'ch-tg', label: 'Telegram', value: c.telegram, href: hasTg ? 'https://t.me/' + tg.replace('@', '') : '' },
    { cls: 'ch-tel', label: 'Телефон', value: c.phone, href: hasPhone ? 'tel:' + digits : '' },
    { cls: 'ch-mail', label: 'E-mail', value: c.email, href: hasMail ? 'mailto:' + c.email : '' },
  ];
}

function createApp({ repo, uploadsDir, admin, contacts, siteUrl, staticMode = false }) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const app = express();
  const root = path.resolve(__dirname, '..');

  app.set('view engine', 'ejs');
  app.set('views', path.join(root, 'views'));
  app.disable('x-powered-by');

  app.use(express.static(path.join(root, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    res.locals.path = req.path;
    res.locals.contacts = contacts;
    res.locals.siteUrl = siteUrl;
    res.locals.directions = content.directions;
    res.locals.md = (s) => marked.parse(String(s || ''));
    res.locals.formatDate = formatDate;
    res.locals.dirName = (slug) => (content.directions.find((d) => d.slug === slug) || {}).name || slug;
    res.locals.lang = 'ru';
    res.locals.isStatic = staticMode;
    res.locals.channels = buildChannels(contacts);
    res.locals.v = ASSET_V;
    // фото из public/img/photo — показываем, только если файл уже положили
    res.locals.photo = (name) => (fs.existsSync(path.join(root, 'public', 'img', 'photo', name)) ? `/img/photo/${name}` : null);
    res.locals.fmtNum = (n) => Number(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
    next();
  });

  const auth = createAuth(admin);
  app.use('/admin', adminRoutes({ repo, auth, uploadsDir }));
  app.use('/', publicRoutes({ repo }));

  app.use((req, res) => res.status(404).render('404', { title: 'Страница не найдена' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('404', { title: 'Ошибка сервера', serverError: true });
  });
  return app;
}

module.exports = { createApp, formatDate, buildChannels };
