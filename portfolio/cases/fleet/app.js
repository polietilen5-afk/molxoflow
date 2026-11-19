/* Fleet Desk demo: bootstrap. Starts after the language is known, repaints on language change. */
(function () {
  'use strict';
  const FD = window.FD;
  let started = false, auto = false;
  MFI18N.onChange(() => {
    if (!started) {
      started = true;
      FD.vis = true;
      FD.refresh();
      PF.onScreen(FD.$('fd'), () => {
        FD.vis = true;
        if (!auto) { auto = true; setTimeout(() => FD.runCheck(true), PF.reduced ? 0 : 1600); }
      }, () => { FD.vis = false; });
      return;
    }
    FD.closeDialog && FD.closeDialog();
    FD.refresh();
  });
}());
