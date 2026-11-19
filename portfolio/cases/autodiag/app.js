/* Auto Diagnostic demo: bootstrap and global events. Repaints on language change. */
(function () {
  'use strict';
  const AD = window.AD;
  let started = false;

  function wire() {
    const phone = AD.$('ad-phone');
    phone.addEventListener('click', e => {
      const b = e.target.closest('[data-back]'); if (b) { AD.back(); return; }
      const tb = e.target.closest('[data-tab]'); if (tb && tb.closest('#ad-tabs')) AD.tab(tb.getAttribute('data-tab'));
    });
    document.getElementById('ad-side-mods').addEventListener('click', e => { const b = e.target.closest('[data-mod]'); if (b) AD.openModule(b.getAttribute('data-mod')); });
    document.getElementById('ad-scn').addEventListener('click', e => { const b = e.target.closest('[data-scn]'); if (b) AD.runScenario(b.getAttribute('data-scn')); });
    document.getElementById('caps').addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (a) AD.openModule(a.getAttribute('data-go')); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') AD.closeSheet(); });
  }

  MFI18N.onChange(() => {
    if (!started) { started = true; wire(); AD.render(true); return; }
    AD.refresh();
  });
}());
