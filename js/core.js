/* Molxo Flow: ядро логики — состояние, готовность, потенциал, схема, хранилище. Без DOM. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') require('./data.js');

  var NBSP = ' ';
  var PENDING = 'Нужно уточнить';
  MF.STORAGE_KEY = 'molxo-flow-v1';

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function str(x) { return typeof x === 'string' ? x : ''; }
  function copyAssumptions(a) {
    return { minutesPerRun: a.minutesPerRun, automationShare: a.automationShare, hourlyRate: a.hourlyRate };
  }
  function questionIds() { return MF.QUESTIONS.map(function (q) { return q.id; }); }

  // Целое число с неразрывными пробелами между тысячами.
  MF.formatNumber = function (n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  };

  MF.emptyState = function () {
    return { version: 1, answers: {}, current: 1, assumptions: copyAssumptions(MF.DEFAULT_ASSUMPTIONS), demo: false, savedAt: null };
  };

  MF.isFilled = function (text) { return typeof text === 'string' && text.trim().length > 0; };

  MF.filledCount = function (answers) {
    var a = answers || {};
    return questionIds().filter(function (id) { return MF.isFilled(a[id]); }).length;
  };

  MF.readiness = function (answers) {
    var filled = MF.filledCount(answers), total = MF.QUESTIONS.length;
    return {
      filled: filled,
      total: total,
      percent: Math.round(filled / total * 100),
      label: filled + ' из ' + total + ' разделов заполнено · черновик сохраняется'
    };
  };

  MF.coreCount = function (answers) {
    var a = answers || {};
    var core = MF.QUESTIONS.filter(function (q) { return q.core; });
    var ready = core.filter(function (q) { return MF.isFilled(a[q.id]); }).length;
    return { ready: ready, total: core.length, label: ready + ' из ' + core.length + ' готовы' };
  };

  var MONTH_RE = /(?:в|за|\/)\s*(?:мес|месяц)|ежемесячн/i;
  var OTHER_RE = /(?:в|за|\/)\s*(?:день|сутки|недел|год|квартал)|ежедневн|еженедельн|ежегодн|ежеквартальн/i;
  var NUM_RE = /(\d{1,3}(?:[    .]\d{3})+(?!\d)|\d+(?:[.,]\d+)?)(?:[    ]*(к|тыс[а-яё.]*)(?![а-яё]))?/gi;

  // Разбор q05: {value, reason}. reason: 'none' (чисел нет) | 'unit' (не в месяц) | 'many' (несколько чисел).
  function analyzeRuns(text) {
    if (!MF.isFilled(text)) return { value: null, reason: 'none' };
    var tokens = [], m;
    NUM_RE.lastIndex = 0;
    while ((m = NUM_RE.exec(text)) !== null) {
      var value = parseFloat(m[1].replace(/[    .]/g, function (c) {
        return c === '.' && !/^\d{1,3}(?:\.\d{3})+$/.test(m[1]) ? '.' : '';
      }).replace(',', '.'));
      if (!isFinite(value)) continue;
      if (m[2]) value *= 1000;
      tokens.push({ value: Math.round(value), end: m.index + m[0].length });
    }
    if (!tokens.length) return { value: null, reason: 'none' };
    tokens.forEach(function (t, i) {
      var next = i + 1 < tokens.length ? text.slice(t.end).search(/\d/) : -1;
      var seg = next >= 0 ? text.slice(t.end, t.end + next) : text.slice(t.end);
      t.unit = MONTH_RE.test(seg) ? 'month' : (OTHER_RE.test(seg) ? 'other' : 'none');
    });
    var months = tokens.filter(function (t) { return t.unit === 'month'; });
    if (months.length === 1) return { value: months[0].value, reason: 'ok' };
    if (months.length > 1) return { value: null, reason: 'many' };
    if (tokens.some(function (t) { return t.unit === 'other'; })) return { value: null, reason: 'unit' };
    if (tokens.length === 1) return { value: tokens[0].value, reason: 'ok' };
    return { value: null, reason: 'many' };
  }

  // Число запусков в месяц из текста q05 («около 1 200 в месяц» → 1200; «2 тыс», «1,5к» → ×1000;
  // «1.200» — точка как разделитель тысяч). null — если числа нет, единица не «в месяц» или чисел несколько без явного «в месяц».
  MF.parseRuns = function (text) { return analyzeRuns(text).value; };

  function cleanAssumptions(raw) {
    var d = MF.DEFAULT_ASSUMPTIONS, r = raw && typeof raw === 'object' ? raw : {};
    return {
      minutesPerRun: isNum(r.minutesPerRun) && r.minutesPerRun > 0 && r.minutesPerRun <= 1440 ? r.minutesPerRun : d.minutesPerRun,
      automationShare: isNum(r.automationShare) && r.automationShare > 0 && r.automationShare <= 1 ? r.automationShare : d.automationShare,
      hourlyRate: isNum(r.hourlyRate) && r.hourlyRate >= 0 && r.hourlyRate <= 1e7 ? r.hourlyRate : d.hourlyRate
    };
  }

  MF.potential = function (state) {
    var s = state || {};
    var a = cleanAssumptions(s.assumptions);
    var an = analyzeRuns((s.answers || {}).q05), runs = an.value;
    if (runs === null || runs <= 0) {
      var why = an.reason === 'unit' ? ' (сейчас указано не в месяц — пересчитайте сами)'
        : an.reason === 'many' ? ' (в ответе несколько чисел — оставьте то, что в месяц)' : '';
      return { ready: false, runs: null, hoursPerMonth: 0, savedHours: 0, savedCost: 0, costPerYear: 0, lines: [],
        note: PENDING + ': укажите число запусков в месяц' + why };
    }
    var hours = runs * a.minutesPerRun / 60;
    var savedHours = hours * a.automationShare;
    var savedCost = savedHours * a.hourlyRate;
    var f = MF.formatNumber;
    var r = {
      ready: true,
      runs: runs,
      hoursPerMonth: Math.round(hours),
      savedHours: Math.round(savedHours),
      savedCost: Math.round(savedCost),
      costPerYear: Math.round(savedCost * 12)
    };
    r.lines = [
      'Запусков в месяц: ' + f(runs),
      'Время на запуски сейчас: ' + f(r.hoursPerMonth) + ' ч в месяц',
      'Можно сэкономить: ' + f(r.savedHours) + ' ч в месяц',
      'Экономия: ' + f(r.savedCost) + ' ₽ в месяц',
      'За год: ' + f(r.costPerYear) + ' ₽'
    ];
    r.note = 'Допущения: ' + f(a.minutesPerRun) + ' мин на запуск, ' + Math.round(a.automationShare * 100) +
      '% работы берёт автоматизация, ' + f(a.hourlyRate) + ' ₽ за час. Это допущения, а не факты о вашем бизнесе — измените их под себя.';
    return r;
  };

  // Шаги схемы из ответа на вопрос 4.
  // opts.full=true — все шаги и полный текст (для документов); по умолчанию лимит схемы в UI: 8 шагов, ≤ 80 символов.
  MF.schemeSteps = function (answers, opts) {
    var full = !!(opts && opts.full);
    var text = (answers || {}).q04;
    if (!MF.isFilled(text)) return [];
    var s = text
      .replace(/&(?:#\d+|#[xX][0-9a-fA-F]+|(?:amp|lt|gt|quot|apos|nbsp|laquo|raquo|copy|reg|mdash|ndash|hellip|euro|trade));|->|→|;/g, function (m) { return m.charAt(0) === '&' ? m : '\n'; })
      .replace(/,?\s*(?:а\s+)?(?:затем|потом|после этого)\s+/gi, '\n')
      .replace(/(^|\s)\d{1,2}[.)]\s+/g, '\n');
    var steps = [];
    s.split(/\r?\n/).forEach(function (line) {
      var t = line.replace(/^[\s\-–—•*]+/, '').replace(/[\s.,]+$/, '');
      if (!t) return;
      t = t.charAt(0).toUpperCase() + t.slice(1);
      if (!full && t.length > 80) t = t.slice(0, 79) + '…';
      if (full || steps.length < 8) steps.push({ n: steps.length + 1, text: t });
    });
    return steps;
  };

  MF.listFrom = function (text) {
    if (typeof text !== 'string') return [];
    return text.split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 0; });
  };

  MF.sidebarSummary = function (state) {
    var a = (state && state.answers) || {};
    var res = PENDING;
    if (MF.isFilled(a.q13)) {
      var first = a.q13.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean)[0] || PENDING;
      res = first.length > 120 ? first.slice(0, 119) + '…' : first;
    }
    return {
      process: MF.isFilled(a.q01) ? a.q01.trim() : '',
      steps: MF.schemeSteps(a),
      potential: MF.potential(state),
      core: MF.coreCount(a),
      integrations: MF.listFrom(a.q07),
      users: MF.listFrom(a.q08),
      result: res
    };
  };

  MF.setAnswer = function (state, id, text) {
    var next = Object.assign({}, state);
    next.answers = Object.assign({}, state.answers);
    next.answers[id] = text;
    return next;
  };

  MF.setCurrent = function (state, n) {
    var k = Math.round(Number(n));
    var next = Object.assign({}, state);
    next.current = k >= 1 && k <= MF.QUESTIONS.length ? k : 1;
    return next;
  };

  // key: minutesPerRun | automationShare | hourlyRate; мусор отклоняется (остаётся прежнее значение).
  MF.setAssumption = function (state, key, value) {
    var next = Object.assign({}, state);
    var cur = cleanAssumptions(state.assumptions);
    var probe = copyAssumptions(cur);
    if (key in probe) probe[key] = Number(value);
    var clean = cleanAssumptions(probe);
    if (key in cur && clean[key] === probe[key]) cur[key] = probe[key];
    next.assumptions = cur;
    return next;
  };

  MF.withSavedAt = function (state, savedAt) {
    return Object.assign({}, state, { savedAt: savedAt === undefined ? null : savedAt });
  };

  MF.loadDemo = function (state) {
    var next = Object.assign({}, state);
    next.answers = Object.assign({}, MF.DEMO_ANSWERS);
    next.demo = true;
    return next;
  };

  MF.resetProject = function () { return MF.emptyState(); };

  MF.serialize = function (state) { return JSON.stringify(state); };

  MF.deserialize = function (text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return MF.emptyState(); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return MF.emptyState();
    var s = MF.emptyState();
    var src = data.answers && typeof data.answers === 'object' ? data.answers : {};
    questionIds().forEach(function (id) { if (typeof src[id] === 'string') s.answers[id] = src[id]; });
    if (isNum(data.current) && data.current >= 1 && data.current <= MF.QUESTIONS.length && Math.floor(data.current) === data.current) s.current = data.current;
    s.assumptions = cleanAssumptions(data.assumptions);
    s.demo = data.demo === true;
    s.savedAt = isNum(data.savedAt) || (typeof data.savedAt === 'string' && data.savedAt) ? data.savedAt : null;
    return s;
  };

  // Безопасно получить window.localStorage (в приватных режимах доступ может бросать).
  MF.getLocalStorage = function () {
    try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch (e) { return undefined; }
  };

  MF.createStore = function (storageLike) {
    var available = false;
    try {
      if (storageLike) {
        storageLike.setItem(MF.STORAGE_KEY + ':probe', '1');
        storageLike.removeItem(MF.STORAGE_KEY + ':probe');
        available = true;
      }
    } catch (e) { available = false; }
    return {
      available: available,
      load: function () {
        try {
          var raw = storageLike.getItem(MF.STORAGE_KEY);
          return raw === null || raw === undefined ? MF.emptyState() : MF.deserialize(raw);
        } catch (e) { return MF.emptyState(); }
      },
      save: function (state) {
        if (!available) return false;
        try { storageLike.setItem(MF.STORAGE_KEY, MF.serialize(state)); return true; } catch (e) { return false; }
      },
      clear: function () {
        if (!available) return false;
        try { storageLike.removeItem(MF.STORAGE_KEY); return true; } catch (e) { return false; }
      }
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
