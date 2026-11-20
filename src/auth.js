'use strict';
const crypto = require('node:crypto');

const COOKIE = 'qd_admin';
const TTL_MS = 1000 * 60 * 60 * 12; // 12 часов

function sign(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function createAuth({ user, password, secret }) {
  if (!password || !secret) throw new Error('ADMIN_PASSWORD и SESSION_SECRET должны быть заданы');

  const issue = (res) => {
    const payload = `${user}.${Date.now() + TTL_MS}`;
    res.cookie(COOKIE, `${payload}.${sign(secret, payload)}`, {
      httpOnly: true, sameSite: 'strict', maxAge: TTL_MS, path: '/admin',
      secure: process.env.NODE_ENV === 'production',
    });
  };

  const isValid = (req) => {
    const raw = req.cookies && req.cookies[COOKIE];
    if (!raw) return false;
    const i = raw.lastIndexOf('.');
    const payload = raw.slice(0, i);
    const sig = raw.slice(i + 1);
    if (!safeEqual(sig, sign(secret, payload))) return false;
    const exp = Number(payload.split('.').pop());
    return Number.isFinite(exp) && exp > Date.now();
  };

  return {
    check: (login, pass) => safeEqual(login, user) && safeEqual(pass, password),
    login: issue,
    logout: (res) => res.clearCookie(COOKIE, { path: '/admin' }),
    require: (req, res, next) => (isValid(req) ? next() : res.redirect('/admin/login')),
  };
}

module.exports = { createAuth };
