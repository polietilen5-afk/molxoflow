/* Booking Desk demo shell: time, roles, access, audit, notifications feed, navigation. All data is fictional. */
(function (w) {
  'use strict';
  var BK = w.BK, T = BK.T, el = BK.el, icon = BK.icon;

  /* ---------- time, dates (demo timezone, fictional "today") ---------- */
  BK.TODAY = '2026-11-18'; BK.NOW = 630; /* Wednesday 10:30 */
  var LOCALE = { en: 'en-GB', ru: 'ru-RU', uk: 'uk-UA' };
  BK.utc = function (iso) { var p = iso.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
  BK.addDays = function (iso, n) { var d = new Date(BK.utc(iso) + n * 86400000); return d.getUTCFullYear() + '-' + BK.pad2(d.getUTCMonth() + 1) + '-' + BK.pad2(d.getUTCDate()); };
  BK.dow = function (iso) { return (new Date(BK.utc(iso)).getUTCDay() + 6) % 7; };
  BK.dayNo = function (iso) { return Math.round(BK.utc(iso) / 86400000); };
  BK.abs = function (iso, m) { return BK.dayNo(iso) * 1440 + m; };
  BK.nowAbs = function () { return BK.abs(BK.TODAY, BK.NOW); };
  BK.mins = function (s) { var p = s.split(':'); return (+p[0]) * 60 + (+p[1]); };
  BK.hhmm = function (m) { return BK.pad2(Math.floor(m / 60)) + ':' + BK.pad2(m % 60); };
  BK.fmt = function (iso, mode) {
    var lang = w.MFI18N.lang();
    var o = mode === 'wd' ? { weekday: 'short' } : mode === 'wl' ? { weekday: 'long' } : mode === 'dm' ? { day: 'numeric', month: 'short' } : mode === 'long' ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' };
    o.timeZone = 'UTC';
    try { return new Intl.DateTimeFormat(LOCALE[lang] || 'en-GB', o).format(new Date(BK.utc(iso))); } catch (e) { return iso; }
  };
  BK.when = function (b) { return BK.fmt(b.date, 'full') + ', ' + BK.hhmm(b.time); };
  BK.cu = function (n) { return n + ' ' + T('cu'); };

  /* ---------- roles and access ---------- */
  BK.ROLES = ['owner', 'admin', 'spec'];
  BK.ACCESS = { home: 1, cal: 1, list: 1, svc: 1, team: 1, cli: ['owner', 'admin'], page: ['owner', 'admin'], ai: ['owner', 'admin'], bot: ['owner', 'admin'], rem: ['owner', 'admin'], kb: ['owner', 'admin'], an: ['owner'], set: ['owner'], audit: ['owner'] };
  BK.modOK = function (m) { var a = BK.ACCESS[m]; return a === 1 || (a && a.indexOf(BK.DB.role) >= 0); };
  BK.isSpec = function () { return BK.DB.role === 'spec'; };
  BK.can = function (a) {
    var r = BK.DB.role;
    switch (a) {
      case 'create': case 'cancel': case 'move': case 'editSvc': case 'editClient': return r !== 'spec';
      case 'editTeam': case 'settings': return r === 'owner';
      case 'status': return true;
      default: return false;
    }
  };
  BK.vis = function (b) { return !BK.isSpec() || b.staff === BK.DB.me; };

  /* ---------- lookups and display names ---------- */
  BK.byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
  BK.svc = function (id) { return BK.byId(BK.DB.services, id); };
  BK.svcName = function (id) { var s = BK.svc(id); return s ? (s.name || T('svc.' + s.id)) : id; };
  BK.staff = function (id) { return BK.byId(BK.DB.staff, id); };
  BK.staffName = function (id) { var s = BK.staff(id); return s ? s.name : id; };
  BK.client = function (id) { return BK.byId(BK.DB.clients, id); };
  BK.clientName = function (id) { var c = BK.client(id); return c ? c.name : id; };
  BK.booking = function (id) { return BK.byId(BK.DB.bookings, id); };
  BK.nextId = function (p) { var d = BK.DB.seq; d[p] = (d[p] || 0) + 1; return p + d[p]; };
  BK.initials = function (n) { var p = String(n).replace(/[^A-Za-z ]/g, '').split(' '); return (p[0] || '?').charAt(0) + (p[1] || '').charAt(0); };
  var STK = { pending: 'warn', confirmed: 'info', done: 'ok', noshow: 'bad', cancelled: 'mute' };
  BK.stBadge = function (st) { return BK.badge(STK[st] || '', T('st.' + st)); };
  BK.occupying = function (b) { return b.status === 'pending' || b.status === 'confirmed' || b.status === 'done'; };
  BK.active = function (b) { return b.status === 'pending' || b.status === 'confirmed'; };

  /* ---------- clock, audit and feed ---------- */
  BK.stamp = function () {
    var m = BK.DB.clock; BK.DB.clock += 1 + (m % 3);
    return BK.TODAY + ' ' + BK.pad2(Math.floor(m / 60) % 24) + ':' + BK.pad2(m % 60);
  };
  /* vars hold raw ids; they are turned into display text at render time (so a language switch re-translates old entries) */
  BK.fv = function (v) {
    var o = {}, k, x;
    for (k in (v || {})) {
      x = v[k];
      if (k === 'svc') o[k] = BK.svcName(x);
      else if (k === 'd') o[k] = BK.fmt(x, 'dm');
      else if (k === 'tm') o[k] = BK.hhmm(x);
      else if (k === 'st') o[k] = T('st.' + x);
      else if (k === 'src') o[k] = T('src.' + x);
      else if (k === 'role') o[k] = T('role.' + x);
      else if (k === 'mod') o[k] = T('m.' + x);
      else o[k] = x;
    }
    return o;
  };
  BK.log = function (mod, key, vars, ref, actor) {
    BK.DB.audit.unshift({ t: BK.stamp(), role: actor || BK.DB.role, mod: mod, key: key, vars: vars || {}, ref: ref || null });
  };
  BK.auditText = function (a) { return T('a.' + a.key, BK.fv(a.vars)); };
  BK.who = function (r) { return r === 'client' || r === 'system' ? T('who.' + r) : T('role.' + r); };
  /* manager notifications (the Telegram feed); the switches in Settings decide whether they are delivered */
  BK.notify = function (kind, vars, ref) {
    var tg = BK.DB.settings.tg;
    BK.DB.feed.unshift({ t: BK.stamp(), kind: kind, vars: vars || {}, ref: ref || null, muted: !(tg.on && tg[kind] !== false) });
  };

  /* ---------- navigation and shell ---------- */
  BK.UI = { mod: 'home', menu: false };
  BK.uiDefaults = { mod: 'home', menu: false };
  function cp(v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }
  BK.ud = function (o) { for (var k in o) { BK.uiDefaults[k] = cp(o[k]); BK.UI[k] = cp(o[k]); } };
  BK.newUI = function () { var o = {}; for (var k in BK.uiDefaults) o[k] = cp(BK.uiDefaults[k]); return o; };
  BK.registerMod = function (id, def) { BK.mods[id] = def; BK.order.push(id); };
  BK.go = function (mod, opts) {
    if (!BK.modOK(mod)) { BK.toast(T('toast.noAccess')); return; }
    BK.UI.mod = mod; BK.UI.menu = false;
    if (opts) { for (var k in opts) BK.UI[k] = opts[k]; }
    BK.render('main');
  };
  BK.root = null;
  var GROUPS = [['g.work', ['home', 'cal', 'list', 'cli']], ['g.channels', ['page', 'ai', 'bot', 'rem', 'kb']], ['g.setup', ['svc', 'team', 'an', 'set', 'audit']]];
  BK.render = function (focus) {
    var root = BK.root, h0 = root.offsetHeight, keep = {};
    var sc = root.querySelector('.cal-scroll'); if (sc) { keep.x = sc.scrollLeft; keep.y = sc.scrollTop; }
    root.style.minHeight = h0 + 'px';
    root.innerHTML = '';
    root.style.setProperty('--brand', BK.DB.settings.accent);
    var shell = el('div', { cls: 'shell' + (BK.UI.menu ? ' menu-open' : '') });
    shell.appendChild(renderSide());
    var main = el('div', { cls: 'main', id: 'modMain', tabindex: '-1' });
    main.appendChild(renderTop());
    var def = BK.mods[BK.UI.mod];
    var body = el('div', { cls: 'mod mod-' + BK.UI.mod });
    try { def.render(body); } catch (e) { if (w.console) w.console.error(e); body.appendChild(el('p', { text: String(e) })); }
    main.appendChild(body);
    shell.appendChild(main);
    shell.appendChild(el('button', { type: 'button', cls: 'scrim', 'aria-label': T('nav.close'), tabindex: '-1', onclick: function () { BK.UI.menu = false; BK.render(); } }));
    root.appendChild(shell);
    sc = root.querySelector('.cal-scroll'); if (sc && keep.x !== undefined) { sc.scrollLeft = keep.x; sc.scrollTop = keep.y; }
    [].forEach.call(root.querySelectorAll('.chat-log'), function (c) { c.scrollTop = c.scrollHeight; });
    if (focus === 'main') { var mm = root.querySelector('#modMain'); if (mm) mm.focus({ preventScroll: true }); }
    else if (focus) { var f = root.querySelector(focus); if (f) f.focus({ preventScroll: true }); }
    w.requestAnimationFrame(function () { root.style.minHeight = ''; });
  };
  function renderSide() {
    var nav = el('nav', { cls: 'side', 'aria-label': T('nav.label') });
    nav.appendChild(el('div', { cls: 'side-brand' }, [el('b', { text: T('app.name') }), el('span', { text: BK.DB.settings.name })]));
    GROUPS.forEach(function (g) {
      nav.appendChild(el('p', { cls: 'side-g', text: T(g[0]) }));
      g[1].forEach(function (m) {
        var ok = BK.modOK(m), cnt = ok && BK.mods[m].badge ? BK.mods[m].badge() : 0;
        nav.appendChild(el('button', { type: 'button', cls: 'ni' + (BK.UI.mod === m ? ' on' : '') + (ok ? '' : ' off'), 'data-mod': m, 'aria-current': BK.UI.mod === m ? 'page' : null, 'aria-disabled': ok ? null : 'true', onclick: function () { BK.go(m); } }, [icon(BK.mods[m].icon), el('span', { text: T('m.' + m) }), ok ? (cnt ? el('em', { cls: 'cnt', text: String(cnt), 'aria-label': T('nav.count', { n: cnt }) }) : null) : icon('lock')]));
      });
    });
    return nav;
  }
  function seg(label, items, cur, onpick, cls) {
    var g = el('div', { cls: 'roles ' + (cls || ''), role: 'group', 'aria-label': label });
    items.forEach(function (x) { g.appendChild(el('button', { type: 'button', 'data-k': x[0], 'aria-pressed': cur === x[0] ? 'true' : 'false', text: x[1], onclick: function () { onpick(x[0]); } })); });
    return g;
  }
  function renderTop() {
    var r = BK.DB.role;
    var roles = seg(T('role.label'), BK.ROLES.map(function (x) { return [x, T('role.' + x)]; }), r, function (x) {
      BK.DB.role = x; BK.log('set', 'role', { role: x });
      if (!BK.modOK(BK.UI.mod)) BK.UI.mod = 'home';
      BK.UI.sel = null;
      BK.render('[data-role-seg] [data-k="' + x + '"]');
    });
    roles.setAttribute('data-role-seg', '');
    var ws = seg(T('ws.label'), [['clinic', T('ws.clinic')], ['auto', T('ws.auto')]], BK.niche, function (x) { BK.switchNiche(x); }, 'ws');
    return el('div', { cls: 'top' }, [
      el('button', { type: 'button', cls: 'burger', 'aria-label': T('nav.open'), 'aria-expanded': BK.UI.menu ? 'true' : 'false', onclick: function () { BK.UI.menu = !BK.UI.menu; BK.render(BK.UI.menu ? '.ni.on' : '.burger'); } }, [icon('menu'), el('span', { text: T('m.' + BK.UI.mod) })]),
      el('div', { cls: 'rolebox' }, [el('span', { cls: 'rl', text: T('ws.pick') }), ws, el('span', { cls: 'rl', text: T('role.viewAs') }), roles, el('button', { type: 'button', cls: 'reset', text: T('app.reset'), onclick: function () { BK.reset(); } })]),
      el('p', { cls: 'rolenote' }, [icon(r === 'owner' ? 'shield' : 'lock'), el('span', {}, [el('b', { text: T('role.' + r) + '. ' }), T('note.' + r, { name: BK.staffName(BK.DB.me) })])])
    ]);
  }
  BK.switchNiche = function (n) {
    if (n === BK.niche) return;
    var role = BK.DB.role; BK.niche = n; BK.DB = BK.DBS[n]; BK.DB.role = role;
    if (!BK.modOK(BK.UI.mod)) BK.UI.mod = 'home';
    BK.UI.sel = null;
    BK.render('[data-k="' + n + '"]');
    BK.toast(T('toast.ws', { name: BK.DB.settings.name }));
  };
  BK.reset = function () {
    var role = BK.DB.role;
    BK.DBS = { clinic: BK.seed('clinic'), auto: BK.seed('auto') }; BK.DB = BK.DBS[BK.niche]; BK.DB.role = role;
    BK.UI = BK.newUI(); BK.render('.reset'); BK.toast(T('toast.reset'));
  };
}(window));
