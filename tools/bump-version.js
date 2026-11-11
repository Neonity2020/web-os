#!/usr/bin/env node
/* WebOS 发布前运行：node tools/bump-version.js
   给 CSS/JS 引用附加内容指纹版本号，生成 version.json，供页面自检新版本。
   托管环境不给静态资源设置 Cache-Control/ETag，仅靠 URL 变化才能确保客户端拿到新脚本。 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const assetRe = /(href|src)="((?:css|js)\/[^"?]+\.(?:css|js))(?:\?[^"]*)?"/g;
const seen = new Set();
const assets = [];
let match;
while ((match = assetRe.exec(html)) !== null) {
  if (seen.has(match[2])) continue;
  seen.add(match[2]);
  assets.push(match[2]);
}
if (!assets.length) throw new Error('index.html 中未找到 CSS/JS 资源引用');

const digest = crypto.createHash('sha256');
assets.forEach((rel) => digest.update(fs.readFileSync(path.join(root, rel))));
const d = new Date();
const date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('');
const build = date + '-' + digest.digest('hex').slice(0, 8);

html = html.replace(new RegExp(assetRe.source, 'g'), (_, attr, rel) => attr + '="' + rel + '?v=' + build + '"');
if (!/window\.WEBOS_BUILD\s*=/.test(html)) throw new Error('index.html 缺少 window.WEBOS_BUILD 占位');
html = html.replace(/window\.WEBOS_BUILD\s*=\s*'[^']*'/, "window.WEBOS_BUILD = '" + build + "'");

fs.writeFileSync(htmlPath, html);
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ build: build, assets: assets.length }, null, 2) + '\n');
console.log(build);
