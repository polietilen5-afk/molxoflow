/* Molxo Flow: генерация 12 Markdown-документов ТЗ и ZIP без сжатия. Без DOM. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') { require('./data.js'); require('./core.js'); }

  MF.PENDING_MARK = '⚠ Не заполнено';

  MF.DOC_DEFS = [
    { id: '01-overview', file: '01-obzor-processa.md', title: 'Обзор процесса' },
    { id: '02-goals', file: '02-celi.md', title: 'Цели и результат' },
    { id: '03-roles', file: '03-roli.md', title: 'Роли и пользователи' },
    { id: '04-steps', file: '04-shagi.md', title: 'Шаги процесса' },
    { id: '05-data', file: '05-dannye.md', title: 'Входные данные' },
    { id: '06-integrations', file: '06-integracii.md', title: 'Интеграции' },
    { id: '07-rules', file: '07-pravila.md', title: 'Бизнес-правила' },
    { id: '08-risks', file: '08-riski.md', title: 'Риски и сбои' },
    { id: '09-security', file: '09-bezopasnost.md', title: 'Безопасность и данные' },
    { id: '10-acceptance', file: '10-kriterii.md', title: 'Критерии приёмки' },
    { id: '11-screens', file: '11-ekrany.md', title: 'Экраны и действия' },
    { id: '12-first-release', file: '12-pervyj-reliz.md', title: 'Состав первого релиза' }
  ];

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function question(id) {
    for (var i = 0; i < MF.QUESTIONS.length; i++) if (MF.QUESTIONS[i].id === id) return MF.QUESTIONS[i];
    return null;
  }
  // Явная пометка вместо выдуманного текста.
  function pending(id) {
    var q = question(id);
    return MF.PENDING_MARK + ': ' + q.title + ' (вопрос ' + pad2(q.n) + ') — уточнить';
  }
  function answerOrPending(state, id) {
    var t = state.answers[id];
    return MF.isFilled(t) ? t.trim() : pending(id);
  }
  function section(heading, body) { return '## ' + heading + '\n\n' + body; }
  function bullets(items) { return items.map(function (x) { return '- ' + x; }).join('\n'); }
  function listOrPending(state, id) {
    var items = MF.listFrom(state.answers[id]);
    return items.length ? bullets(items) : pending(id);
  }

  // Содержимое документов; в каждом — только то, что ответил пользователь.
  var BUILDERS = {
    '01-overview': function (s) {
      return [section('Процесс', answerOrPending(s, 'q01')), section('Бизнес-контекст', answerOrPending(s, 'q02'))];
    },
    '02-goals': function (s) {
      var p = MF.potential(s), pot;
      if (p.ready) {
        pot = bullets(p.lines) + '\n\n' + p.note;
      } else {
        pot = MF.PENDING_MARK + ': число запусков в месяц (вопрос 05) — уточнить, потенциал не рассчитан';
      }
      return [
        section('Желаемый результат', answerOrPending(s, 'q03')),
        section('Масштаб: запусков в месяц', answerOrPending(s, 'q05')),
        section('Предварительный потенциал', pot)
      ];
    },
    '03-roles': function (s) {
      return [section('Пользователи и роли', listOrPending(s, 'q08'))];
    },
    '04-steps': function (s) {
      var steps = MF.schemeSteps(s.answers, { full: true });
      var body = steps.length
        ? steps.map(function (x) { return x.n + '. ' + x.text; }).join('\n')
        : pending('q04');
      return [section('Как процесс выполняется сейчас', body)];
    },
    '05-data': function (s) {
      return [section('Входные данные', answerOrPending(s, 'q06'))];
    },
    '06-integrations': function (s) {
      return [section('Внешние сервисы', listOrPending(s, 'q07'))];
    },
    '07-rules': function (s) {
      return [section('Правила процесса', answerOrPending(s, 'q09'))];
    },
    '08-risks': function (s) {
      return [section('Возможные сбои и спорные случаи', answerOrPending(s, 'q10'))];
    },
    '09-security': function (s) {
      return [section('Требования к безопасности и данным', answerOrPending(s, 'q11'))];
    },
    '10-acceptance': function (s) {
      return [section('Как поймём, что всё работает правильно', answerOrPending(s, 'q14'))];
    },
    '11-screens': function (s) {
      return [section('Экраны и действия', answerOrPending(s, 'q12')), section('Выходные данные', answerOrPending(s, 'q13'))];
    },
    '12-first-release': function (s) {
      return [section('Что войдёт в первый релиз', answerOrPending(s, 'q15'))];
    }
  };

  // Всегда ровно 12 документов, даже для пустого проекта.
  MF.buildDocs = function (state) {
    var s = { answers: (state && state.answers) || {}, assumptions: state && state.assumptions, demo: !!(state && state.demo) };
    return MF.DOC_DEFS.map(function (def) {
      var parts = ['# ' + def.title];
      if (s.demo) parts.push('> Это демо-пример: данные вымышленные.');
      parts = parts.concat(BUILDERS[def.id](s));
      return { id: def.id, file: def.file, title: def.title, content: parts.join('\n\n') + '\n' };
    });
  };

  // ---------- UTF-8, CRC32, ZIP (метод store) ----------

  MF.utf8 = function (str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        var d = str.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      }
      if (c >= 0xD800 && c <= 0xDFFF) c = 0xFFFD;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return Uint8Array.from(out);
  };

  var CRC_TABLE = null;
  function crcTable() {
    if (CRC_TABLE) return CRC_TABLE;
    CRC_TABLE = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TABLE[n] = c >>> 0;
    }
    return CRC_TABLE;
  }

  MF.crc32 = function (bytes) {
    var t = crcTable(), c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  // files: [{name, content}] -> Uint8Array. Без сжатия, имена в UTF-8 (флаг 0x0800).
  MF.buildZip = function (files) {
    var DOS_TIME = 0, DOS_DATE = 33; // 1980-01-01, чтобы архив был воспроизводимым
    var chunks = [], central = [], offset = 0;
    function push(arr) { chunks.push(arr); offset += arr.length; }

    files.forEach(function (f) {
      var name = MF.utf8(f.name), data = MF.utf8(f.content), crc = MF.crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, DOS_TIME, true);
      lh.setUint16(12, DOS_DATE, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);

      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, DOS_TIME, true);
      ch.setUint16(14, DOS_DATE, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);

      push(new Uint8Array(lh.buffer)); push(name); push(data);
    });

    var cdStart = offset, cdSize = 0;
    central.forEach(function (c) { cdSize += c.length; });
    central.forEach(push);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, cdStart, true);
    push(new Uint8Array(end.buffer));

    var out = new Uint8Array(offset), pos = 0;
    chunks.forEach(function (c) { out.set(c, pos); pos += c.length; });
    return out;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
