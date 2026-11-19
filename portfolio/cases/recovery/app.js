/* Recovery Desk demo: bootstrap. Starts after the language is known, repaints on language change. */
(function () {
  'use strict';
  const RC = window.RC;
  let started = false;
  MFI18N.onChange(() => {
    if (!started) { started = true; RC.refresh(); return; }
    RC.closeDialog && RC.closeDialog();
    RC.refresh();
  });
}());
