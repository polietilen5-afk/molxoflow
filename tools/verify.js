/* Автопроверка сайта (T09): node tools/verify.js [--only a,b,c] [--out <папка>]
 * Свой статический сервер на свободном порту, Playwright chromium (как tools/shots.js), без внешней сети:
 * все запросы не на 127.0.0.1 обрываются и считаются нарушением.
 * Отчёт: <корень>/../.ai/EVIDENCE/T09/report.md, results.json, verify.log.
 * Группы (--only): static, matrix, overflow, perf, switch, detect, propagate, pause, rotator, booking, autodiag, excav320, external
 */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var PW = process.env.PLAYWRIGHT_DIR || 'C:/Users/Molxo1/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
var CH = process.env.CHROME_PATH || 'C:/Users/Molxo1/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
var chromium = require(PW).chromium;
var args = process.argv.slice(2);
function opt(n, d) { var i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; }
var OUT = path.resolve(opt('--out', path.join(ROOT, '..', '.ai', 'EVIDENCE', 'T09')));
var ONLY = opt('--only', '') ? opt('--only', '').split(',') : null;
function want(g) { return !ONLY || ONLY.indexOf(g) >= 0; }
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

var SLUGS = ['fleet', 'dispatch', 'hr', 'tender', 'kb', 'autodiag', 'excavation', 'booking', 'recovery'];
var PAGES = [{ id: 'home', url: '/' }, { id: 'portfolio', url: '/portfolio/' }].concat(SLUGS.map(function (s) {
  return { id: 'case-' + s, url: '/portfolio/cases/' + s + '/' };
})).concat([{ id: 'privacy', url: '/privacy/' }, { id: '404', url: '/404.html' }]);
var LANGS = ['ru', 'uk', 'en'];
var WIDTHS = [320, 390, 768, 1440];
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };

var logLines = [];
function log(s) { logLines.push(s); console.log(s); }
var results = [];
function rec(group, name, ok, detail) {
  results.push({ group: group, name: name, ok: !!ok, detail: detail || '' });
  log((ok ? 'PASS ' : 'FAIL ') + '[' + group + '] ' + name + (detail ? ' :: ' + detail : ''));
}

var server = http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split('?')[0]);
  var f = path.join(ROOT, p);
  if (f.indexOf(ROOT) !== 0) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, function (e, d) {
    if (e) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); return res.end('404'); }
    res.setHeader('Content-Type', MIME[path.extname(f).toLowerCase()] || 'application/octet-stream');
    res.end(d);
  });
});
var BASE = '', HOST = '';
var extReqs = {}; /* url -> where */

