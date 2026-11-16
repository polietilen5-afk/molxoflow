/* Molxo Flow: логика мастера и плана «Ваш план». Правила подбора, без AI и без сети. Без DOM.
   Состояние мастера отдельное от состояния конструктора (ключ MF.WIZARD_KEY). Все тексты через MF.t. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./data.js'); require('./core.js'); require('./texts.js'); require('./config.js'); require('./catalog.js');
  }

  MF.WIZARD_KEY = 'molxo-flow-wizard-v1';
  // Значение «Пропустить»: ответ считается данным, но текста не даёт.
  MF.WIZARD_SKIP = '@skip';
  var MAX_TEXT = 2000;
  var OTHER_SUFFIX = '.other';
  var MAX_CHOICES = 20;

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

  /* ---------- шаги и варианты ---------- */
  MF.wizardSteps = function (w) {
    var goal = isWizard(w) && w.goal ? w.goal : 'unknown';
    return MF.WIZARD_STEPS.filter(function (s) { return s.forGoals === null || s.forGoals.indexOf(goal) >= 0; });
  };
  function visibleStep(w, id) { return byId(MF.wizardSteps(w), id); }

  // Варианты шага для текущего состояния: pain зависит от цели, остальные от отрасли.
  MF.wizardOptions = function (w, stepId) {
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
    var isOther = key.length > OTHER_SUFFIX.length && key.slice(-OTHER_SUFFIX.length) === OTHER_SUFFIX;
    var stepId = isOther ? key.slice(0, -OTHER_SUFFIX.length) : key;
    var st = visibleStep(w, stepId);
    if (!st || st.kind === 'goal') return { ok: false };
    if (isOther) {
      if (st.kind !== 'choice' && st.kind !== 'multi') return { ok: false };
      if (typeof value !== 'string') return { ok: false };
      return value.trim() === '' ? { ok: true, remove: true } : { ok: true, value: value.slice(0, MAX_TEXT) };
    }
    if (st.kind === 'text') {
      if (typeof value !== 'string') return { ok: false };
      if (value === MF.WIZARD_SKIP) return { ok: true, value: value };
      return value.trim() === '' ? { ok: true, remove: true } : { ok: true, value: value.slice(0, MAX_TEXT) };
    }
    var ids = MF.wizardOptions(w, stepId).map(function (o) { return o.id; });
    if (st.kind === 'choice') {
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
        var base = k.slice(-OTHER_SUFFIX.length) === OTHER_SUFFIX ? k.slice(0, -OTHER_SUFFIX.length) : k;
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
    var v = w.answers[stepId];
    if (typeof v === 'string') return v.trim() !== '' || (stepId === 'business' && !!w.industry);
    if (Array.isArray(v)) return v.length > 0;
    return stepId === 'business' && !!w.industry;
  };

  /* ---------- чтение ответов ---------- */
  function textOf(w, stepId) {
    var v = w.answers[stepId];
    return typeof v === 'string' && v !== MF.WIZARD_SKIP ? v.trim() : '';
  }
  function selectedIds(w, stepId) {
    var v = w.answers[stepId];
    var list = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
    return list.filter(function (x) { return x !== MF.WIZARD_SKIP; });
  }
  function selectedLabels(w, stepId) {
    var opts = MF.wizardOptions(w, stepId), other = textOf(w, stepId + OTHER_SUFFIX);
    return selectedIds(w, stepId).map(function (id) {
      if (id === 'other') return other || MF.t('opt.other');
      var o = byId(opts, id);
      return o ? MF.t(o.labelKey) : id;
    });
  }
  // Ответ шага одной строкой для сводки и заявки; пустая строка: нет ответа или пропуск.
  MF.wizardAnswerText = function (w, stepId) {
    var st = stepDef(stepId);
    if (!isWizard(w) || !st) return '';
    if (st.kind === 'goal') {
      var g = byId(MF.GOALS, w.goal);
      return g ? MF.t(g.titleKey) : '';
    }
    if (st.kind === 'text') return textOf(w, stepId);
    return selectedLabels(w, stepId).join(', ');
  };

  /* ---------- подбор возможностей (правила, не AI) ---------- */
  var LETTER = /[a-z0-9\u0430-\u044f\u0451]/;
  // Основа слова ищется только с начала слова: «бот» не находится в «работа».
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
  MF.formatPrice = function (value) {
    if (typeof value !== 'number' || !isFinite(value) || value <= 0) return null;
    return MF.t('price.value', { value: MF.formatNumber(value) });
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
    var volume = textOf(w, 'volume');
    if (w.goal !== 'opportunities' && volume) {
      var p = MF.potential({ answers: { q05: volume }, assumptions: assumptions || MF.DEFAULT_ASSUMPTIONS });
      plan.effect = p.ready ? p : null;
    }
    return plan;
  };

  /* ---------- текст заявки и ссылка для связи ---------- */
  function titleOf(solutionId) { return MF.t(byId(MF.SOLUTIONS, solutionId).titleKey); }

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
      pl.effect.lines.forEach(function (x) { lines.push('- ' + x); });
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
  // Предзаполнение q01, q02, q03, q05: только непустые строки.
  MF.wizardToAnswers = function (w) {
    var out = {};
    if (!isWizard(w) || !w.goal) return out;
    var plan = MF.buildPlan(w);
    if (plan.ready) out.q01 = titleOf(plan.opportunities[0].solutionId);
    var ctx = [];
    var business = textOf(w, 'business');
    if (business) ctx.push(business.replace(/\s*\n\s*/g, ' '));
    var industry = byId(MF.INDUSTRIES, w.industry);
    if (industry) ctx.push(MF.t('answers.industry', { name: MF.t(industry.titleKey) }));
    var team = MF.wizardAnswerText(w, 'team');
    if (team) ctx.push(MF.t('answers.team', { name: team }));
    var tools = MF.wizardAnswerText(w, 'tools');
    if (tools) ctx.push(MF.t('answers.tools', { names: tools }));
    var pain = MF.wizardAnswerText(w, 'pain');
    if (pain) ctx.push(MF.t('answers.pain', { names: pain }));
    if (ctx.length) out.q02 = ctx.join(' ');
    var result = w.goal === 'opportunities'
      ? [textOf(w, 'find'), textOf(w, 'criteria')].filter(function (x) { return x; }).join('; ')
      : textOf(w, 'result');
    if (result) out.q03 = result;
    var volume = w.goal === 'opportunities' ? '' : textOf(w, 'volume');
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
