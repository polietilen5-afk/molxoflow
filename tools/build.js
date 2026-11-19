/* Локальная сборка (Node, без зависимостей): node tools/build.js
 * Делает исходный HTML самодостаточным и индексируемым. Результат коммитится как обычные файлы.
 *  1. Пререндер: en-текст из словаря подставляется в узлы [data-i18n], [data-i18n-html] и атрибуты
 *     [data-i18n-attr]; html lang остаётся en, ru/uk подставляет рантайм (kit.i18n.js).
 *  2. Метатеги между <!-- build:meta --> и <!-- /build:meta -->: CSP, referrer, robots, canonical,
 *     hreflang ru/uk/en/x-default, favicon, og:*, twitter:*.
 *  3. sitemap.xml и строка Sitemap в robots.txt.
 *  4. Кэш-бастинг: ?v=<sha1, 8 знаков> во всех локальных script src и link stylesheet href; версия сцены
 *     (scene.js, подгружается из app.js) подставляется в app.js до расчёта хеша app.js.
 * Сборка идемпотентна: второй запуск ничего не меняет. Коды выхода: 0 готово, 1 ошибка (нет ключа и т.п.).
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..');
var ORIGIN = 'https://molxoflow.com';
var SLUGS = ['fleet', 'dispatch', 'hr', 'tender', 'kb', 'autodiag', 'excavation', 'booking', 'recovery'];
var LANGS = ['ru', 'uk', 'en'];

/* Content-Security-Policy в meta: шрифты свои (fonts/), внешних хостов нет (T13, ADR-005). */
var CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

var PAGES = [
  { file: 'index.html', url: '/', dict: 'i18n/en.js' },
  { file: 'portfolio/index.html', url: '/portfolio/', dict: 'portfolio/i18n/en.js' },
  { file: 'privacy/index.html', url: '/privacy/', dict: 'privacy/i18n/en.js' },
  { file: '404.html', url: null, dict: 'inline' }
].concat(SLUGS.map(function (s) {
  return { file: 'portfolio/cases/' + s + '/index.html', url: '/portfolio/cases/' + s + '/', dict: 'portfolio/cases/' + s + '/i18n/en.js' };
}));

/* Критичные начертания: preload на главной и в галерее (имя файла в fonts/). */
var PRELOAD_FONTS = ['manrope-400-latin.woff2', 'unbounded-500-latin.woff2'];
var PRELOAD_PAGES = { 'index.html': 1, 'portfolio/index.html': 1 };

/* Кириллические начертания: preload только при языке ru/uk (создаёт inline-скрипт, T16). */
function cyrFonts(file) {
  var l = ['manrope-400-cyrillic.woff2', 'unbounded-500-cyrillic.woff2'];
  if (/^portfolio\/cases\//.test(file)) l.push('jetbrains-mono-400-cyrillic.woff2');
  if (file === 'portfolio/cases/excavation/index.html') l.push('fira-sans-extra-condensed-600-cyrillic.woff2', 'fira-sans-extra-condensed-700-cyrillic.woff2');
  return l;
}

/* T16: до первой отрисовки определяем язык так же, как kit.i18n (?lang, localStorage, navigator.languages).
 * Если не en: класс i18n-pending на <html> прячет body (визуально) и подгружается кириллица;
 * kit.i18n.js снимает класс после подстановки словаря и загрузки шрифтов, страховочный таймаут 1500 мс.
 * Без JS класс не ставится, контент виден. */
function pendingBlock(page, fdir, nl, soft) {
  var hide = !soft; /* soft: главная, только ранний preload кириллицы без скрытия */
  var js = "(function(){var d=document.documentElement,l='',m,s,n,i,b,q=/^(en|ru|uk|ua)/;" +
    "try{m=/[?&]lang=([a-zA-Z]+)/.exec(location.search);if(m){b=m[1].toLowerCase().slice(0,2);if(q.test(b))l=b}}catch(e){}" +
    "if(!l)try{b=String(localStorage.getItem('molxo-variant-lang')||'').toLowerCase().slice(0,2);if(q.test(b))l=b}catch(e){}" +
    "if(!l)try{n=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];for(i=0;i<n.length;i++){b=String(n[i]||'').toLowerCase().slice(0,2);if(q.test(b)){l=b;break}}}catch(e){}" +
    "if(l==='ua')l='uk';if(l!=='ru'&&l!=='uk')return;" +
    (hide ? "d.classList.add('i18n-pending');" +
    "var f=function(){d.classList.remove('i18n-pending')};setTimeout(f,6000);document.addEventListener('DOMContentLoaded',function(){setTimeout(f,1500)});" : "") +
    "var F=" + JSON.stringify(cyrFonts(page.file)) + ",k,a;" +
    "for(k=0;k<F.length;k++){a=document.createElement('link');a.rel='preload';a.as='font';a.type='font/woff2';a.crossOrigin='';a.href='" + fdir + "'+F[k];document.head.appendChild(a)}" +
    "})();";
  return ['<script id="i18n-pend">' + js + '</script>',
    hide ? '<style>html.i18n-pending body{visibility:hidden}</style>' : ''].filter(Boolean).join(nl);
}

var errors = [];
var changed = [];

function abs(rel) { return path.join(ROOT, rel); }
function readText(rel) { return fs.readFileSync(abs(rel), 'utf8'); }
function writeIfChanged(rel, text) {
  var old = null;
  try { old = fs.readFileSync(abs(rel), 'utf8'); } catch (e) { old = null; }
  if (old !== text) { fs.writeFileSync(abs(rel), text, 'utf8'); changed.push(rel); }
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }
function sha(buf) { return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8); }

