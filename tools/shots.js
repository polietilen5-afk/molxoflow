/* Снимки превью кейсов портфолио: node tools/shots.js [--port 9120] [--evidence <папка>]
   Playwright берётся локально (без сети). Превью: 1280x800 (16:10), JPEG <= 60 KB в portfolio/img/<slug>.jpg.
   С --evidence дополнительно снимает галерею на 1440 и 390 px. */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var PW = process.env.PLAYWRIGHT_DIR || 'C:/Users/Molxo1/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
var CH = process.env.CHROME_PATH || 'C:/Users/Molxo1/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
var chromium = require(PW).chromium;
var args = process.argv.slice(2);
function opt(n, d) { var i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; }
var PORT = +opt('--port', 9120), EVID = opt('--evidence', '');
var SLUGS = ['fleet', 'dispatch', 'hr', 'tender', 'kb', 'autodiag', 'excavation', 'booking', 'recovery'];
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

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

(async function () {
  await new Promise(function (r) { server.listen(PORT, '127.0.0.1', r); });
  var br = await chromium.launch({ executablePath: CH, headless: true });
  var base = 'http://127.0.0.1:' + PORT;
  var outDir = path.join(ROOT, 'portfolio', 'img');
  fs.mkdirSync(outDir, { recursive: true });
  try {
    for (var i = 0; i < SLUGS.length; i++) {
      var s = SLUGS[i];
      /* 640x400 выходного кадра = вьюпорт 1280x800 при масштабе 0.5 */
      var ctx = await br.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5, reducedMotion: 'reduce' });
      var pg = await ctx.newPage();
      await pg.goto(base + '/portfolio/cases/' + s + '/index.html?lang=en', { waitUntil: 'load' });
      await pg.waitForTimeout(2500);
      /* первый содержательный экран: само демо (#demo), если оно есть, иначе верх страницы */
      var top = await pg.evaluate(function () { var d = document.getElementById('demo'); return d ? Math.max(0, Math.round(d.getBoundingClientRect().top + window.pageYOffset)) : 0; });
      var q = 70, buf;
      do { buf = await pg.screenshot({ type: 'jpeg', quality: q, fullPage: true, clip: { x: 0, y: top, width: 1280, height: 800 } }); q -= 8; } while (buf.length > 60 * 1024 && q > 20);
      fs.writeFileSync(path.join(outDir, s + '.jpg'), buf);
      console.log(s + '.jpg', buf.length);
      await ctx.close();
    }
    if (EVID) {
      fs.mkdirSync(EVID, { recursive: true });
      var sizes = [[1440, 900], [390, 844]];
      for (var j = 0; j < sizes.length; j++) {
        var c2 = await br.newContext({ viewport: { width: sizes[j][0], height: sizes[j][1] } });
        var p2 = await c2.newPage();
        await p2.goto(base + '/portfolio/index.html?lang=en', { waitUntil: 'load' });
        await p2.waitForTimeout(800);
        await p2.evaluate(async function () { for (var y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(function (r) { setTimeout(r, 120); }); } window.scrollTo(0, 0); });
        await p2.waitForTimeout(800);
        await p2.screenshot({ path: path.join(EVID, 'gallery-' + sizes[j][0] + '.png'), fullPage: true });
        await c2.close();
      }
    }
  } finally { await br.close(); server.close(); }
}()).catch(function (e) { console.error(e); process.exit(1); });
