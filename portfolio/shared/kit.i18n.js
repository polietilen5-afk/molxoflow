/* MFI18N: общий мини-рантайм мультиязычности для вариантов (прототипы, ES5).
 *
 * Язык по умолчанию: en. Языки ru и uk подключаются файлами словарей: если файл
 * i18n/ru.js или i18n/uk.js лежит рядом и подключён <script>, язык появляется в
 * переключателе; нет файла, нет кнопки.
 *
 * Словарь:   MFI18N.register('ru', { 'hero.title': '...', ... });
 * HTML:      <h1 data-i18n="hero.title"></h1>
 *            data-i18n-attr="placeholder:key1;aria-label:key2;title:key3"
 *            data-i18n-html="key" (только для текста с <br>/<em> из своего словаря)
 * JS:        MFI18N.t('key', {name: 'x'})   подстановка {name}
 *            MFI18N.onChange(function (lang) { перерисовать динамические тексты })
 * Переключатель: <div data-i18n-switch></div> (или MFI18N.mountSwitcher(el))
 * Выбор языка: ?lang=en|ru|uk, затем localStorage 'molxo-variant-lang', затем язык браузера
 * (navigator.languages), иначе en.
 * Перенос языка: ?lang= дописывается ко всем внутренним ссылкам (кроме якорей, внешних адресов,
 * mailto/tel/tg и ссылок с data-i18n-nolang); смена языка обновляет адрес (history.replaceState).
 * Клавиатура: Enter/пробел раскрывает ряд, стрелки влево/вправо двигают фокус, Escape сворачивает;
 * фокус остаётся на кнопке активного языка.
 * Нет ключа в текущем языке: берётся en, иначе виден сам ключ в квадратных скобках.
 */
