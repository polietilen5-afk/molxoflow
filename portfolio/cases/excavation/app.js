/* Demo shell: tabs (website / manager panel / under the hood), preview width, links from the page into demo modules. */
(function (w) {
  'use strict';
  var EX = w.EX, t = EX.t, $ = EX.$, S = EX.S;
  var tab = 'site', ready = false, incoming = false;
  var TABS = ['site', 'panel', 'hood'];

  EX.showTab = function (id, focus) {
    tab = id; if (EX.panel) EX.panel.stop(); EX.hood.stop();
    TABS.forEach(function (k) {
      var b = $('tab-' + k); b.setAttribute('aria-selected', k === id ? 'true' : 'false'); b.tabIndex = k === id ? 0 : -1;
      $('pane-' + k).hidden = k !== id;
    });
    if (id === 'site' && ready && EX.site.wire) EX.site.wire();
    if (id === 'panel') { S.unseen = 0; badge(); EX.panel.show(); simulateIncoming(); }
    else if (id === 'hood') EX.hood.render();
    if (focus) $('tab-' + id).focus();
  };
  function badge() { var b = $('tabBadge'); b.hidden = S.unseen < 1; b.textContent = S.unseen; }
  function simulateIncoming() {
    if (incoming) return; incoming = true;
    function add() {
      var r = EX.createRequest({ name: 'Taylor P.', contact: 'taylor.p@example.test', area: 'oak', service: 'trench', size: 35, acc: 'open', tim: 'flex', lo: EX.estimate('trench', 35, 'open', 'flex').lo, hi: EX.estimate('trench', 35, 'open', 'flex').hi, source: 'faq', channel: 'form', note: '' });
      r.noteKey = 'seed.n7'; S.unseen = 0; badge();
      if (tab === 'panel') EX.panel.render();
    }
    if (w.PF && w.PF.reduced) add(); else setTimeout(add, 1500);
  }
  function setVp(v) {
    $('vp').className = 'vp-in is-' + v;
    var bs = document.querySelectorAll('[data-vp]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-vp') === v ? 'true' : 'false');
  }
  /* "site:pricing", "panel:calendar", "hood" */
  EX.openModule = function (spec) {
    var p = spec.split(':');
    if (p[0] === 'site') { EX.showTab('site'); EX.site.go(p[1], p[2] || null, { focus: false }); }
    else if (p[0] === 'panel') { EX.showTab('panel'); EX.panel.show(p[1]); }
    else EX.showTab('hood');
    var d = $('demo'); if (d) w.scrollTo({ top: d.getBoundingClientRect().top + w.pageYOffset - 68, behavior: w.PF && w.PF.reduced ? 'auto' : 'smooth' });
  };

  function init() {
    EX.site.render(); EX.site.bind(); EX.panel.bind(); EX.hood.bind(); badge();
    var tl = document.querySelector('.pf-tabs');
    tl.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) EX.showTab(b.getAttribute('data-tab')); });
    tl.addEventListener('keydown', function (e) {
      var i = TABS.indexOf(tab), n = -1;
      if (e.key === 'ArrowRight') n = (i + 1) % 3; else if (e.key === 'ArrowLeft') n = (i + 2) % 3; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = 2;
      if (n >= 0) { e.preventDefault(); EX.showTab(TABS[n], true); }
    });
    document.querySelector('.vp-switch').addEventListener('click', function (e) { var b = e.target.closest('[data-vp]'); if (b) setVp(b.getAttribute('data-vp')); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-open]'); if (a) { e.preventDefault(); EX.openModule(a.getAttribute('data-open')); }
    });
  }
  w.MFI18N.onChange(function () {
    if (!ready) { ready = true; init(); return; }
    if (EX.panel) EX.panel.stop(); EX.hood.stop();
    EX.site.render(); if (tab === 'panel') EX.panel.render(); else if (tab === 'hood') EX.hood.render();
  });
}(window));
