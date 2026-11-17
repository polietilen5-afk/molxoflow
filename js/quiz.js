/* Molxo Flow: квиз «готовность к ИИ» и подбор идей агентов. Чистые функции, без DOM и без сети.
   Тексты вопросов и вариантов лежат в словарях (ключи quiz.q.*, quiz.o.*, quiz.level.*); здесь только ключи.
   Идеи берутся только из каталога решений MF.SOLUTIONS. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./texts.js'); require('./texts.uk.js'); require('./texts.en.js'); require('./catalog.js');
  }

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // Вопрос готовности: три варианта; очки заданы по идентификатору, а порядок показа смешан (лучший вариант не всегда первый),
  // чтобы «первые варианты без разбора» не давали максимум.
  function scored(id, pairs) {
    return {
      id: id, kind: 'score', labelKey: 'quiz.q.' + id,
      options: pairs.map(function (p) { return { id: p[0], labelKey: 'quiz.o.' + id + '.' + p[0], score: p[1] }; })
    };
  }

  // Профиль (цель и отрасль) очков не даёт и нужен для подбора идей; подписи берутся из каталога мастера.
  function profile(id, kind, list) {
    return {
      id: id, kind: kind, labelKey: 'quiz.q.' + id,
      options: list.map(function (x) { return { id: x.id, labelKey: x.titleKey, score: 0 }; })
    };
  }

  MF.QUIZ = [
    profile('goal', 'goal', MF.GOALS),
    profile('industry', 'industry', MF.INDUSTRIES),
    scored('repeat', [['daily', 2], ['weekly', 1], ['rare', 0]]),
    scored('data', [['scattered', 0], ['mixed', 1], ['system', 2]]),
    scored('rules', [['partly', 1], ['clear', 2], ['none', 0]]),
    scored('owner', [['maybe', 1], ['yes', 2], ['no', 0]]),
    scored('pilot', [['unsure', 1], ['yes', 2], ['no', 0]])
  ];

  MF.QUIZ_MAX_SCORE = 10;

  function optionOf(question, optionId) {
    return typeof optionId === 'string' ? byId(question.options, optionId) : null;
  }

  // Идеи агентов: до трёх идентификаторов из MF.SOLUTIONS. Цель даёт +3, отрасль +1, направление автоматизации или
  // интеллекта +1 (агенты работают там); при равенстве порядок каталога. Неизвестные цель и отрасль не ломают подбор.
  MF.agentIdeas = function (goal, industry) {
    var rows = MF.SOLUTIONS.map(function (s, index) {
      var score = 0;
      if (typeof goal === 'string' && s.goals.indexOf(goal) >= 0) score += 3;
      if (typeof industry === 'string' && s.industries.indexOf(industry) >= 0) score += 1;
      if (s.direction === 'automation' || s.direction === 'intelligence') score += 1;
      return { id: s.id, score: score, index: index };
    });
    rows.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    return rows.slice(0, 3).map(function (r) { return r.id; });
  };

  // Результат квиза по ответам { идентификатор вопроса: идентификатор варианта }.
  // score: сумма очков известных вариантов; level: low (до 3), mid (4-7), high (8 и больше); ideas: до трёх решений.
  MF.quizResult = function (answers) {
    var a = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
    var score = 0, goal = null, industry = null;
    MF.QUIZ.forEach(function (q) {
      var key = has(a, q.id) ? a[q.id] : null;
      var o = optionOf(q, key);
      if (!o) return;
      if (q.kind === 'score') score += o.score;
      else if (q.kind === 'goal') goal = o.id;
      else if (q.kind === 'industry') industry = o.id;
    });
    var level = score >= 8 ? 'high' : (score >= 4 ? 'mid' : 'low');
    return { score: score, max: MF.QUIZ_MAX_SCORE, level: level, goal: goal, industry: industry, ideas: MF.agentIdeas(goal, industry) };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
