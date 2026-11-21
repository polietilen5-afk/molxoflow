/* Проверка сайта: node tools/check-site.js
 *  - у 11 страниц (главная, портфолио, 9 кейсов), /privacy/ и 404: непустые title, description, h1 с текстом,
 *    canonical (кроме 404), hreflang ru/uk/en/x-default, og:title/description/image/url, favicon, CSP, referrer;
 *  - все локальные href/src/stylesheet/script существуют; локальные script и stylesheet имеют ?v=<хеш> и он совпадает;
 *  - нет [ключей] в HTML; все ключи data-i18n есть в словарях en/ru/uk страницы (рядом лежащих i18n);
 *  - наборы ключей en/ru/uk одинаковы; sitemap.xml разбирается и содержит все страницы; robots.txt с Sitemap;
 *  - target=_blank без rel=noopener нет; kit-копии равны (tools/check-kit.js).
 * Коды выхода: 0 всё хорошо, 1 есть замечания.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');
var cp = require('child_process');

var ROOT = path.resolve(__dirname, '..');
var SLUGS = ['fleet', 'dispatch', 'hr', 'tender', 'kb', 'autodiag', 'excavation', 'booking', 'recovery'];
var PAGES = [
  { file: 'index.html', url: '/', dir: 'i18n' },
  { file: 'portfolio/index.html', url: '/portfolio/', dir: 'portfolio/i18n' },
  { file: 'privacy/index.html', url: '/privacy/', dir: 'privacy/i18n' },
  { file: '404.html', url: null, dir: null }
].concat(SLUGS.map(function (s) {
  return { file: 'portfolio/cases/' + s + '/index.html', url: '/portfolio/cases/' + s + '/', dir: 'portfolio/cases/' + s + '/i18n' };
}));

var bad = [];
var ok = 0;
function fail(msg) { bad.push(msg); }
function abs(rel) { return path.join(ROOT, rel); }
function sha(buf) { return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8); }
function stripTags(s) { return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

function loadDicts(source) {
  var got = {};
  vm.runInNewContext(source, { MFI18N: { register: function (l, d) { got[l] = d; } }, window: {} }, { timeout: 2000 });
  return got;
}
function pageDicts(p, html) {
  var all = {}, m, re, d, l;
  if (p.dir) {
    ['en', 'ru', 'uk'].forEach(function (l2) {
      try { all[l2] = loadDicts(fs.readFileSync(abs(p.dir + '/' + l2 + '.js'), 'utf8'))[l2]; } catch (e) { fail(p.file + ': нет словаря ' + p.dir + '/' + l2 + '.js'); }
    });
  } else {
    re = /<script>([\s\S]*?MFI18N\.register[\s\S]*?)<\/script>/g;
    html = html.replace(/<script id="i18n-pend">[^]*?<\/script>/g, '');
    while ((m = re.exec(html))) { d = loadDicts(m[1]); for (l in d) { all[l] = d[l]; } }
  }
  return all;
}
function metaContent(html, attr, name) {
  var re = new RegExp('<meta\\b[^>]*\\b' + attr + '="' + name + '"[^>]*>', 'i'), m = re.exec(html), c;
  if (!m) return '';
  c = /\scontent="([^"]*)"/.exec(m[0]);
  return c ? c[1] : '';
}
function resolve(pageFile, ref) {
  var clean = ref.split('#')[0].split('?')[0];
  if (!clean || /^([a-z]+:)?\/\//i.test(clean) || /^(data|blob|mailto|tel|tg|javascript):/i.test(clean)) return null;
  return clean.charAt(0) === '/' ? path.join(ROOT, clean) : path.resolve(path.dirname(abs(pageFile)), clean);
}

PAGES.forEach(function (p) {
  var html, dicts, m, re, keys, k, l, before = bad.length, title, desc, h1;
  try { html = fs.readFileSync(abs(p.file), 'utf8'); } catch (e) { fail(p.file + ': файла нет'); return; }
  title = (/<title\b[^>]*>([\s\S]*?)<\/title>/.exec(html) || [])[1] || '';
  if (!stripTags(title)) fail(p.file + ': пустой title');
  desc = metaContent(html, 'name', 'description');
  if (!desc.trim()) fail(p.file + ': пустой description');
  h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  if (!h1 || !stripTags(h1[1])) fail(p.file + ': h1 пустой или нет');
  if (p.url) {
    if (html.indexOf('<link rel="canonical" href="https://molxoflow.com' + p.url + '">') < 0) fail(p.file + ': нет canonical');
    ['ru', 'uk', 'en'].forEach(function (x) {
      if (html.indexOf('hreflang="' + x + '" href="https://molxoflow.com' + (x === 'en' ? '' : '/' + x) + p.url + '"') < 0) fail(p.file + ': нет hreflang ' + x);
    });
    if (html.indexOf('hreflang="x-default" href="https://molxoflow.com' + p.url + '"') < 0) fail(p.file + ': нет hreflang x-default');
    if (metaContent(html, 'property', 'og:url') !== 'https://molxoflow.com' + p.url) fail(p.file + ': og:url');
  }
  ['og:title', 'og:description', 'og:image'].forEach(function (n) { if (!metaContent(html, 'property', n)) fail(p.file + ': нет ' + n); });
  if (!metaContent(html, 'name', 'twitter:card')) fail(p.file + ': нет twitter:card');
  if (!/<link rel="icon"[^>]*href="\/favicon\.svg"/.test(html)) fail(p.file + ': нет favicon');
  if (!metaContent(html, 'http-equiv', 'Content-Security-Policy')) fail(p.file + ': нет CSP');
  if (metaContent(html, 'name', 'referrer') !== 'no-referrer') fail(p.file + ': нет referrer');
  if (/fonts\.(googleapis|gstatic)\.com/i.test(html)) fail(p.file + ': осталась ссылка на Google Fonts');
  if (!/<link rel="stylesheet" href="((\.\.\/)*|\/)fonts\/fonts\.css\?v=[0-9a-f]{8}">/.test(html)) fail(p.file + ': не подключён fonts/fonts.css');
  /* [ключи] в видимом HTML */
  m = /\[[a-z][a-z0-9]*(\.[a-z0-9]+)+\]/i.exec(html.replace(/<script[\s\S]*?<\/script>/g, ''));
  if (m) fail(p.file + ': в HTML виден ключ ' + m[0]);
  /* ключи словарей */
  dicts = pageDicts(p, html);
  keys = {};
  re = /\sdata-i18n(?:-html)?="([^"]+)"/g;
  while ((m = re.exec(html))) keys[m[1]] = 1;
  re = /\sdata-i18n-attr="([^"]*)"/g;
  while ((m = re.exec(html))) m[1].split(';').forEach(function (x) { var c = x.indexOf(':'); if (c > 0) keys[x.slice(c + 1).replace(/\s/g, '')] = 1; });
  ['en', 'ru', 'uk'].forEach(function (lg) {
    if (!dicts[lg]) { fail(p.file + ': нет словаря ' + lg); return; }
    for (k in keys) if (!Object.prototype.hasOwnProperty.call(dicts[lg], k)) fail(p.file + ': в ' + lg + ' нет ключа ' + k);
  });
  if (dicts.en && dicts.ru && dicts.uk) {
    ['ru', 'uk'].forEach(function (lg) {
      for (k in dicts.en) if (!Object.prototype.hasOwnProperty.call(dicts[lg], k)) fail(p.file + ': набор ключей ' + lg + ' без ' + k);
      for (k in dicts[lg]) if (!Object.prototype.hasOwnProperty.call(dicts.en, k)) fail(p.file + ': набор ключей ' + lg + ' лишний ' + k);
    });
  }
  /* ссылки и версии */
  re = /<(a|link|script|img|source|video)\b[^>]*>/gi;
  while ((m = re.exec(html))) {
    var tag = m[0], name = m[1].toLowerCase(), attr = (name === 'a' || name === 'link') ? 'href' : 'src', av, f, vm2, isAsset;
    av = new RegExp('\\s' + attr + '="([^"]*)"').exec(tag);
    if (name === 'video') { av = /\sposter="([^"]*)"/.exec(tag); }
    if (!av) continue;
    f = resolve(p.file, av[1]);
    if (f) {
      if (f.indexOf(ROOT) !== 0) { fail(p.file + ': ссылка выходит за корень ' + av[1]); continue; }
      if (!fs.existsSync(f) && !(fs.existsSync(f + '.html'))) { fail(p.file + ': мёртвая ссылка ' + av[1]); continue; }
      isAsset = name === 'script' || (name === 'link' && /rel="stylesheet"/.test(tag));
      if (isAsset && fs.statSync(f).isFile()) {
        vm2 = /\?v=([0-9a-f]{8})$/.exec(av[1]);
        if (!vm2) fail(p.file + ': нет ?v= у ' + av[1]);
        else if (vm2[1] !== sha(fs.readFileSync(f))) fail(p.file + ': устаревший ?v= у ' + av[1]);
      }
    }
    if (/\starget="_blank"/.test(tag) && !/\srel="[^"]*noopener/.test(tag)) fail(p.file + ': target=_blank без noopener');
  }
  if (bad.length === before) ok++;
});