(function (w) {
  'use strict';
  var ORDER = ['en', 'ru', 'uk'];
  var LABEL = { en: 'EN', ru: 'RU', uk: 'UA' };
  var GROUP = { en: 'Language', ru: 'Язык', uk: 'Мова' };
  var NAME = { en: 'English', ru: 'Русский', uk: 'Українська' };
  var KEY = 'molxo-variant-lang';
  var dicts = {};
  var subs = [];
  var lang = 'en';
  var inited = false;

  function has(l) { return !!dicts[l]; }
  function norm(l) {
    l = String(l || '').toLowerCase().slice(0, 2);
    if (l === 'ua') l = 'uk';
    return l;
  }
  function pickInitial() {
    var q = '', nl = [], i, b;
    try { q = (/[?&]lang=([a-zA-Z]+)/.exec(w.location.search) || [])[1] || ''; } catch (e) {}
    q = norm(q);
    if (q && has(q)) return q;
    var s = '';
    try { s = norm(w.localStorage.getItem(KEY)); } catch (e2) {}
    if (s && has(s)) return s;
    try { nl = (w.navigator.languages && w.navigator.languages.length) ? w.navigator.languages : [w.navigator.language]; } catch (e3) {}
    for (i = 0; i < nl.length; i++) { b = norm(nl[i]); if (b && has(b)) return b; }
    return 'en';
  }
  function t(key, vars) {
    var d = dicts[lang] || {};
    var v = Object.prototype.hasOwnProperty.call(d, key) ? d[key]
      : (dicts.en && Object.prototype.hasOwnProperty.call(dicts.en, key) ? dicts.en[key] : null);
    if (v === null) return '[' + key + ']';
    if (vars) {
      v = String(v).replace(/\{(\w+)\}/g, function (m, k) {
        return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m;
      });
    }
    return v;
  }
  function apply(root) {
    var r = root || w.document, i, n, list, parts, p, c;
    list = r.querySelectorAll('[data-i18n]');
    for (i = 0; i < list.length; i++) list[i].textContent = t(list[i].getAttribute('data-i18n'));
    list = r.querySelectorAll('[data-i18n-html]');
    for (i = 0; i < list.length; i++) list[i].innerHTML = t(list[i].getAttribute('data-i18n-html'));
    list = r.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < list.length; i++) {
      parts = list[i].getAttribute('data-i18n-attr').split(';');
      for (n = 0; n < parts.length; n++) {
        c = parts[n].indexOf(':');
        if (c > 0) {
          p = parts[n].slice(0, c).replace(/\s/g, '');
          list[i].setAttribute(p, t(parts[n].slice(c + 1).replace(/\s/g, '')));
        }
      }
    }
  }
  /* Перенос языка: ?lang= к внутренней ссылке (не якорь, не внешний адрес, не mailto/tel/tg). */
  function decorate(a) {
    var h = a.getAttribute('href'), hash = '', q = '', i, u, same;
    if (!h || a.hasAttribute('data-i18n-nolang') || /^(#|mailto:|tel:|tg:|javascript:|data:|blob:)/i.test(h)) return;
    if (/^(https?:)?\/\//i.test(h)) {
      try { u = new w.URL(h, w.location.href); same = u.host === w.location.host; } catch (e) { same = false; }
      if (!same) return;
    }
    i = h.indexOf('#');
    if (i >= 0) { hash = h.slice(i); h = h.slice(0, i); }
    i = h.indexOf('?');
    if (i >= 0) { q = h.slice(i + 1); h = h.slice(0, i); }
    if (/\.[a-z0-9]{1,5}$/i.test(h) && !/\.html?$/i.test(h)) return;
    q = q.replace(/(^|&)lang=[^&]*/g, '').replace(/^&/, '');
    a.setAttribute('href', h + '?' + (q ? q + '&' : '') + 'lang=' + lang + hash);
  }
  function decorateAll() {
    var list = w.document.querySelectorAll('a[href]'), i;
    for (i = 0; i < list.length; i++) decorate(list[i]);
  }
  function syncUrl() {
    try {
      var u = w.location, q = u.search.replace(/^\?/, '').replace(/(^|&)lang=[^&]*/g, '').replace(/^&/, '');
      w.history.replaceState(w.history.state, '', u.pathname + '?' + (q ? q + '&' : '') + 'lang=' + lang + u.hash);
    } catch (e) {}
  }
  function switches() { return w.document.querySelectorAll('[data-i18n-switch]'); }
  function activeBtn(sw) { return sw ? sw.querySelector('button[aria-pressed="true"]') : null; }
  function setOpen(sw, on) {
    var a = activeBtn(sw);
    if (on) sw.classList.add('mfi-open'); else sw.classList.remove('mfi-open');
    if (a) a.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function renderSwitchers() {
    var els = switches(), i, j, b, l;
    for (i = 0; i < els.length; i++) {
      els[i].setAttribute('role', 'group');
      els[i].setAttribute('aria-label', GROUP[lang] || GROUP.en);
      els[i].setAttribute('aria-live', 'polite');
      els[i].className = (els[i].className.replace(/\bmfi-switch\b/, '') + ' mfi-switch').replace(/^\s+/, '');
      els[i].innerHTML = '';
      for (j = 0; j < ORDER.length; j++) {
        l = ORDER[j];
        if (!has(l)) continue;
        b = w.document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-lang', l);
        b.setAttribute('lang', l);
        b.setAttribute('aria-label', NAME[l]);
        b.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
        if (l === lang) {
          b.setAttribute('aria-haspopup', 'true');
          b.setAttribute('aria-expanded', els[i].classList.contains('mfi-open') ? 'true' : 'false');
        }
        b.textContent = LABEL[l];
        els[i].appendChild(b);
      }
      els[i].hidden = els[i].children.length < 2;
    }
  }
  function setLang(l, silent) {
    l = norm(l);
    if (!has(l)) return false;
    lang = l;
    try { w.localStorage.setItem(KEY, l); } catch (e) {}
    w.document.documentElement.setAttribute('lang', l);
    apply();
    renderSwitchers();
    decorateAll();
    syncUrl();
    if (!silent) {
      for (var i = 0; i < subs.length; i++) { try { subs[i](l); } catch (e2) { if (w.console) w.console.error(e2); } }
    }
    return true;
  }
  function register(l, obj) {
    l = norm(l);
    dicts[l] = obj;
    if (inited) renderSwitchers();
  }
  /* Снимает класс i18n-pending (ставит inline-скрипт сборки при ru/uk, кроме главной, и прячет body до подстановки
   * словаря, чтобы английский пререндер не прыгал на ru/uk-текст). После подстановки ждём шрифты (их заранее ставит
   * в preload тот же скрипт), чтобы смена гарнитуры не перестроила строки. Страховка в самом inline-скрипте: через
   * 1500 мс после DOMContentLoaded и в любом случае через 6 с. */
  function release() {
    var de = w.document.documentElement, f = w.document.fonts;
    var done = function () { de.classList.remove('i18n-pending'); };
    if (!de.classList.contains('i18n-pending')) return;
    try {
      void w.document.body.offsetHeight;
      if (f && f.ready) f.ready.then(function () { w.setTimeout(done, 0); }, done); else done();
    } catch (e) { done(); }
  }
  function init() {
    if (inited) return;
    inited = true;
    lang = pickInitial();
    w.document.documentElement.setAttribute('lang', lang);
    apply();
    renderSwitchers();
    decorateAll();
    release();
    w.document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-i18n-switch] [data-lang]') : null, all, idx = -1, k;
      if (!b) return;
      all = switches();
      for (k = 0; k < all.length; k++) if (all[k] === b.parentNode) idx = k;
      setLang(b.getAttribute('data-lang'));
      if (idx >= 0) { b = activeBtn(switches()[idx]); if (b && b.focus) b.focus(); }
    });
    /* ссылки, добавленные позже (демо, динамика): язык дописывается перед переходом */
    ['mousedown', 'touchstart', 'focusin', 'click'].forEach(function (ev) {
      w.document.addEventListener(ev, function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (a) decorate(a);
      }, true);
    });
    w.document.addEventListener('click', function (e) {
      var bt = e.target && e.target.closest ? e.target.closest('.mfi-switch button') : null, sw, all, k;
      all = w.document.querySelectorAll('.mfi-switch.mfi-open');
      if (!bt) { for (k = 0; k < all.length; k++) setOpen(all[k], false); return; }
      sw = bt.parentNode;
      for (k = 0; k < all.length; k++) if (all[k] !== sw) setOpen(all[k], false);
      if (!sw.classList.contains('mfi-open')) { e.stopPropagation(); setOpen(sw, true); return; }
      if (bt.getAttribute('aria-pressed') === 'true') { e.stopPropagation(); setOpen(sw, false); return; }
      sw.classList.remove('mfi-open');
    }, true);
    w.document.addEventListener('keydown', function (e) {
      var all = w.document.querySelectorAll('.mfi-switch.mfi-open'), k, a, btns, cur, n, ae = w.document.activeElement;
      if (e.key === 'Escape') {
        for (k = 0; k < all.length; k++) {
          a = activeBtn(all[k]);
          setOpen(all[k], false);
          if (a && a.focus) a.focus();
        }
        return;
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && ae && ae.closest) {
        cur = ae.closest('.mfi-switch.mfi-open');
        if (!cur) return;
        btns = cur.querySelectorAll('button');
        for (n = 0; n < btns.length; n++) if (btns[n] === ae) break;
        if (n === btns.length) return;
        n = e.key === 'ArrowRight' ? Math.min(btns.length - 1, n + 1) : Math.max(0, n - 1);
        btns[n].focus();
        e.preventDefault();
      }
    });
    w.document.addEventListener('focusout', function (e) {
      var sw = e.target && e.target.closest ? e.target.closest('.mfi-switch.mfi-open') : null, to = e.relatedTarget;
      if (sw && to && !sw.contains(to)) setOpen(sw, false);
    });
    for (var i = 0; i < subs.length; i++) { try { subs[i](lang); } catch (e3) { if (w.console) w.console.error(e3); } }
  }
  w.MFI18N = {
    register: register,
    t: t,
    apply: apply,
    setLang: setLang,
    lang: function () { return lang; },
    has: has,
    langs: function () { return ORDER.filter(has); },
    onChange: function (fn) { subs.push(fn); },
    mountSwitcher: function (el) { if (el) { el.setAttribute('data-i18n-switch', ''); renderSwitchers(); } },
    init: init
  };
  /* Инициализация после разбора документа: все словари и скрипты варианта уже зарегистрированы. */
  if (w.document.readyState === 'loading') w.document.addEventListener('DOMContentLoaded', function () { w.setTimeout(init, 0); });
  else w.setTimeout(init, 0);
}(window));
