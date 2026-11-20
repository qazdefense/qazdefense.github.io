'use strict';
const path = require('node:path');

const root = path.resolve(__dirname, '..');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  // Домен пока не выбран — подставьте после покупки.
  siteUrl: process.env.SITE_URL || 'https://qazdef.kz',
  dbPath: process.env.DB_PATH || path.join(root, 'data', 'site.db'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'uploads'),
  admin: {
    user: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
    secret: process.env.SESSION_SECRET || '',
  },
  // Контакты пока не заданы — заглушки видны на сайте как [в квадратных скобках].
  contacts: {
    phone: process.env.CONTACT_PHONE || '[телефон]',
    whatsapp: process.env.CONTACT_WHATSAPP || '',
    telegram: process.env.CONTACT_TELEGRAM || '[Telegram]',
    email: process.env.CONTACT_EMAIL || '[e-mail]',
    geography: 'Весь Казахстан',
  },
};