/* шрифты: все woff2 из fonts.css существуют, лишних нет */
(function () {
  var css = '', re = /url\(([^)]+)\)/g, m, used = {}, files;
  try { css = fs.readFileSync(abs('fonts/fonts.css'), 'utf8'); } catch (e) { fail('нет fonts/fonts.css'); return; }
  while ((m = re.exec(css))) {
    var ref = m[1].replace(/["']/g, '');
    used[ref] = 1;
    if (/^(https?:)?\/\//i.test(ref)) fail('fonts.css: внешний url ' + ref);
    else if (!fs.existsSync(path.join(abs('fonts'), ref))) fail('fonts.css: нет файла ' + ref);
  }
  files = fs.readdirSync(abs('fonts')).filter(function (f) { return /\.woff2$/.test(f); });
  files.forEach(function (f) { if (!used[f]) fail('fonts/' + f + ' не используется в fonts.css'); });
  if (!fs.existsSync(abs('fonts/LICENSE.txt'))) fail('нет fonts/LICENSE.txt');
}());

/* версия сцены в app.js */
(function () {
  var app = fs.readFileSync(abs('app.js'), 'utf8'), m = /scene\.js\?v=([0-9a-f]{8})/.exec(app);
  if (!m) fail('app.js: нет версии scene.js');
  else if (m[1] !== sha(fs.readFileSync(abs('scene.js')))) fail('app.js: устаревшая версия scene.js');
}());

/* Языковые копии ru/ и uk/: статичный текст языка в сыром HTML, самоссылающийся canonical, полный набор hreflang,
 * ссылки на страницы ведут в тот же язык, ресурсы существуют. */
(function () {
  function langUrl(url, lang) { return lang !== 'en' ? '/' + lang + url : url; }
  PAGES.filter(function (p) { return p.url; }).forEach(function (p) {
    ['ru', 'uk'].forEach(function (lang) {
      var file = lang + '/' + p.file, html, canon = 'https://molxoflow.com' + langUrl(p.url, lang), title, h1, m, re, ref, f;
      try { html = fs.readFileSync(abs(file), 'utf8'); } catch (e) { fail(file + ': файла нет'); return; }
      if (!new RegExp('<html lang="' + lang + '" data-lang-fixed="' + lang + '"').test(html)) fail(file + ': нет <html lang data-lang-fixed>');
      if (html.indexOf('<link rel="canonical" href="' + canon + '">') < 0) fail(file + ': нет canonical на себя');
      ['ru', 'uk', 'en'].forEach(function (x) {
        if (html.indexOf('hreflang="' + x + '" href="https://molxoflow.com' + langUrl(p.url, x) + '"') < 0) fail(file + ': нет hreflang ' + x);
      });
      if (html.indexOf('hreflang="x-default" href="https://molxoflow.com' + p.url + '"') < 0) fail(file + ': нет hreflang x-default');
      if (metaContent(html, 'property', 'og:url') !== canon) fail(file + ': og:url');
      title = stripTags((/<title\b[^>]*>([\s\S]*?)<\/title>/.exec(html) || [])[1] || '');
      h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html);
      if (!/[А-Яа-яІіЇїЄєҐґ]/.test(title)) fail(file + ': title не на языке страницы');
      if (!h1 || !/[А-Яа-яІіЇїЄєҐґ]/.test(stripTags(h1[1]))) fail(file + ': h1 не на языке страницы');
      if (!/[А-Яа-яІіЇїЄєҐґ]/.test(metaContent(html, 'name', 'description'))) fail(file + ': description не на языке страницы');
      m = /\[[a-z][a-z0-9]*(\.[a-z0-9]+)+\]/i.exec(html.replace(/<script[\s\S]*?<\/script>/g, ''));
      if (m) fail(file + ': в HTML виден ключ ' + m[0]);
      /* ссылки на страницы сайта: только в тот же язык */
      re = /<a\b[^>]*\shref="([^"#][^"]*)"/g;
      while ((m = re.exec(html))) {
        ref = m[1].split('?')[0];
        if (/^([a-z]+:)?\/\//i.test(ref)) continue;
        if (PAGES.some(function (q) { return q.url === ref; })) fail(file + ': ссылка на страницу без языка: ' + ref);
      }
      /* ресурсы: корневые пути существуют */
      re = /\s(?:src|href)="(\/[^"#?]+)/g;
      while ((m = re.exec(html.replace(/<script\b(?![^>]*\ssrc=)[\s\S]*?<\/script>/g, '')))) {
        f = abs(m[1].replace(/^\//, ''));
        if (/\/$/.test(m[1])) { if (!fs.existsSync(abs(m[1].replace(/^\//, '') + 'index.html'))) fail(file + ': нет страницы ' + m[1]); }
        else if (!fs.existsSync(f)) fail(file + ': нет файла ' + m[1]);
      }
    });
  });
}());

/* sitemap и robots */
(function () {
  var sm = '', rb = '', locs, i, depth = 0, tags;
  try { sm = fs.readFileSync(abs('sitemap.xml'), 'utf8'); } catch (e) { fail('нет sitemap.xml'); }
  if (sm) {
    tags = sm.replace(/<\?xml[^>]*\?>/, '').match(/<[^>]+>/g) || [];
    tags.forEach(function (t) {
      if (/^<\//.test(t)) depth--; else if (!/\/>$/.test(t)) depth++;
      if (depth < 0) fail('sitemap.xml: лишний закрывающий тег');
    });
    if (depth !== 0) fail('sitemap.xml: теги не сбалансированы');
    locs = (sm.match(/<loc>[^<]+<\/loc>/g) || []).length;
    if (locs !== 36) fail('sitemap.xml: ожидалось 36 адресов (12 страниц x en, ru, uk), найдено ' + locs);
    PAGES.filter(function (p) { return p.url; }).forEach(function (p) {
      ['', '/ru', '/uk'].forEach(function (pre) {
        if (sm.indexOf('<loc>https://molxoflow.com' + pre + p.url + '</loc>') < 0) fail('sitemap.xml: нет ' + pre + p.url);
      });
    });
  }
  try { rb = fs.readFileSync(abs('robots.txt'), 'utf8'); } catch (e2) { fail('нет robots.txt'); }
  if (!/^Sitemap: https:\/\/molxoflow\.com\/sitemap\.xml/m.test(rb)) fail('robots.txt: нет строки Sitemap');
  if (!fs.existsSync(abs('404.html'))) fail('нет 404.html');
}());

/* kit-копии */
(function () {
  var r = cp.spawnSync(process.execPath, [path.join(__dirname, 'check-kit.js')], { encoding: 'utf8' });
  if (r.status !== 0) fail('kit-копии различаются: ' + (r.stderr || '').trim());
}());

if (bad.length) {
  bad.forEach(function (b) { console.error('ЗАМЕЧАНИЕ: ' + b); });
  console.error('Проблем: ' + bad.length);
  process.exit(1);
}
console.log('Всё в порядке: страниц без замечаний ' + ok + ' из ' + PAGES.length + ', 0 мёртвых ссылок, 0 [ключей].');
