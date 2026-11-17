/* Molxo Flow: логика мастера и плана «Ваш план». Правила подбора, без AI и без сети. Без DOM.
   Состояние мастера отдельное от состояния конструктора (ключ MF.WIZARD_KEY). Все тексты через MF.t. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./data.js'); require('./core.js'); require('./texts.js'); require('./texts.uk.js'); require('./texts.en.js');
    require('./lang.js'); require('./config.js'); require('./catalog.js');
  }

  MF.WIZARD_KEY = 'molxo-flow-wizard-v1';
  // Значение «Пропустить»: ответ считается данным, но текста не даёт.
  MF.WIZARD_SKIP = '@skip';
  var MAX_TEXT = 2000;
  var OTHER_SUFFIX = '.other';
  var MAX_CHOICES = 20;
  // Ключ ответа «сколько предложений или обращений в месяц» для цели opportunities (не шаг мастера).
  var HUNT_VOLUME = 'huntVolume';

  /* ---------- поиск по каталогу ---------- */
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function stepDef(id) { return byId(MF.WIZARD_STEPS, id); }
  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function isWizard(w) { return !!w && typeof w === 'object' && !!w.answers && typeof w.answers === 'object'; }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  MF.emptyWizard = function () {
    return { version: 1, goal: null, industry: null, answers: {}, step: 0, done: false, demo: null, savedAt: null };
  };
  function copyWizard(w) {
    var n = {};
    Object.keys(w).forEach(function (k) { n[k] = w[k]; });
    n.answers = {};
    Object.keys(w.answers).forEach(function (k) { n.answers[k] = w.answers[k]; });
    return n;
  }

  // Ключ ответа: <шаг>, <шаг>.other, а у шага вида pair ещё <шаг>.<группа> и <шаг>.<группа>.other.
  function parseKey(key) {
    var other = key.length > OTHER_SUFFIX.length && key.slice(-OTHER_SUFFIX.length) === OTHER_SUFFIX;
    var base = other ? key.slice(0, -OTHER_SUFFIX.length) : key;
    var dot = base.indexOf('.');
    return { other: other, base: base, stepId: dot >= 0 ? base.slice(0, dot) : base, group: dot >= 0 ? base.slice(dot + 1) : null };
  }

  /* ---------- шаги и варианты ---------- */
  MF.wizardSteps = function (w) {
    var goal = isWizard(w) && w.goal ? w.goal : 'unknown';
    return MF.WIZARD_STEPS.filter(function (s) { return s.forGoals === null || s.forGoals.indexOf(goal) >= 0; });
  };
  function visibleStep(w, id) { return byId(MF.wizardSteps(w), id); }

  // Варианты шага для текущего состояния: pain зависит от цели, остальные от отрасли.
  // Пока валюта не задана, цифровые диапазоны бюджета не предлагаются: остаются «не знаю» и «Другое».
  // Валюта владельца задана, если после обрезки пробелов что-то осталось.
  function ownerCurrencySet() {
    return !!(MF.CONFIG && typeof MF.CONFIG.currency === 'string' && MF.CONFIG.currency.trim());
  }
  function priced(o) { return o.id !== 'unknown' && o.id !== 'other'; }
  function groupOptions(stepId, all) {
    var pk = parseKey(stepId);
    var pair = stepDef(pk.stepId);
    var gt = pair && pair.kind === 'pair' && pair.groups.indexOf(pk.group) >= 0 ? MF.WIZARD_OPTIONS[pk.group] : null;
    var list = gt ? (gt['default'] || []) : [];
    if (!all && pk.group === 'budget' && !ownerCurrencySet()) list = list.filter(function (o) { return !priced(o); });
    return list;
  }
  MF.wizardOptions = function (w, stepId) {
    var pk = typeof stepId === 'string' ? parseKey(stepId) : null;
    if (pk && pk.group) {
      // Группа шага pair, например budgetTime.budget: варианты лежат в MF.WIZARD_OPTIONS.<группа>.
      return groupOptions(stepId, false);
    }
    var st = stepDef(stepId);
    if (!st) return [];
    if (stepId === 'business') {
      return MF.INDUSTRIES.map(function (i) { return { id: i.id, labelKey: i.titleKey, solutions: [] }; });
    }
    if (!st.optionsKey) return [];
    if (st.optionsKey === 'pain') {
      var g = isWizard(w) && w.goal && MF.WIZARD_OPTIONS_BY_GOAL.pain[w.goal] ? w.goal : 'unknown';
      return MF.WIZARD_OPTIONS_BY_GOAL.pain[g];
    }
    var table = MF.WIZARD_OPTIONS[st.optionsKey];
    if (!table) return [];
    var ind = isWizard(w) ? w.industry : null;
    return (ind && has(table, ind)) ? table[ind] : (table['default'] || []);
  };

  /* ---------- проверка и запись ответов ---------- */
  // Приводит ответ к хранимому виду. Результат: { ok, remove, value }. ok=false: мусор.
  function normalize(w, key, value) {
    if (key === HUNT_VOLUME) {
      // Необязательное число обращений в месяц для цели «выгодные предложения»: отдельного шага в мастере нет, поле стоит в плане.
      if (w.goal !== 'opportunities' || typeof value !== 'string') return { ok: false };
      return value.trim() === '' ? { ok: true, remove: true } : { ok: true, value: value.slice(0, MAX_TEXT) };
    }
    var pk = parseKey(key);
    var isOther = pk.other;
    var st = visibleStep(w, pk.stepId);
    if (!st || st.kind === 'goal') return { ok: false };
    // Шаг pair: каждая группа отвечается как одиночный выбор со своими вариантами.
    var kind = st.kind;
    var stepId = pk.base;
    if (kind === 'pair') {
      if (!pk.group || st.groups.indexOf(pk.group) < 0) return { ok: false };
      kind = 'choice';
    } else if (pk.group) {
      return { ok: false };
    }
    if (isOther) {
      if (kind !== 'choice' && kind !== 'multi') return { ok: false };
      if (typeof value !== 'string') return { ok: false };
      return value.trim() === '' ? { ok: true, remove: true } : { ok: true, value: value.slice(0, MAX_TEXT) };
    }
    if (kind === 'text') {
      if (typeof value !== 'string') return { ok: false };
      if (value === MF.WIZARD_SKIP) return { ok: true, value: value };
      return value.trim() === '' ? { ok: true, remove: true } : { ok: true, value: value.slice(0, MAX_TEXT) };
    }
    // Для проверки берутся все варианты: ранее сохранённый цифровой ответ не теряется при пустой валюте.
    var ids = (kind === 'choice' && pk.group ? groupOptions(stepId, true) : MF.wizardOptions(w, stepId)).map(function (o) { return o.id; });
    if (kind === 'choice') {
      if (typeof value !== 'string') return { ok: false };
      if (value === '') return { ok: true, remove: true };
      if (value === MF.WIZARD_SKIP || ids.indexOf(value) >= 0) return { ok: true, value: value };
      return { ok: false };
    }
    // multi
    if (!Array.isArray(value) || value.length > MAX_CHOICES) return { ok: false };
    var out = [];
    for (var i = 0; i < value.length; i++) {
      var v = value[i];
      if (typeof v !== 'string' || (v !== MF.WIZARD_SKIP && ids.indexOf(v) < 0)) return { ok: false };
      if (out.indexOf(v) < 0) out.push(v);
    }
    if (out.length > 1 && out.indexOf(MF.WIZARD_SKIP) >= 0) out = out.filter(function (x) { return x !== MF.WIZARD_SKIP; });
    return out.length === 0 ? { ok: true, remove: true } : { ok: true, value: out };
  }

  MF.setWizardAnswer = function (w, key, value) {
    if (!isWizard(w) || typeof key !== 'string') return w;
    var r = normalize(w, key, value);
    if (!r.ok) return w;
    var n = copyWizard(w);
    if (r.remove) delete n.answers[key]; else n.answers[key] = r.value;
    return n;
  };

  MF.setWizardGoal = function (w, goalId) {
    if (!isWizard(w) || !byId(MF.GOALS, goalId)) return w;
    var n = copyWizard(w);
    n.goal = goalId;
    n.done = false;
    n.demo = null;
    if (w.goal !== goalId) {
      // Ответы чужой ветки и сложности (варианты зависят от цели) сбрасываются.
      Object.keys(n.answers).forEach(function (k) {
        var base = parseKey(k).stepId;
        if (!visibleStep(n, base) || base === 'pain') delete n.answers[k];
      });
    }
    var last = MF.wizardSteps(n).length - 1;
    if (n.step > last) n.step = last;
    return n;
  };

  MF.setWizardIndustry = function (w, industryId) {
    if (!isWizard(w)) return w;
    if (industryId !== null && !byId(MF.INDUSTRIES, industryId)) return w;
    var n = copyWizard(w);
    n.industry = industryId;
    return n;
  };

  MF.setWizardStep = function (w, index) {
    if (!isWizard(w) || !isInt(index) || index < 0 || index >= MF.wizardSteps(w).length) return w;
    var n = copyWizard(w);
    n.step = index;
    return n;
  };

  MF.completeWizard = function (w) {
    if (!isWizard(w) || !w.goal) return w;
    var n = copyWizard(w);
    n.done = true;
    n.step = MF.wizardSteps(n).length - 1;
    return n;
  };

  // Демо: текстовые ответы '@t:ключ' берутся из словаря.
  MF.loadWizardDemo = function (w, demoId) {
    var demo = byId(MF.WIZARD_DEMOS, demoId);
    if (!demo || !isWizard(w)) return w;
    var n = MF.emptyWizard();
    n.goal = demo.wizard.goal;
    n.industry = demo.wizard.industry;
    Object.keys(demo.wizard.answers).forEach(function (k) {
      var v = demo.wizard.answers[k];
      n.answers[k] = typeof v === 'string' && v.indexOf('@t:') === 0 ? MF.t(v.slice(3)) : (Array.isArray(v) ? v.slice() : v);
    });
    n.demo = demoId;
    n.done = true;
    n.step = MF.wizardSteps(n).length - 1;
    n.savedAt = w.savedAt;
    return n;
  };

  MF.wizardAnswered = function (w, stepId) {
    if (!isWizard(w)) return false;
    if (stepId === 'goal') return !!w.goal;
    var pairDef = stepDef(stepId);
    if (pairDef && pairDef.kind === 'pair') {
      // Шаг pair отвечен, когда есть любой из ответов групп или пропуск.
      return pairDef.groups.some(function (g) {
        var pv = w.answers[stepId + '.' + g];
        return typeof pv === 'string' && pv !== '';
      });
    }
    var v = w.answers[stepId];
    if (typeof v === 'string') return v.trim() !== '' || (stepId === 'business' && !!w.industry);
    if (Array.isArray(v)) return v.length > 0;
    return stepId === 'business' && !!w.industry;
  };

  /* ---------- чтение ответов ---------- */
  // Перевод на заданный язык (без языка: язык интерфейса).
  function tfor(lang) {
    return lang ? function (key, params) { return MF.tIn(lang, key, params); } : MF.t;
  }
  function textOf(w, stepId) {
    var v = w.answers[stepId];
    return typeof v === 'string' && v !== MF.WIZARD_SKIP ? v.trim() : '';
  }
  function textOfRaw(w, stepId) { return textOf(w, stepId); }
  function selectedIds(w, stepId) {
    var v = w.answers[stepId];
    var list = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
    return list.filter(function (x) { return x !== MF.WIZARD_SKIP; });
  }
  function selectedLabels(w, stepId, lang) {
    var tr = tfor(lang);
    var opts = MF.wizardOptions(w, stepId), other = textOf(w, stepId + OTHER_SUFFIX);
    return selectedIds(w, stepId).map(function (id) {
      if (id === 'other') return other || tr('opt.other');
      var o = byId(opts, id);
      // Скрытый вариант группы (цифровой бюджет без валюты) в текст не попадает.
      if (!o && parseKey(stepId).group) return '';
      return o ? tr(o.labelKey) : id;
    }).filter(function (x) { return x !== ''; });
  }
  // Ответ шага одной строкой для сводки и заявки; пустая строка: нет ответа или пропуск.
  MF.wizardAnswerText = function (w, stepId, lang) {
    var pk = typeof stepId === 'string' ? parseKey(stepId) : null;
    if (pk && pk.group && isWizard(w)) {
      var holder = stepDef(pk.stepId);
      return holder && holder.kind === 'pair' && holder.groups.indexOf(pk.group) >= 0 ? selectedLabels(w, stepId, lang).join(', ') : '';
    }
    var st = stepDef(stepId);
    if (!isWizard(w) || !st) return '';
    if (st.kind === 'pair') {
      // «бюджет; срок»: только отвеченные группы по порядку.
      return st.groups.map(function (g) { return selectedLabels(w, stepId + '.' + g, lang).join(', '); })
        .filter(function (x) { return x; }).join('; ');
    }
    if (st.kind === 'goal') {
      var g = byId(MF.GOALS, w.goal);
      return g ? tfor(lang)(g.titleKey) : '';
    }
    if (st.kind === 'text') return textOf(w, stepId);
    return selectedLabels(w, stepId, lang).join(', ');
  };

  // Число для показа клиенту: на английском тысячи через запятую, на ru и uk неразрывный пробел (как MF.formatNumber).
  // Русский конструктор ТЗ остаётся на MF.formatNumber: язык интерфейса на него не влияет.
  MF.formatNumberLang = function (n) {
    var s = MF.formatNumber(n);
    return MF.LANG === 'en' ? s.replace(/\u00a0/g, ',') : s;
  };

  // Слова клиента для начала плана: { named, need } только из его ответов (сложности, инструменты, результат или то, что искать).
  // Строки обрезаются; пустые поля остаются ''. Показывать только через textContent.
  var RECAP_MAX = 240;
  function recapPart(s) {
    var t = String(s || '').replace(/\s+/g, ' ').trim().replace(/[\s.;,!?\u2026]+$/, '');
    return t.length > RECAP_MAX ? t.slice(0, RECAP_MAX - 1).replace(/\s+$/, '') + '\u2026' : t;
  }
  MF.planRecap = function (w) {
    var out = { named: '', need: '' };
    if (!isWizard(w) || !w.goal) return out;
    var hunt = w.goal === 'opportunities';
    var named = [];
    (hunt ? ['find'] : ['pain', 'tools']).forEach(function (id) {
      var sel = selectedIds(w, id);
      if (id === 'tools' && sel.length === 1 && sel[0] === 'none') return;
      var t = recapPart(MF.wizardAnswerText(w, id));
      if (t) named.push(t);
    });
    out.named = named.join(', ');
    if (!hunt) out.need = recapPart(MF.wizardAnswerText(w, 'result'));
    return out;
  };

  // Блок «Кто за этим стоит» из MF.CONFIG.about: null, пока текст пуст; текст до 600 знаков, заголовок до 120.
  MF.aboutSlot = function () {
    var a = MF.CONFIG && MF.CONFIG.about;
    if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
    var text = typeof a.text === 'string' ? a.text.trim().slice(0, 600) : '';
    if (!text) return null;
    var title = typeof a.title === 'string' ? a.title.trim().slice(0, 120) : '';
    return { title: title, text: text };
  };

  /* ---------- подбор возможностей (правила, не AI) ---------- */
  // Буквы слова: латиница, цифры, русские и украинские (іїєґ).
  var LETTER = /[a-z0-9\u0430-\u044f\u0451\u0456\u0457\u0454\u0491]/;
  // Основа слова ищется только с начала слова: «бот» не находится в «работа».
  MF.hasStem = hasStem;
  function hasStem(text, stem) {
    var i = text.indexOf(stem);
    while (i >= 0) {
      if (i === 0 || !LETTER.test(text.charAt(i - 1))) return true;
      i = text.indexOf(stem, i + 1);
    }
    return false;
  }
  function freeText(w) {
    var parts = [];
    MF.WIZARD_STEPS.forEach(function (st) {
      if (st.kind === 'text' && st.id !== 'volume') parts.push(textOf(w, st.id));
      if (st.kind === 'choice' || st.kind === 'multi') parts.push(textOf(w, st.id + OTHER_SUFFIX));
      // Бюджет и срок (шаг pair) в подбор решений слов не дают.
    });
    return parts.join(' \n ').toLowerCase();
  }
  // Решения, на которые указывают отмеченные сложности и подсказки в тексте шага find.
  function signalSet(w) {
    var set = {};
    function add(o) { o.solutions.forEach(function (id) { set[id] = true; }); }
    MF.WIZARD_STEPS.forEach(function (st) {
      if (st.kind === 'choice' || st.kind === 'multi') {
        var opts = MF.wizardOptions(w, st.id), sel = selectedIds(w, st.id);
        opts.forEach(function (o) { if (sel.indexOf(o.id) >= 0) add(o); });
      }
    });
    var find = textOf(w, 'find').toLowerCase();
    if (find) {
      MF.wizardOptions(w, 'find').forEach(function (o) {
        if (find.indexOf(MF.t(o.labelKey).toLowerCase()) >= 0) add(o);
      });
    }
    return set;
  }

  // Очки каждого решения: цель +3, отрасль +1, сигнал +2, слова +1 за основу (не более 3). Порядок: очки, затем каталог.
  MF.scoreSolutions = function (w) {
    var rows = [];
    var text = isWizard(w) ? freeText(w) : '';
    var signals = isWizard(w) ? signalSet(w) : {};
    MF.SOLUTIONS.forEach(function (s, index) {
      var score = 0, reasons = [];
      if (isWizard(w) && w.goal && s.goals.indexOf(w.goal) >= 0) { score += 3; reasons.push('reason.goal'); }
      if (isWizard(w) && w.industry && s.industries.indexOf(w.industry) >= 0) { score += 1; reasons.push('reason.industry'); }
      if (signals[s.id]) { score += 2; reasons.push('reason.signal'); }
      var words = 0;
      s.keywords.forEach(function (stem) { if (text && hasStem(text, stem)) words++; });
      if (words > 0) { score += Math.min(3, words); reasons.push('reason.words'); }
      rows.push({ solutionId: s.id, direction: s.direction, score: score, reasons: reasons, index: index });
    });
    rows.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    return rows.map(function (r) { return { solutionId: r.solutionId, direction: r.direction, score: r.score, reasons: r.reasons }; });
  };

  function formatPrices() {
    var p = (MF.CONFIG && MF.CONFIG.prices) || {};
    return { start: MF.formatPrice(p.start), grow: MF.formatPrice(p.grow), scale: MF.formatPrice(p.scale) };
  }
  // Цена «от X валюта» (на языке интерфейса); null, пока цена не положительное число или валюта владельца не задана.
  MF.formatPrice = function (value) {
    if (typeof value !== 'number' || !isFinite(value) || value <= 0) return null;
    var currency = MF.CONFIG && typeof MF.CONFIG.currency === 'string' ? MF.CONFIG.currency.trim() : '';
    if (!currency) return null;
    return MF.t('price.from', { value: MF.formatNumberLang(value), currency: currency });
  };

  // Код контекста для start= (допустимые символы Telegram, до 64 знаков).
  var START_CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;

  // Ссылка на Telegram-бота из MF.CONFIG.bot вида «tg:имя» (имя 3-64 знака, допускается @); иначе { ok: false, href: '' }.
  // Необязательный code (из MF.botStartCode) дописывается как &start=<код>; недопустимый код молча отбрасывается.
  MF.botLink = function (code) {
    var b = MF.CONFIG && typeof MF.CONFIG.bot === 'string' ? MF.CONFIG.bot.trim() : '';
    var none = { ok: false, href: '' };
    if (!/^tg:/i.test(b)) return none;
    var name = b.slice(3).replace(/^@/, '');
    if (!/^[A-Za-z0-9_]{3,64}$/.test(name)) return none;
    var href = 'tg://resolve?domain=' + name;
    if (typeof code === 'string' && START_CODE_RE.test(code)) href += '&start=' + code;
    return { ok: true, href: href };
  };

  // Код плана для бота: g<цель>-i<отрасль>-s<первая возможность>; только идентификаторы справочников, без текста посетителя.
  // Пустой мастер или цель вне справочника дают ''; неизвестная отрасль заменяется на other.
  MF.botStartCode = function (w) {
    if (!isWizard(w) || !w.goal) return '';
    var goal = byId(MF.GOALS, w.goal);
    if (!goal) return '';
    var plan;
    try { plan = MF.buildPlan(w); } catch (e) { return ''; }
    if (!plan.ready || !plan.opportunities.length) return '';
    var industry = byId(MF.INDUSTRIES, w.industry);
    var code = 'g' + goal.id + '-i' + (industry ? industry.id : 'other') + '-s' + plan.opportunities[0].solutionId;
    return START_CODE_RE.test(code) ? code : '';
  };

  // Хост из настроек владельца: буквы, цифры, точки и дефисы, внутри есть точка; иначе ''.
  function cleanHost(value) {
    var h = typeof value === 'string' ? value.trim() : '';
    if (h.length > 253 || !/^[a-z0-9.-]+$/i.test(h) || h.indexOf('.') < 1) return '';
    if (/\.\.|^[.-]|[.-]$/.test(h)) return '';
    return h;
  }
  // Ссылка без схемы: схему наследует страница.
  var NOSCHEME = '/' + '/';
  // Ссылка на веб-чат из MF.CONFIG.agentUrl (хост без схемы); иначе { ok: false, href: '' }.
  MF.agentLink = function () {
    var host = cleanHost(MF.CONFIG && MF.CONFIG.agentUrl);
    return host ? { ok: true, href: NOSCHEME + host + '/' } : { ok: false, href: '' };
  };
  // Ссылка на статус заявки по коду: MF.CONFIG.statusUrl + /status?code=<код>; без хоста или кода { ok: false, href: '' }.
  MF.statusLink = function (code) {
    var host = cleanHost(MF.CONFIG && MF.CONFIG.statusUrl);
    var c = typeof code === 'string' ? code.trim() : '';
    if (!host || !c || c.length > 200) return { ok: false, href: '' };
    return { ok: true, href: NOSCHEME + host + '/status?code=' + encodeURIComponent(c) };
  };

  // Слоты доверия владельца: только валидные элементы { title, text } из непустых строк, не больше 6 в списке.
  var TRUST_MAX = 6;
  function trustList(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length && out.length < TRUST_MAX; i++) {
      var it = list[i];
      if (!it || typeof it !== 'object' || Array.isArray(it)) continue;
      if (typeof it.title !== 'string' || typeof it.text !== 'string') continue;
      var title = it.title.trim(), text = it.text.trim();
      if (title && text) out.push({ title: title, text: text });
    }
    return out;
  }
  MF.trustSlots = function () {
    var c = MF.CONFIG || {};
    return { cases: trustList(c.cases), reviews: trustList(c.reviews), guarantees: trustList(c.guarantees) };
  };

  MF.buildPlan = function (w, assumptions) {
    var plan = { ready: false, direction: null, opportunities: [], tiers: { start: [], grow: [], scale: [] }, effect: null, intelligenceNotice: false, prices: formatPrices() };
    if (!isWizard(w) || !w.goal) return plan;
    var rows = MF.scoreSolutions(w).filter(function (r) { return r.score > 0; });
    var picked = rows.slice(0, 2);
    if (rows.length > 2 && rows[2].score >= 3) picked.push(rows[2]);
    // Добор по цели: возможностей не меньше двух.
    MF.SOLUTIONS.forEach(function (s) {
      if (picked.length < 2 && s.goals.indexOf(w.goal) >= 0 && !picked.some(function (r) { return r.solutionId === s.id; })) {
        picked.push({ solutionId: s.id, direction: s.direction, score: 3, reasons: ['reason.goal'] });
      }
    });
    plan.ready = true;
    plan.opportunities = picked;
    plan.direction = picked[0].direction;
    var first = byId(MF.SOLUTIONS, picked[0].solutionId);
    ['start', 'grow', 'scale'].forEach(function (l) { plan.tiers[l] = first.tiers[l].slice(); });
    plan.intelligenceNotice = picked.some(function (r) { return r.direction === 'intelligence'; });
    var volume = textOf(w, w.goal === 'opportunities' ? HUNT_VOLUME : 'volume');
    if (volume) {
      var p = MF.potential({ answers: { q05: volume }, assumptions: assumptions || MF.DEFAULT_ASSUMPTIONS });
      plan.effect = p.ready ? p : null;
    }
    return plan;
  };

  /* ---------- схема по ответам: какие модули схемы соответствуют плану ---------- */
  // Явная таблица: решение из MF.SOLUTIONS -> модули схемы из MF.MODULES (input, analysis, decision, execution, check, result).
  // Правило: input, если решение принимает данные или сообщения; analysis, если разбирает смысл; decision, если выбирает действие;
  // execution, если вызывает сервисы и выполняет шаги; check, если последнее слово за человеком; result, если отдаёт итог людям.
  // Модулей у решения два или три, поэтому у разных целей подсвечены разные наборы.
  MF.SCENE_MAP = {
    'process-automation': ['decision', 'execution'],
    'service-integration': ['input', 'execution'],
    'ai-agent': ['analysis', 'decision'],
    'chatbot': ['input', 'execution'],
    'parser-scraper': ['input', 'analysis'],
    'monitoring-alerts': ['analysis', 'result'],
    'website': ['input', 'result'],
    'portal-cabinet': ['input', 'check', 'result'],
    'crm': ['input', 'decision', 'result'],
    'internal-system': ['decision', 'check'],
    'analytics-reports': ['analysis', 'result'],
    'custom-software': ['decision', 'execution', 'check']
  };
  // Схема по ответам клиента: { personal, modules, solutions }. personal только при выбранной цели и законченном мастере
  // (opts.any: достаточно выбранной цели, это план). modules идут в порядке MF.MODULES. Текста клиента здесь нет, только идентификаторы.
  MF.sceneView = function (w, opts) {
    var out = { personal: false, modules: [], solutions: [] };
    if (!isWizard(w) || !w.goal || !byId(MF.GOALS, w.goal)) return out;
    if (!(opts && opts.any) && w.done !== true) return out;
    var plan;
    try { plan = MF.buildPlan(w); } catch (e) { return out; }
    if (!plan.ready) return out;
    var on = {};
    plan.opportunities.forEach(function (o) {
      out.solutions.push(o.solutionId);
      (MF.SCENE_MAP[o.solutionId] || []).forEach(function (m) { on[m] = true; });
    });
    out.modules = (MF.MODULES || []).map(function (m) { return m.id; }).filter(function (id) { return on[id]; });
    out.personal = out.modules.length > 0;
    return out;
  };
  // Текстовое описание схемы для чтеца экрана: перечень включённых модулей на языке интерфейса.
  MF.sceneAria = function (view) {
    var names = (view && view.modules || []).map(function (id) { return MF.t('mod.' + id + '.title'); });
    return MF.t(view && view.personal ? 'scene.ariaPersonal' : 'scene.aria', { modules: names.join(', ') });
  };

  // Демо-план для главной («живые экраны»): одно фиксированное вымышленное состояние мастера (демо «shop»), план, схема и список документов.
  // Ничего не сохраняется; цена и эффект берутся из buildPlan как есть (без валюты цены нет), своих цифр здесь нет.
  MF.DEMO_PLAN_ID = 'shop';
  MF.demoPlan = function () {
    var demo = byId(MF.WIZARD_DEMOS, MF.DEMO_PLAN_ID);
    var w = MF.loadWizardDemo(MF.emptyWizard(), MF.DEMO_PLAN_ID);
    var plan = MF.buildPlan(w);
    return { id: MF.DEMO_PLAN_ID, titleKey: demo.titleKey, wizard: w, plan: plan, view: MF.sceneView(w), docs: (MF.DOC_DEFS || []).map(function (d) { return { id: d.id, file: d.file, title: d.title }; }) };
  };

  // Уровень (start, grow, scale), подходящий под бюджет клиента, или null. Подсветка только при однозначном совпадении:
  // заданы цены владельца, бюджет выбран из диапазонов и ровно одна цена уровня попадает в выбранный диапазон.
  var BUDGET_RANGES = { lt1k: [0, 1000], '1k-5k': [1000, 5000], '5k-15k': [5000, 15000], gt15k: [15000, Infinity] };
  MF.matchTier = function (w) {
    if (!isWizard(w)) return null;
    var picked = selectedIds(w, 'budgetTime.budget');
    if (picked.length !== 1 || !Object.prototype.hasOwnProperty.call(BUDGET_RANGES, picked[0])) return null;
    var range = BUDGET_RANGES[picked[0]];
    var prices = (MF.CONFIG && MF.CONFIG.prices) || {};
    var currency = MF.CONFIG && typeof MF.CONFIG.currency === 'string' ? MF.CONFIG.currency.trim() : '';
    if (!currency) return null;
    var hits = ['start', 'grow', 'scale'].filter(function (l) {
      var p = prices[l];
      return typeof p === 'number' && isFinite(p) && p > 0 && p >= range[0] && p < range[1];
    });
    return hits.length === 1 ? hits[0] : null;
  };

  /* ---------- текст заявки и ссылка для связи ---------- */
  function titleOf(solutionId, lang) { return tfor(lang)(byId(MF.SOLUTIONS, solutionId).titleKey); }

  // Строки блока эффекта из чисел потенциала на языке интерфейса; пусто, пока оценки нет.
  MF.effectLines = function (effect) {
    if (!effect || !effect.ready) return [];
    var f = MF.formatNumberLang;
    return [
      MF.t('plan.effect.runs', { value: f(effect.runs) }),
      MF.t('plan.effect.hours', { value: f(effect.hoursPerMonth) }),
      MF.t('plan.effect.saved', { value: f(effect.savedHours) }),
      MF.t('plan.effect.cost', { value: f(effect.savedCost) }),
      MF.t('plan.effect.year', { value: f(effect.costPerYear) })
    ];
  };

  // Подпись единицы стоимости часа: на uk/en без валюты владельца остаётся только «в час» (без денежной единицы).
  MF.rateUnit = function () {
    var u = MF.t('assume.unit.rub');
    return u.charAt(0) === '/' ? MF.t('assume.unit.hour') : u;
  };

  MF.planText = function (w, plan) {
    var pl = plan || MF.buildPlan(w);
    var lines = [MF.t('req.title'), MF.t('req.prelim')];
    if (!pl.ready) {
      lines.push('', MF.t('req.notReady'), '', MF.t('req.footer'));
      return lines.join('\n');
    }
    var industry = byId(MF.INDUSTRIES, w.industry);
    lines.push('', MF.t('req.goal', { name: MF.wizardAnswerText(w, 'goal') }));
    if (industry) lines.push(MF.t('req.industry', { name: MF.t(industry.titleKey) }));
    var business = textOf(w, 'business');
    if (business) lines.push(MF.t('req.business', { text: business.replace(/\s*\n\s*/g, ' ') }));
    lines.push(MF.t('req.lang', { name: MF.langName(MF.LANG) }));
    var budget = MF.wizardAnswerText(w, 'budgetTime.budget'), deadline = MF.wizardAnswerText(w, 'budgetTime.deadline');
    if (budget) lines.push(MF.t('req.budget', { value: budget }));
    if (deadline) lines.push(MF.t('req.deadline', { value: deadline }));
    lines.push('', MF.t('req.opps'));
    pl.opportunities.forEach(function (o, i) {
      var s = byId(MF.SOLUTIONS, o.solutionId);
      lines.push(MF.t('req.opp', { index: i + 1, name: MF.t(s.titleKey), direction: MF.t('dir.' + o.direction + '.title'), changes: MF.t(s.changesKey) }));
    });
    lines.push('', MF.t('req.additional'));
    ['start', 'grow', 'scale'].forEach(function (l) {
      lines.push(MF.t('req.tier', { level: MF.t('tier.' + l + '.title'), items: pl.tiers[l].map(function (k) { return MF.t(k); }).join('; ') }));
    });
    if (pl.effect) {
      lines.push('', MF.t('req.effect'));
      MF.effectLines(pl.effect).forEach(function (x) { lines.push('- ' + x); });
    }
    if (pl.intelligenceNotice) lines.push('', MF.t('notice.intelligence'));
    var pr = pl.prices || {};
    var shown = ['start', 'grow', 'scale'].filter(function (l) { return pr[l]; });
    lines.push('');
    if (shown.length === 0) lines.push(MF.t('price.unknown') + '.');
    else shown.forEach(function (l) { lines.push(MF.t('req.priceLevel', { level: MF.t('tier.' + l + '.title'), value: pr[l] })); });
    lines.push('', MF.t('req.footer'));
    return lines.join('\n');
  };

  // Текст заявки на звонок на языке интерфейса: удобное время, часовой пояс, тема; лишнее обрезается, пустое пропускается.
  function oneLine(v, max) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }
  MF.callText = function (opts) {
    var o = opts && typeof opts === 'object' ? opts : {};
    var windows = Array.isArray(o.windows) ? o.windows.map(function (x) { return oneLine(x, 80); }).filter(function (x) { return x; }).slice(0, 7) : [];
    var tz = oneLine(o.tz, 64), topic = oneLine(o.topic, 300);
    var lines = [MF.t('call.title'), ''];
    lines.push(windows.length ? MF.t('call.windows', { value: windows.join('; ') }) : MF.t('call.noWindows'));
    if (tz) lines.push(MF.t('call.tz', { value: tz }));
    if (topic) lines.push(MF.t('call.topic', { value: topic }));
    lines.push('', MF.t('call.footer'));
    return lines.join('\n');
  };

  // Канал заявки из MF.CONFIG.contact: адрес с @ даёт письмо, «tg:имя» даёт ссылку на Telegram, иначе none.
  MF.contactLink = function (text) {
    var c = MF.CONFIG && typeof MF.CONFIG.contact === 'string' ? MF.CONFIG.contact.trim() : '';
    var none = { kind: 'none', href: '' };
    if (!c) return none;
    if (/^tg:/i.test(c)) {
      var name = c.slice(3).replace(/^@/, '');
      return /^[A-Za-z0-9_]{3,64}$/.test(name) ? { kind: 'telegram', href: 'tg://resolve?domain=' + name } : none;
    }
    if (/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(c)) {
      var head = 'mailto:' + c + '?subject=' + encodeURIComponent(MF.t('contact.subject')) + '&body=';
      var whole = encodeURIComponent(String(text || ''));
      var max = 1900;
      if (head.length + whole.length <= max) return { kind: 'mailto', href: head + whole };
      // Длина итоговой ссылки ограничена: режем закодированное тело по границе символа.
      var mark = encodeURIComponent('\n\n' + MF.t('plan.mailTruncated'));
      var room = max - head.length - mark.length;
      var src = String(text || '');
      var out = '';
      var i = 0;
      while (i < src.length) {
        var code = src.charCodeAt(i);
        var step = code >= 0xD800 && code <= 0xDBFF && i + 1 < src.length ? 2 : 1;
        var part;
        try { part = encodeURIComponent(src.substr(i, step)); } catch (e) { part = ''; }
        if (out.length + part.length > room) break;
        out += part;
        i += step;
      }
      return { kind: 'mailto', href: head + out + mark };
    }
    return none;
  };

  /* ---------- перенос в конструктор ---------- */
  // Предзаполнение русского конструктора q01, q02, q03, q05: только непустые строки, служебные слова и подписи всегда по-русски.
  MF.wizardToAnswers = function (w) {
    var out = {};
    if (!isWizard(w) || !w.goal) return out;
    var plan = MF.buildPlan(w);
    // Чип-подсказки вставляются в текст на языке интерфейса: подписи известных подсказок возвращаем на русский.
    var textOf = function (wz, id) {
      var text = textOfRaw(wz, id);
      if (!text) return text;
      var opts = [];
      try { opts = MF.wizardOptions(wz, id) || []; } catch (e) { opts = []; }
      opts.forEach(function (o) {
        var ru = MF.tIn('ru', o.labelKey);
        ['uk', 'en'].forEach(function (lg) {
          var s = MF.tIn(lg, o.labelKey);
          if (s && s !== ru) text = text.split(s).join(ru);
        });
      });
      return text;
    };
    if (plan.ready) out.q01 = titleOf(plan.opportunities[0].solutionId, 'ru');
    var ctx = [];
    var business = textOf(w, 'business');
    if (business) ctx.push(business.replace(/\s*\n\s*/g, ' '));
    var industry = byId(MF.INDUSTRIES, w.industry);
    if (industry) ctx.push(MF.tIn('ru', 'answers.industry', { name: MF.tIn('ru', industry.titleKey) }));
    var team = MF.wizardAnswerText(w, 'team', 'ru');
    if (team) ctx.push(MF.tIn('ru', 'answers.team', { name: team }));
    var tools = MF.wizardAnswerText(w, 'tools', 'ru');
    if (tools) ctx.push(MF.tIn('ru', 'answers.tools', { names: tools }));
    var pain = MF.wizardAnswerText(w, 'pain', 'ru');
    if (pain) ctx.push(MF.tIn('ru', 'answers.pain', { names: pain }));
    var budget = MF.wizardAnswerText(w, 'budgetTime.budget', 'ru'), deadline = MF.wizardAnswerText(w, 'budgetTime.deadline', 'ru');
    if (budget && deadline) ctx.push(MF.tIn('ru', 'answers.budgetTime', { budget: budget, deadline: deadline }));
    else if (budget) ctx.push(MF.tIn('ru', 'answers.budget', { budget: budget }));
    else if (deadline) ctx.push(MF.tIn('ru', 'answers.deadline', { deadline: deadline }));
    if (ctx.length) out.q02 = ctx.join(' ');
    var result = w.goal === 'opportunities'
      ? [textOf(w, 'find'), textOf(w, 'criteria')].filter(function (x) { return x; }).join('; ')
      : textOf(w, 'result');
    if (result) out.q03 = result;
    var volume = textOf(w, w.goal === 'opportunities' ? HUNT_VOLUME : 'volume');
    if (volume) out.q05 = volume;
    return out;
  };

  /* ---------- сохранение ---------- */
  MF.serializeWizard = function (w) { return JSON.stringify(w); };

  MF.deserializeWizard = function (text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return MF.emptyWizard(); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return MF.emptyWizard();
    var w = MF.emptyWizard();
    if (byId(MF.GOALS, data.goal)) w.goal = data.goal;
    if (byId(MF.INDUSTRIES, data.industry)) w.industry = data.industry;
    var src = data.answers && typeof data.answers === 'object' && !Array.isArray(data.answers) ? data.answers : {};
    Object.keys(src).forEach(function (k) {
      var r = normalize(w, k, src[k]);
      if (r.ok && !r.remove) w.answers[k] = r.value;
    });
    if (isInt(data.step) && data.step >= 0 && data.step < MF.wizardSteps(w).length) w.step = data.step;
    w.done = data.done === true && !!w.goal;
    if (byId(MF.WIZARD_DEMOS, data.demo)) w.demo = data.demo;
    if (typeof data.savedAt === 'number' && isFinite(data.savedAt)) w.savedAt = data.savedAt;
    return w;
  };

  MF.createWizardStore = function (storageLike) {
    var available = false;
    try {
      if (storageLike) {
        storageLike.setItem(MF.WIZARD_KEY + ':probe', '1');
        storageLike.removeItem(MF.WIZARD_KEY + ':probe');
        available = true;
      }
    } catch (e) { available = false; }
    return {
      available: available,
      load: function () {
        try {
          var raw = storageLike.getItem(MF.WIZARD_KEY);
          return raw === null || raw === undefined ? MF.emptyWizard() : MF.deserializeWizard(raw);
        } catch (e) { return MF.emptyWizard(); }
      },
      save: function (w) {
        if (!available) return false;
        try { storageLike.setItem(MF.WIZARD_KEY, MF.serializeWizard(w)); return true; } catch (e) { return false; }
      },
      clear: function () {
        if (!available) return false;
        try { storageLike.removeItem(MF.WIZARD_KEY); return true; } catch (e) { return false; }
      }
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
