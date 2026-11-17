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
  // Выбор — строка-опция: маркер-круг (один ответ) или маркер-квадрат (несколько); выбранная получает is-on.
  function chipCls(on, multi, choice) { return 'chip' + (choice === false ? '' : ' chip-choice') + (multi ? ' chip-multi' : '') + (on ? ' is-on' : ''); }
  // От 768 px короткие ответы (меньше 28 знаков) идут в две колонки; длинный текст (на uk чаще) — в одну.
  var SHORT_LABEL = 28;
  function chipsCls(labels, extra) {
    var short = labels.length > 3 && labels.every(function (t) { return t.length < SHORT_LABEL; });
    return 'chips' + (extra ? ' ' + extra : '') + (short ? ' chips-2' : '');
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
    if (ui.refreshStatus) ui.refreshStatus();
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
  // Каждый шаг мастера имеет свой адрес «#/start/s<номер>» и запись в истории: кнопка «Назад» телефона идёт на предыдущий шаг.
  function stepHash(i) { return '#/start/s' + (i + 1); }
  function pushStep(i) {
    var h = stepHash(i);
    if (root.location && root.location.hash === h) return;
    try { root.history.pushState(null, '', root.location.pathname + root.location.search + h); } catch (e) { /* без истории шаг меняется, но «Назад» выйдет из мастера */ }
  }
  function scrollTop() { if (typeof root.scrollTo === 'function') { try { root.scrollTo(0, 0); } catch (e) { /* без прокрутки */ } } }

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
  // Число шагов на путях разных целей: до выбора цели показывается диапазон «из 8–9», после выбора точное число.
  function stepRange() {
    var min = 0, max = 0;
    MF.GOALS.forEach(function (g) {
      var n = MF.wizardSteps(MF.setWizardGoal(MF.emptyWizard(), g.id)).length;
      if (!min || n < min) min = n;
      if (n > max) max = n;
    });
    return { min: min, max: max };
  }

  // Предел текста шага и порог, с которого показывается счётчик (совпадает с MAX_TEXT в wizard.js).
  var TEXT_MAX = 2000;
  var COUNT_FROM = 200;

  // Не больше четырёх видимых вариантов в группе шага pair; остальные («Пока не знаю», «Другое») раскрываются кнопкой.
  var GROUP_VISIBLE = 4;

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
      } else {
        // «#/start/s<номер>»: шаг из истории браузера («Назад» и «Вперёд»), нужен выбранная цель.
        var m = /^s(\d+)$/.exec(parts[1]);
        if (m && w.goal && w.step !== Number(m[1]) - 1) {
          ui.wizardDir = Number(m[1]) - 1 < w.step ? 'back' : 'fwd';
          w = saveWizard(MF.setWizardStep(w, Number(m[1]) - 1));
        }
      }
    }

    var steps = MF.wizardSteps(w);
    var index = w.goal ? Math.min(Math.max(w.step, 0), steps.length - 1) : 0;
    // Адрес всегда называет показанный шаг (запись истории не добавляется).
    if (hashParts().join('/') !== 'start/s' + (index + 1)) replaceHash(stepHash(index));
    var step = steps[index];
    var isLast = index === steps.length - 1;
    var refs = {};
    var range = w.goal ? null : stepRange();

    function go(i, focus) {
      // Направление запоминается до перерисовки: вход нового шага идёт оттуда, куда пользователь двигался (css по data-dir).
      ui.wizardDir = i < index ? 'back' : 'fwd';
      saveWizard(MF.setWizardStep(ui.wizard, i));
      pushStep(i);
      ui.render();
      scrollTop();
      if (focus) { var t = document.getElementById('wz-title'); if (t) t.focus({ preventScroll: true }); }
    }
    function finish() {
      saveWizard(MF.completeWizard(ui.wizard));
      ui.go('plan');
    }
    function advance() {
      // Кнопка не disabled (иначе она выпадает из Tab), поэтому ответ проверяется здесь: причина показывается рядом.
      if (!MF.wizardAnswered(ui.wizard, step.id)) {
        if (refs.need) {
          // Попытка пойти дальше без ответа: текст постоянной live-области перезаписывается, чтец экрана озвучивает его снова.
          refs.need.textContent = '';
          refs.need.textContent = MF.t('wizard.needAnswer');
        }
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
      if (refs.need) {
        var want = answered ? '' : MF.t('wizard.needAnswer');
        if (refs.need.textContent !== want) refs.need.textContent = want;
      }
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
            pushStep(1);
            ui.render();
            scrollTop();
            var t = document.getElementById('wz-title'); if (t) t.focus({ preventScroll: true });
          } }
        }, [el('span', { class: 'goal-title' }, MF.t(g.titleKey)), el('span', { class: 'goal-hint' }, MF.t(g.hintKey))]));
      })));
    } else if (step.kind === 'text') {
      var area = el('textarea', {
        id: 'wz-answer', class: 'answer' + (step.id === 'volume' ? ' answer-short' : ''), rows: step.id === 'volume' ? '2' : '5', maxlength: String(TEXT_MAX),
        placeholder: MF.t('wizard.placeholder'), 'aria-labelledby': 'wz-title', 'aria-describedby': 'wz-hint wz-count', value: textOf(w, step.id)
      });
      // Счётчик знаков показывается, когда до предела остаётся мало; текст не обрезается молча.
      var counter = el('p', { id: 'wz-count', class: 'char-count small muted', 'aria-live': 'polite' });
      var chipButtons = [];
      var updateCounter = function (note) {
        var left = TEXT_MAX - area.value.length;
        var text = note || (left <= 0 ? MF.t('wizard.limit', { max: TEXT_MAX }) : (left <= COUNT_FROM ? MF.t('wizard.counter', { left: left }) : ''));
        if (counter.textContent !== text) counter.textContent = text;
      };
      var hasPhrase = function (label) { return area.value.toLowerCase().indexOf(label.toLowerCase()) >= 0; };
      var refreshChips = function () {
        chipButtons.forEach(function (b) {
          var on = hasPhrase(b.label);
          b.node.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.node.className = chipCls(on, true, false);
        });
      };
      area.addEventListener('input', function () {
        saveWizard(MF.setWizardAnswer(ui.wizard, step.id, area.value));
        refreshNav();
        updateCounter();
        refreshChips();
      });
      body.appendChild(area);
      body.appendChild(counter);
      updateCounter();

      var chipBox = null;
      if (step.id === 'business') {
        var indButtons = [];
        var refreshIndustry = function () {
          indButtons.forEach(function (b) {
            var on = ui.wizard.industry === b.id;
            b.node.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.node.className = chipCls(on, false);
          });
        };
        var indOpts = MF.wizardOptions(w, 'business');
        chipBox = el('ul', { class: chipsCls(indOpts.map(function (o) { return MF.t(o.labelKey); })), 'aria-label': MF.t('wizard.industryLabel') }, indOpts.map(function (o) {
          var b = el('button', { type: 'button', class: chipCls(false, false), 'aria-pressed': 'false', on: { click: function () {
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
          body.appendChild(el('ul', { class: chipsCls(hints.map(function (o) { return MF.t(o.labelKey); })), 'aria-label': MF.t('wizard.chipsLabel') }, hints.map(function (o) {
            var label = MF.t(o.labelKey);
            var b = el('button', { type: 'button', class: chipCls(false, true, false), 'aria-pressed': 'false', on: { click: function () {
              // Та же фраза повторно не дописывается; не влезающая в предел подсказка не добавляется молча.
              if (!hasPhrase(label)) {
                var next = MF.isFilled(area.value) ? area.value.replace(/\s+$/, '') + '; ' + label : label;
                if (next.length > TEXT_MAX) { updateCounter(MF.t('wizard.chipTooLong', { max: TEXT_MAX })); area.focus(); return; }
                area.value = next;
                area.dispatchEvent(new Event('input'));
              }
              area.focus();
            } } }, label);
            chipButtons.push({ label: label, node: b });
            return el('li', null, b);
          })));
          refreshChips();
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
        var gExtra = [];
        var gExtraIds = [];
        var gMore = null;
        var gExpanded = false;
        var refreshGroup = function () {
          var sel = selectedOf(ui.wizard, key);
          // Выбранный скрытый вариант раскрывает список сам: ответ не прячется.
          if (sel.some(function (id) { return gExtraIds.indexOf(id) >= 0; })) gExpanded = true;
          gExtra.forEach(function (li) {
            // Раскрытие по нажатию «Ещё» показывается мягко; уже выбранный скрытый вариант открывается сразу.
            if (li.hidden && gExpanded && gMore && gMore.hidden === false) li.classList.add('is-revealed');
            li.hidden = !gExpanded;
          });
          if (gMore) gMore.hidden = gExpanded;
          gButtons.forEach(function (b) {
            var on = sel.indexOf(b.id) >= 0;
            b.node.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.node.className = chipCls(on, false);
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
          el('ul', { class: chipsCls(gOpts.map(function (o) { return MF.t(o.labelKey); }), 'wizard-options'), 'aria-label': MF.t('group.' + g) }, gOpts.map(function (o, k) {
            var b = el('button', { type: 'button', class: chipCls(false, false), 'aria-pressed': 'false', on: { click: function () { gToggle(o.id); } } }, MF.t(o.labelKey));
            gButtons.push({ id: o.id, node: b });
            var li = el('li', null, b);
            if (k >= GROUP_VISIBLE) { gExtra.push(li); gExtraIds.push(o.id); }
            return li;
          }))
        ]);
        if (gExtra.length) {
          gMore = el('button', { type: 'button', class: 'link-btn group-more', 'aria-expanded': 'false', on: { click: function () {
            gExpanded = true;
            refreshGroup();
          } } }, MF.t('wizard.moreOptions'));
          groupBox.appendChild(gMore);
        }
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
          b.node.className = chipCls(on, step.kind === 'multi');
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
      body.appendChild(el('ul', { class: chipsCls(opts.map(function (o) { return MF.t(o.labelKey); }), 'wizard-options'), 'aria-label': MF.t('wizard.optionsLabel') }, opts.map(function (o) {
        var b = el('button', { type: 'button', class: chipCls(false, step.kind === 'multi'), 'aria-pressed': 'false', on: { click: function () { toggle(o.id); } } }, MF.t(o.labelKey));
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
    refs.skipped = el('p', { class: 'wizard-skipped muted small', role: 'status', 'aria-live': 'polite' }, MF.t('wizard.skipped'));
    // Подсказка о недостающем ответе: постоянная live-область (role не меняется), без ответа в ней текст, с ответом пусто.
    refs.need = el('p', { id: 'wz-need', class: 'wizard-need small', role: 'status', 'aria-live': 'polite' }, MF.t('wizard.needAnswer'));
    // На первом шаге «Назад» остаётся в Tab (aria-disabled вместо disabled), клик ничего не делает.
    var back = el('button', { type: 'button', class: 'btn btn-ghost' + (index <= 0 ? ' is-disabled' : ''), 'aria-disabled': index <= 0 ? 'true' : null, on: { click: function () { if (index > 0) go(index - 1, true); } } }, MF.t('wizard.back'));
    var skipBtn = step.skippable
      ? el('button', { type: 'button', class: 'btn btn-ghost', on: { click: skip } }, MF.t('wizard.skip'))
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

    // Панель-табло над карточкой: шаг и ветка моно-меткой, под ними прогресс 4 px (scaleX через --p).
    var branchName = w.goal ? MF.wizardAnswerText(w, 'goal') : '';
    var progressText = range ? MF.t('wizard.progressRange', { n: index + 1, min: range.min, max: range.max }) : MF.t('wizard.progress', { n: index + 1, total: steps.length });
    var panel = el('div', { class: 'wizard-panel' }, [
      el('div', { class: 'wizard-meta' }, [
        el('p', { class: 'eyebrow' }, progressText),
        branchName ? el('p', { class: 'mono-label wizard-branch' }, branchName) : null
      ]),
      el('div', { class: 'bar wizard-bar', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(steps.length), 'aria-valuenow': String(index + 1), 'aria-valuetext': progressText, 'aria-label': MF.t('wizard.stepsLabel') },
        el('div', { class: 'bar-fill', style: '--p:' + ((index + 1) / steps.length).toFixed(3) }))
    ]);
    var card = el('section', { class: 'card wizard-card', 'aria-labelledby': 'wz-title' }, [
      title,
      el('p', { id: 'wz-hint', class: 'hint' }, MF.t(step.hintKey)),
      demoNote,
      body,
      refs.skipped,
      refs.need
    ]);
    var actions = el('div', { class: 'wizard-actions' }, [back, el('span', { class: 'wizard-actions-end' }, [skipBtn, refs.next])]);

    var wizardPage = el('div', { class: 'page narrow wizard' }, [
      panel,
      card,
      actions,
      index === 0 ? el('p', { class: 'muted small wizard-rules' }, MF.t('wizard.rules')) : null,
      el('div', { class: 'wizard-foot' }, [statusNode, clearBtn])
    ]);
    // Фокус на заголовок шага ставит go() сразу, не дожидаясь конца входа.
    if (ui.wizardDir) wizardPage.setAttribute('data-dir', ui.wizardDir);
    ui.wizardDir = '';
    container.appendChild(wizardPage);
    updateStatus();
    refreshNav();
    // Нижняя панель «Назад | Далее» на телефоне: плавающий чат поднимается над ней.
    ui.setBodyFlag('actionbar', true);
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
  // Бюджет и срок только из ответов клиента; «пока не знаю» не показывается. Пустая строка: ответа нет.
  function shownAnswer(w, key) {
    var ids = selectedOf(w, key);
    return ids.length && ids[0] !== 'unknown' ? MF.wizardAnswerText(w, key) : '';
  }

  // Демо не трогает ответы клиента: уходим в мастер, ничего не стирая.
  function leaveDemo() {
    ui.go('start');
  }

  // demoId: пример плана на вымышленных данных (MF.demoPlan); ответы мастера клиента не читаются и не пишутся.
  function renderPlan(container, demoId) {
    var demoMode = !!demoId;
    var demoData = demoMode ? MF.demoPlan(demoId) : null;
    var w = demoMode ? demoData.wizard : ensureWizard();
    var plan = demoMode ? demoData.plan : MF.buildPlan(w, ui.state.assumptions);
    var page = el('div', { class: 'page plan' });
    container.appendChild(page);

    if (!plan.ready) {
      page.appendChild(el('div', { class: 'plan-empty' }, [
        el('h1', { class: 'page-title' }, MF.t('plan.title')),
        ui.empty({ pic: 'schema', text: MF.t('plan.empty'), actions: [el('a', { href: '#/start', class: 'btn btn-primary btn-large' }, MF.t('plan.toStart'))] })
      ]));
      return;
    }

    if (demoMode) {
      page.appendChild(el('div', { class: 'plan-demo', role: 'note' }, [
        el('p', { class: 'plan-demo-text' }, MF.t('plan.demoBanner')),
        el('button', { type: 'button', class: 'btn btn-secondary btn-small', on: { click: leaveDemo } }, MF.t('plan.demoReset'))
      ]));
    }

    var industry = byId(MF.INDUSTRIES, w.industry);
    // Слова клиента одной строкой: только из его ответов, текстом на языке интерфейса.
    var recap = MF.planRecap && !demoMode ? MF.planRecap(w) : { named: '', need: '' };
    var recapText = demoMode ? MF.t('demo.' + demoId + '.business') : recap.named && recap.need ? MF.t('plan.recap', recap) : (recap.named ? MF.t('plan.recap.named', recap) : (recap.need ? MF.t('plan.recap.need', recap) : ''));
    // Ответы клиента как показания: цель, отрасль, бюджет, срок; пустые не выводятся.
    var facts = [
      ['plan.fact.goal', MF.wizardAnswerText(w, 'goal')],
      ['plan.fact.industry', industry ? MF.t(industry.titleKey) : ''],
      ['plan.fact.budget', shownAnswer(w, 'budgetTime.budget')],
      ['plan.fact.deadline', shownAnswer(w, 'budgetTime.deadline')]
    ].filter(function (f) { return !!f[1]; });
    page.appendChild(el('header', { class: 'plan-head' }, [
      el('div', { class: 'plan-head-main' }, [
        el('p', { class: 'plan-prelim' }, MF.t('plan.preliminary')),
        el('h1', { class: 'page-title' }, MF.t(demoMode ? 'plan.demoTitle' : 'plan.title')),
        recapText ? el('p', { class: 'plan-recap' }, recapText) : null
      ]),
      facts.length ? el('dl', { class: 'plan-facts' }, facts.map(function (f) {
        return el('div', { class: 'plan-fact' }, [el('dt', null, MF.t(f[0])), el('dd', null, f[1])]);
      })) : null
    ]));
    // Блок заявки с единственной главной кнопкой стоит после плана (место занимается ниже, после оценки эффекта).
    var requestSlot = el('div', { class: 'plan-request-slot' });

    /* возможности */
    var names = [];
    // Причины, одинаковые у всех карточек, не повторяются: остаются только различающиеся.
    var sharedReasons = plan.opportunities.length > 1 ? plan.opportunities[0].reasons.filter(function (r) {
      return plan.opportunities.every(function (o) { return o.reasons.indexOf(r) >= 0; });
    }) : [];
    var opps = plan.opportunities.map(function (o, i) {
      var ownReasons = o.reasons.filter(function (r) { return sharedReasons.indexOf(r) < 0; });
      var s = byId(MF.SOLUTIONS, o.solutionId);
      if (i > 0) names.push(MF.t(s.titleKey));
      return el('li', null, el('div', { class: 'card opp-card' }, [
        el('span', { class: 'tag opp-dir dir-' + o.direction }, MF.t('dir.' + o.direction + '.title')),
        el('h3', { class: 'opp-title' }, MF.t(s.titleKey)),
        el('p', { class: 'opp-changes' }, [el('span', { class: 'opp-label' }, MF.t('plan.changes') + ': '), MF.t(s.changesKey)]),
        ownReasons.length ? el('ul', { class: 'opp-reasons small muted', 'aria-label': MF.t('plan.reasons') }, ownReasons.map(function (r) { return el('li', null, MF.t(r)); })) : null
      ]));
    });
    page.appendChild(el('section', { class: 'plan-section', 'aria-labelledby': 'pl-opps' }, [
      el('h2', { id: 'pl-opps', class: 'section-sub' }, MF.t('plan.opportunities')),
      el('ol', { class: 'opp-list plan-opps' }, opps)
    ]));

    /* схема решения: те же модули, что на главной, уменьшенно и статично; описание для чтеца перечисляет включённые модули */
    var sceneView = MF.sceneView ? MF.sceneView(w, { any: true }) : null;
    if (sceneView && sceneView.personal) {
      var sceneBox = el('div', { class: 'plan-scene-box', role: 'img', 'aria-label': MF.sceneAria(sceneView) });
      if (MF.scene && MF.scene.buildScene) MF.scene.buildScene(sceneBox, { view: sceneView, compact: true, hidden: true });
      page.appendChild(el('section', { class: 'plan-section plan-scene', 'aria-labelledby': 'pl-scene' }, [
        el('h2', { id: 'pl-scene', class: 'section-sub' }, MF.t('plan.scene.title')),
        el('p', { class: 'plan-scene-lead muted' }, MF.t('plan.scene.lead')),
        sceneBox
      ]));
    }

    /* START / GROW / SCALE */
    var anyPrice = ['start', 'grow', 'scale'].some(function (l) { return !!(plan.prices && plan.prices[l]); });
    // Подсветка уровня по бюджету клиента: только при однозначном совпадении с ценами владельца.
    var fit = MF.matchTier && !demoMode ? MF.matchTier(w) : null;
    var tierCards = ['start', 'grow', 'scale'].map(function (l, level) {
      var price = plan.prices && plan.prices[l];
      // Шкала мощности: 1, 2 или 3 сегмента из трёх; только декор, чтец экрана её не читает.
      var power = el('span', { class: 'tier-power', 'aria-hidden': 'true' }, [0, 1, 2].map(function (k) { return el('i', { class: k <= level ? 'is-on' : '' }); }));
      return el('section', { class: 'tier-card tier-' + l + (fit === l ? ' is-fit' : ''), 'aria-labelledby': 'tier-' + l }, [
        power,
        fit === l ? el('p', { class: 'tier-fit' }, MF.t('plan.tier.fit')) : null,
        ui.tierTitle(l, 'tier-' + l, 'h3'),
        el('p', { class: 'tier-lead muted' }, MF.t('tier.' + l + '.lead')),
        el('ul', { class: 'tier-items' }, plan.tiers[l].map(function (k) { return el('li', null, MF.t(k)); })),
        // Цен нет вовсе: фраза стоит один раз над уровнями, на карточках без повтора.
        anyPrice ? el('p', { class: 'tier-price' + (price ? '' : ' is-unknown') }, price || MF.t('price.unknown')) : null
      ]);
    });
    page.appendChild(el('section', { class: 'plan-section', 'aria-labelledby': 'pl-tiers' }, [
      el('h2', { id: 'pl-tiers', class: 'section-sub' }, MF.t('plan.tiers')),
      el('p', { class: 'plan-price-note muted' }, MF.t('price.later')),
      el('div', { class: 'tiers plan-tiers' }, tierCards),
      names.length ? el('p', { class: 'tier-additional muted' }, MF.t('plan.additional', { names: names.join(', ') })) : null
    ]));

    ui.renderHow(page);

    /* оценка эффекта с редактируемыми допущениями */
    var hunt = w.goal === 'opportunities';
    var volumeText = hunt ? (typeof w.answers.huntVolume === 'string' ? w.answers.huntVolume.trim() : '') : MF.wizardAnswerText(w, 'volume');
    var effLines = el('ul', { class: 'potential-lines' });
    var effectCounted = false;
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
        el('label', { 'for': 'pa-' + key, class: 'assume-label' }, [label, ' ', el('span', { class: 'tag-assume' }, MF.t('assume.tag'))]),
        el('span', { class: 'assume-field' }, [input, el('span', { class: 'assume-unit' }, unit)])
      ]);
    }
    var effectBox = null;
    // Возврат к шагу про частоту задачи: мастер открывается на нём.
    function goToVolume() {
      var list = MF.wizardSteps(ui.wizard);
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === 'volume') { saveWizard(MF.setWizardStep(ui.wizard, i)); break; }
      }
      ui.go('start');
    }
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
    if (demoMode) {
      // Демо: цифр эффекта нет вовсе, только честная строка.
      page.appendChild(el('section', { class: 'card plan-effect', 'aria-labelledby': 'pl-eff' }, [
        el('h2', { id: 'pl-eff', class: 'card-title' }, MF.t('plan.effect')),
        el('p', { class: 'muted' }, MF.t('plan.demoEffect'))
      ]));
    } else if (hunt && !volumeText) {
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
          el('p', { class: hunt ? 'pending' : 'muted' }, MF.t(hunt ? 'plan.huntVolume.unclear' : 'plan.effectUnclear')),
          huntAsk,
          hunt ? null : el('button', { type: 'button', class: 'btn btn-secondary btn-small plan-effect-fix', on: { click: goToVolume } }, MF.t('plan.effectFix'))
        ]);
      }
      page.appendChild(effectBox);
    }

    if (plan.intelligenceNotice) {
      page.appendChild(el('aside', { class: 'card plan-notice', role: 'note' }, el('p', null, MF.t('notice.intelligence'))));
    }

    // Заявка после плана: что будет дальше, главная кнопка и вторичный звонок.
    page.appendChild(requestSlot);
    // Абзац про законные источники данных показан один раз: выше, в блоке notice.intelligence.
    ui.renderSecurity(page);
    ui.renderTrust(page);
    if (ui.renderAbout) ui.renderAbout(page);

    if (demoMode) {
      page.appendChild(el('div', { class: 'plan-links' }, [
        el('a', { href: '#/start', class: 'btn btn-primary' }, MF.t('plan.demoReset')),
        el('a', { href: '#/', class: 'btn btn-secondary' }, MF.t('demo.home'))
      ]));
      return;
    }

    /* заявка: одна главная кнопка, вторичный звонок, остальное свёрнуто в «Другие действия» */
    function currentText() { return MF.planText(ui.wizard, MF.buildPlan(ui.wizard, ui.state.assumptions)); }
    var link = MF.contactLink(currentText());
    var copyStatus = el('p', { class: 'copy-status small', role: 'status', 'aria-live': 'polite' });
    var manualNote = el('p', { class: 'pending small', hidden: true }, MF.t('plan.copyManual'));
    var manual = el('textarea', { class: 'answer plan-manual', rows: '10', readonly: true, hidden: true, 'aria-label': MF.t('plan.requestText') });
    function doCopy() {
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
    }
    // История планов на устройстве: запись добавляется, когда клиент готовит заявку.
    var remembered = false;
    function remember() {
      if (remembered || !ui.saveToCabinet) return;
      remembered = !!ui.saveToCabinet(ui.wizard, MF.buildPlan(ui.wizard, ui.state.assumptions));
    }
    var offer;
    if (link.kind === 'none') {
      // Канал связи не задан: заявку можно только скопировать, рядом видна заглушка для владельца.
      offer = el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { doCopy(); remember(); } } }, MF.t('plan.copyOnly'));
    } else {
      // Ссылка открывает канал связи; для Telegram текст заявки копируется тем же нажатием (Telegram сам его не подставит).
      offer = el('a', { href: link.href, class: 'btn btn-primary', on: { click: function () {
        remember();
        if (link.kind === 'telegram') { doCopy(); if (requestHint) requestHint.hidden = false; }
      } } }, MF.t('plan.getOffer'));
    }
    var contactMissing = link.kind === 'none' ? el('p', { class: 'contact-missing', role: 'note' }, MF.t('plan.contactMissing')) : null;
    var requestHint = link.kind === 'telegram' ? el('p', { class: 'request-hint small muted', role: 'status', 'aria-live': 'polite', hidden: true }, MF.t('plan.telegramHint'))
      : (link.kind === 'mailto' ? el('p', { class: 'request-hint small muted' }, MF.t('plan.mailHint')) : null);

    var requestBox = el('section', { class: 'card plan-request', 'aria-labelledby': 'pl-req' }, [
      el('h2', { id: 'pl-req', class: 'card-title' }, MF.t('plan.requestTitle')),
      el('p', { class: 'muted' }, MF.t('plan.requestLead')),
      el('p', { class: 'plan-next muted' }, [el('strong', null, MF.t('plan.next.title') + '. '), MF.t('plan.next.text')]),
      el('p', { class: 'small muted' }, MF.t('wizard.rules')),
      el('div', { class: 'plan-actions' }, offer),
      requestHint,
      contactMissing,
      copyStatus,
      manualNote,
      manual
    ]);
    requestSlot.appendChild(requestBox);
    // Вторичное действие: «Договориться о звонке» (форма свёрнута).
    if (ui.renderCallBlock) ui.renderCallBlock(requestBox);

    // «Другие действия»: файл для разработчиков, копирование текста, коммерческое предложение, конструктор ТЗ, правка ответов. Закрыто по умолчанию.
    var moreItems = [
      el('button', { type: 'button', class: 'row-action', on: { click: function () {
        if (!ui.download) return;
        ui.download('molxo-flow-tz.zip', MF.buildZip(MF.devFiles(ui.state, ui.wizard)), 'application/zip');
      } } }, MF.t('plan.zip')),
      el('p', { class: 'small muted' }, MF.t('plan.zipNote')),
      link.kind === 'none' ? null : el('button', { type: 'button', class: 'row-action', on: { click: doCopy } }, MF.t('plan.copy')),
      el('a', { href: '#/offer', class: 'row-action' }, MF.t('plan.toOffer')),
      el('a', { href: '#/interview', class: 'row-action' }, MF.t('plan.toTz')),
      el('a', { href: '#/start', class: 'row-action' }, MF.t('plan.edit'))
    ];
    // Раскрытие без скачка: обёртка с grid-template-rows 0fr → 1fr (css .reveal-box); закрытое содержимое inert (Tab и чтец внутрь не заходят).
    var moreIn = el('div', { class: 'reveal-in plan-more-panel', inert: true }, moreItems);
    var morePanel = el('div', { id: 'plan-more', class: 'reveal-box', 'data-open': 'false' }, moreIn);
    var moreToggle = el('button', { type: 'button', class: 'btn btn-secondary plan-more-toggle', 'aria-expanded': 'false', 'aria-controls': 'plan-more', on: { click: function () {
      var open = morePanel.getAttribute('data-open') !== 'true';
      morePanel.setAttribute('data-open', open ? 'true' : 'false');
      if (open) moreIn.removeAttribute('inert'); else moreIn.setAttribute('inert', '');
      moreToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    } } }, MF.t('plan.more'));
    page.appendChild(el('section', { class: 'plan-more' }, [moreToggle, morePanel]));

    // Липкая полоса на телефоне: длинный план не прячет главную кнопку; пока блок заявки на экране, полоса скрыта. Без канала связи полосы нет.
    if (link.kind !== 'none') {
      // Скрыта, пока блок заявки на экране (и до первого ответа наблюдателя); без наблюдателя остаётся видимой. Скрытая — inert.
      var hasObserver = typeof root.IntersectionObserver === 'function';
      var cta = el('div', { class: 'plan-cta-bar', 'data-hidden': hasObserver ? 'true' : 'false', inert: hasObserver }, el('button', { type: 'button', class: 'btn btn-primary', 'aria-label': MF.t('plan.getOffer') + ': ' + MF.t('plan.requestTitle'), on: { click: function () {
        remember();
        if (requestBox.scrollIntoView) requestBox.scrollIntoView({ block: 'start' });
        offer.focus();
      } } }, MF.t('plan.getOffer')));
      // Вне .page: у страницы после анимации остаётся transform, и position: fixed считался бы от неё.
      container.appendChild(cta);
      ui.setBodyFlag('actionbar', true);
      if (hasObserver) {
        try {
          new root.IntersectionObserver(function (entries) {
            var hide = !!(entries[0] && entries[0].isIntersecting);
            cta.setAttribute('data-hidden', hide ? 'true' : 'false');
            if (hide) cta.setAttribute('inert', ''); else cta.removeAttribute('inert');
          }).observe(requestBox);
        } catch (e) { cta.setAttribute('data-hidden', 'false'); cta.removeAttribute('inert'); }
      }
    }

    // Бот и веб-чат: один блок «Задать вопрос ассистенту» с двумя ссылками.
    if (ui.renderAssistant) ui.renderAssistant(page, { code: MF.botStartCode ? MF.botStartCode(ui.wizard) : '' });

    // Обновляет оценку эффекта и ссылку заявки при правке допущений.
    function refreshAll(force) {
      var cur = MF.buildPlan(ui.wizard, ui.state.assumptions);
      if (effectBox && cur.effect) {
        ui.clear(effLines);
        var ef = cur.effect, efValues = [ef.runs, ef.hoursPerMonth, ef.savedHours, ef.savedCost, ef.costPerYear];
        MF.effectLines(ef).forEach(function (l, k) {
          // Число в строке — отдельный span: при первом показе оно «набегает» до итога (ui.countUp); правка допущений числа не анимирует.
          var num = typeof efValues[k] === 'number' && MF.formatNumberLang ? MF.formatNumberLang(efValues[k]) : '';
          var at = num ? l.indexOf(num) : -1;
          if (at < 0) { effLines.appendChild(el('li', null, l)); return; }
          var cnt = el('span', { class: 'cnt' }, num);
          effLines.appendChild(el('li', null, [l.slice(0, at), cnt, l.slice(at + num.length)]));
          if (!effectCounted && ui.countUp) ui.countUp(cnt, efValues[k], MF.formatNumberLang);
        });
        effectCounted = true;
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
  // «#/demo/<id>» всегда показывает пример на вымышленных данных; ответы мастера клиента не читаются и не перезаписываются.
  function renderDemo(container) {
    var id = hashParts()[1] || '';
    if (!byId(MF.WIZARD_DEMOS, id)) {
      var page = el('div', { class: 'page narrow demo-page' });
      container.appendChild(page);
      page.appendChild(el('h1', { class: 'page-title' }, MF.t('demo.title')));
      page.appendChild(el('p', { class: 'lead' }, MF.t('demo.notFound')));
      page.appendChild(el('a', { href: '#/', class: 'btn btn-secondary' }, MF.t('demo.home')));
      return;
    }
    renderPlan(container, id);
  }

  ui.registerView('start', renderStart);
  ui.registerView('plan', function (c) { renderPlan(c, ''); });
  ui.registerView('demo', renderDemo);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