/* Загрузка словаря: файл выполняется с подставным MFI18N.register. */
function loadDict(source) {
  var got = {};
  var sandbox = { MFI18N: { register: function (l, d) { got[l] = d; } }, window: {} };
  vm.runInNewContext(source, sandbox, { timeout: 2000 });
  return got.en || {};
}
function dictFor(page, html) {
  if (page.dict === 'inline') {
    var m = /<script>([\s\S]*?MFI18N\.register[\s\S]*?)<\/script>/.exec(html.replace(/<!-- build:meta -->[^]*?<!-- \/build:meta -->/g, ''));
    return m ? loadDict(m[1]) : {};
  }
  return loadDict(readText(page.dict));
}

/* ---------- 1. Пререндер ---------- */
var VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;

function setAttr(tag, name, value) {
  var re = new RegExp('(\\s' + name + '=)(["\'])[\\s\\S]*?\\2');
  if (re.test(tag)) return tag.replace(re, function (m, a) { return a + '"' + escAttr(value) + '"'; });
  return tag.replace(/\s*(\/?)>$/, function (m, sl) { return ' ' + name + '="' + escAttr(value) + '"' + (sl ? ' /' : '') + '>'; });
}

function prerender(html, dict, file) {
  var out, re, m, pos;
  function t(key) {
    if (!Object.prototype.hasOwnProperty.call(dict, key)) { errors.push(file + ': нет ключа en "' + key + '"'); return null; }
    return dict[key];
  }
  /* атрибуты */
  out = html.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]*)"[^>]*>/g, function (tag, spec) {
    var parts = spec.split(';'), i, c, name, key, v;
    for (i = 0; i < parts.length; i++) {
      c = parts[i].indexOf(':');
      if (c <= 0) continue;
      name = parts[i].slice(0, c).replace(/\s/g, '');
      key = parts[i].slice(c + 1).replace(/\s/g, '');
      v = t(key);
      if (v !== null) tag = setAttr(tag, name, v);
    }
    return tag;
  });
  /* содержимое [data-i18n] и [data-i18n-html] */
  re = /<([a-zA-Z][\w-]*)\b[^>]*?\sdata-i18n(-html)?="([^"]+)"[^>]*>/g;
  pos = 0;
  while ((m = re.exec(out))) {
    var name = m[1], isHtml = !!m[2], key = m[3], start = m.index + m[0].length, depth = 1, tagRe, tm, end = -1, v;
    if (VOID.test(name) || /\/>$/.test(m[0])) continue;
    tagRe = new RegExp('<(/?)' + name + '\\b[^>]*>', 'gi');
    tagRe.lastIndex = start;
    while ((tm = tagRe.exec(out))) {
      if (tm[1]) { depth--; if (depth === 0) { end = tm.index; break; } } else if (!/\/>$/.test(tm[0])) depth++;
    }
    if (end < 0) { errors.push(file + ': не найден закрывающий тег для ' + name + ' ' + key); continue; }
    v = t(key);
    if (v === null) continue;
    out = out.slice(0, start) + (isHtml ? v : esc(v)) + out.slice(end);
    re.lastIndex = start;
  }
  return out;
}

