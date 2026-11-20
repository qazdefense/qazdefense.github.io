'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const content = require('../content');

const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

module.exports = function adminRoutes({ repo, auth, uploadsDir }) {
  const r = express.Router();

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (req, file, cb) => cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}${IMAGE_EXT[file.mimetype]}`),
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: 20 },
    fileFilter: (req, file, cb) => cb(null, Boolean(IMAGE_EXT[file.mimetype])),
  });

  const removeUpload = (url) => {
    if (!url || !url.startsWith('/uploads/')) return;
    const file = path.join(uploadsDir, path.basename(url));
    fs.rm(file, { force: true }, () => {});
  };

  r.use((req, res, next) => {
    res.locals.admin = true;
    res.locals.path = req.path;
    res.locals.flash = req.query.saved ? 'Сохранено' : req.query.deleted ? 'Удалено' : '';
    next();
  });

  // --- вход
  r.get('/login', (req, res) => res.render('admin/login', { title: 'Вход', error: '' }));
  r.post('/login', (req, res) => {
    if (auth.check(String(req.body.login || ''), String(req.body.password || ''))) {
      auth.login(res);
      return res.redirect('/admin');
    }
    res.status(401).render('admin/login', { title: 'Вход', error: 'Неверный логин или пароль' });
  });
  r.post('/logout', (req, res) => { auth.logout(res); res.redirect('/admin/login'); });

  r.use(auth.require);
  r.use((req, res, next) => { res.locals.unread = repo.countUnreadLeads(); next(); });

  r.get('/', (req, res) => {
    const cases = repo.listCases();
    const news = repo.listNews();
    res.render('admin/dashboard', {
      title: 'Панель',
      stats: {
        cases: cases.length, casesDraft: cases.filter((c) => c.status !== 'published').length,
        news: news.length, newsDraft: news.filter((n) => n.status !== 'published').length,
        leads: repo.listLeads().length,
      },
      leads: repo.listLeads().slice(0, 5),
    });
  });

  // --- кейсы
  const caseFields = upload.fields([{ name: 'cover_file', maxCount: 1 }, { name: 'gallery_files', maxCount: 12 }]);
  const formCase = (res, item, error = '', status = 200) => res.status(status).render('admin/case-form', {
    title: item.id ? 'Кейс' : 'Новый кейс', item, error, industries: repo.listIndustries(), directions: content.directions,
  });

  const collectCase = (req, existing = {}) => {
    const b = req.body;
    let cover = existing.cover || '';
    if (b.remove_cover) { removeUpload(cover); cover = ''; }
    const coverFile = req.files && req.files.cover_file && req.files.cover_file[0];
    if (coverFile) { removeUpload(cover); cover = `/uploads/${coverFile.filename}`; }
    const removeSet = new Set([].concat(b.remove_gallery || []));
    const gallery = (existing.gallery || []).filter((g) => {
      if (removeSet.has(g)) { removeUpload(g); return false; }
      return true;
    });
    for (const f of (req.files && req.files.gallery_files) || []) gallery.push(`/uploads/${f.filename}`);
    return { ...b, directions: [].concat(b.directions || []), cover, gallery };
  };

  r.get('/cases', (req, res) => res.render('admin/cases', { title: 'Кейсы', cases: repo.listCases() }));
  r.get('/cases/new', (req, res) => formCase(res, { status: 'draft', directions: [], gallery: [] }));
  r.post('/cases/new', caseFields, (req, res) => {
    const data = collectCase(req);
    try {
      const id = repo.saveCase(data);
      res.redirect(`/admin/cases/${id}?saved=1`);
    } catch (e) {
      formCase(res, { ...data, solutions: String(data.solutions || '').split(',') }, e.message, 422);
    }
  });
  r.get('/cases/:id', (req, res, next) => {
    const item = repo.getCase(Number(req.params.id));
    if (!item) return next();
    formCase(res, item);
  });
  r.post('/cases/:id', caseFields, (req, res, next) => {
    const existing = repo.getCase(Number(req.params.id));
    if (!existing) return next();
    const data = collectCase(req, existing);
    try {
      repo.saveCase(data, existing.id);
      res.redirect(`/admin/cases/${existing.id}?saved=1`);
    } catch (e) {
      formCase(res, { ...existing, ...data, solutions: String(data.solutions || '').split(',') }, e.message, 422);
    }
  });
  r.post('/cases/:id/delete', (req, res) => {
    const item = repo.getCase(Number(req.params.id));
    if (item) {
      removeUpload(item.cover);
      item.gallery.forEach(removeUpload);
      repo.deleteCase(item.id);
    }
    res.redirect('/admin/cases?deleted=1');
  });

  // --- новости
  const newsFields = upload.fields([{ name: 'cover_file', maxCount: 1 }]);
  const formNews = (res, item, error = '', status = 200) => res.status(status)
    .render('admin/news-form', { title: item.id ? 'Новость' : 'Новая новость', item, error });
  const collectNews = (req, existing = {}) => {
    let cover = existing.cover || '';
    if (req.body.remove_cover) { removeUpload(cover); cover = ''; }
    const f = req.files && req.files.cover_file && req.files.cover_file[0];
    if (f) { removeUpload(cover); cover = `/uploads/${f.filename}`; }
    return { ...req.body, cover };
  };

  r.get('/news', (req, res) => res.render('admin/news', { title: 'Новости', news: repo.listNews() }));
  r.get('/news/new', (req, res) => formNews(res, { status: 'draft', date: new Date().toISOString().slice(0, 10) }));
  r.post('/news/new', newsFields, (req, res) => {
    const data = collectNews(req);
    try {
      res.redirect(`/admin/news/${repo.saveNews(data)}?saved=1`);
    } catch (e) { formNews(res, data, e.message, 422); }
  });
  r.get('/news/:id', (req, res, next) => {
    const item = repo.getNews(Number(req.params.id));
    if (!item) return next();
    formNews(res, item);
  });
  r.post('/news/:id', newsFields, (req, res, next) => {
    const existing = repo.getNews(Number(req.params.id));
    if (!existing) return next();
    const data = collectNews(req, existing);
    try {
      repo.saveNews(data, existing.id);
      res.redirect(`/admin/news/${existing.id}?saved=1`);
    } catch (e) { formNews(res, { ...existing, ...data }, e.message, 422); }
  });
  r.post('/news/:id/delete', (req, res) => {
    const item = repo.getNews(Number(req.params.id));
    if (item) { removeUpload(item.cover); repo.deleteNews(item.id); }
    res.redirect('/admin/news?deleted=1');
  });

  // --- заявки
  r.get('/leads', (req, res) => res.render('admin/leads', { title: 'Заявки', leads: repo.listLeads() }));
  r.post('/leads/:id/read', (req, res) => { repo.markLead(Number(req.params.id), req.body.read !== '0'); res.redirect('/admin/leads'); });
  r.post('/leads/:id/delete', (req, res) => { repo.deleteLead(Number(req.params.id)); res.redirect('/admin/leads?deleted=1'); });

  // --- отрасли
  r.get('/industries', (req, res) => res.render('admin/industries', { title: 'Отрасли', industries: repo.listIndustries(), error: '' }));
  r.post('/industries', (req, res) => {
    const name = String(req.body.name || '').trim();
    if (name) repo.addIndustry(name, Number(req.body.sort) || 100);
    res.redirect('/admin/industries?saved=1');
  });
  r.post('/industries/:id/delete', (req, res) => { repo.deleteIndustry(Number(req.params.id)); res.redirect('/admin/industries?deleted=1'); });

  return r;
};
