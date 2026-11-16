/* Molxo Flow: каталог мастера (направления, цели, отрасли, решения, шаги, варианты, демо). Только данные, без DOM.
   Все тексты лежат в js/texts.js, texts.uk.js и texts.en.js; здесь только ключи. Правила подбора возможностей: js/wizard.js. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./texts.js'); require('./texts.uk.js'); require('./texts.en.js');
  }

  /* ---------- направления ---------- */
  MF.DIRECTIONS = [
    { id: 'automation', titleKey: 'dir.automation.title', leadKey: 'dir.automation.lead' },
    { id: 'intelligence', titleKey: 'dir.intelligence.title', leadKey: 'dir.intelligence.lead' },
    { id: 'digital', titleKey: 'dir.digital.title', leadKey: 'dir.digital.lead' }
  ];

  /* ---------- цели (порядок как в брифе) ---------- */
  MF.GOALS = [
    { id: 'routine', titleKey: 'goal.routine.title', hintKey: 'goal.routine.hint', directions: ['automation'] },
    { id: 'growth', titleKey: 'goal.growth.title', hintKey: 'goal.growth.hint', directions: ['digital', 'automation'] },
    { id: 'opportunities', titleKey: 'goal.opportunities.title', hintKey: 'goal.opportunities.hint', directions: ['intelligence'] },
    { id: 'build', titleKey: 'goal.build.title', hintKey: 'goal.build.hint', directions: ['digital'] },
    { id: 'unknown', titleKey: 'goal.unknown.title', hintKey: 'goal.unknown.hint', directions: ['automation', 'intelligence', 'digital'] }
  ];

  /* ---------- отрасли ---------- */
  MF.INDUSTRIES = [
    { id: 'real-estate', titleKey: 'industry.real-estate.title' },
    { id: 'auto', titleKey: 'industry.auto.title' },
    { id: 'trade', titleKey: 'industry.trade.title' },
    { id: 'marketing', titleKey: 'industry.marketing.title' },
    { id: 'services', titleKey: 'industry.services.title' },
    { id: 'other', titleKey: 'industry.other.title' }
  ];

  /* ---------- решения ---------- */
  // Ключи состава работ: tier.<решение>.<уровень>.<номер>; counts = сколько пунктов на START, GROW, SCALE.
  function tierKeys(id, counts) {
    var out = {}, levels = ['start', 'grow', 'scale'];
    for (var l = 0; l < levels.length; l++) {
      out[levels[l]] = [];
      for (var n = 1; n <= counts[l]; n++) out[levels[l]].push('tier.' + id + '.' + levels[l] + '.' + n);
    }
    return out;
  }
  // Основы слов решения из словарей всех языков сразу (ключ kw.<решение>, основы через «|»): клиент пишет на любом языке.
  // Читаются при каждом вызове, поэтому порядок загрузки словарей и смена языка на лету не мешают.
  MF.solutionKeywords = function (solutionId) {
    var out = [];
    Object.keys(MF.TEXTS || {}).forEach(function (lang) {
      var raw = MF.TEXTS[lang]['kw.' + solutionId];
      if (typeof raw !== 'string') return;
      raw.split('|').forEach(function (stem) {
        var s = stem.trim().toLowerCase();
        if (s && out.indexOf(s) < 0) out.push(s);
      });
    });
    return out;
  };
  // Основы слов сравниваются с началом слова в свободном тексте клиента.
  function solution(id, direction, goals, industries) {
    var s = {
      id: id, direction: direction, titleKey: 'sol.' + id + '.title', changesKey: 'sol.' + id + '.changes',
      goals: goals, industries: industries, tiers: tierKeys(id, [3, 3, 3])
    };
    Object.defineProperty(s, 'keywords', { enumerable: true, get: function () { return MF.solutionKeywords(id); } });
    return s;
  }

  MF.SOLUTIONS = [
    solution('process-automation', 'automation', ['routine', 'unknown'], ['trade', 'services', 'marketing']),
    solution('service-integration', 'automation', ['routine', 'build', 'unknown'], ['trade', 'services']),
    solution('ai-agent', 'intelligence', ['routine', 'growth', 'opportunities', 'unknown'], ['services', 'marketing', 'real-estate']),
    solution('chatbot', 'digital', ['growth', 'build'], ['services', 'trade', 'real-estate', 'auto']),
    solution('parser-scraper', 'intelligence', ['opportunities'], ['real-estate', 'auto', 'trade', 'marketing']),
    solution('monitoring-alerts', 'intelligence', ['opportunities'], ['real-estate', 'auto', 'trade', 'marketing']),
    solution('website', 'digital', ['growth', 'build', 'unknown'], ['services', 'auto', 'real-estate']),
    solution('portal-cabinet', 'digital', ['build', 'growth'], ['services', 'real-estate']),
    solution('crm', 'digital', ['growth', 'build', 'routine'], ['real-estate', 'auto', 'services', 'trade']),
    solution('internal-system', 'digital', ['build', 'routine'], ['trade', 'services']),
    solution('analytics-reports', 'intelligence', ['routine', 'growth', 'opportunities', 'unknown'], ['trade', 'marketing', 'auto']),
    solution('custom-software', 'digital', ['build', 'unknown'], ['other'])
  ];

  /* ---------- шаги мастера ---------- */
  // Путь routine/growth/build/unknown: 8 шагов; путь opportunities: 9 шагов (последним на обоих идёт budgetTime).
  var COMMON = ['routine', 'growth', 'build', 'unknown'];
  var HUNT = ['opportunities'];
  function step(id, kind, optionsKey, forGoals, skippable) {
    var s = { id: id, kind: kind, titleKey: 'step.' + id + '.title', hintKey: 'step.' + id + '.hint', forGoals: forGoals, skippable: skippable };
    if (optionsKey) s.optionsKey = optionsKey;
    return s;
  }
  MF.WIZARD_STEPS = [
    step('goal', 'goal', null, null, false),
    step('business', 'text', null, null, true),
    step('team', 'choice', 'team', COMMON, true),
    step('pain', 'multi', 'pain', COMMON, true),
    step('tools', 'multi', 'tools', COMMON, true),
    step('volume', 'text', 'volume', COMMON, true),
    step('result', 'text', 'result', COMMON, true),
    step('find', 'text', 'find', HUNT, true),
    step('sources', 'text', null, HUNT, true),
    step('criteria', 'text', 'criteria', HUNT, true),
    step('frequency', 'choice', 'frequency', HUNT, true),
    step('notify', 'choice', 'notify', HUNT, true),
    step('store', 'multi', 'store', HUNT, true),
    // Одна пара вопросов в одном шаге: ответы budgetTime.budget и budgetTime.deadline (каждый со своим «Другое»).
    { id: 'budgetTime', kind: 'pair', groups: ['budget', 'deadline'], titleKey: 'step.budgetTime.title', hintKey: 'step.budgetTime.hint',
      forGoals: COMMON.concat(HUNT), skippable: true }
  ];

  /* ---------- варианты ответов ---------- */
  // solutions у варианта: какие решения он подсказывает (+2 к счёту, см. wizard.js).
  function opt(group, id, solutions) {
    return { id: id, labelKey: 'opt.' + group + '.' + id, solutions: solutions || [] };
  }
  var OTHER = { id: 'other', labelKey: 'opt.other', solutions: [] };

  MF.WIZARD_OPTIONS = {
    team: { 'default': [opt('team', 'one'), opt('team', 'small'), opt('team', 'mid'), opt('team', 'large'), OTHER] },
    tools: { 'default': [opt('tools', 'sheets'), opt('tools', 'crm'), opt('tools', 'messengers'), opt('tools', 'site'), opt('tools', 'mail'), opt('tools', 'none'), OTHER] },
    // Подсказки-чипы шага volume: вставляются в поле текстом, как у result.
    volume: { 'default': [opt('volume', 'daily'), opt('volume', 'weekly'), opt('volume', 'unknown')] },
    result: { 'default': [opt('result', 'saves-time'), opt('result', 'faster-replies'), opt('result', 'order'), opt('result', 'new-channel'), opt('result', 'see-numbers')] },
    find: {
      'default': [
        opt('find.default', 'new-offers', ['parser-scraper', 'monitoring-alerts']),
        opt('find.default', 'price-changes', ['monitoring-alerts', 'analytics-reports']),
        opt('find.default', 'competitors', ['parser-scraper', 'analytics-reports']),
        opt('find.default', 'tenders', ['parser-scraper', 'monitoring-alerts'])
      ],
      'real-estate': [
        opt('find.real-estate', 'underpriced', ['parser-scraper', 'analytics-reports']),
        opt('find.real-estate', 'new-listings', ['monitoring-alerts', 'parser-scraper']),
        opt('find.real-estate', 'price-drops', ['monitoring-alerts']),
        opt('find.real-estate', 'new-buildings', ['parser-scraper'])
      ],
      auto: [
        opt('find.auto', 'undervalued-cars', ['parser-scraper', 'analytics-reports']),
        opt('find.auto', 'new-ads', ['monitoring-alerts', 'parser-scraper']),
        opt('find.auto', 'price-drop-cars', ['monitoring-alerts']),
        opt('find.auto', 'auctions', ['parser-scraper'])
      ],
      trade: [
        opt('find.trade', 'supplier-prices', ['parser-scraper', 'analytics-reports']),
        opt('find.trade', 'competitor-prices', ['parser-scraper', 'monitoring-alerts']),
        opt('find.trade', 'stock-changes', ['monitoring-alerts']),
        opt('find.trade', 'new-products', ['parser-scraper'])
      ],
      marketing: [
        opt('find.marketing', 'competitor-ads', ['parser-scraper', 'monitoring-alerts']),
        opt('find.marketing', 'mentions', ['monitoring-alerts', 'analytics-reports']),
        opt('find.marketing', 'trends', ['analytics-reports', 'parser-scraper']),
        opt('find.marketing', 'publications', ['monitoring-alerts'])
      ]
    },
    criteria: {
      'default': [opt('criteria.default', 'price-range'), opt('criteria.default', 'region'), opt('criteria.default', 'freshness'), opt('criteria.default', 'source-quality')],
      'real-estate': [opt('criteria.real-estate', 'below-market'), opt('criteria.real-estate', 'price-per-m2'), opt('criteria.real-estate', 'district'), opt('criteria.real-estate', 'area')],
      auto: [opt('criteria.auto', 'brand-year'), opt('criteria.auto', 'mileage'), opt('criteria.auto', 'below-avg'), opt('criteria.auto', 'region')],
      trade: [opt('criteria.trade', 'margin-gap'), opt('criteria.trade', 'delivery'), opt('criteria.trade', 'stock'), opt('criteria.trade', 'region')],
      marketing: [opt('criteria.marketing', 'channel'), opt('criteria.marketing', 'language'), opt('criteria.marketing', 'period'), opt('criteria.marketing', 'topic')]
    },
    frequency: { 'default': [opt('frequency', 'now'), opt('frequency', 'daily'), opt('frequency', 'weekly'), OTHER] },
    notify: { 'default': [opt('notify', 'telegram'), opt('notify', 'mail'), opt('notify', 'screen'), OTHER] },
    store: { 'default': [opt('store', 'source-link'), opt('store', 'price'), opt('store', 'date'), opt('store', 'history'), OTHER] },
    // Диапазоны примерные; {currency} в подписи берётся из MF.CONFIG.currency (пусто: подпись без валюты).
    budget: { 'default': [opt('budget', 'lt1k'), opt('budget', '1k-5k'), opt('budget', '5k-15k'), opt('budget', 'gt15k'), opt('budget', 'unknown'), OTHER] },
    deadline: { 'default': [opt('deadline', 'urgent'), opt('deadline', '1-3m'), opt('deadline', '3-6m'), opt('deadline', 'none'), opt('deadline', 'unknown'), OTHER] }
  };

  // Сложности (шаг pain) зависят от цели, а не от отрасли.
  MF.WIZARD_OPTIONS_BY_GOAL = {
    pain: {
      routine: [
        opt('pain.routine', 'manual-entry', ['process-automation', 'service-integration']),
        opt('pain.routine', 'lost-requests', ['crm', 'chatbot']),
        opt('pain.routine', 'slow-replies', ['chatbot', 'ai-agent']),
        opt('pain.routine', 'sheet-chaos', ['crm', 'internal-system']),
        opt('pain.routine', 'reports', ['analytics-reports', 'process-automation']),
        OTHER
      ],
      growth: [
        opt('pain.growth', 'few-clients', ['website', 'chatbot']),
        opt('pain.growth', 'late-replies', ['chatbot', 'ai-agent']),
        opt('pain.growth', 'no-crm', ['crm', 'portal-cabinet']),
        opt('pain.growth', 'repeat-sales', ['crm', 'analytics-reports']),
        OTHER
      ],
      build: [
        opt('pain.build', 'need-site', ['website']),
        opt('pain.build', 'need-portal', ['portal-cabinet']),
        opt('pain.build', 'need-crm', ['crm']),
        opt('pain.build', 'need-bot', ['chatbot', 'ai-agent']),
        opt('pain.build', 'need-custom', ['custom-software', 'internal-system']),
        OTHER
      ],
      unknown: [
        opt('pain.unknown', 'manual-work', ['process-automation', 'service-integration']),
        opt('pain.unknown', 'lost-clients', ['crm', 'chatbot']),
        opt('pain.unknown', 'no-overview', ['analytics-reports', 'crm']),
        opt('pain.unknown', 'slow-search', ['parser-scraper', 'monitoring-alerts']),
        opt('pain.unknown', 'unclear'),
        OTHER
      ]
    }
  };

  /* ---------- демо-наборы (вымышленные) ---------- */
  // Текстовые ответы вида '@t:ключ' разворачивает MF.loadWizardDemo через MF.t.
  MF.WIZARD_DEMOS = [
    { id: 'realestate', titleKey: 'demo.realestate.title', wizard: { goal: 'opportunities', industry: 'real-estate', answers: {
      business: '@t:demo.realestate.business', find: '@t:demo.realestate.find', sources: '@t:demo.realestate.sources',
      criteria: '@t:demo.realestate.criteria', frequency: 'now', notify: 'telegram', store: ['source-link', 'price', 'date', 'history'] } } },
    { id: 'auto', titleKey: 'demo.auto.title', wizard: { goal: 'opportunities', industry: 'auto', answers: {
      business: '@t:demo.auto.business', find: '@t:demo.auto.find', sources: '@t:demo.auto.sources',
      criteria: '@t:demo.auto.criteria', frequency: 'now', notify: 'telegram', store: ['source-link', 'price', 'date', 'history'] } } },
    { id: 'shop', titleKey: 'demo.shop.title', wizard: { goal: 'routine', industry: 'trade', answers: {
      business: '@t:demo.shop.business', team: 'small', pain: ['manual-entry', 'lost-requests', 'reports'],
      tools: ['sheets', 'messengers', 'site'], volume: '@t:demo.shop.volume', result: '@t:demo.shop.result' } } },
    { id: 'suppliers', titleKey: 'demo.suppliers.title', descKey: 'demo.suppliers.desc', wizard: { goal: 'opportunities', industry: 'trade', answers: {
      business: '@t:demo.suppliers.business', find: '@t:demo.suppliers.find', sources: '@t:demo.suppliers.sources',
      criteria: '@t:demo.suppliers.criteria', frequency: 'daily', notify: 'telegram', store: ['source-link', 'price', 'date', 'history'],
      'budgetTime.budget': 'unknown', 'budgetTime.deadline': 'unknown', huntVolume: '@t:demo.suppliers.volume' } } }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