async function mk(br, o, label) {
  o = o || {};
  var ctx = await br.newContext({ viewport: o.viewport || { width: 1440, height: 900 }, locale: o.locale || 'en-US', reducedMotion: o.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  var page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  var st = { ctx: ctx, page: page, errs: [], label: label || '' };
  await page.route(function (u) { return u.hostname !== '127.0.0.1'; }, function (r) {
    var u = r.request().url();
    if (!/^(data|blob):/.test(u)) extReqs[u] = st.label;
    r.abort();
  });
  page.on('console', function (m) {
    if (m.type() !== 'error') return;
    var loc = m.location() || {}, u = loc.url || '';
    if (u && u.indexOf(HOST) !== 0 && !/^(data|blob):/.test(u)) return; /* внешний обрыв учитывается отдельно */
    st.errs.push('console: ' + m.text().slice(0, 200) + (u ? ' @' + u.replace(BASE, '') : ''));
  });
  page.on('pageerror', function (e) { st.errs.push('pageerror: ' + String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', function (d) { d.dismiss().catch(function () {}); });
  return st;
}
async function go(st, url, wait) {
  await st.page.goto(BASE + url, { waitUntil: 'load' });
  await st.page.waitForTimeout(wait || 1200);
}
function urlOf(p, l) { return p.url + (l ? '?lang=' + l : ''); }

/* Текст страницы для проверок: видимые и скрытые узлы без скриптов/стилей/переключателя языка, плюс атрибуты. */
var SCAN_FN = function () {
  var c = document.body.cloneNode(true), i, n, out = [];
  n = c.querySelectorAll('script,style,template,noscript,[data-i18n-switch],.mfi-switch'); for (i = 0; i < n.length; i++) n[i].parentNode.removeChild(n[i]);
  out.push(c.textContent);
  out.push(document.title);
  n = document.querySelectorAll('[aria-label],[title],[placeholder],[alt]');
  for (i = 0; i < n.length; i++) {
    if (n[i].closest('[data-i18n-switch],.mfi-switch')) continue;
    out.push(n[i].getAttribute('aria-label') || ''); out.push(n[i].getAttribute('title') || ''); out.push(n[i].getAttribute('placeholder') || ''); out.push(n[i].getAttribute('alt') || '');
  }
  return out.join('\n');
};
var KEY_RE = /\[[A-Za-z_][\w-]*(?:\.[\w-]+)+\]/g;
var CYR_RE = /[\u0400-\u04FF]/;
function scanText(t) {
  var keys = t.match(KEY_RE) || [];
  var cyr = '';
  t.split('\n').some(function (ln) { var m = /[\u0400-\u04FF][\u0400-\u04FF\s\w.,;:!?()\-]{0,25}/.exec(ln); if (m) { cyr = m[0].trim(); return true; } return false; });
  return { keys: keys.filter(function (v, i, a) { return a.indexOf(v) === i; }), cyr: cyr };
}

/* Прокликивает видимые кнопки (кроме переключателя языка и паузы). */
async function clickAll(st, limit) {
  var page = st.page, n = 0, i, cnt, url0 = page.url().split('?')[0], seen = '';
  for (i = 0; i < limit; i++) {
    cnt = await page.evaluate(function () { return window.__vb ? 0 : 0; });
    var info = await page.evaluate(function (idx) {
      var all = document.querySelectorAll('button'), vis = [], k, r, b, cs;
      for (k = 0; k < all.length; k++) {
        b = all[k];
        if (b.closest('[data-i18n-switch],.mfi-switch') || b.id === 'pauseBtn' || b.disabled) continue;
        r = b.getBoundingClientRect(); cs = getComputedStyle(b);
        if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none') continue;
        vis.push(b);
      }
      if (idx >= vis.length) return { total: vis.length, done: true };
      vis[idx].setAttribute('data-vclick', '1');
      return { total: vis.length, done: false, label: (vis[idx].textContent || vis[idx].getAttribute('aria-label') || '').trim().slice(0, 30) };
    }, i);
    if (info.done) { cnt = info.total; break; }
    try { await page.evaluate(function () { var x = document.querySelector('[data-vclick]'); if (x) x.click(); }); n++; } catch (e) { /* пропуск */ }
    await page.evaluate(function () { var x = document.querySelector('[data-vclick]'); if (x) x.removeAttribute('data-vclick'); });
    await page.waitForTimeout(60);
    if (page.url().split('?')[0] !== url0) { try { await page.goBack({ waitUntil: 'load' }); await page.waitForTimeout(500); } catch (e2) {} }
  }
  return n;
}

async function groupStatic() {
  var re = {
    title: /<title[^>]*>([^<]*\S[^<]*)<\/title>/i,
    desc: /<meta\b[^>]*\bname="description"[^>]*>/i
  };
  var allOk = true;
  PAGES.forEach(function (p) {
    var file = path.join(ROOT, p.url === '/404.html' ? '404.html' : p.url.replace(/^\//, '') + 'index.html');
    var h = fs.readFileSync(file, 'utf8'), miss = [];
    function meta(attr, name) { var m = new RegExp('<meta\\b[^>]*\\b' + attr + '="' + name + '"[^>]*>', 'i').exec(h), c; if (!m) return ''; c = /\scontent="([^"]*)"/.exec(m[0]); return c ? c[1].trim() : ''; }
    if (!re.title.test(h)) miss.push('title');
    if (!meta('name', 'description')) miss.push('description');
    if (p.id !== '404') {
      if (!/<link\b[^>]*rel="canonical"[^>]*href="https:\/\/[^"]+"/i.test(h)) miss.push('canonical');
      ['ru', 'uk', 'en', 'x-default'].forEach(function (l) { if (!new RegExp('<link\\b[^>]*hreflang="' + l + '"[^>]*href="https://[^"]+"', 'i').test(h)) miss.push('hreflang-' + l); });
      ['og:title', 'og:description', 'og:image', 'og:url'].forEach(function (k) { if (!meta('property', k)) miss.push(k); });
      if (!meta('name', 'twitter:card')) miss.push('twitter:card');
    }
    if (!/<link\b[^>]*rel="icon"/i.test(h)) miss.push('favicon');
    var h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(h);
    if (p.id !== '404' && (!h1 || !h1[1].replace(/<[^>]*>/g, '').trim())) miss.push('h1-text-in-raw-html');
    rec('static', p.id + ': title/description/canonical/hreflang/og/twitter/favicon/h1 в сыром HTML', !miss.length, miss.length ? 'нет: ' + miss.join(', ') : 'title=' + (re.title.exec(h) || [0, ''])[1].trim().slice(0, 50));
    if (miss.length) allOk = false;
  });
  var sm = fs.existsSync(path.join(ROOT, 'sitemap.xml')), rb = fs.existsSync(path.join(ROOT, 'robots.txt')) && /Sitemap:/i.test(fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8'));
  rec('static', 'sitemap.xml существует, robots.txt содержит Sitemap', sm && rb, 'sitemap=' + sm + ' robots-sitemap=' + rb);
}

async function groupMatrix(br) {
  var matrix = [];
  for (var pi = 0; pi < PAGES.length; pi++) {
    for (var li = 0; li < LANGS.length; li++) {
      var p = PAGES[pi], l = LANGS[li], st = await mk(br, {}, p.id + '/' + l);
      var row = { page: p.id, lang: l, keys: [], cyr: '', errs: 0, clicks: 0, errList: [] };
      try {
        await go(st, urlOf(p, l), 1500);
        var t1 = scanText(await st.page.evaluate(SCAN_FN));
        row.clicks = await clickAll(st, 30);
        await st.page.waitForTimeout(400);
        var t2 = scanText(await st.page.evaluate(SCAN_FN));
        row.keys = t1.keys.concat(t2.keys).filter(function (v, i, a) { return a.indexOf(v) === i; });
        row.cyr = t1.cyr || t2.cyr;
        row.errList = st.errs.slice(0, 6); row.errs = st.errs.length;
        if (l === 'en' && (p.id === 'home' || p.id === 'portfolio')) await st.page.screenshot({ path: path.join(OUT, 'shots', p.id + '-' + l + '-1440.png') });
      } catch (e) { row.errList.push('exception: ' + e.message.slice(0, 160)); row.errs++; }
      await st.ctx.close();
      matrix.push(row);
      log('  matrix ' + p.id + '/' + l + ' keys=' + row.keys.length + ' cyr=' + (row.cyr ? 'YES' : 'no') + ' errs=' + row.errs + ' clicks=' + row.clicks);
    }
  }
  var badK = matrix.filter(function (r) { return r.keys.length; });
  rec('matrix', 'Нет [ключей] на 13 страницах x ru/uk/en (39 проверок, до и после кликов)', !badK.length, badK.length ? badK.map(function (r) { return r.page + '/' + r.lang + ': ' + r.keys.slice(0, 4).join(' '); }).join('; ') : '0 ключей в 39 прогонах');
  var enRows = matrix.filter(function (r) { return r.lang === 'en'; }), badC = enRows.filter(function (r) { return r.cyr; });
  rec('matrix', 'Нет кириллицы в en (13 страниц)', !badC.length, badC.length ? badC.map(function (r) { return r.page + ': «' + r.cyr + '»'; }).join('; ') : '0 вхождений');
  var badE = matrix.filter(function (r) { return r.errs; });
  var totalClicks = matrix.reduce(function (a, r) { return a + r.clicks; }, 0);
  rec('matrix', 'Нет ошибок консоли/pageerror после кликов по кнопкам (39 прогонов, кликов: ' + totalClicks + ')', !badE.length, badE.length ? badE.map(function (r) { return r.page + '/' + r.lang + ': ' + r.errList.join(' | '); }).join('; ') : '0 ошибок');
  fs.writeFileSync(path.join(OUT, 'matrix.json'), JSON.stringify(matrix, null, 1));
  return matrix;
}

async function groupOverflow(br) {
  var bad = [], n = 0, worst = 0;
  for (var wi = 0; wi < WIDTHS.length; wi++) {
    for (var pi = 0; pi < PAGES.length; pi++) {
      for (var li = 0; li < LANGS.length; li++) {
        var p = PAGES[pi], l = LANGS[li], st = await mk(br, { viewport: { width: WIDTHS[wi], height: 800 } }, 'ovf');
        try {
          await go(st, urlOf(p, l), 900);
          var m = await st.page.evaluate(function () { var de = document.documentElement; return { sw: Math.max(de.scrollWidth, document.body.scrollWidth), cw: de.clientWidth, iw: window.innerWidth }; });
          n++;
          var over = m.sw - Math.max(m.cw, m.iw);
          if (over > 1) { bad.push(WIDTHS[wi] + ' ' + p.id + '/' + l + ' scrollWidth=' + m.sw + ' > ' + m.iw); if (over > worst) worst = over; }
        } catch (e) { bad.push(WIDTHS[wi] + ' ' + p.id + '/' + l + ' exception ' + e.message.slice(0, 80)); }
        await st.ctx.close();
      }
    }
    log('  overflow width ' + WIDTHS[wi] + ' done, bad so far ' + bad.length);
  }
  WIDTHS.forEach(function (w) {
    var b = bad.filter(function (x) { return x.indexOf(w + ' ') === 0; });
    rec('overflow', 'Нет горизонтальной прокрутки на ' + w + ' px (13 страниц x 3 языка = 39)', !b.length, b.length ? b.slice(0, 8).join('; ') : '39/39 без прокрутки');
  });
}

async function perfRun(br, url, label, vp, waitMs) {
  var st = await mk(br, { viewport: vp || { width: 1365, height: 900 } }, 'perf');
  var cdp = await st.ctx.newCDPSession(st.page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await st.page.addInitScript(function () {
    window.__lcp = 0; window.__cls = 0; window.__lt = []; window.__fcp = 0;
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { window.__lcp = e.startTime; }); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (!e.hadRecentInput) window.__cls += e.value; }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { window.__lt.push([e.startTime, e.duration]); }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.name === 'first-contentful-paint') window.__fcp = e.startTime; }); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  });
  await st.page.goto(BASE + url, { waitUntil: 'load', timeout: 90000 });
  await st.page.waitForTimeout(waitMs || 20000);
  var m = await st.page.evaluate(function () {
    var tbt = 0, i; for (i = 0; i < window.__lt.length; i++) { if (window.__lt[i][0] >= window.__fcp) tbt += Math.max(0, window.__lt[i][1] - 50); }
    return { lcp: Math.round(window.__lcp), fcp: Math.round(window.__fcp), cls: +window.__cls.toFixed(4), tbt: Math.round(tbt), tasks: window.__lt.length };
  });
  m.errs = st.errs.length;
  await st.ctx.close();
  log('  perf ' + label + ' ' + JSON.stringify(m));
  return m;
}
async function groupPerf(br) {
  var home = [];
  for (var i = 0; i < 3; i++) home.push(await perfRun(br, '/?lang=en', 'home#' + (i + 1), null, 22000));
  function med(k) { var a = home.map(function (x) { return x[k]; }).sort(function (x, y) { return x - y; }); return a[1]; }
  var h = { lcp: med('lcp'), cls: Math.max.apply(null, home.map(function (x) { return x.cls; })), tbt: med('tbt') };
  rec('perf', 'Главная (Slow 4G 1.6 Мбит/150 мс, CPU x4, 1365x900): LCP <= 2500 мс (медиана из 3)', h.lcp <= 2500, 'LCP ' + home.map(function (x) { return x.lcp; }).join('/') + ' мс, медиана ' + h.lcp);
  rec('perf', 'Главная: CLS <= 0.1', h.cls <= 0.1, 'CLS ' + home.map(function (x) { return x.cls; }).join('/') + ', макс ' + h.cls);
  rec('perf', 'Главная: TBT < 1000 мс (было 849-1631 мс до T07; медиана из 3, окно 22 с)', h.tbt < 1000, 'TBT ' + home.map(function (x) { return x.tbt; }).join('/') + ' мс, медиана ' + h.tbt);
  var hm = await perfRun(br, '/?lang=ru', 'home-ru-390', { width: 390, height: 844 }, 22000);
  rec('perf', 'Главная ru 390x844: LCP <= 2500 мс, CLS <= 0.1', hm.lcp <= 2500 && hm.cls <= 0.1, 'LCP ' + hm.lcp + ' мс, CLS ' + hm.cls + ', TBT ' + hm.tbt + ' мс');
  var targets = [['/portfolio/?lang=en', 'Галерея'], ['/portfolio/cases/excavation/?lang=en', 'Кейс excavation'], ['/portfolio/cases/tender/?lang=en', 'Кейс tender']];
  for (var j = 0; j < targets.length; j++) {
    var m = await perfRun(br, targets[j][0], targets[j][1], null, 12000);
    rec('perf', targets[j][1] + ': LCP <= 2500 мс, CLS <= 0.1', m.lcp <= 2500 && m.cls <= 0.1, 'LCP ' + m.lcp + ' мс, CLS ' + m.cls + ', TBT ' + m.tbt + ' мс (информативно), FCP ' + m.fcp + ' мс');
  }
}

async function groupSwitch(br) {
  var pages = [PAGES[0], PAGES[1], PAGES.filter(function (p) { return p.id === 'case-fleet'; })[0], PAGES.filter(function (p) { return p.id === 'privacy'; })[0]];
  var vps = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
  var smallClosed = [], smallOpen = [], focusBad = [], escBad = [], arrowBad = [], ariaBad = [], liveBad = [], urlBad = [], n = 0;
  for (var pi = 0; pi < pages.length; pi++) {
    for (var vi = 0; vi < vps.length; vi++) {
      var p = pages[pi], st = await mk(br, { viewport: vps[vi] }, 'sw');
      var tag = p.id + '@' + vps[vi].width;
      try {
        await go(st, urlOf(p, 'en'), 1200);
        var pg = st.page, sw = pg.locator('[data-i18n-switch]').first();
        if (!(await sw.count())) { smallClosed.push(tag + ': нет переключателя'); await st.ctx.close(); continue; }
        n++;
        var act = sw.locator('button[aria-pressed="true"]');
        var bb = await act.boundingBox();
        if (!bb || bb.width < 43.5 || bb.height < 43.5) smallClosed.push(tag + ' активная ' + (bb ? Math.round(bb.width) + 'x' + Math.round(bb.height) : 'нет'));
        var ariaE = await act.getAttribute('aria-expanded');
        var live = await sw.getAttribute('aria-live'), role = await sw.getAttribute('role'), lbl = await sw.getAttribute('aria-label');
        if (ariaE !== 'false' || !live || role !== 'group' || lbl !== 'Language') ariaBad.push(tag + ' closed aria-expanded=' + ariaE + ' live=' + live + ' role=' + role + ' label=' + lbl);
        await act.click(); await pg.waitForTimeout(250);
        var openE = await act.getAttribute('aria-expanded');
        if (openE !== 'true') ariaBad.push(tag + ' open aria-expanded=' + openE);
        var btns = sw.locator('button'), cnt = await btns.count(), k;
        for (k = 0; k < cnt; k++) { var b2 = await btns.nth(k).boundingBox(); if (!b2 || b2.width < 43.5 || b2.height < 43.5) smallOpen.push(tag + ' ' + (await btns.nth(k).getAttribute('data-lang')) + ' ' + (b2 ? Math.round(b2.width) + 'x' + Math.round(b2.height) : 'нет')); }
        /* стрелки */
        await act.focus(); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(80);
        var f1 = await pg.evaluate(function () { return document.activeElement && document.activeElement.getAttribute('data-lang'); });
        await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(80);
        var f2 = await pg.evaluate(function () { return document.activeElement && document.activeElement.getAttribute('data-lang'); });
        if (f1 !== 'ru' || f2 !== 'en') arrowBad.push(tag + ' Right->' + f1 + ' Left->' + f2);
        /* Escape */
        await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
        var esc = await pg.evaluate(function () { var a = document.activeElement, s = document.querySelector('[data-i18n-switch]'); return { lang: a && a.getAttribute('data-lang'), pressed: a && a.getAttribute('aria-pressed'), exp: a && a.getAttribute('aria-expanded'), open: s.classList.contains('mfi-open') }; });
        if (esc.lang !== 'en' || esc.pressed !== 'true' || esc.open) escBad.push(tag + ' ' + JSON.stringify(esc));
        /* выбор языка мышью: en -> uk */
        await act.click(); await pg.waitForTimeout(200);
        await sw.locator('button[data-lang="uk"]').click(); await pg.waitForTimeout(700);
        var after = await pg.evaluate(function () { var a = document.activeElement; return { lang: a && a.getAttribute('data-lang'), pressed: a && a.getAttribute('aria-pressed'), html: document.documentElement.lang, url: location.search, grp: document.querySelector('[data-i18n-switch]').getAttribute('aria-label') }; });
        if (after.lang !== 'uk' || after.pressed !== 'true') focusBad.push(tag + ' фокус на ' + JSON.stringify(after));
        if (after.html !== 'uk' || after.url.indexOf('lang=uk') < 0) urlBad.push(tag + ' html=' + after.html + ' url=' + after.url);
        if (after.grp !== 'Мова') ariaBad.push(tag + ' подпись группы после uk = «' + after.grp + '» (ожидается «Мова»)');
        /* выбор языка с клавиатуры: Enter на ru */
        await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
        await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(100);
        var cur = await pg.evaluate(function () { return document.activeElement && document.activeElement.getAttribute('data-lang'); });
        await pg.keyboard.press('Enter'); await pg.waitForTimeout(700);
        var after2 = await pg.evaluate(function () { var a = document.activeElement; return { lang: a && a.getAttribute('data-lang'), pressed: a && a.getAttribute('aria-pressed'), html: document.documentElement.lang }; });
        if (cur !== after2.html && after2.lang !== after2.html) focusBad.push(tag + ' (клавиатура) выбран ' + cur + ', фокус на ' + JSON.stringify(after2));
        else if (after2.pressed !== 'true') focusBad.push(tag + ' (клавиатура) фокус не на активной кнопке ' + JSON.stringify(after2));
        if (p.id === 'home' && vps[vi].width === 1440) await pg.screenshot({ path: path.join(OUT, 'shots', 'switch-home-1440.png'), clip: { x: 900, y: 0, width: 540, height: 120 } });
      } catch (e) { focusBad.push(tag + ' exception ' + e.message.slice(0, 120)); }
      await st.ctx.close();
    }
  }
  rec('switch', 'Переключатель: активная кнопка (свёрнутая) >= 44x44 px (' + n + ' замеров)', !smallClosed.length, smallClosed.length ? smallClosed.join('; ') : 'все >= 44x44');
  rec('switch', 'Переключатель: все кнопки раскрытого ряда >= 44x44 px', !smallOpen.length, smallOpen.length ? smallOpen.join('; ') : 'все >= 44x44');
  rec('switch', 'Фокус возвращается на кнопку активного языка после выбора (мышь и клавиатура)', !focusBad.length, focusBad.length ? focusBad.join('; ') : 'фокус на кнопке нового языка во всех ' + n + ' замерах');
  rec('switch', 'Escape сворачивает ряд и возвращает фокус на активную кнопку', !escBad.length, escBad.length ? escBad.join('; ') : 'ok во всех ' + n);
  rec('switch', 'Стрелки влево/вправо двигают фокус в открытом ряду', !arrowBad.length, arrowBad.length ? arrowBad.join('; ') : 'ok во всех ' + n);
  rec('switch', 'aria-expanded, aria-live, role=group, подпись группы на языке страницы (en «Language», uk «Мова»)', !ariaBad.length, ariaBad.length ? ariaBad.join('; ') : 'ok во всех ' + n);
  rec('switch', 'Смена языка обновляет html lang и адрес (?lang=)', !urlBad.length, urlBad.length ? urlBad.join('; ') : 'ok во всех ' + n);
}

async function groupDetect(br) {
  var cases = [['ru-RU', 'ru'], ['uk-UA', 'uk'], ['en-US', 'en'], ['de-DE', 'en']], bad = [], det = [];
  var pages = [PAGES[0], PAGES[1], PAGES[2]];
  for (var pi = 0; pi < pages.length; pi++) {
    for (var ci = 0; ci < cases.length; ci++) {
      var st = await mk(br, { locale: cases[ci][0] }, 'det');
      try {
        await go(st, pages[pi].url, 1200);
        var r = await st.page.evaluate(function () { return { html: document.documentElement.lang, h1: (document.querySelector('h1') || {}).textContent || '', nl: navigator.languages.join(',') }; });
        det.push(pages[pi].id + ' ' + cases[ci][0] + ' -> ' + r.html);
        if (r.html !== cases[ci][1]) bad.push(pages[pi].id + ' locale ' + cases[ci][0] + ' -> html lang=' + r.html + ' (ожидается ' + cases[ci][1] + ')');
        else if (cases[ci][1] === 'ru' && !/[\u0400-\u04FF]/.test(r.h1)) bad.push(pages[pi].id + ' ru: h1 не на русском: ' + r.h1.slice(0, 40));
        else if (cases[ci][1] === 'uk' && !/[\u0400-\u04FF]/.test(r.h1)) bad.push(pages[pi].id + ' uk: h1 не на украинском: ' + r.h1.slice(0, 40));
      } catch (e) { bad.push(pages[pi].id + ' ' + cases[ci][0] + ' exception ' + e.message.slice(0, 80)); }
      await st.ctx.close();
    }
  }
  rec('detect', 'Язык браузера (locale ru-RU/uk-UA/en-US/de-DE без ?lang и localStorage) на главной, портфолио, кейсе', !bad.length, bad.length ? bad.join('; ') : det.join('; '));
}

async function groupPropagate(br) {
  var bad = [], total = 0;
  for (var li = 0; li < LANGS.length; li++) {
    var l = LANGS[li];
    for (var pi = 0; pi < PAGES.length; pi++) {
      var p = PAGES[pi];
      if (p.id === '404') continue;
      var st = await mk(br, {}, 'prop');
      try {
        await go(st, urlOf(p, l), 1200);
        var r = await st.page.evaluate(function (lang) {
          var out = [], list = document.querySelectorAll('a[href]'), i, h, a, u, tot = 0;
          for (i = 0; i < list.length; i++) {
            a = list[i]; h = a.getAttribute('href');
            if (/^(#|mailto:|tel:|tg:|javascript:)/i.test(h) || a.hasAttribute('data-i18n-nolang')) continue;
            try { u = new URL(h, location.href); } catch (e) { continue; }
            if (u.host !== location.host) continue;
            if (/\.[a-z0-9]{1,5}$/i.test(u.pathname) && !/\.html?$/i.test(u.pathname)) continue;
            tot++;
            if (u.searchParams.get('lang') !== lang) out.push(h);
          }
          return { tot: tot, bad: out };
        }, l);
        total += r.tot;
        if (r.bad.length) bad.push(p.id + '/' + l + ': ' + r.bad.slice(0, 3).join(', '));
      } catch (e) { bad.push(p.id + '/' + l + ' exception'); }
      await st.ctx.close();
    }
  }
  rec('propagate', 'Все внутренние ссылки на 12 страницах x 3 языка несут ?lang= текущего языка (проверено ссылок: ' + total + ')', !bad.length, bad.length ? bad.slice(0, 8).join('; ') : 'ok');
  /* реальный переход: главная -> портфолио -> кейс -> назад на главную через логотип, язык uk */
  var st2 = await mk(br, {}, 'prop-nav'), steps = [], ok = true;
  try {
    await go(st2, '/?lang=uk', 1200);
    var pg = st2.page;
    await pg.locator('a.top-link[href^="portfolio"]').first().click(); await pg.waitForTimeout(1500);
    steps.push('home->portfolio: ' + pg.url().replace(BASE, '') + ' html=' + await pg.evaluate(function () { return document.documentElement.lang; }));
    if (pg.url().indexOf('lang=uk') < 0) ok = false;
    await pg.locator('a[href*="cases/"]').first().click(); await pg.waitForTimeout(1500);
    steps.push('portfolio->case: ' + pg.url().replace(BASE, '') + ' html=' + await pg.evaluate(function () { return document.documentElement.lang; }));
    if (pg.url().indexOf('lang=uk') < 0 || (await pg.evaluate(function () { return document.documentElement.lang; })) !== 'uk') ok = false;
    await pg.locator('a.pf-brand, a[href="/?lang=uk"]').first().click(); await pg.waitForTimeout(1500);
    steps.push('case->home: ' + pg.url().replace(BASE, '') + ' html=' + await pg.evaluate(function () { return document.documentElement.lang; }));
    if ((await pg.evaluate(function () { return document.documentElement.lang; })) !== 'uk') ok = false;
  } catch (e) { ok = false; steps.push('exception ' + e.message.slice(0, 120)); }
  await st2.ctx.close();
  rec('propagate', 'Клик-путь uk: главная -> портфолио -> кейс -> главная сохраняет язык', ok, steps.join(' | '));
}

async function groupPause(br) {
  var vps = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
  for (var vi = 0; vi < vps.length; vi++) {
    var st = await mk(br, { viewport: vps[vi] }, 'pause');
    try {
      await go(st, '/?lang=en', 2500);
      var pg = st.page, btn = pg.locator('#pauseBtn');
      var vis = await btn.isVisible(), bb = vis ? await btn.boundingBox() : null;
      var before = await pg.evaluate(function () { var an = document.getAnimations ? document.getAnimations().filter(function (a) { return a.playState === 'running'; }).length : -1; return { an: an, cls: document.documentElement.className, pressed: document.getElementById('pauseBtn').getAttribute('aria-pressed'), label: document.getElementById('pauseBtn').textContent.trim() }; });
      await btn.click(); await pg.waitForTimeout(500);
      var mid = await pg.evaluate(function () { var an = document.getAnimations ? document.getAnimations().filter(function (a) { return a.playState === 'running'; }).length : -1; return { an: an, cls: document.documentElement.className, pressed: document.getElementById('pauseBtn').getAttribute('aria-pressed'), label: document.getElementById('pauseBtn').textContent.trim() }; });
      /* кадры canvas: меняется ли картинка за 700 мс */
      var f1 = await pg.evaluate(function () { var c = document.getElementById('stage'); try { return c.toDataURL('image/png').length + ':' + c.toDataURL('image/png').slice(-60); } catch (e) { return 'n/a'; } });
      await pg.waitForTimeout(700);
      var f2 = await pg.evaluate(function () { var c = document.getElementById('stage'); try { return c.toDataURL('image/png').length + ':' + c.toDataURL('image/png').slice(-60); } catch (e) { return 'n/a'; } });
      await btn.click(); await pg.waitForTimeout(400);
      var aft = await pg.evaluate(function () { return { pressed: document.getElementById('pauseBtn').getAttribute('aria-pressed'), cls: document.documentElement.className }; });
      var ok = vis && before.pressed === 'false' && mid.pressed === 'true' && aft.pressed === 'false' && /paused/.test(mid.cls) && !/paused/.test(aft.cls);
      rec('pause', 'Кнопка паузы на ' + vps[vi].width + ' px: видна, aria-pressed false -> true -> false, html.paused ставится и снимается', ok, 'visible=' + vis + ', размер ' + (bb ? Math.round(bb.width) + 'x' + Math.round(bb.height) : '-') + ', до {' + before.pressed + ', «' + before.label + '», анимаций ' + before.an + '}, пауза {' + mid.pressed + ', «' + mid.label + '», анимаций ' + mid.an + '}, canvas на паузе ' + (f1 === f2 ? 'неподвижен' : 'меняется (' + (f1 === 'n/a' ? 'n/a' : 'кадры различаются') + ')') + ', после {' + aft.pressed + ', class «' + aft.cls + '»}; html class до/пауза: «' + before.cls + '» / «' + mid.cls + '»');
      await pg.screenshot({ path: path.join(OUT, 'shots', 'pause-' + vps[vi].width + '.png') });
    } catch (e) { rec('pause', 'Кнопка паузы на ' + vps[vi].width + ' px', false, 'exception ' + e.message.slice(0, 160)); }
    await st.ctx.close();
  }
  /* reduced motion: кнопка скрыта по коду, движения нет */
  var st2 = await mk(br, { reduced: true }, 'pause-rm');
  await go(st2, '/?lang=en', 1500);
  var hid = await st2.page.evaluate(function () { var b = document.getElementById('pauseBtn'); return b.hidden || getComputedStyle(b).display === 'none'; });
  rec('pause', 'prefers-reduced-motion: кнопка паузы скрыта (движение выключено само)', hid, 'hidden=' + hid);
  await st2.ctx.close();
}

async function groupRotator(br) {
  var st = await mk(br, { viewport: { width: 1440, height: 900 } }, 'rot');
  try {
    await go(st, '/portfolio/cases/excavation/?lang=en', 2000);
    var pg = st.page, seq = [], i;
    var total = await pg.evaluate(function () { return document.querySelectorAll('.rw').length; });
    for (i = 0; i < 9; i++) {
      seq.push(await pg.evaluate(function () { var rw = document.querySelectorAll('.rw'), k, out = -1; for (k = 0; k < rw.length; k++) if (rw[k].classList.contains('on')) out = k; return out; }));
      await pg.waitForTimeout(1200);
    }
    var uniq = seq.filter(function (v, k, a) { return a.indexOf(v) === k; });
    rec('rotator', 'Ротатор excavation (hero) переключает слова', total >= 2 && uniq.length >= 2, 'слов ' + total + ', активный индекс по времени (1.2 c шаг): ' + seq.join(','));
    var txt = await pg.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('.rw'), function (e) { return e.textContent; }).join('|'); });
    log('  rotator words: ' + txt);
    await pg.screenshot({ path: path.join(OUT, 'shots', 'excavation-1440.png') });
  } catch (e) { rec('rotator', 'Ротатор excavation', false, 'exception ' + e.message.slice(0, 160)); }
  await st.ctx.close();
}

async function groupBooking(br) {
  for (var li = 0; li < LANGS.length; li++) {
    var l = LANGS[li], st = await mk(br, {}, 'booking'), steps = [], ok = true;
    try {
      await go(st, '/portfolio/cases/booking/?lang=' + l, 1800);
      var pg = st.page;
      var ws = pg.locator('.roles.ws button[data-k="auto"]');
      if (!(await ws.count())) { ok = false; steps.push('нет кнопки ниши auto'); } else { await ws.first().click(); await pg.waitForTimeout(600); steps.push('niche=auto'); }
      var calBtn = pg.locator('button[data-mod="cal"]');
      if (!(await calBtn.count())) { ok = false; steps.push('нет data-mod=cal'); } else { await calBtn.first().click(); await pg.waitForTimeout(900); }
      var grid = await pg.evaluate(function () { return { grid: !!document.querySelector('.cal-grid'), cols: document.querySelectorAll('.cal-col').length, blocks: document.querySelectorAll('.cal-col .blk').length, on: (document.querySelector('button[data-mod].on') || {}).getAttribute ? document.querySelector('button[data-mod].on').getAttribute('data-mod') : '' }; });
      steps.push('grid=' + grid.grid + ' cols=' + grid.cols + ' записей=' + grid.blocks + ' mod=' + grid.on);
      if (!grid.grid || !grid.cols) ok = false;
      /* переключение день/неделя, если есть, и клик по записи и по пустому слоту */
      var blk = pg.locator('.cal-col .blk').first();
      if (await blk.count()) { await blk.click({ timeout: 1500 }).catch(function () {}); await pg.waitForTimeout(500); }
      var col = pg.locator('.cal-col').first();
      if (await col.count()) { var bb = await col.boundingBox(); if (bb) await pg.mouse.click(bb.x + bb.width / 2, bb.y + 60); await pg.waitForTimeout(500); }
      /* обратно в клинику и снова расписание */
      await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
      await pg.evaluate(function () { var b = document.querySelector('.roles.ws button[data-k="clinic"]'); if (b) b.click(); }); await pg.waitForTimeout(500);
      await pg.evaluate(function () { var b = document.querySelector('button[data-mod="cal"]'); if (b) b.click(); }); await pg.waitForTimeout(700);
      var again = await pg.evaluate(function () { return !!document.querySelector('.cal-grid'); });
      steps.push('clinic->расписание grid=' + again);
      if (!again) ok = false;
      var hasKey = scanText(await pg.evaluate(SCAN_FN)).keys;
      if (hasKey.length) { ok = false; steps.push('ключи: ' + hasKey.join(' ')); }
      if (st.errs.length) { ok = false; steps.push('ошибки: ' + st.errs.slice(0, 3).join(' | ')); }
      if (l === 'en') await pg.screenshot({ path: path.join(OUT, 'shots', 'booking-calendar-en.png') });
    } catch (e) { ok = false; steps.push('exception ' + e.message.slice(0, 160)); }
    rec('booking', 'booking (' + l + '): Автосервис -> Расписание (календарь) без ошибок', ok, steps.join('; '));
    await st.ctx.close();
  }
}

async function groupAutodiag(br) {
  for (var li = 0; li < LANGS.length; li++) {
    var l = LANGS[li], st = await mk(br, {}, 'autodiag'), steps = [], ok = true;
    try {
      await go(st, '/portfolio/cases/autodiag/?lang=' + l, 1800);
      var pg = st.page;
      await pg.locator('#ad-tabs [data-tab="diagnose"]').click(); await pg.waitForTimeout(500);
      await pg.locator('[data-cat]').first().click(); await pg.waitForTimeout(250);
      await pg.locator('[data-next]').click(); await pg.waitForTimeout(400);
      await pg.locator('[data-sym]').first().click(); await pg.waitForTimeout(250);
      await pg.locator('[data-next]').click(); await pg.waitForTimeout(400);
      await pg.locator('[data-start]').click(); await pg.waitForTimeout(500);
      var chat = await pg.evaluate(function () { return !!document.getElementById('ad-chat'); });
      steps.push('Диалог с ИИ открыт=' + chat);
      if (!chat) ok = false;
      /* ответы на вопросы ИИ (появляются через 800 мс) */
      for (var q = 0; q < 2; q++) { await pg.locator('[data-opt]').first().click({ timeout: 6000 }); await pg.waitForTimeout(1400); }
      /* свободный текст */
      var say = pg.locator('#ad-say'); if (await say.count()) { await say.fill('test'); await pg.locator('#ad-send').evaluate(function (f) { f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }); await pg.waitForTimeout(1200); }
      var res = pg.locator('[data-res]'); await res.first().click({ timeout: 6000 }); await pg.waitForTimeout(900);
      var r = await pg.evaluate(function () { return { bubbles: document.querySelectorAll('.ad-bub, .ad-msg').length, screen: (document.getElementById('ad-screen') || {}).textContent.length }; });
      steps.push('результат экран ' + r.screen + ' символов');
      if (r.screen < 20) ok = false;
      var hasKey = scanText(await pg.evaluate(SCAN_FN)).keys;
      if (hasKey.length) { ok = false; steps.push('ключи: ' + hasKey.join(' ')); }
      if (st.errs.length) { ok = false; steps.push('ошибки: ' + st.errs.slice(0, 3).join(' | ')); }
      if (l === 'en') await pg.screenshot({ path: path.join(OUT, 'shots', 'autodiag-result-en.png') });
    } catch (e) { ok = false; steps.push('exception ' + e.message.slice(0, 160) + (st.errs.length ? ' | ' + st.errs.slice(0, 2).join(' | ') : '')); }
    rec('autodiag', 'autodiag (' + l + '): Диагностика -> Диалог с ИИ -> ответы -> результат без ошибок', ok, steps.join('; '));
    await st.ctx.close();
  }
}

async function groupExcav320(br) {
  for (var li = 0; li < 2; li++) {
    var l = ['en', 'ru'][li], st = await mk(br, { viewport: { width: 320, height: 640 } }, 'ex320'), steps = [], ok = true;
    try {
      await go(st, '/portfolio/cases/excavation/?lang=' + l, 2000);
      var pg = st.page;
      var ov = await pg.evaluate(function () { var de = document.documentElement; return de.scrollWidth - de.clientWidth; });
      steps.push('переполнение страницы ' + ov + ' px');
      if (ov > 1) ok = false;
      var burger = pg.locator('.w-burger'), vis = await burger.isVisible(), bb = vis ? await burger.boundingBox() : null;
      steps.push('бургер виден=' + vis + (bb ? ' ' + Math.round(bb.x) + ',' + Math.round(bb.y) + ' ' + Math.round(bb.width) + 'x' + Math.round(bb.height) : ''));
      if (!vis || !bb || bb.x < 0 || bb.x + bb.width > 321 || bb.width < 43.5 || bb.height < 43.5) ok = false;
      if (vis) {
        await burger.click(); await pg.waitForTimeout(500);
        var nav = await pg.evaluate(function () { var n = document.getElementById('wNav'), b = document.querySelector('.w-burger'), r = n.getBoundingClientRect(); return { open: n.classList.contains('open'), exp: b.getAttribute('aria-expanded'), vis: getComputedStyle(n).display !== 'none' && r.width > 0, left: Math.round(r.left), right: Math.round(r.right) }; });
        steps.push('меню ' + JSON.stringify(nav));
        if (!nav.open || nav.exp !== 'true' || !nav.vis || nav.right > 321) ok = false;
        await pg.screenshot({ path: path.join(OUT, 'shots', 'excavation-320-menu-' + l + '.png') });
        var lnk = pg.locator('#wNav a').first();
        if (await lnk.count()) { var txt0 = await pg.evaluate(function () { return location.href; }); await lnk.click({ timeout: 2000 }).catch(function () {}); await pg.waitForTimeout(700); steps.push('пункт меню кликается'); }
      }
      var hasKey = scanText(await pg.evaluate(SCAN_FN)).keys;
      if (hasKey.length) { ok = false; steps.push('ключи: ' + hasKey.join(' ')); }
      if (st.errs.length) { ok = false; steps.push('ошибки: ' + st.errs.slice(0, 3).join(' | ')); }
    } catch (e) { ok = false; steps.push('exception ' + e.message.slice(0, 160)); }
    rec('excav320', 'excavation на 320 px (' + l + '): бургер виден и в экране, меню открывается, нет переполнения', ok, steps.join('; '));
    await st.ctx.close();
  }
}

async function main() {
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var port = server.address().port;
  BASE = 'http://127.0.0.1:' + port; HOST = BASE;
  log('verify.js: сервер ' + BASE + ', корень ' + ROOT + ', ' + new Date().toISOString());
  var br = await chromium.launch({ executablePath: CH, headless: true });
  try {
    if (want('static')) await groupStatic();
    if (want('matrix')) await groupMatrix(br);
    if (want('overflow')) await groupOverflow(br);
    if (want('switch')) await groupSwitch(br);
    if (want('detect')) await groupDetect(br);
    if (want('propagate')) await groupPropagate(br);
    if (want('pause')) await groupPause(br);
    if (want('rotator')) await groupRotator(br);
    if (want('booking')) await groupBooking(br);
    if (want('autodiag')) await groupAutodiag(br);
    if (want('excav320')) await groupExcav320(br);
    if (want('perf')) await groupPerf(br);
  } finally { await br.close(); server.close(); }
  var ek = Object.keys(extReqs);
  if (want('external') || !ONLY) rec('external', 'Нет внешних запросов за весь прогон (всё не 127.0.0.1 обрывалось и считалось)', !ek.length, ek.length ? ek.length + ': ' + ek.slice(0, 8).map(function (u) { return u + ' (' + extReqs[u] + ')'; }).join('; ') : '0 внешних запросов');
  var pass = results.filter(function (r) { return r.ok; }).length, fail = results.length - pass;
  var md = ['# T09: отчёт автопроверки', '', 'Запуск: `node tools/verify.js` из site/ (' + new Date().toISOString() + '), Playwright chromium 1248, свой сервер на свободном порту (остановлен). Внешние хосты обрываются.', '',
    '**Итого: PASS ' + pass + ', FAIL ' + fail + ' из ' + results.length + '**', '', '| # | Группа | Проверка | Результат | Числа / воспроизведение |', '|---|---|---|---|---|'];
  results.forEach(function (r, i) { md.push('| ' + (i + 1) + ' | ' + r.group + ' | ' + r.name.replace(/\|/g, '/') + ' | ' + (r.ok ? 'PASS' : '**FAIL**') + ' | ' + r.detail.replace(/\|/g, '/').replace(/\n/g, ' ') + ' |'); });
  fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  fs.writeFileSync(path.join(OUT, 'verify.log'), logLines.join('\n') + '\n');
  log('ИТОГО PASS ' + pass + ' FAIL ' + fail);
  process.exit(fail ? 1 : 0);
}
main().catch(function (e) { console.error(e); try { server.close(); } catch (x) {} process.exit(2); });
