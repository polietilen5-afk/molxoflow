/* Booking Desk case: boot. Modules live in js/. All data is fictional. */
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (!root || !window.MFI18N || !window.BK) return;
  BK.root = root;
  BK.render();

  /* "Open in demo" links from the capabilities grid */
  function openMod(m, scroll) {
    if (!BK.mods[m]) return;
    if (!BK.modOK(m)) BK.DB.role = 'owner';
    BK.UI.menu = false; BK.UI.mod = m; BK.render('main');
    if (scroll) { var d = document.getElementById('demo'); if (d) d.scrollIntoView({ behavior: PF.reduced ? 'auto' : 'smooth', block: 'start' }); }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!a) return;
    e.preventDefault(); openMod(a.getAttribute('data-open'), true);
    try { history.replaceState(null, '', '#demo/' + a.getAttribute('data-open')); } catch (x) { /* ignore */ }
  });
  var m = /^#demo\/(\w+)/.exec(location.hash || '');
  if (m) openMod(m[1], false);

  MFI18N.onChange(function () { BK.render(); });
  PF.onScreen(document.getElementById('appFrame'), function () { root.classList.add('live'); }, function () { root.classList.remove('live'); });
}());
