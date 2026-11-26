'use strict';
const express = require('express');
const content = require('../content');
const { solutions, getSolution } = require('../solutions');
const products = require('../products');
// чип конфигурации на странице направления → страница решения
const solutionLinks = { '1С:УТ': '1c-ut-kz' };
solutions.forEach((x) => { solutionLinks[x.name] = x.slug; });

const LEAD_KINDS = { contacts: 'Заявка с сайта', audit: 'Аудит 1С' };

function validateLead(body) {
  const v = {
    name: String(body.name || '').trim().slice(0, 120),
    phone: String(body.phone || '').trim().slice(0, 40),
    company: String(body.company || '').trim().slice(0, 160),
    message: String(body.message || '').trim().slice(0, 4000),
  };
  const errors = {};
  if (!v.name) errors.name = 'Укажите имя';
  if (v.phone.replace(/\D/g, '').length < 6) errors.phone = 'Укажите телефон для связи';
  return { values: v, errors };
}

module.exports = function publicRoutes({ repo }) {
  const r = express.Router();

  r.get('/', (req, res) => {
    res.render('home', {
      title: 'QazDefense — автоматизация учёта, ИТ, сайты и ИИ-агенты в Казахстане',
      cases: repo.listCases({ publishedOnly: true, limit: 3 }),
      news: repo.listNews({ publishedOnly: true, limit: 3 }),
      ...content,
    });
  });

  r.get('/services', (req, res) => res.render('services', { title: 'Направления', ...content }));

  r.get('/services/:slug', (req, res, next) => {
    const dir = content.directions.find((d) => d.slug === req.params.slug);
    if (!dir) return next();
    res.render('service', {
      title: dir.name,
      dir,
      solutionLinks,
      cases: repo.listCases({ publishedOnly: true, direction: dir.slug, limit: 3 }),
    });
  });

  r.get('/solutions', (req, res) => {
    const catalog = require('../catalog');
    res.render('solutions', {
      title: 'Решения',
      description: 'Готовые решения QazDefense: собственные продукты и каталог решений на 1С — конфигурации для Казахстана, отраслевые программы, обмены с Kaspi.kz и маркетплейсами, ИИ в 1С и сопровождение.',
      ...catalog,
    });
  });

  r.get('/solutions/:slug', (req, res, next) => {
    const p = products.getProduct(req.params.slug);
    if (!p) return next();
    res.render('product', { title: p.title, description: p.description, p, rm: products.roadmap(p.slug) });
  });

  r.get('/solutions/:slug/roadmap', (req, res, next) => {
    const p = products.getProduct(req.params.slug);
    const rm = p && products.roadmap(p.slug);
    if (!rm) return next();
    res.render('roadmap', {
      title: `Дорожная карта: ${p.name}`,
      description: `Что уже сделано в программе ${p.name}, что в работе и что впереди. Обновляется из задач разработки.`,
      p, rm,
    });
  });

  r.get('/solutions/:slug', (req, res, next) => {
    const s = getSolution(req.params.slug);
    if (!s) return next();
    res.render('solution', { title: s.title, description: s.description, s });
  });

  r.get('/industries', (req, res) => {
    res.render('industries', { title: 'Отраслевые решения', ...content, industries: repo.listIndustries() });
  });

  r.get('/cases', (req, res) => {
    const industry = typeof req.query.industry === 'string' ? req.query.industry : '';
    const direction = typeof req.query.direction === 'string' ? req.query.direction : '';
    res.render('cases', {
      title: 'Кейсы',
      cases: repo.listCases({ publishedOnly: true, industry, direction }),
      industries: repo.listIndustries(),
      filter: { industry, direction },
    });
  });

  r.get('/cases/:slug', (req, res, next) => {
    const item = repo.getCaseBySlug(req.params.slug);
    if (!item) return next();
    const more = repo.listCases({ publishedOnly: true, limit: 4 }).filter((c) => c.id !== item.id).slice(0, 3);
    res.render('case', { title: item.title, item, more });
  });

  r.get('/news', (req, res) => res.render('news-list', { title: 'Новости', news: repo.listNews({ publishedOnly: true }) }));

  r.get('/news/:slug', (req, res, next) => {
    const item = repo.getNewsBySlug(req.params.slug);
    if (!item) return next();
    const more = repo.listNews({ publishedOnly: true, limit: 4 }).filter((n) => n.id !== item.id).slice(0, 3);
    res.render('news-item', { title: item.title, item, more });
  });

  const leadPage = (kind, view, title) => {
    r.get(`/${kind}`, (req, res) => {
      res.render(view, { title, ...content, values: {}, errors: {}, sent: req.query.sent === '1' });
    });
    r.post(`/${kind}`, (req, res) => {
      if (req.body.website) return res.redirect(`/${kind}?sent=1`); // ловушка для ботов
      const { values, errors } = validateLead(req.body);
      if (Object.keys(errors).length) {
        return res.status(422).render(view, { title, ...content, values, errors, sent: false });
      }
      repo.addLead({ kind: LEAD_KINDS[kind], ...values });
      res.redirect(`/${kind}?sent=1#form`);
    });
  };
  leadPage('audit', 'audit', 'Бесплатный экспресс-аудит 1С');
  leadPage('contacts', 'contacts', 'Контакты');

  r.get('/kz', (req, res) => { res.locals.lang = 'kk'; res.render('kz', { title: 'Қазақша нұсқа' }); });

  return r;
};

module.exports.validateLead = validateLead;
