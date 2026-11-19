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
 * Выбор языка: ?lang=en|ru|uk, затем localStorage 'molxo-variant-lang', иначе en.
 * Нет ключа в текущем языке: берётся en, иначе виден сам ключ в квадратных скобках.
 */
(function (w) {
  'use strict';
  var ORDER = ['en', 'ru', 'uk'];
  var LABEL = { en: 'EN', ru: 'RU', uk: 'UA' };
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
    var q = '';
    try { q = (/[?&]lang=([a-zA-Z]+)/.exec(w.location.search) || [])[1] || ''; } catch (e) {}
    q = norm(q);
    if (q && has(q)) return q;
    var s = '';
    try { s = norm(w.localStorage.getItem(KEY)); } catch (e2) {}
    if (s && has(s)) return s;
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
  function renderSwitchers() {
    var els = w.document.querySelectorAll('[data-i18n-switch]'), i, j, b, html, l;
    for (i = 0; i < els.length; i++) {
      els[i].setAttribute('role', 'group');
      els[i].setAttribute('aria-label', 'Language');
      els[i].className = (els[i].className.replace(/\bmfi-switch\b/, '') + ' mfi-switch').replace(/^\s+/, '');
      els[i].innerHTML = '';
      var pos = 0, cnt = 0;
      for (j = 0; j < ORDER.length; j++) {
        l = ORDER[j];
        if (!has(l)) continue;
        if (l === lang) pos = cnt;
        cnt++;
        b = w.document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-lang', l);
        b.setAttribute('lang', l);
        b.setAttribute('aria-label', NAME[l]);
        b.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
        b.textContent = LABEL[l];
        els[i].appendChild(b);
      }
      els[i].setAttribute('data-pos', String(pos));
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
  function init() {
    if (inited) return;
    inited = true;
    lang = pickInitial();
    w.document.documentElement.setAttribute('lang', lang);
    apply();
    renderSwitchers();
    w.document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-i18n-switch] [data-lang]') : null;
      if (b) setLang(b.getAttribute('data-lang'));
    });
    w.document.addEventListener('click', function (e) {
      var bt = e.target && e.target.closest ? e.target.closest('.mfi-switch button') : null, list, k, n, box, reduce;
      if (!bt || bt.getAttribute('aria-pressed') !== 'true') return;
      e.stopPropagation();
      list = bt.parentNode.querySelectorAll('button');
      for (k = 0; k < list.length; k++) if (list[k] === bt) break;
      n = list[(k + 1) % list.length];
      if (bt.getAttribute('data-busy')) return;
      reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { setLang(n.getAttribute('data-lang')); return; }
      bt.setAttribute('data-busy', '1');
      box = w.document.createElement('span'); box.className = 'mfi-roll';
      box.innerHTML = '<i></i><i></i>';
      box.firstChild.textContent = bt.textContent; box.lastChild.textContent = n.textContent;
      bt.textContent = ''; bt.appendChild(box);
      w.requestAnimationFrame(function () { w.requestAnimationFrame(function () { box.className = 'mfi-roll mfi-go'; }); });
      w.setTimeout(function () { setLang(n.getAttribute('data-lang')); }, 260);
    }, true);
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
