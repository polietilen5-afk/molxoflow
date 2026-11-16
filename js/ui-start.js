/* Molxo Flow: экраны воронки — мастер «Начать», «Ваш план» и демо. Работает только в браузере.
   Состояние мастера отдельное от состояния конструктора (MF.ui.wizard, ключ MF.WIZARD_KEY).
   Все тексты через MF.t; ответы клиента вставляются только как текстовые узлы. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined' || !MF.ui || !MF.createWizardStore) return;
  var ui = MF.ui, el = ui.el;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- состояние мастера и сохранение ---------- */
  var wstore = null;
  var lastSaveOk = true;
  var statusNode = null;
  var prefillSig = '';
  ui.wizard = null;

  function wizardStore() {
    if (!wstore) wstore = MF.createWizardStore(MF.getLocalStorage());
    return wstore;
  }
  function ensureWizard() {
    if (!ui.wizard) ui.wizard = wizardStore().load();
    return ui.wizard;
  }
  ui.getWizard = ensureWizard;

  function stamp(w) {
    var n = {};
    Object.keys(w).forEach(function (k) { n[k] = w[k]; });
    n.savedAt = Date.now();
    return n;
  }
  ui.saveWizard = function (next) { return saveWizard(next); };
  function wizardSaved() { return wizardStore().available && lastSaveOk; }
  function updateStatus() {
    if (!statusNode || !statusNode.isConnected) return;
    var ok = wizardSaved();
    var cls = 'save-status wizard-status ' + (ok ? 'is-saved' : 'is-unavailable');
    var text = ok ? MF.t('wizard.saved') : MF.t('wizard.unavailable');
    // Текст не переписывается, пока он тот же: иначе чтец экрана повторяет «Сохранено» на каждый символ.
    if (statusNode.className !== cls) statusNode.className = cls;
    if (statusNode.textContent !== text) statusNode.textContent = text;
  }
  function saveWizard(next) {
    next = stamp(next);
    ui.wizard = next;
    lastSaveOk = wizardStore().save(next);
    updateStatus();
    return next;
  }
  // Стирает данные мастера: используется кнопкой «Очистить» и общей очисткой проекта.
  function clearWizardData() {
    wizardStore().clear();
    ui.wizard = MF.emptyWizard();
    lastSaveOk = true;
    prefillSig = '';
  }
  if (ui.onClear) ui.onClear(clearWizardData);

  /* ---------- перенос в конструктор ---------- */
  // Пустые q01, q02, q03, q05 заполняются из мастера; введённые ответы не трогаются; демо мастера не переносится.
  ui.prefillFromWizard = function () {
    var w = ensureWizard();
    if (!w.goal || w.demo || (ui.state && ui.state.demo)) return;
    var from = MF.wizardToAnswers(w);
    var sig = JSON.stringify(from);
    if (sig === prefillSig) return;
    prefillSig = sig;
    var next = ui.state, changed = false;
    ['q01', 'q02', 'q03', 'q05'].forEach(function (id) {
      if (from[id] && !MF.isFilled(next.answers[id])) { next = MF.setAnswer(next, id, from[id]); changed = true; }
    });
    if (changed) ui.setState(next, { quiet: true });
  };

  /* ---------- разбор адреса ---------- */
  function hashParts() {
    var h = (root.location && root.location.hash) || '';
    return h.replace(/^#\/?/, '').split('?')[0].split('/');
  }
  function replaceHash(hash) {
    try { root.history.replaceState(null, '', root.location.pathname + root.location.search + hash); } catch (e) { /* без истории адрес останется прежним */ }
  }

  /* ---------- ответы: чтение ---------- */
  function selectedOf(w, id) {
    var v = w.answers[id];
    var list = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
    return list.filter(function (x) { return x !== MF.WIZARD_SKIP; });
  }
  function isSkipped(w, id) {
    var v = w.answers[id];
    return v === MF.WIZARD_SKIP || (Array.isArray(v) && v.length === 1 && v[0] === MF.WIZARD_SKIP);
  }
  // Шаг пропущен целиком: для вида pair это обе группы, пропущенные кнопкой «Пропустить».
  function stepSkipped(w, step) {
    if (step.kind === 'pair') return step.groups.every(function (g) { return isSkipped(w, step.id + '.' + g); });
    return isSkipped(w, step.id);
  }
  function textOf(w, id) {
    var v = w.answers[id];
    return typeof v === 'string' && v !== MF.WIZARD_SKIP ? v : '';
  }

  /* ---------- мастер ---------- */
  function renderStart(container) {
    var w = ensureWizard();
    var parts = hashParts();
    if (parts[1]) {
      // Переход по ссылке «#/start/<цель>/<отрасль>»: цель и отрасль выбираются, мастер идёт с первого вопроса.
      if (byId(MF.GOALS, parts[1])) {
        var base = w.demo ? MF.emptyWizard() : w;
        var n = MF.setWizardGoal(base, parts[1]);
        if (parts[2] && byId(MF.INDUSTRIES, parts[2])) n = MF.setWizardIndustry(n, parts[2]);
        w = saveWizard(MF.setWizardStep(n, 1));
      }
      replaceHash('#/start');
    }

    var steps = MF.wizardSteps(w);
    var index = w.goal ? Math.min(Math.max(w.step, 0), steps.length - 1) : 0;
    var step = steps[index];
    var isLast = index === steps.length - 1;
    var refs = {};

    function go(i, focus) {
      saveWizard(MF.setWizardStep(ui.wizard, i));
      ui.render();
      if (focus) { var t = document.getElementById('wz-title'); if (t) t.focus({ preventScroll: true }); }
    }
    function finish() {
      saveWizard(MF.completeWizard(ui.wizard));
      ui.go('plan');
    }
    function advance() {
      // Кнопка не disabled (иначе она выпадает из Tab), поэтому ответ проверяется здесь: причина показывается рядом.
      if (!MF.wizardAnswered(ui.wizard, step.id)) {
        if (refs.need) { refs.need.hidden = false; }
        return;
      }
      if (isLast) finish(); else go(index + 1, true);
    }
    function refreshNav() {
      var cur = ui.wizard;
      var answered = MF.wizardAnswered(cur, step.id);
      if (refs.next) {
        refs.next.setAttribute('aria-disabled', answered ? 'false' : 'true');
        refs.next.className = 'btn btn-primary' + (answered ? '' : ' is-disabled');
      }
      if (refs.need) refs.need.hidden = answered;
      if (refs.skipped) refs.skipped.hidden = !stepSkipped(cur, step);
    }
    function skip() {
      if (step.kind === 'pair') {
        // Пропускаются только группы без ответа: выбранное в другой группе остаётся.
        step.groups.forEach(function (g) {
          var key = step.id + '.' + g;
          if (selectedOf(ui.wizard, key).length === 0) saveWizard(MF.setWizardAnswer(ui.wizard, key, MF.WIZARD_SKIP));
        });
      } else {
        var value = step.kind === 'multi' ? [MF.WIZARD_SKIP] : MF.WIZARD_SKIP;
        saveWizard(MF.setWizardAnswer(ui.wizard, step.id, value));
      }
      advance();
    }

    /* --- тело шага по его виду --- */
    var body = el('div', { class: 'wizard-body' });

    if (step.kind === 'goal') {
      body.appendChild(el('ul', { class: 'goal-grid', 'aria-label': MF.t('wizard.goalsLabel') }, MF.GOALS.map(function (g) {
        return el('li', null, el('button', {
          type: 'button', class: 'goal-card' + (w.goal === g.id ? ' is-selected' : ''), 'aria-pressed': w.goal === g.id ? 'true' : 'false',
          on: { click: function () {
            var base = ui.wizard.demo ? MF.emptyWizard() : ui.wizard;
            saveWizard(MF.setWizardStep(MF.setWizardGoal(base, g.id), 1));
            ui.render();
            var t = document.getElementById('wz-title'); if (t) t.focus({ preventScroll: true });
          } }
        }, [el('span', { class: 'goal-title' }, MF.t(g.titleKey)), el('span', { class: 'goal-hint' }, MF.t(g.hintKey))]));
      })));
    } else if (step.kind === 'text') {
      var area = el('textarea', {
        id: 'wz-answer', class: 'answer' + (step.id === 'volume' ? ' answer-short' : ''), rows: step.id === 'volume' ? '2' : '5', maxlength: '2000',
        placeholder: MF.t('wizard.placeholder'), 'aria-labelledby': 'wz-title', 'aria-describedby': 'wz-hint', value: textOf(w, step.id)
      });
      area.addEventListener('input', function () {
        saveWizard(MF.setWizardAnswer(ui.wizard, step.id, area.value));
        refreshNav();
      });
      body.appendChild(area);

      var chipBox = null;
      if (step.id === 'business') {
        var indButtons = [];
        var refreshIndustry = function () {
          indButtons.forEach(function (b) {
            var on = ui.wizard.industry === b.id;
            b.node.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.node.className = 'chip chip-choice' + (on ? ' is-on' : '');
          });
        };
        chipBox = el('ul', { class: 'chips', 'aria-label': MF.t('wizard.industryLabel') }, MF.wizardOptions(w, 'business').map(function (o) {
          var b = el('button', { type: 'button', class: 'chip chip-choice', 'aria-pressed': 'false', on: { click: function () {
            var cur = ui.wizard;
            saveWizard(MF.setWizardIndustry(cur, cur.industry === o.id ? null : o.id));
            refreshIndustry();
            refreshNav();
          } } }, MF.t(o.labelKey));
          indButtons.push({ id: o.id, node: b });
          return el('li', null, b);
        }));
        body.appendChild(el('p', { class: 'chips-label' }, MF.t('wizard.industryLabel')));
        body.appendChild(chipBox);
        refreshIndustry();
      } else {
        var hints = MF.wizardOptions(w, step.id);
        if (hints.length) {
          body.appendChild(el('p', { class: 'chips-label' }, MF.t('wizard.chipsLabel')));
          body.appendChild(el('ul', { class: 'chips', 'aria-label': MF.t('wizard.chipsLabel') }, hints.map(function (o) {
            return el('li', null, el('button', { type: 'button', class: 'chip', on: { click: function () {
              var label = MF.t(o.labelKey);
              area.value = MF.isFilled(area.value) ? area.value.replace(/\s+$/, '') + '; ' + label : label;
              area.dispatchEvent(new Event('input'));
              area.focus();
            } } }, MF.t(o.labelKey)));
          })));
        }
      }
    } else if (step.kind === 'pair') {
      // Две группы одиночного выбора со своими подзаголовками и своим «Другое».
      step.groups.forEach(function (g) {
        var key = step.id + '.' + g;
        var gOpts = MF.wizardOptions(w, key);
        var gButtons = [];
        var gOtherRow = null;
        var gOtherInput = null;
        var refreshGroup = function () {
          var sel = selectedOf(ui.wizard, key);
          gButtons.forEach(function (b) {
            var on = sel.indexOf(b.id) >= 0;
            b.node.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.node.className = 'chip chip-choice' + (on ? ' is-on' : '');
          });
          if (gOtherRow) gOtherRow.hidden = sel.indexOf('other') < 0;
        };
        var gToggle = function (id) {
          var cur = ui.wizard, sel = selectedOf(cur, key);
          saveWizard(MF.setWizardAnswer(cur, key, sel[0] === id ? '' : id));
          refreshGroup();
          refreshNav();
          if (id === 'other' && gOtherRow && !gOtherRow.hidden) gOtherInput.focus();
        };
        var groupBox = el('div', { class: 'wizard-group', role: 'group', 'aria-labelledby': 'wz-group-' + g }, [
          el('h2', { id: 'wz-group-' + g, class: 'group-title' }, MF.t('group.' + g)),
          el('ul', { class: 'chips wizard-options', 'aria-label': MF.t('group.' + g) }, gOpts.map(function (o) {
            var b = el('button', { type: 'button', class: 'chip chip-choice', 'aria-pressed': 'false', on: { click: function () { gToggle(o.id); } } }, MF.t(o.labelKey));
            gButtons.push({ id: o.id, node: b });
            return el('li', null, b);
          }))
        ]);
        if (byId(gOpts, 'other')) {
          gOtherInput = el('input', {
            id: 'wz-other-' + g, type: 'text', class: 'answer other-input', maxlength: '200', value: textOf(w, key + '.other'),
            'aria-label': MF.t('wizard.otherLabel'), placeholder: MF.t('wizard.otherLabel')
          });
          gOtherInput.addEventListener('input', function () {
            saveWizard(MF.setWizardAnswer(ui.wizard, key + '.other', gOtherInput.value));
            refreshNav();
          });
          gOtherRow = el('div', { class: 'other-row', hidden: true }, gOtherInput);
          groupBox.appendChild(gOtherRow);
        }
        body.appendChild(groupBox);
        refreshGroup();
      });
    } else {
      // choice и multi: варианты-переключатели и поле «Другое»
      var opts = MF.wizardOptions(w, step.id);
      var optButtons = [];
      var otherRow = null;
      var otherInput = null;
      var refreshOptions = function () {
        var sel = selectedOf(ui.wizard, step.id);
        optButtons.forEach(function (b) {
          var on = sel.indexOf(b.id) >= 0;
          b.node.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.node.className = 'chip chip-choice' + (on ? ' is-on' : '');
        });
        if (otherRow) otherRow.hidden = sel.indexOf('other') < 0;
      };
      var toggle = function (id) {
        var cur = ui.wizard, sel = selectedOf(cur, step.id), next;
        if (step.kind === 'choice') next = sel[0] === id ? '' : id;
        else next = sel.indexOf(id) >= 0 ? sel.filter(function (x) { return x !== id; }) : sel.concat([id]);
        saveWizard(MF.setWizardAnswer(cur, step.id, next));
        refreshOptions();
        refreshNav();
        if (id === 'other' && otherRow && !otherRow.hidden) otherInput.focus();
      };
      body.appendChild(el('ul', { class: 'chips wizard-options', 'aria-label': MF.t('wizard.optionsLabel') }, opts.map(function (o) {
        var b = el('button', { type: 'button', class: 'chip chip-choice', 'aria-pressed': 'false', on: { click: function () { toggle(o.id); } } }, MF.t(o.labelKey));
        optButtons.push({ id: o.id, node: b });
        return el('li', null, b);
      })));
      if (byId(opts, 'other')) {
        otherInput = el('input', {
          id: 'wz-other', type: 'text', class: 'answer other-input', maxlength: '200', value: textOf(w, step.id + '.other'),
          'aria-label': MF.t('wizard.otherLabel'), placeholder: MF.t('wizard.otherLabel')
        });
        otherInput.addEventListener('input', function () {
          saveWizard(MF.setWizardAnswer(ui.wizard, step.id + '.other', otherInput.value));
          refreshNav();
        });
        otherRow = el('div', { class: 'other-row', hidden: true }, otherInput);
        body.appendChild(otherRow);
      }
      refreshOptions();
    }

    /* --- кнопки --- */
    refs.skipped = el('p', { class: 'wizard-skipped muted small' }, MF.t('wizard.skipped'));
    refs.need = el('p', { id: 'wz-need', class: 'wizard-need small' }, MF.t('wizard.needAnswer'));
    var back = el('button', { type: 'button', class: 'btn btn-secondary', disabled: index <= 0, on: { click: function () { go(index - 1, true); } } }, MF.t('wizard.back'));
    var skipBtn = step.skippable
      ? el('button', { type: 'button', class: 'btn btn-secondary', on: { click: skip } }, MF.t('wizard.skip'))
      : null;
    refs.next = el('button', { type: 'button', class: 'btn btn-primary', 'aria-describedby': 'wz-need', on: { click: advance } }, isLast ? MF.t('wizard.finish') : MF.t('wizard.next'));

    var demoNote = w.demo ? el('p', { class: 'plan-demo-note pending' }, MF.t('wizard.demoNote')) : null;
    var title = el('h1', { id: 'wz-title', class: 'question-title', tabindex: '-1' }, MF.t(step.titleKey));

    statusNode = el('p', { class: 'save-status wizard-status', 'aria-live': 'polite' });
    var clearBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-small', on: { click: function () {
      ui.confirm({ title: MF.t('wizard.clear.title'), text: MF.t('wizard.clear.text'), okLabel: MF.t('wizard.clear.ok') }, function () {
        clearWizardData();
        ui.render();
      });
    } } }, MF.t('wizard.clear'));

    var card = el('section', { class: 'card wizard-card', 'aria-labelledby': 'wz-title' }, [
      el('p', { class: 'eyebrow' }, MF.t('wizard.progress', { n: index + 1, total: steps.length })),
      el('div', { class: 'bar wizard-bar', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(steps.length), 'aria-valuenow': String(index + 1), 'aria-label': MF.t('wizard.stepsLabel') },
        el('div', { class: 'bar-fill', style: 'width:' + Math.round((index + 1) / steps.length * 100) + '%' })),
      title,
      el('p', { id: 'wz-hint', class: 'hint' }, MF.t(step.hintKey)),
      demoNote,
      body,
      refs.skipped,
      refs.need,
      el('div', { class: 'card-actions wizard-actions' }, [back, el('span', { class: 'wizard-actions-end' }, [skipBtn, refs.next])])
    ]);

    container.appendChild(el('div', { class: 'page narrow wizard' }, [
      card,
      el('p', { class: 'muted small wizard-rules' }, MF.t('wizard.rules')),
      el('div', { class: 'wizard-foot' }, [statusNode, clearBtn])
    ]));
    updateStatus();
    refreshNav();
  }

  /* ---------- буфер обмена ---------- */
  // Сначала navigator.clipboard, затем execCommand('copy'), иначе вызывается onFail (поле для ручного копирования).
  function copyText(text, onOk, onFail) {
    function legacy() {
      var active = document.activeElement;
      var ta = el('textarea', { readonly: true, tabindex: '-1', 'aria-hidden': 'true', style: 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0' });
      ta.value = text;
      document.body.appendChild(ta);
      var ok = false;
      try { ta.select(); ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (active && active.focus) { try { active.focus({ preventScroll: true }); } catch (e2) { /* фокус не вернулся */ } }
      if (ok) onOk(); else onFail();
    }
    try {
      if (root.navigator && root.navigator.clipboard && typeof root.navigator.clipboard.writeText === 'function') {
        root.navigator.clipboard.writeText(text).then(onOk, legacy);
        return;
      }
    } catch (e) { /* падаем на запасной способ */ }
    legacy();
  }

  ui.copyText = copyText;

  /* ---------- «Ваш план» ---------- */
  function leaveDemo() {
    clearWizardData();
    ui.go('start');
  }

  function renderPlan(container) {
    var w = ensureWizard();
    var plan = MF.buildPlan(w, ui.state.assumptions);
    var page = el('div', { class: 'page plan' });
    container.appendChild(page);

    if (!plan.ready) {
      page.appendChild(el('div', { class: 'plan-empty' }, [
        el('h1', { class: 'page-title' }, MF.t('plan.title')),
        el('p', { class: 'lead' }, MF.t('plan.empty')),
        el('a', { href: '#/start', class: 'btn btn-primary' }, MF.t('plan.toStart'))
      ]));
      return;
    }

    if (w.demo) {
      page.appendChild(el('div', { class: 'plan-demo', role: 'note' }, [
        el('p', { class: 'plan-demo-text' }, MF.t('plan.demoBanner')),
        el('button', { type: 'button', class: 'btn btn-secondary btn-small', on: { click: leaveDemo } }, MF.t('plan.demoReset'))
      ]));
    }

    var goalLine = MF.t('req.goal', { name: MF.wizardAnswerText(w, 'goal') });
    var industry = byId(MF.INDUSTRIES, w.industry);
    page.appendChild(el('header', { class: 'plan-head' }, [
      el('h1', { class: 'page-title' }, MF.t('plan.title')),
      el('p', { class: 'plan-meta muted' }, goalLine + (industry ? ' · ' + MF.t('req.industry', { name: MF.t(industry.titleKey) }) : '')),
      el('p', { class: 'plan-prelim' }, MF.t('plan.preliminary'))
    ]));

    /* возможности */
    var names = [];
    var opps = plan.opportunities.map(function (o, i) {
      var s = byId(MF.SOLUTIONS, o.solutionId);
      if (i > 0) names.push(MF.t(s.titleKey));
      return el('li', { class: 'card opp-card' }, [
        el('span', { class: 'tag opp-dir dir-' + o.direction }, MF.t('dir.' + o.direction + '.title')),
        el('h3', { class: 'opp-title' }, MF.t(s.titleKey)),
        el('p', { class: 'opp-changes' }, [el('span', { class: 'opp-label' }, MF.t('plan.changes') + ': '), MF.t(s.changesKey)]),
        el('ul', { class: 'opp-reasons small muted', 'aria-label': MF.t('plan.reasons') }, o.reasons.map(function (r) { return el('li', null, MF.t(r)); }))
      ]);
    });
    page.appendChild(el('section', { class: 'plan-section', 'aria-labelledby': 'pl-opps' }, [
      el('h2', { id: 'pl-opps', class: 'section-sub' }, MF.t('plan.opportunities')),
      el('ol', { class: 'opp-list' }, opps)
    ]));

    /* START / GROW / SCALE */
    var tierCards = ['start', 'grow', 'scale'].map(function (l) {
      var price = plan.prices && plan.prices[l];
      return el('section', { class: 'card tier-card tier-' + l, 'aria-labelledby': 'tier-' + l }, [
        el('h3', { id: 'tier-' + l, class: 'tier-title' }, MF.t('tier.' + l + '.title')),
        el('p', { class: 'tier-lead muted' }, MF.t('tier.' + l + '.lead')),
        el('ul', { class: 'tier-items' }, plan.tiers[l].map(function (k) { return el('li', null, MF.t(k)); })),
        el('p', { class: 'tier-price' + (price ? '' : ' is-unknown') }, price || MF.t('price.unknown'))
      ]);
    });
    page.appendChild(el('section', { class: 'plan-section', 'aria-labelledby': 'pl-tiers' }, [
      el('h2', { id: 'pl-tiers', class: 'section-sub' }, MF.t('plan.tiers')),
      el('div', { class: 'tiers' }, tierCards),
      names.length ? el('p', { class: 'tier-additional muted' }, MF.t('plan.additional', { names: names.join(', ') })) : null
    ]));

    ui.renderHow(page);

    /* оценка эффекта с редактируемыми допущениями */
    var hunt = w.goal === 'opportunities';
    var volumeText = hunt ? (typeof w.answers.huntVolume === 'string' ? w.answers.huntVolume.trim() : '') : MF.wizardAnswerText(w, 'volume');
    var effLines = el('ul', { class: 'potential-lines' });
    var assumeInputs = {};
    function assumption(key, label, unit, min, max, stepVal) {
      var input = el('input', { type: 'number', inputmode: 'decimal', min: min, max: max, step: stepVal, class: 'assume-input', id: 'pa-' + key });
      assumeInputs[key] = input;
      input.addEventListener('input', function () {
        var v = key === 'automationShare' ? Number(input.value) / 100 : Number(input.value);
        if (input.value === '' || !isFinite(v)) return;
        ui.setState(MF.setAssumption(ui.state, key, v), { quiet: true });
        refreshAll(false);
      });
      input.addEventListener('change', function () { refreshAll(true); });
      return el('div', { class: 'assume-row' }, [
        el('label', { 'for': 'pa-' + key, class: 'assume-label' }, [label, el('span', { class: 'tag-assume' }, MF.t('assume.tag'))]),
        el('span', { class: 'assume-field' }, [input, el('span', { class: 'assume-unit' }, unit)])
      ]);
    }
    var effectBox = null;
    // Для цели «выгодные предложения» число обращений в месяц спрашивается здесь, необязательным полем (шагов мастера не добавляется).
    var huntInput = null;
    if (hunt) {
      huntInput = el('input', {
        type: 'text', id: 'pl-hunt-volume', class: 'answer other-input', maxlength: '200', value: volumeText,
        'aria-describedby': 'pl-hunt-hint', placeholder: MF.t('wizard.placeholder')
      });
      huntInput.addEventListener('change', function () {
        saveWizard(MF.setWizardAnswer(ui.wizard, 'huntVolume', huntInput.value));
        ui.render();
      });
    }
    var huntAsk = hunt ? el('div', { class: 'hunt-volume' }, [
      el('label', { 'for': 'pl-hunt-volume', class: 'assume-label' }, MF.t('plan.huntVolume.label')),
      huntInput,
      el('p', { id: 'pl-hunt-hint', class: 'small muted' }, MF.t('plan.huntVolume.hint'))
    ]) : null;
    if (hunt && !volumeText) {
      effectBox = el('section', { class: 'card plan-effect', 'aria-labelledby': 'pl-eff' }, [
        el('h2', { id: 'pl-eff', class: 'card-title' }, MF.t('plan.effect')),
        huntAsk
      ]);
      page.appendChild(effectBox);
      effectBox = null; // оценки ещё нет: обновлять нечего
    } else if (volumeText) {
      if (plan.effect) {
        effectBox = el('section', { class: 'card plan-effect', 'aria-labelledby': 'pl-eff' }, [
          el('h2', { id: 'pl-eff', class: 'card-title' }, MF.t('plan.effect')),
          el('p', { class: 'plan-prelim' }, MF.t('plan.preliminary')),
          huntAsk,
          effLines,
          el('div', { class: 'assume' }, [
            el('p', { class: 'assume-head' }, MF.t('assume.head')),
            assumption('minutesPerRun', MF.t('assume.minutes'), MF.t('assume.unit.min'), '1', '1440', '1'),
            assumption('automationShare', MF.t('assume.share'), MF.t('assume.unit.pct'), '1', '100', '1'),
            assumption('hourlyRate', MF.t('assume.rate'), MF.rateUnit(), '0', '10000000', '50')
          ])
        ]);
      } else {
        effectBox = el('section', { class: 'card plan-effect', 'aria-labelledby': 'pl-eff' }, [
          el('h2', { id: 'pl-eff', class: 'card-title' }, MF.t('plan.effect')),
          el('p', { class: 'pending' }, MF.t(hunt ? 'plan.huntVolume.unclear' : 'plan.effectUnclear')),
          huntAsk
        ]);
      }
      page.appendChild(effectBox);
    }

    if (plan.intelligenceNotice) {
      page.appendChild(el('aside', { class: 'card plan-notice', role: 'note' }, el('p', null, MF.t('notice.intelligence'))));
    }

    ui.renderSecurity(page, { intelligence: plan.intelligenceNotice });
    ui.renderTrust(page);

    /* заявка */
    function currentText() { return MF.planText(ui.wizard, MF.buildPlan(ui.wizard, ui.state.assumptions)); }
    var link = MF.contactLink(currentText());
    var offer;
    if (link.kind === 'none') {
      offer = el('button', { type: 'button', class: 'btn btn-primary', disabled: true }, MF.t('plan.getOffer'));
    } else {
      offer = el('a', { href: link.href, class: 'btn btn-primary', on: { click: function () {
        // История планов на устройстве: запись добавляется при «Получить предложение».
        if (ui.saveToCabinet) ui.saveToCabinet(ui.wizard, MF.buildPlan(ui.wizard, ui.state.assumptions));
      } } }, MF.t('plan.getOffer'));
    }
    var contactMissing = link.kind === 'none' ? el('p', { class: 'contact-missing', role: 'note' }, MF.t('plan.contactMissing')) : null;
    var telegramHint = link.kind === 'telegram' ? el('p', { class: 'telegram-hint', role: 'note' }, MF.t('plan.telegramHint')) : null;
    var copyStatus = el('p', { class: 'copy-status small', role: 'status', 'aria-live': 'polite' });
    var manualNote = el('p', { class: 'pending small', hidden: true }, MF.t('plan.copyManual'));
    var manual = el('textarea', { class: 'answer plan-manual', rows: '10', readonly: true, hidden: true, 'aria-label': MF.t('plan.requestText') });
    var copyBtn = el('button', { type: 'button', class: 'btn btn-secondary', on: { click: function () {
      var text = currentText();
      copyText(text, function () {
        copyStatus.textContent = MF.t('plan.copied');
        manual.hidden = true; manualNote.hidden = true;
      }, function () {
        copyStatus.textContent = '';
        manual.value = text;
        manual.hidden = false; manualNote.hidden = false;
        manual.focus();
        manual.select();
      });
    } } }, MF.t('plan.copy'));
    var zipBtn = el('button', { type: 'button', class: 'btn btn-secondary', on: { click: function () {
      if (!ui.download) return;
      ui.download('molxo-flow-tz.zip', MF.buildZip(MF.devFiles(ui.state, ui.wizard)), 'application/zip');
    } } }, MF.t('plan.zip'));

    page.appendChild(el('section', { class: 'card plan-request', 'aria-labelledby': 'pl-req' }, [
      el('h2', { id: 'pl-req', class: 'card-title' }, MF.t('plan.requestTitle')),
      el('p', { class: 'muted' }, MF.t('plan.requestLead')),
      el('div', { class: 'plan-actions' }, [offer, copyBtn, zipBtn]),
      contactMissing,
      telegramHint,
      copyStatus,
      manualNote,
      manual,
      el('p', { class: 'small muted' }, MF.t('plan.sendNote')),
      el('p', { class: 'small muted' }, MF.t('plan.zipNote'))
    ]));

    if (ui.renderCallBlock) ui.renderCallBlock(page);
    ui.renderBotCard(page, { code: MF.botStartCode ? MF.botStartCode(ui.wizard) : '' });
    if (ui.renderAgentWeb) ui.renderAgentWeb(page);

    page.appendChild(el('div', { class: 'plan-links' }, [
      el('a', { href: '#/start', class: 'btn btn-secondary' }, MF.t('plan.edit')),
      el('a', { href: '#/offer', class: 'btn btn-secondary' }, MF.t('plan.toOffer')),
      el('a', { href: '#/interview', class: 'btn btn-secondary' }, MF.t('plan.toTz'))
    ]));
    page.appendChild(el('p', { class: 'small muted plan-privacy' }, MF.t('plan.privacy')));

    // Обновляет оценку эффекта и ссылку заявки при правке допущений.
    function refreshAll(force) {
      var cur = MF.buildPlan(ui.wizard, ui.state.assumptions);
      if (effectBox && cur.effect) {
        ui.clear(effLines);
        MF.effectLines(cur.effect).forEach(function (l) { effLines.appendChild(el('li', null, l)); });
        var a = ui.state.assumptions;
        [['minutesPerRun', a.minutesPerRun], ['automationShare', Math.round(a.automationShare * 100)], ['hourlyRate', a.hourlyRate]].forEach(function (p) {
          var input = assumeInputs[p[0]];
          if (input && (force || document.activeElement !== input)) input.value = String(p[1]);
        });
      }
      if (link.kind === 'mailto') offer.setAttribute('href', MF.contactLink(currentText()).href);
    }
    refreshAll(true);
  }

  /* ---------- демо ---------- */
  function renderDemo(container) {
    var id = hashParts()[1] || '';
    var demo = byId(MF.WIZARD_DEMOS, id);
    var page = el('div', { class: 'page narrow demo-page' });
    container.appendChild(page);
    page.appendChild(el('h1', { class: 'page-title' }, MF.t('demo.title')));
    if (!demo) {
      page.appendChild(el('p', { class: 'lead' }, MF.t('demo.notFound')));
      page.appendChild(el('a', { href: '#/', class: 'btn btn-secondary' }, MF.t('demo.home')));
      return;
    }
    page.appendChild(el('p', { class: 'lead' }, MF.t('demo.loading')));
    ui.renderBotCard(page);

    page.appendChild(el('div', { class: 'plan-links' }, [
      el('a', { href: '#/plan', class: 'btn btn-primary' }, MF.t('demo.openPlan')),
      el('a', { href: '#/', class: 'btn btn-secondary' }, MF.t('demo.home'))
    ]));
    var w = ensureWizard();
    function open() {
      saveWizard(MF.loadWizardDemo(MF.emptyWizard(), id));
      root.location.replace('#/plan');
    }
    var hasOwn = !w.demo && (!!w.goal || Object.keys(w.answers).length > 0);
    if (hasOwn) ui.confirm({ title: MF.t('demo.replace.title'), text: MF.t('demo.replace.text'), okLabel: MF.t('demo.replace.ok') }, open);
    else open();
  }

  ui.registerView('start', renderStart);
  ui.registerView('plan', renderPlan);
  ui.registerView('demo', renderDemo);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
