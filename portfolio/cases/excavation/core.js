/* Shared model of the demo: one in-memory data set used by the website, the manager panel and the under-the-hood tab. Fictional data only. */
(function (w) {
  'use strict';
  var EX = w.EX = {};
  EX.t = function (k, v) { return w.MFI18N.t(k, v); };
  EX.$ = function (id) { return w.document.getElementById(id); };
  EX.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  EX.fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  EX.clock = function () { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };

  EX.SERV = {
    pit: { rate: 9, min: 10, max: 300, step: 5, def: 60, unit: 'm³' },
    trench: { rate: 14, min: 5, max: 200, step: 5, def: 40, unit: 'm' },
    grade: { rate: 2.2, min: 50, max: 2000, step: 50, def: 400, unit: 'm²' },
    drive: { rate: 3.4, min: 20, max: 600, step: 10, def: 120, unit: 'm²' },
    demo: { rate: 7, min: 10, max: 400, step: 10, def: 60, unit: 'm²' }
  };
  EX.SERV_IDS = ['pit', 'trench', 'grade', 'drive', 'demo'];
  EX.ACC = { open: 1, tight: 1.25, hard: 1.6 };
  EX.TIM = { flex: 0.95, month: 1, urgent: 1.2 };
  EX.EXTRA = { haul: 0.18, clear: 0.1 };
  EX.AREAS = [
    { id: 'central', name: 'Riverton Central', g: 1 }, { id: 'north', name: 'Northgate', g: 1 }, { id: 'mill', name: 'Millbrook', g: 1 }, { id: 'harbor', name: 'Harbor Hill', g: 1 },
    { id: 'east', name: 'Eastfield', g: 2 }, { id: 'west', name: 'Westbridge', g: 2 }, { id: 'oak', name: 'Oakmoor', g: 2 }, { id: 'stone', name: 'Stonebay', g: 2 }
  ];
  EX.TEAM = ['Alex M.', 'Dana P.', 'Robin S.'];
  EX.STATUSES = ['new', 'contacted', 'visit', 'quoted', 'won', 'declined'];
  EX.BADGE = { new: 'info', contacted: 'warn', visit: 'warn', quoted: 'info', won: 'ok', declined: 'muted' };
  EX.PAGES = ['home', 'services', 'service', 'projects', 'equipment', 'areas', 'process', 'pricing', 'faq', 'guide', 'contact', 'thanks'];
  EX.PATH = { home: '/', services: '/services', service: '/services/', projects: '/projects', equipment: '/equipment', areas: '/service-area', process: '/how-we-work', pricing: '/pricing', faq: '/faq', guide: '/guides/site-preparation', contact: '/contact', thanks: '/contact/thanks' };
  EX.SLUG = { pit: 'foundation-pits', trench: 'trenching', grade: 'grading', drive: 'driveways', demo: 'concrete-removal' };
  EX.SLOTS = ['09:00', '11:30', '14:00'];
  EX.CATALOG = [
    { id: 'mob', price: 120, unit: 'job' }, { id: 'pit', price: 9, unit: 'm³' }, { id: 'trench', price: 14, unit: 'm' }, { id: 'grade', price: 2.2, unit: 'm²' },
    { id: 'drive', price: 3.4, unit: 'm²' }, { id: 'demo', price: 7, unit: 'm²' }, { id: 'haul', price: 6, unit: 'm³' }, { id: 'breaker', price: 90, unit: 'day' }
  ];

  EX.CAP = { pit: 40, trench: 25, grade: 500, drive: 150, demo: 40 };
  EX.days = function (type, size, acc) {
    if (!type) return 0;
    return Math.max(1, Math.ceil(size / EX.CAP[type] * EX.ACC[acc] - 0.0001));
  };
  EX.estimate = function (type, size, acc, tim, extras) {
    if (!type) return null;
    var raw = EX.SERV[type].rate * size * EX.ACC[acc] * EX.TIM[tim], k = 1, i;
    extras = extras || [];
    for (i = 0; i < extras.length; i++) k += EX.EXTRA[extras[i]] || 0;
    raw = raw * k + 150;
    return { lo: Math.round(raw * 0.88 / 10) * 10, hi: Math.round(raw * 1.14 / 10) * 10 };
  };

  /* ---------- state ---------- */
  var S = EX.S = {
    reqs: [], feed: [], visits: [], templates: [], seq: 1042, evSeq: 1, quoteSeq: 301, unseen: 0,
    channels: { email: true, messenger: true, auto: true },
    selReq: null, panelView: 'inbox', filter: 'all', search: '', fresh: null
  };
  var listeners = [];
  EX.onChange = function (fn) { listeners.push(fn); };
  EX.changed = function (what) { for (var i = 0; i < listeners.length; i++) { try { listeners[i](what); } catch (e) { if (w.console) w.console.error(e); } } };

  EX.find = function (id) { for (var i = 0; i < S.reqs.length; i++) if (S.reqs[i].id === id) return S.reqs[i]; return null; };
  EX.area = function (id) { for (var i = 0; i < EX.AREAS.length; i++) if (EX.AREAS[i].id === id) return EX.AREAS[i]; return EX.AREAS[0]; };
  EX.tpl = function (id) { for (var i = 0; i < S.templates.length; i++) if (S.templates[i].id === id) return S.templates[i]; return null; };

  EX.addFeed = function (kind, textKey, vars, reqId) {
    S.feed.unshift({ kind: kind, key: textKey, vars: vars || {}, req: reqId || null, time: EX.clock() });
  };
  EX.log = function (r, k, extra) {
    var e = { k: k, time: EX.clock() }, x; for (x in extra) if (extra.hasOwnProperty(x)) e[x] = extra[x];
    r.log.push(e);
  };
  EX.setStatus = function (r, st) {
    if (r.status === st) return;
    r.status = st; EX.log(r, 'status', { st: st });
    EX.changed('status');
  };
  EX.assign = function (r, name) {
    if (r.owner === name) return;
    r.owner = name; EX.log(r, 'assign', { who: name || '' });
    if (name) EX.addFeed('messenger', 'feed.assigned', { ref: r.ref, who: name }, r.id);
    EX.changed('assign');
  };
  EX.visitAt = function (wk, day, slot) { for (var i = 0; i < S.visits.length; i++) { var v = S.visits[i]; if (v.wk === wk && v.day === day && v.slot === slot) return v; } return null; };
  EX.visitOf = function (r) { for (var i = 0; i < S.visits.length; i++) if (S.visits[i].req === r.id) return S.visits[i]; return null; };
  EX.scheduleVisit = function (r, wk, day, slot) {
    if (EX.visitAt(wk, day, slot)) return false;
    var old = EX.visitOf(r); if (old) S.visits.splice(S.visits.indexOf(old), 1);
    S.visits.push({ id: 'v' + (S.evSeq++), req: r.id, wk: wk, day: day, slot: slot });
    EX.log(r, 'visit', { wk: wk, day: day, slot: slot });
    if (r.status === 'new' || r.status === 'contacted') { r.status = 'visit'; EX.log(r, 'status', { st: 'visit' }); }
    EX.addFeed('messenger', 'feed.visit', { ref: r.ref, name: r.name }, r.id);
    EX.changed('visit'); return true;
  };
  EX.removeVisit = function (v) {
    var r = EX.find(v.req); S.visits.splice(S.visits.indexOf(v), 1);
    if (r) EX.log(r, 'visitCancel', {});
    EX.changed('visit');
  };
  EX.sendReply = function (r, text, tplId) {
    r.replies = r.replies || []; r.replies.push({ text: text, time: EX.clock() });
    EX.log(r, 'reply', { tpl: tplId || '' });
    if (r.status === 'new') { r.status = 'contacted'; EX.log(r, 'status', { st: 'contacted' }); }
    EX.addFeed('email', 'feed.replySent', { ref: r.ref, name: r.name }, r.id);
    EX.changed('reply');
  };
  EX.quoteTotal = function (q) {
    var s = 0, i; for (i = 0; i < q.lines.length; i++) s += q.lines[i].qty * q.lines[i].price;
    if (q.reserve) s *= 1.1;
    return Math.round(s);
  };
  EX.defaultQuote = function (r) {
    var lines = [{ id: 'mob', qty: 1, price: 120 }];
    if (r.service && EX.SERV[r.service]) lines.push({ id: r.service, qty: r.size || EX.SERV[r.service].def, price: EX.CATALOG[EX.catIndex(r.service)].price });
    if (r.extras && r.extras.indexOf('haul') >= 0) lines.push({ id: 'haul', qty: Math.round((r.size || 40) * 0.6), price: 6 });
    return { no: 'Q-' + (S.quoteSeq++), lines: lines, reserve: false, sent: false };
  };
  EX.catIndex = function (id) { for (var i = 0; i < EX.CATALOG.length; i++) if (EX.CATALOG[i].id === id) return i; return 0; };
  EX.sendQuote = function (r) {
    if (!r.quote) return;
    r.quote.sent = true; EX.log(r, 'quote', { no: r.quote.no });
    if (r.status !== 'won' && r.status !== 'declined') { r.status = 'quoted'; EX.log(r, 'status', { st: 'quoted' }); }
    EX.addFeed('email', 'feed.quoteSent', { ref: r.ref, no: r.quote.no }, r.id);
    EX.changed('quote');
  };

  /* A request coming from the website or the wizard: store, then notify through the enabled channels. */
  EX.createRequest = function (d) {
    var id = 'r' + (S.seq), ref = 'RW-' + (S.seq++), tm = EX.clock();
    var r = {
      id: id, ref: ref, name: d.name, contact: d.contact, area: d.area, service: d.service, size: d.size || null, acc: d.acc || null, tim: d.tim || null, extras: d.extras || [],
      lo: d.lo || null, hi: d.hi || null, note: d.note || '', noteKey: '', source: d.source || 'contact', channel: d.channel || 'form', status: 'new', owner: '', time: tm, log: [{ k: 'created', time: tm }], replies: [], quote: null
    };
    S.reqs.unshift(r); S.fresh = id; S.unseen++;
    if (S.channels.email) EX.addFeed('email', 'feed.mgrEmail', { ref: ref, name: r.name }, id);
    if (S.channels.messenger) EX.addFeed('messenger', 'feed.mgrMsg', { ref: ref, area: EX.area(r.area).name }, id);
    if (S.channels.auto) EX.addFeed('auto', 'feed.autoReply', { ref: ref, name: r.name }, id);
    EX.addFeed('system', 'feed.stored', { ref: ref }, id);
    EX.changed('new');
    return r;
  };

  function mk(n, name, contact, area, service, size, acc, tim, status, owner, source, channel, noteKey, tm, log) {
    var e = EX.estimate(service, size, acc, tim, []);
    return { id: 'r' + n, ref: 'RW-' + n, name: name, contact: contact, area: area, service: service, size: size, acc: acc, tim: tim, extras: [], lo: e.lo, hi: e.hi, note: '', noteKey: noteKey, source: source, channel: channel, status: status, owner: owner, time: tm, log: log, replies: [], quote: null };
  }
  EX.reset = function () {
    S.seq = 1042; S.evSeq = 1; S.quoteSeq = 301; S.unseen = 0;
    S.reqs = [
      mk(1041, 'Casey L.', '+0 000 000-00-41', 'east', 'demo', 80, 'open', 'urgent', 'won', 'Dana P.', 'service', 'form', 'seed.n1', '08:12',
        [{ k: 'created', time: '08:12' }, { k: 'reply', time: '08:30', tpl: 't1' }, { k: 'status', st: 'contacted', time: '08:30' }, { k: 'visit', wk: 0, day: 0, slot: 1, time: '08:50' }, { k: 'status', st: 'visit', time: '08:50' }, { k: 'quote', no: 'Q-298', time: '10:05' }, { k: 'status', st: 'quoted', time: '10:05' }, { k: 'status', st: 'won', time: '11:40' }]),
      mk(1040, 'Sam R.', 'sam.r@example.test', 'harbor', 'grade', 600, 'hard', 'flex', 'quoted', 'Alex M.', 'pricing', 'wizard', 'seed.n2', '08:41',
        [{ k: 'created', time: '08:41' }, { k: 'reply', time: '09:05', tpl: 't1' }, { k: 'status', st: 'contacted', time: '09:05' }, { k: 'visit', wk: 0, day: 1, slot: 0, time: '09:20' }, { k: 'status', st: 'visit', time: '09:20' }, { k: 'quote', no: 'Q-299', time: '09:48' }, { k: 'status', st: 'quoted', time: '09:48' }]),
      mk(1039, 'Jordan K.', '+0 000 000-00-39', 'north', 'trench', 60, 'open', 'month', 'visit', 'Robin S.', 'home', 'form', 'seed.n3', '09:30',
        [{ k: 'created', time: '09:30' }, { k: 'assign', who: 'Robin S.', time: '09:34' }, { k: 'visit', wk: 0, day: 2, slot: 2, time: '09:40' }, { k: 'status', st: 'visit', time: '09:40' }]),
      mk(1038, 'Alex Q.', 'alex.q@example.test', 'mill', 'pit', 85, 'tight', 'month', 'contacted', 'Alex M.', 'contact', 'form', 'seed.n4', '10:05',
        [{ k: 'created', time: '10:05' }, { k: 'assign', who: 'Alex M.', time: '10:08' }, { k: 'reply', time: '10:22', tpl: 't2' }, { k: 'status', st: 'contacted', time: '10:22' }]),
      mk(1037, 'Morgan T.', '+0 000 000-00-37', 'west', 'drive', 150, 'open', 'flex', 'new', '', 'guide', 'form', 'seed.n5', '10:31', [{ k: 'created', time: '10:31' }]),
      mk(1036, 'Riley B.', 'riley.b@example.test', 'oak', 'demo', 45, 'tight', 'urgent', 'declined', 'Dana P.', 'service', 'form', 'seed.n6', '07:55',
        [{ k: 'created', time: '07:55' }, { k: 'reply', time: '08:10', tpl: 't2' }, { k: 'status', st: 'contacted', time: '08:10' }, { k: 'status', st: 'declined', time: '08:44' }])
    ];
    S.reqs[0].quote = { no: 'Q-298', lines: [{ id: 'mob', qty: 1, price: 120 }, { id: 'demo', qty: 80, price: 7 }, { id: 'breaker', qty: 1, price: 90 }], reserve: false, sent: true };
    S.reqs[1].quote = { no: 'Q-299', lines: [{ id: 'mob', qty: 1, price: 120 }, { id: 'grade', qty: 600, price: 2.2 }], reserve: true, sent: true };
    S.visits = [
      { id: 'v1', req: 'r1041', wk: 0, day: 0, slot: 1 }, { id: 'v2', req: 'r1040', wk: 0, day: 1, slot: 0 }, { id: 'v3', req: 'r1039', wk: 0, day: 2, slot: 2 }
    ];
    S.evSeq = 4;
    S.templates = [{ id: 't1', n: 'tpl.1' }, { id: 't2', n: 'tpl.2' }, { id: 't3', n: 'tpl.3' }, { id: 't4', n: 'tpl.4' }];
    S.feed = [];
    EX.addFeed('email', 'feed.mgrEmail', { ref: 'RW-1037', name: 'Morgan T.' }, 'r1037');
    EX.addFeed('messenger', 'feed.mgrMsg', { ref: 'RW-1037', area: 'Westbridge' }, 'r1037');
    EX.addFeed('auto', 'feed.autoReply', { ref: 'RW-1037', name: 'Morgan T.' }, 'r1037');
    S.selReq = 'r1037'; S.fresh = null; S.unseen = 0;
  };
  EX.reset();
}(window));
