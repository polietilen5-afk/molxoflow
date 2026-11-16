/* Molxo Flow: заявка в формате публичного приёма Control Center, пакет для Molxo Centr и локальный кабинет заявок.
   Без DOM и без сети: файл только собирается, отправляет его владелец вручную (tools/send-to-control-center.js).
   Формат описан в docs/control-center-handoff.md. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./data.js'); require('./core.js'); require('./docs.js'); require('./texts.js'); require('./texts.uk.js'); require('./texts.en.js');
    require('./lang.js'); require('./config.js'); require('./catalog.js'); require('./wizard.js'); require('./export.js');
  }

  MF.CABINET_KEY = 'molxo-flow-cabinet-v1';
  MF.CABINET_MAX = 20;
  // Версии текста согласия, принятые Control Center (ru и uk); можно переопределить через opts.consentVersion.
  MF.CONSENT_VERSION = { ru: '2026-11-15', uk: '2026-11-15-uk' };
  // Control Center отклоняет заявку, заполненную быстрее 3000 мс: по умолчанию ставится этот минимум.
  MF.INTAKE_MIN_ELAPSED_MS = 3000;
  var ANSWER_MAX = 5000;
  var CONTACT_MAX = 200;
  var ELAPSED_MAX = 86400000;
  var TEXT_MAX = 200;

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function isWizard(w) { return !!w && typeof w === 'object' && !!w.answers && typeof w.answers === 'object'; }

  // Язык заявки: Control Center принимает ru и uk, английский уходит как ru.
  function intakeLang() { return MF.LANG === 'uk' ? 'uk' : 'ru'; }

  // Ответы q01..q15: ответ конструктора, а где его нет, предзаполнение из мастера; всегда строки до 5000 знаков.
  function mergedAnswers(w, answers) {
    var own = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
    var pre = isWizard(w) ? MF.wizardToAnswers(w) : {};
    var out = {};
    MF.QUESTIONS.forEach(function (q) {
      var v = has(own, q.id) && typeof own[q.id] === 'string' ? own[q.id] : '';
      if (v.trim() === '' && has(pre, q.id) && typeof pre[q.id] === 'string') v = pre[q.id];
      out[q.id] = v.slice(0, ANSWER_MAX);
    });
    return out;
  }

  // Тело POST /api/public/intake. consent и contact добавляются только когда заданы явно.
  MF.intakePayload = function (w, answers, opts) {
    var o = opts && typeof opts === 'object' ? opts : {};
    var lang = intakeLang();
    var elapsed = typeof o.elapsedMs === 'number' && isFinite(o.elapsedMs) ? Math.floor(o.elapsedMs) : MF.INTAKE_MIN_ELAPSED_MS;
    elapsed = Math.max(0, Math.min(ELAPSED_MAX, elapsed));
    var payload = { answers: mergedAnswers(w, answers), website: '', elapsed_ms: elapsed, lang: lang };
    var contact = typeof o.contact === 'string' ? o.contact.trim().slice(0, CONTACT_MAX) : '';
    if (contact) payload.contact = contact;
    if (o.consent === true) {
      var version = typeof o.consentVersion === 'string' && o.consentVersion.trim() ? o.consentVersion.trim() : MF.CONSENT_VERSION[lang];
      payload.consent = { version: version, accepted: true };
    }
    return payload;
  };

  // Пакет для Molxo Centr: заявка, сводка и 13 файлов ZIP «Для разработчика» (сводка и 12 документов).
  MF.handoffBundle = function (w, answers, opts) {
    var payload = MF.intakePayload(w, answers, opts);
    var state = MF.emptyState();
    Object.keys(payload.answers).forEach(function (k) { state.answers[k] = payload.answers[k]; });
    var files = MF.devFiles(state, isWizard(w) ? w : MF.emptyWizard());
    var documents = {};
    files.forEach(function (f) { documents[f.name] = f.content; });
    return { payload: payload, summary: files[0].content, documents: documents };
  };

  // Содержимое файла molxo-centr-handoff.json: заявка и поле handoff { summary, documents }.
  MF.handoffJson = function (bundle) {
    var b = bundle && typeof bundle === 'object' ? bundle : { payload: {}, summary: '', documents: {} };
    var out = {};
    Object.keys(b.payload || {}).forEach(function (k) { out[k] = b.payload[k]; });
    out.handoff = { summary: b.summary || '', documents: b.documents || {} };
    return JSON.stringify(out, null, 2) + '\n';
  };

  /* ---------- кабинет: история планов на этом устройстве ---------- */
  function text(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

  // Запись кабинета; без пригодных полей возвращает null. Цель и отрасль только из справочников.
  function cleanEntry(e, fallbackId) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
    var id = text(e.id, 64) || fallbackId;
    var savedAt = typeof e.savedAt === 'number' && isFinite(e.savedAt) ? e.savedAt : 0;
    return {
      id: id,
      savedAt: savedAt,
      goal: byId(MF.GOALS, e.goal) ? e.goal : null,
      industry: byId(MF.INDUSTRIES, e.industry) ? e.industry : null,
      planTitle: text(e.planTitle, TEXT_MAX),
      statusCode: text(e.statusCode, TEXT_MAX)
    };
  }

  MF.createCabinetStore = function (storageLike) {
    var available = false;
    try {
      if (storageLike) {
        storageLike.setItem(MF.CABINET_KEY + ':probe', '1');
        storageLike.removeItem(MF.CABINET_KEY + ':probe');
        available = true;
      }
    } catch (e) { available = false; }
    var counter = 0;
    function read() {
      var raw;
      try { raw = storageLike.getItem(MF.CABINET_KEY); } catch (e) { return []; }
      if (raw === null || raw === undefined) return [];
      var data;
      try { data = JSON.parse(raw); } catch (e2) { return []; }
      if (!Array.isArray(data)) return [];
      var out = [];
      for (var i = 0; i < data.length && out.length < MF.CABINET_MAX; i++) {
        var c = cleanEntry(data[i], 'e' + i);
        if (c) out.push(c);
      }
      return out;
    }
    return {
      available: available,
      // Записи от новых к старым, не больше 20.
      load: function () { return available ? read() : []; },
      // Добавляет запись в начало (запись с тем же id заменяется); старше двадцатой отбрасываются. Результат: сохранено ли.
      add: function (entry) {
        if (!available) return false;
        counter++;
        var c = cleanEntry(entry, 'e' + (typeof entry === 'object' && entry && typeof entry.savedAt === 'number' ? entry.savedAt : 0) + '-' + counter);
        if (!c) return false;
        var list = read().filter(function (x) { return x.id !== c.id; });
        list.unshift(c);
        list = list.slice(0, MF.CABINET_MAX);
        try { storageLike.setItem(MF.CABINET_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
      },
      clear: function () {
        if (!available) return false;
        try { storageLike.removeItem(MF.CABINET_KEY); return true; } catch (e) { return false; }
      }
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
