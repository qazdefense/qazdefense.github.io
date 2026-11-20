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

function createApp({ repo, uploadsDir, admin, contacts, siteUrl }) {
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
    res.locals.v = ASSET_V;
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

module.exports = { createApp, formatDate };
