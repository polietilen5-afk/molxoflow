/* Снимки превью кейсов портфолио (T17): node tools/shots.js [--only slug,slug] [--lang ru,uk,en] [--evidence <папка>] [--debug <папка>]
   Снимается не верх страницы, а рабочий экран самого демо (блок приложения без заголовка и абзаца обёртки),
   с кадрированием на ключевой момент продукта. Результат: portfolio/img/<slug>.<lang>.jpg, 1280x800 (16:10),
   JPEG <= 60 KB (подбирается качество). Язык переключается через ?lang=.
   Рамки: dispatch - окно ОС, excavation - окно браузера, autodiag - рамка телефона (рисуются в кадре, без внешних ресурсов).
   Playwright берётся локально (без сети), сервер слушает свободный порт и останавливается в конце. */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var PW = process.env.PLAYWRIGHT_DIR || 'C:/Users/Molxo1/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
var CH = process.env.CHROME_PATH || 'C:/Users/Molxo1/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
var chromium = require(PW).chromium;
var args = process.argv.slice(2);
function opt(n, d) { var i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; }
var EVID = opt('--evidence', ''), DEBUG = opt('--debug', '');
var ONLY = opt('--only', '') ? opt('--only', '').split(',') : null;
var LANGS = opt('--lang', 'ru,uk,en').split(',');
var MAXB = +opt('--max', 36000);
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

/* Для каждого кейса: app - блок приложения; pre - действия до снимка; clip - прямоугольник (CSS px) от левого верхнего угла блока;
   масштаб = 1280 / w. frame - рамка. */
var CASES = {
  fleet: { vw: 1100, app: '#fd', pre: [['click', '[data-go-mod=deadlines]']], clip: { x: 235, y: 110, w: 720, h: 450 } },
  dispatch: { app: '#rm', pre: [['click', '[data-nav=leads]']], clip: { x: 566, y: 70, w: 560, h: 326 }, frame: 'os' },
  tender: { app: '#app', pre: [['click', '[data-mod=pipeline]'], ['click', '.kc-t, .lnk, tr[data-key]']], clip: { x: 265, y: 225, w: 720, h: 450 } },
  hr: { app: '#appFrame', pre: [['click', '[data-mod=ts]']], clip: { x: 245, y: 360, w: 720, h: 450 } },
  kb: { app: '#kb', pre: [['click', '[data-nav=chat]']], clip: { x: 225, y: 130, w: 720, h: 450 } },
  autodiag: { app: '#ad-phone', pre: [['click', '[data-scn=brakes]'], ['clickText', '#ad-screen button'], ['clickText', '#ad-screen button'], ['clickOpt'], ['clickOpt'], ['clickOpt'], ['wait', 1500]], frame: 'phone' },
  booking: { app: '#appFrame', pre: [['click', '[data-mod=cal]']], clip: { x: 300, y: 290, w: 800, h: 500 } },
  recovery: { vw: 1100, app: '#rc', pre: [['click', '[data-go-mod=cases]']], clip: { x: 240, y: 330, w: 720, h: 450 } },
  excavation: { vw: 1000, app: '#vp', pre: [], clip: { x: 0, y: 0, w: 'full' }, frame: 'browser' }
};
var ORDER = ['fleet', 'dispatch', 'hr', 'tender', 'kb', 'autodiag', 'excavation', 'booking', 'recovery'];

var server = http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split('?')[0]);
  var f = path.join(ROOT, p);
  if (f.indexOf(ROOT) !== 0) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, function (e, d) {
    if (e) { res.statusCode = 404; return res.end('404'); }
    res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
    res.end(d);
  });
});

var FRAME_CSS = 'html,body{margin:0;background:#0b0d11;overflow:hidden}' +
  '.win{position:absolute;left:0;top:0;width:640px;height:400px;background:#10131a;overflow:hidden}' +
  '.bar{height:28px;display:flex;align-items:center;gap:6px;padding:0 12px;background:#1b2030;border-bottom:1px solid #2c3347;font:600 11px/1 Segoe UI,Arial,sans-serif;color:#aab1c5}' +
  '.bar i{width:9px;height:9px;border-radius:50%;background:#4a526b;display:block}' +
  '.bar i:nth-child(1){background:#ff5f57}.bar i:nth-child(2){background:#febc2e}.bar i:nth-child(3){background:#28c840}' +
  '.url{flex:1;margin-left:10px;height:18px;border-radius:9px;background:#0e1118;border:1px solid #2c3347;color:#8a93ab;font:500 10px/16px Consolas,monospace;padding:0 10px;max-width:360px}' +
  '.t{margin-left:10px;letter-spacing:.02em}' +
  '.win img{display:block;width:640px;height:372px}';

async function render(br, html, w, h, type) {
  var ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  var pg = await ctx.newPage();
  await pg.setContent(html, { waitUntil: 'load' });
  await pg.waitForTimeout(150);
  var buf;
  if (type === 'jpeg') {
    var q = 84;
    do { buf = await pg.screenshot({ type: 'jpeg', quality: q, clip: { x: 0, y: 0, width: w, height: h } }); q -= 6; } while (buf.length > MAXB && q > 20);
  } else buf = await pg.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
  await ctx.close();
  return buf;
}

