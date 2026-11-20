'use strict';
// Публикация статической версии в ветку gh-pages удалённого репозитория.
//   npm run publish                 — в remote "origin"
//   npm run publish -- <remote>     — в другой remote
// Перед публикацией собирает dist/ (src/build-static.js).

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const remote = process.argv[2] || 'origin';
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const out = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();

run(process.execPath, [path.join(root, 'src', 'build-static.js')]);

const url = out('git', ['remote', 'get-url', remote], { cwd: root });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qazdefense-pages-'));
fs.cpSync(path.join(root, 'dist'), tmp, { recursive: true });

const git = (args) => run('git', args, { cwd: tmp });
git(['init', '-q', '-b', 'gh-pages']);
const name = out('git', ['config', 'user.name'], { cwd: root });
const email = out('git', ['config', 'user.email'], { cwd: root });
git(['config', 'user.name', name]);
git(['config', 'user.email', email]);
git(['add', '-A']);
git(['commit', '-q', '-m', `Публикация сайта ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`]);
git(['push', '-q', '--force', url, 'gh-pages']);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Опубликовано в ветку gh-pages (${remote}).`);
