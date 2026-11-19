/* Crew Ledger case: boot. Modules live in js/. All data is fictional. */
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (!root || !window.MFI18N || !window.CL) return;
  CL.root = root;
  CL.render();

  /* "Open in demo" links from the capabilities grid */
  function openMod(m, scroll) {
    if (!CL.mods[m]) return;
    CL.DB.role = CL.modOK(m) ? CL.DB.role : 'hr';
    CL.UI.menu = false; CL.UI.mod = m; CL.render('main');
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

  MFI18N.onChange(function () { CL.render(); });
  PF.onScreen(document.getElementById('appFrame'), function () { root.classList.add('live'); }, function () { root.classList.remove('live'); });
}());
