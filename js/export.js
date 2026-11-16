/* Molxo Flow: внутренний пакет «Для разработчика» (сводка для Molxo Centr и 12 документов). Без DOM.
   Собирается из любого режима: мастера, конструктора ТЗ или обоих. Все тексты через MF.t. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./data.js'); require('./core.js'); require('./docs.js'); require('./texts.js'); require('./config.js');
    require('./catalog.js'); require('./wizard.js');
  }

  var SUMMARY_FILE = '00-svodka-dlya-centr.md';

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function num(v, fallback) { return typeof v === 'number' && isFinite(v) ? v : fallback; }
  function oneLine(s) { return String(s).replace(/\s*\n\s*/g, ' '); }
  function section(heading, lines) { return '## ' + heading + '\n\n' + lines.join('\n'); }

  // Markdown сводки: тип проекта, направление, ответы мастера, допущения, состояние конструктора.
  MF.devSummary = function (state, w) {
    var st = state && state.answers && typeof state.answers === 'object' ? state : MF.emptyState();
    var wz = w && w.answers && typeof w.answers === 'object' ? w : MF.emptyWizard();
    var plan = MF.buildPlan(wz, st.assumptions);
    var wizardUsed = !!wz.goal || Object.keys(wz.answers).length > 0;
    var filled = MF.filledCount(st.answers);
    var source = wizardUsed && filled > 0 ? 'both' : (wizardUsed ? 'wizard' : (filled > 0 ? 'constructor' : 'none'));

    var parts = ['# ' + MF.t('sum.title') + '\n\n' + MF.t('sum.date', { date: today() })];
    parts.push(section(MF.t('sum.h.source'), [MF.t('sum.source.' + source)]));

    var dir = [];
    if (plan.ready) {
      dir.push(MF.t('sum.direction', { name: MF.t('dir.' + plan.direction + '.title') }), '');
      plan.opportunities.forEach(function (o) {
        dir.push(MF.t('sum.solution', { name: MF.t(byId(MF.SOLUTIONS, o.solutionId).titleKey), id: o.solutionId, direction: MF.t('dir.' + o.direction + '.title') }));
      });
    } else {
      dir.push(MF.t('sum.none'));
    }
    parts.push(section(MF.t('sum.h.direction'), dir));

    var goal = byId(MF.GOALS, wz.goal), industry = byId(MF.INDUSTRIES, wz.industry);
    parts.push(section(MF.t('sum.h.goal'), [
      MF.t('sum.goal', { name: goal ? MF.t(goal.titleKey) : MF.t('sum.unset') }),
      MF.t('sum.industry', { name: industry ? MF.t(industry.titleKey) : MF.t('sum.unset') })
    ]));

    var answers = [];
    if (wz.goal) {
      MF.wizardSteps(wz).forEach(function (step) {
        if (step.id === 'goal') return;
        var text = MF.wizardAnswerText(wz, step.id);
        var shown = text ? oneLine(text) : (MF.wizardAnswered(wz, step.id) ? MF.t('sum.skipped') : MF.t('sum.unanswered'));
        answers.push(MF.t('sum.answer', { question: MF.t(step.titleKey), answer: shown }));
      });
    } else {
      answers.push(MF.t('sum.none'));
    }
    parts.push(section(MF.t('sum.h.answers'), answers));

    var a = st.assumptions || MF.DEFAULT_ASSUMPTIONS;
    parts.push(section(MF.t('sum.h.assume'), [
      MF.t('sum.assume.minutes', { value: num(a.minutesPerRun, MF.DEFAULT_ASSUMPTIONS.minutesPerRun) }),
      MF.t('sum.assume.share', { value: Math.round(num(a.automationShare, MF.DEFAULT_ASSUMPTIONS.automationShare) * 100) }),
      MF.t('sum.assume.rate', { value: MF.formatNumber(num(a.hourlyRate, MF.DEFAULT_ASSUMPTIONS.hourlyRate)) }),
      '',
      MF.t('sum.assume.note')
    ]));

    parts.push(section(MF.t('sum.h.constructor'), [MF.t('sum.constructor', { filled: filled, total: MF.QUESTIONS.length })]));

    var notes = [];
    var prices = (MF.CONFIG && MF.CONFIG.prices) || {};
    if (!MF.formatPrice(prices.start) && !MF.formatPrice(prices.grow) && !MF.formatPrice(prices.scale)) notes.push('- ' + MF.t('sum.note.price'));
    if (!MF.CONFIG || typeof MF.CONFIG.contact !== 'string' || MF.CONFIG.contact.trim() === '') notes.push('- ' + MF.t('sum.note.contact'));
    notes.push('- ' + MF.t('sum.note.preliminary'));
    if (plan.intelligenceNotice) notes.push('- ' + MF.t('sum.note.intelligence'));
    if (wz.demo || st.demo) notes.push('- ' + MF.t('sum.note.demo'));
    parts.push(section(MF.t('sum.h.notes'), notes));

    return parts.join('\n\n') + '\n';
  };

  // Файлы пакета для MF.buildZip: сводка и 12 документов.
  MF.devFiles = function (state, w) {
    var st = state && state.answers && typeof state.answers === 'object' ? state : MF.emptyState();
    var files = [{ name: SUMMARY_FILE, content: MF.devSummary(st, w) }];
    MF.buildDocs(st).forEach(function (d) { files.push({ name: d.file, content: d.content }); });
    return files;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
