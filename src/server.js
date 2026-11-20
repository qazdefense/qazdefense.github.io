'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// При первом запуске создаём .env с паролем админки и секретом сессии.
const envPath = path.resolve(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  const pass = crypto.randomBytes(9).toString('base64url');
  fs.writeFileSync(envPath, [
    '# Настройки сайта. Файл не попадает в git.',
    'PORT=3000',
    'ADMIN_USER=admin',
    `ADMIN_PASSWORD=${pass}`,
    `SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}`,
    '# CONTACT_PHONE=+7 ...',
    '# CONTACT_TELEGRAM=@...',
    '# CONTACT_EMAIL=...',
    '',
  ].join('\n'));
  console.log('Создан файл .env с логином и паролем админки.');
}
process.loadEnvFile(envPath);

const config = require('./config');
const { openDb, createRepo } = require('./db');
const { seed } = require('./seed');
const { createApp } = require('./app');

const repo = createRepo(openDb(config.dbPath));
seed(repo);

const app = createApp({ repo, uploadsDir: config.uploadsDir, admin: config.admin, contacts: config.contacts, siteUrl: config.siteUrl });
app.listen(config.port, () => {
  console.log(`Сайт: http://localhost:${config.port}`);
  console.log(`Админка: http://localhost:${config.port}/admin (логин и пароль в файле .env)`);
});
