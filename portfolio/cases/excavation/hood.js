/* "Under the hood" tab: SEO structure of the site, URL map, request pipeline and the checks that run before release. */
(function (w) {
  'use strict';
  var EX = w.EX, t = EX.t, esc = EX.esc, $ = EX.$;
  var hood = EX.hood = {};
  var H = { sel: 'home', checks: 0, running: false, timer: null };
  var ROWS = ['home', 'services', 'service', 'projects', 'equipment', 'areas', 'process', 'pricing', 'faq', 'guide', 'contact'];
  var SCHEMA = { home: 'LocalBusiness', services: 'ItemList', service: 'Service', projects: 'CollectionPage', equipment: 'ItemList', areas: 'LocalBusiness', process: 'HowTo', pricing: 'WebPage', faq: 'FAQPage', guide: 'Article', contact: 'ContactPage' };
  var NCHECK = 10;

  function titleOf(p, s) { return p === 'service' ? t('hood.svctitle', { name: t('sv.' + s + '.n') }) : t('pg.' + p + '.t'); }
  function descOf(p, s) { return p === 'service' ? t('sv.' + s + '.s') + ' ' + t('hood.svcdesc') : t('pg.' + p + '.d'); }
  function h1Of(p, s) { return p === 'service' ? t('sv.' + s + '.n') : (p === 'home' ? t('home.h1') : t('pg.' + p + '.h1')); }
  function pathOf(p) { return p === 'service' ? '/services/' + EX.SLUG.pit : EX.PATH[p]; }

  hood.render = function () {
    var pane = $('pane-hood'); if (!pane) return;
    var i, p = H.sel, s = 'pit', h = '<div class="hd-wrap"><div class="hd-col"><h3>' + esc(t('hood.pages')) + '</h3><p class="pn-hint">' + esc(t('hood.pages.p')) + '</p><ul class="hd-pages" aria-label="' + esc(t('hood.pages')) + '">';
    for (i = 0; i < ROWS.length; i++) h += '<li><button type="button" data-hp="' + ROWS[i] + '"' + (p === ROWS[i] ? ' aria-current="true"' : '') + '><code>' + esc(pathOf(ROWS[i])) + (ROWS[i] === 'service' ? '{slug}' : '') + '</code><span>' + esc(titleOf(ROWS[i], s)) + '</span></button></li>';
    h += '</ul></div><div class="hd-col"><h3>' + esc(t('hood.serp')) + '</h3><div class="serp"><p class="u">' + esc('example.test' + pathOf(p) + (p === 'service' ? '{slug}' : '')) + '</p><p class="tt">' + esc(titleOf(p, s)) + '</p><p class="ds">' + esc(descOf(p, s)) + '</p></div>' +
      '<dl class="hd-facts"><div><dt>' + esc(t('hood.h1')) + '</dt><dd>' + esc(h1Of(p, s)) + '</dd></div><div><dt>' + esc(t('hood.canon')) + '</dt><dd><code>' + esc(pathOf(p)) + (p === 'service' ? '{slug}' : '') + '</code></dd></div><div><dt>' + esc(t('hood.schema')) + '</dt><dd><code>' + SCHEMA[p] + '</code></dd></div></dl>' +
      '<h3>' + esc(t('hood.ld')) + '</h3><pre class="code" tabindex="0">' + esc('{\n  "@context": "schema.org",\n  "@type": "' + SCHEMA[p] + '",\n  "name": "Ridgeway Earthworks",\n  "areaServed": ["Riverton Central", "Northgate", "Millbrook"],\n  "url": "/' + (p === 'home' ? '' : pathOf(p).slice(1)) + '"\n}') + '</pre></div></div>';
    h += '<div class="hd-wrap"><div class="hd-col"><h3>' + esc(t('hood.urls')) + '</h3><pre class="code" tabindex="0">' + esc('/\n/services\n  /services/foundation-pits\n  /services/trenching\n  /services/grading\n  /services/driveways\n  /services/concrete-removal\n/projects\n/equipment\n/service-area\n/how-we-work\n/pricing\n/faq\n/guides/site-preparation\n/contact\n  /contact/thanks   (noindex)\n/sitemap.xml\n/robots.txt') + '</pre><p class="pn-hint">' + esc(t('hood.urls.p')) + '</p></div>';
    h += '<div class="hd-col"><h3>' + esc(t('hood.checks')) + '</h3><div class="pn-inline"><button type="button" class="pbtn" data-run="1"' + (H.running ? ' disabled' : '') + '>' + esc(H.checks >= NCHECK ? t('hood.rerun') : t('hood.run')) + '</button><span class="pn-ok" role="status">' + (H.checks >= NCHECK ? esc(t('hood.allpass')) : '') + '</span></div><ul class="hd-checks">';
    for (i = 1; i <= NCHECK; i++) h += '<li class="' + (i <= H.checks ? 'ok' : '') + '"><span class="mk" aria-hidden="true">' + (i <= H.checks ? '✓' : '·') + '</span><span>' + esc(t('ck.' + i)) + '</span><em class="sr">' + esc(i <= H.checks ? t('hood.pass') : t('hood.pending')) + '</em></li>';
    h += '</ul></div></div>';
    h += '<h3>' + esc(t('hood.flow')) + '</h3><ol class="hd-flow">';
    for (i = 1; i <= 6; i++) h += '<li><b>' + esc(t('fl.' + i + '.h')) + '</b><span>' + esc(t('fl.' + i + '.p')) + '</span></li>';
    h += '</ol>';
    pane.innerHTML = '<div class="hood">' + h + '</div>';
  };
  hood.bind = function () {
    $('pane-hood').addEventListener('click', function (e) {
      var b = e.target.closest('[data-hp]');
      if (b) { H.sel = b.getAttribute('data-hp'); hood.render(); var n = $('pane-hood').querySelector('[data-hp="' + H.sel + '"]'); if (n) n.focus({ preventScroll: true }); return; }
      if (e.target.closest('[data-run]')) {
        if (H.running) return; H.checks = 0; H.running = true; hood.render();
        var step = function () { H.checks++; if (H.checks >= NCHECK) H.running = false; hood.render(); var rb = $('pane-hood').querySelector('[data-run]'); if (rb && !H.running) rb.focus({ preventScroll: true }); if (H.running) H.timer = setTimeout(step, w.PF && w.PF.reduced ? 0 : 260); };
        step();
      }
    });
  };
  hood.stop = function () { if (H.timer) { clearTimeout(H.timer); H.timer = null; } if (H.running) { H.running = false; H.checks = 0; } };
}(window));
