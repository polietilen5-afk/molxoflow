/* Molxo Flow: язык интерфейса. Определение, смена, запоминание. Без DOM-зависимостей при загрузке в Node.
   Выбор хранится в localStorage под ключом MF.LANG_KEY отдельно от данных мастера и конструктора. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./texts.js'); require('./texts.uk.js'); require('./texts.en.js');
  }

  MF.LANGS = ['ru', 'uk', 'en'];
  MF.LANG_KEY = 'molxo-flow-lang';

  var listeners = [];

  function known(code) { return typeof code === 'string' && MF.LANGS.indexOf(code) >= 0; }

  // Код языка из строки адреса вида ?a=1&lang=uk; неизвестный код даёт пустую строку.
  function fromSearch(search) {
    if (typeof search !== 'string') return '';
    var m = /[?&]lang=([^&#]*)/.exec(search);
    if (!m) return '';
    var code = '';
    try { code = decodeURIComponent(m[1]); } catch (e) { code = ''; }
    return known(code) ? code : '';
  }

  function fromBrowser(value) {
    var s = typeof value === 'string' ? value.toLowerCase() : '';
    if (s.indexOf('uk') === 0) return 'uk';
    if (s.indexOf('en') === 0) return 'en';
    return '';
  }

  // env = { search, saved, browser }: ?lang= из адреса, затем сохранённый выбор, затем язык браузера, затем ru.
  MF.detectLang = function (env) {
    var e = env && typeof env === 'object' ? env : {};
    var fromUrl = fromSearch(e.search);
    if (fromUrl) return fromUrl;
    if (known(e.saved)) return e.saved;
    return fromBrowser(e.browser) || 'ru';
  };

  function apply(code) {
    MF.LANG = code;
    try {
      if (typeof document !== 'undefined' && document && document.documentElement) document.documentElement.lang = code;
    } catch (e) { /* без документа язык работает и так */ }
  }

  // Родное название языка берётся из словаря (в логике кириллицы нет).
  MF.langName = function (code) {
    var ru = MF.TEXTS && MF.TEXTS.ru;
    return known(code) && ru && typeof ru['lang.' + code] === 'string' ? ru['lang.' + code] : '';
  };

  // Ставит язык, запоминает выбор (отказ хранилища не мешает) и зовёт слушателей. Неизвестный код: false.
  MF.setLang = function (code) {
    if (!known(code)) return false;
    apply(code);
    try {
      if (typeof localStorage !== 'undefined' && localStorage) localStorage.setItem(MF.LANG_KEY, code);
    } catch (e) { /* хранилище недоступно: язык действует до перезагрузки */ }
    listeners.slice().forEach(function (fn) {
      try { fn(code); } catch (e) { /* слушатель не должен ломать смену языка */ }
    });
    return true;
  };

  MF.onLang = function (fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  };

  // Строка адреса без параметра lang (остальные параметры сохраняются): '?lang=uk&a=1' даёт '?a=1', единственный lang даёт ''.
  MF.stripLangParam = function (search) {
    if (typeof search !== 'string') return '';
    var kept = search.replace(/^\?/, '').split('&').filter(function (part) { return part !== '' && !/^lang(=|$)/.test(part); });
    return kept.length ? '?' + kept.join('&') : '';
  };

  // ?lang= применяется один раз и убирается из адреса: перезагрузка или переход по ссылке без параметра не перебьёт
  // выбор, сделанный переключателем (он хранится в localStorage). Адрес меняется без новой записи в истории.
  function dropLangParam() {
    try {
      if (typeof location === 'undefined' || !location || typeof history === 'undefined' || !history || typeof history.replaceState !== 'function') return;
      var search = String(location.search || '');
      if (!/[?&]lang=/.test(search)) return;
      history.replaceState(history.state || null, '', String(location.pathname || '') + MF.stripLangParam(search) + String(location.hash || ''));
    } catch (e) { /* адрес останется прежним */ }
  }

  // Читает адрес, хранилище и язык браузера (каждый источник отдельно защищён) и ставит язык без записи в хранилище.
  // Язык из ?lang= после применения убирается из адреса (dropLangParam).
  MF.initLang = function () {
    var env = { search: '', saved: '', browser: '' };
    try { if (typeof location !== 'undefined' && location) env.search = String(location.search || ''); } catch (e) { /* нет адреса */ }
    try { if (typeof localStorage !== 'undefined' && localStorage) env.saved = localStorage.getItem(MF.LANG_KEY) || ''; } catch (e) { /* нет хранилища */ }
    try { if (typeof navigator !== 'undefined' && navigator) env.browser = String(navigator.language || ''); } catch (e) { /* нет языка браузера */ }
    var code = MF.detectLang(env);
    apply(code);
    if (fromSearch(env.search)) dropLangParam();
    return code;
  };

  // При загрузке в браузере язык определяется сразу; в Node (тесты) остаётся ru.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') MF.initLang();

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