/* ---------- 2. Метатеги ---------- */
function stripHeadTags(html) {
  html = html.replace(/[ \t]*<!-- build:meta -->[\s\S]*?<!-- \/build:meta -->(\r?\n)?/g, '');
  html = html.replace(/[ \t]*<link\b[^>]*\bhref="https:\/\/fonts\.(googleapis|gstatic)\.com[^"]*"[^>]*>[ \t]*(\r?\n)?/gi, '');
  html = html.replace(/[ \t]*<link\b[^>]*\brel="(canonical|icon|alternate)"[^>]*>[ \t]*(\r?\n)?/gi, '');
  html = html.replace(/[ \t]*<meta\b[^>]*\b(property="og:[^"]*"|name="twitter:[^"]*"|name="referrer"|name="robots"|http-equiv="Content-Security-Policy")[^>]*>[ \t]*(\r?\n)?/gi, '');
  return html;
}
function getTitle(html) {
  var m = /<title\b[^>]*>([\s\S]*?)<\/title>/.exec(html);
  return m ? m[1] : '';
}
function getDesc(html) {
  var m = /<meta\b[^>]*name="description"[^>]*>/.exec(html), c;
  if (!m) return '';
  c = /\scontent="([^"]*)"/.exec(m[0]);
  return c ? c[1] : '';
}
function metaBlock(page, title, desc, nl) {
  var L = [], noindex = page.url === null, canon = page.url ? ORIGIN + page.url : null;
  L.push('<!-- build:meta -->');
  L.push('<meta http-equiv="Content-Security-Policy" content="' + escAttr(CSP) + '">');
  L.push('<meta name="referrer" content="no-referrer">');
  L.push('<meta name="robots" content="' + (noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large') + '">');
  L.push('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
  var up = path.relative(path.dirname(abs(page.file)), ROOT).split(path.sep).join('/');
  var fdir = (up ? up + '/' : '') + 'fonts/';
  if (page.url === null) fdir = '/fonts/'; /* 404.html отдаётся на любой глубине URL: путь только корневой */
  L.push(pendingBlock(page, fdir, nl, page.file === 'index.html')); /* главная: свой гейт T07 (html:not(.rdy)), тут только preload кириллицы при ru/uk */
  L.push('<link rel="stylesheet" href="' + fdir + 'fonts.css">');
  if (PRELOAD_PAGES[page.file]) PRELOAD_FONTS.forEach(function (f) {
    L.push('<link rel="preload" href="' + fdir + f + '" as="font" type="font/woff2" crossorigin>');
  });
  if (canon) {
    L.push('<link rel="canonical" href="' + canon + '">');
    LANGS.forEach(function (l) { L.push('<link rel="alternate" hreflang="' + l + '" href="' + canon + '?lang=' + l + '">'); });
    L.push('<link rel="alternate" hreflang="x-default" href="' + canon + '">');
    L.push('<meta property="og:url" content="' + canon + '">');
  }
  L.push('<meta property="og:type" content="website">');
  L.push('<meta property="og:site_name" content="Molxo Flow">');
  L.push('<meta property="og:title" content="' + title + '">');
  L.push('<meta property="og:description" content="' + desc + '">');
  L.push('<meta property="og:image" content="' + ORIGIN + '/og.jpg">');
  L.push('<meta property="og:image:width" content="1200">');
  L.push('<meta property="og:image:height" content="630">');
  L.push('<meta property="og:image:alt" content="' + title + '">');
  L.push('<meta name="twitter:card" content="summary_large_image">');
  L.push('<meta name="twitter:title" content="' + title + '">');
  L.push('<meta name="twitter:description" content="' + desc + '">');
  L.push('<meta name="twitter:image" content="' + ORIGIN + '/og.jpg">');
  L.push('<!-- /build:meta -->');
  return L.join(nl) + nl;
}
function injectMeta(html, page) {
  var nl = html.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  var title, desc, m, at;
  html = stripHeadTags(html);
  title = getTitle(html); desc = getDesc(html);
  m = /<meta\b[^>]*name="viewport"[^>]*>(\r?\n)?/.exec(html);
  if (!m) { errors.push(page.file + ': нет meta viewport'); return html; }
  at = m.index + m[0].length;
  if (!m[1]) { html = html.slice(0, at) + nl + html.slice(at); at += nl.length; }
  return html.slice(0, at) + metaBlock(page, title, desc, nl) + html.slice(at);
}

/* ---------- 4. Кэш-бастинг ---------- */
function resolveLocal(pageFile, ref) {
  var clean = ref.split('#')[0].split('?')[0];
  if (/^([a-z]+:)?\/\//i.test(clean) || /^(data|blob|mailto|tel|tg|javascript):/i.test(clean) || !clean) return null;
  if (clean.charAt(0) === '/') return path.join(ROOT, clean);
  return path.resolve(path.dirname(abs(pageFile)), clean);
}
function versioned(pageFile, html) {
  function fix(tag, attr) {
    var re = new RegExp('(\\s' + attr + '=)(["\'])([^"\']*)\\2');
    return tag.replace(re, function (all, a, q, ref) {
      var f = resolveLocal(pageFile, ref), base;
      if (!f) return all;
      if (!fs.existsSync(f)) { errors.push(pageFile + ': нет файла ' + ref); return all; }
      base = ref.split('#')[0].split('?')[0];
      return a + q + base + '?v=' + sha(fs.readFileSync(f)) + q;
    });
  }
  html = html.replace(/<script\b[^>]*\ssrc=["'][^"']*["'][^>]*>/gi, function (tag) { return fix(tag, 'src'); });
  html = html.replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, function (tag) { return /\shref=/.test(tag) ? fix(tag, 'href') : tag; });
  html = html.replace(/<link\b[^>]*\shref=["'][^"']*["'][^>]*\brel=["']stylesheet["'][^>]*>/gi, function (tag) { return fix(tag, 'href'); });
  return html;
}
/* app.js подгружает scene.js динамически: подставляем хеш сцены, затем app.js получает свой хеш. */
function stampScene() {
  var app = readText('app.js'), scene = sha(fs.readFileSync(abs('scene.js'))), n = 0;
  var next = app.replace(/(['"])scene\.js(\?v=[0-9a-zA-Z]*)?\1/g, function (all, q) { n++; return q + 'scene.js?v=' + scene + q; });
  if (n === 0) errors.push('app.js: не найдена ссылка на scene.js');
  writeIfChanged('app.js', next);
}

/* ---------- 3. sitemap и robots ---------- */
function sitemap() {
  var L = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
  PAGES.filter(function (p) { return p.url; }).forEach(function (p) {
    var loc = ORIGIN + p.url;
    L.push('  <url>');
    L.push('    <loc>' + loc + '</loc>');
    LANGS.forEach(function (l) { L.push('    <xhtml:link rel="alternate" hreflang="' + l + '" href="' + loc + '?lang=' + l + '"/>'); });
    L.push('    <xhtml:link rel="alternate" hreflang="x-default" href="' + loc + '"/>');
    L.push('  </url>');
  });
  L.push('</urlset>');
  writeIfChanged('sitemap.xml', L.join('\n') + '\n');
}
function robots() {
  var t = readText('robots.txt'), nl = t.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  t = t.replace(/^Sitemap:.*(\r?\n)?/gim, '').replace(/\s+$/, '');
  writeIfChanged('robots.txt', t + nl + nl + 'Sitemap: ' + ORIGIN + '/sitemap.xml' + nl);
}

/* ---------- запуск ---------- */
function main() {
  stampScene();
  PAGES.forEach(function (p) {
    var html = readText(p.file), dict = dictFor(p, html);
    html = prerender(html, dict, p.file);
    html = injectMeta(html, p);
    html = versioned(p.file, html);
    writeIfChanged(p.file, html);
  });
  sitemap();
  robots();
  if (errors.length) {
    errors.forEach(function (e) { console.error('ОШИБКА: ' + e); });
    process.exit(1);
  }
  console.log(changed.length ? 'Изменено файлов: ' + changed.length + ' (' + changed.join(', ') + ')' : 'Без изменений (сборка идемпотентна)');
}
main();