function frameHtml(png, kind, title) {
  var src = 'data:image/png;base64,' + png.toString('base64');
  if (kind === 'phone') {
    return '<style>' + FRAME_CSS + '.bg{position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 30%,#2a2f4a 0%,#0b0d11 75%)}' +
      '.ph{position:absolute;left:50%;top:18px;width:394px;margin-left:-197px;transform:scale(.82);transform-origin:50% 0;filter:drop-shadow(0 12px 28px rgba(0,0,0,.6))}.ph img{display:block;width:394px}' +
      '.fade{position:absolute;left:0;right:0;bottom:0;height:70px;background:linear-gradient(to bottom,rgba(11,13,17,0),#0b0d11)}</style>' +
      '<div class="bg"></div><div class="ph"><img src="' + src + '"></div><div class="fade"></div>';
  }
  var bar = kind === 'os'
    ? '<div class="bar"><i></i><i></i><i></i><span class="t">' + title + '</span></div>'
    : '<div class="bar"><i></i><i></i><i></i><span class="url">' + title + '</span></div>';
  return '<style>' + FRAME_CSS + '</style><div class="win">' + bar + '<img src="' + src + '"></div>';
}

async function shoot(br, base, slug, lang) {
  var cfg = CASES[slug];
  var vw = cfg.vw || 1440, scale = 2;
  if (cfg.clip && typeof cfg.clip.w === 'number') scale = 1280 / cfg.clip.w;
  var ctx = await br.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: scale, reducedMotion: 'reduce' });
  var pg = await ctx.newPage();
  await pg.goto(base + '/portfolio/cases/' + slug + '/index.html?lang=' + lang, { waitUntil: 'load' });
  await pg.waitForTimeout(1800);
  await pg.addStyleTag({ content: '.pf-top,.pf-bar,header{display:none !important}' });
  var el = await pg.$(cfg.app);
  await el.scrollIntoViewIfNeeded();
  for (var i = 0; i < cfg.pre.length; i++) {
    var a = cfg.pre[i];
    if (a[0] === 'click') await pg.click(a[1]);
    else if (a[0] === 'wait') await pg.waitForTimeout(a[1]);
    else if (a[0] === 'clickText') {
      var bs = await pg.$$(a[1]), last = null;
      for (var k = 0; k < bs.length; k++) { if ((await bs[k].textContent()).trim()) last = bs[k]; }
      if (last) await last.click();
    } else if (a[0] === 'clickOpt') {
      var os = await pg.$$('#ad-screen button'), pick = null;
      for (var m = 0; m < os.length; m++) { if ((await os[m].textContent()).trim()) { pick = os[m]; break; } }
      if (pick) await pick.click();
    }
    await pg.waitForTimeout(700);
  }
  await pg.waitForTimeout(500);
  var png;
  if (cfg.frame === 'phone') {
    png = await el.screenshot({ type: 'png' });
  } else {
    var box = await el.boundingBox();
    var cw = cfg.clip.w, ch = cfg.clip.h;
    if (cw === 'full') { cw = Math.floor(box.width); ch = Math.round(cw * 372 / 640); }
    var sy = await pg.evaluate(function () { return window.pageYOffset; });
    png = await pg.screenshot({ type: 'png', fullPage: true, clip: { x: box.x + cfg.clip.x, y: box.y + sy + cfg.clip.y, width: cw, height: ch } });
  }
  await ctx.close();
  var html;
  if (cfg.frame) html = frameHtml(png, cfg.frame, cfg.frame === 'os' ? 'Route Match' : 'ridgeway-demo');
  else html = '<style>html,body{margin:0;background:#0b0d11}img{display:block;width:640px;height:400px}</style><img src="data:image/png;base64,' + png.toString('base64') + '">';
  var out = await render(br, html, 640, 400, 'jpeg');
  var f = path.join(ROOT, 'portfolio', 'img', slug + '.' + lang + '.jpg');
  fs.writeFileSync(f, out);
  if (DEBUG) { fs.mkdirSync(DEBUG, { recursive: true }); fs.writeFileSync(path.join(DEBUG, slug + '.' + lang + '.jpg'), out); }
  return out.length;
}

(async function () {
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var port = server.address().port;
  var br = await chromium.launch({ executablePath: CH, headless: true });
  var base = 'http://127.0.0.1:' + port;
  fs.mkdirSync(path.join(ROOT, 'portfolio', 'img'), { recursive: true });
  try {
    for (var i = 0; i < ORDER.length; i++) {
      var s = ORDER[i];
      if (ONLY && ONLY.indexOf(s) < 0) continue;
      for (var j = 0; j < LANGS.length; j++) {
        var n = await shoot(br, base, s, LANGS[j]);
        console.log(s + '.' + LANGS[j] + '.jpg', n);
      }
    }
    if (EVID) {
      fs.mkdirSync(EVID, { recursive: true });
      var sizes = [[1440, 900], [390, 844]], lg = ['ru', 'en'];
      for (var a = 0; a < sizes.length; a++) for (var b = 0; b < lg.length; b++) {
        var c2 = await br.newContext({ viewport: { width: sizes[a][0], height: sizes[a][1] } });
        var p2 = await c2.newPage();
        await p2.goto(base + '/portfolio/index.html?lang=' + lg[b], { waitUntil: 'load' });
        await p2.waitForTimeout(800);
        await p2.evaluate(async function () { for (var y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(function (r) { setTimeout(r, 120); }); } window.scrollTo(0, 0); });
        await p2.waitForTimeout(800);
        await p2.screenshot({ path: path.join(EVID, 'gallery-' + lg[b] + '-' + sizes[a][0] + '.png'), fullPage: true });
        await c2.close();
      }
    }
  } finally { await br.close(); server.close(); }
}()).catch(function (e) { console.error(e); process.exit(1); });
