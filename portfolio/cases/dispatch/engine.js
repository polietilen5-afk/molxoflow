/* Route Match demo: fictional data, shared state and the matching engine. No network, no storage. */
(function (w) {
  'use strict';
  var t = function (k, v) { return w.MFI18N.t(k, v); };
  var RM = w.RM = { mods: {}, acts: {}, ins: {} };

  /* ---------- cities (fictional) ---------- */
  var CITY_IDS = ['riverton', 'milford', 'stonebridge', 'oakdale', 'kingsport', 'lakeview', 'brookside', 'fairhaven'];
  var DAYSETS = { 'daily': [1, 2, 3, 4, 5, 6, 7], 'mon-sat': [1, 2, 3, 4, 5, 6], 'weekdays': [1, 2, 3, 4, 5], 'tts': [2, 4, 6], 'weekend': [6, 7] };
  RM.DAYSETS = DAYSETS;
  RM.CITY_IDS = CITY_IDS;

  function defaultState() {
    return {
      cities: {
        riverton: { id: 'riverton', cc: 'nm', x: 0, y: 0, al: ['rivertown'] },
        milford: { id: 'milford', cc: 'nm', x: 60, y: 10, al: [] },
        stonebridge: { id: 'stonebridge', cc: 'nm', x: 30, y: -40, al: [] },
        oakdale: { id: 'oakdale', cc: 'ea', x: -70, y: 30, al: ['oak dale'] },
        kingsport: { id: 'kingsport', cc: 'ea', x: -110, y: 80, al: [] },
        lakeview: { id: 'lakeview', cc: 'nm', x: -20, y: -30, al: [] },
        brookside: { id: 'brookside', cc: 'nm', x: -28, y: -24, al: [] },
        fairhaven: { id: 'fairhaven', cc: 'ea', x: 120, y: 90, al: [] }
      },
      routes: [
        { id: 'r1', kind: 'route', zones: [['riverton'], ['milford']], mode: 'zones', radius: 25, cap: 0, occ: 0, time: '07:30', days: 'daily', types: ['passenger', 'parcel'], on: true, geo: 'ok' },
        { id: 'r2', kind: 'route', zones: [['milford'], ['riverton']], mode: 'zones', radius: 25, cap: 0, occ: 0, time: '17:00', days: 'daily', types: ['passenger', 'parcel'], on: true, geo: 'ok' },
        { id: 'r3', kind: 'route', zones: [['riverton'], ['stonebridge']], mode: 'zones', radius: 25, cap: 0, occ: 0, time: '09:00', days: 'tts', types: ['parcel'], on: true, geo: 'ok' },
        { id: 'r4', kind: 'route', zones: [['oakdale'], ['kingsport']], mode: 'zones', radius: 25, cap: 0, occ: 0, time: '08:15', days: 'mon-sat', types: ['passenger', 'parcel'], on: true, geo: 'stale' },
        { id: 'r5', kind: 'route', zones: [['lakeview'], ['riverton']], mode: 'zones', radius: 25, cap: 0, occ: 0, time: '14:00', days: 'weekdays', types: ['passenger', 'parcel'], on: true, geo: 'ok' },
        { id: 'g1', kind: 'group', nameKey: 'rt.circuit.coast', zones: [['riverton', 'lakeview'], ['milford', 'fairhaven']], mode: 'zones', radius: 40, cap: 8, occ: 5, time: '06:45', days: 'mon-sat', types: ['passenger', 'parcel'], on: true, geo: 'ok' },
        { id: 'g2', kind: 'group', nameKey: 'rt.circuit.valley', stops: ['oakdale', 'stonebridge', 'riverton', 'milford'], mode: 'linear', radius: 40, cap: 6, occ: 6, time: '05:30', days: 'weekdays', types: ['passenger'], on: true, geo: 'ok' }
      ],
      groups: [
        { id: 'g1', on: true, auto: false }, { id: 'g2', on: true, auto: false },
        { id: 'g3', on: true, auto: false }, { id: 'g4', on: false, auto: true }
      ],
      excl: [t('kw.def')],
      rules: { high: 70, review: 40, near: 40, fuzzy: 80, pDay: 15, pFull: 20, pType: 25 },
      cfg: {
        llmOn: true, provider: 'cloud', key: true, model: 'std', prefilter: true, corridor: true,
        quiet: false, qFrom: '22:00', qTo: '07:00', sla: 30, tg: true, tgCollector: true, repeat: 15,
        limit: 14, used: 0, budgetAlerted: false, backup: true, every: 'daily', keep: 7, backups: 2,
        autostart: true, portal: false, interval: 4
      },
      tpl: [
        { id: 't1', kind: 'passenger', text: null }, { id: 't2', kind: 'parcel', text: null },
        { id: 't3', kind: 'noroute', text: null }, { id: 't4', kind: 'decline', text: null }
      ],
      log: [], leads: [], items: [], uid: 0, lid: 0, cursor: 0, clock: 9 * 60 + 38,
      paused: false, nextRoute: 8, nextTpl: 5, nextCity: 1, sent: {}
    };
  }
  RM.S = null;
  RM.reset = function () { RM.S = defaultState(); };

  /* ---------- messages: fictional pool ---------- */
  /* d: weekday (Mon=1, demo "today" = Thursday); n: volume number; kind: req|noise */
  var MSGS = [
    { id: 'm1', g: 'g2', kind: 'req', type: 'parcel', day: 5, rel: 'tomorrow', n: 2, src: 'llm', who: 'Alex M', phone: '+0 000 555-01-12' },
    { id: 'm3', g: 'g1', kind: 'noise', why: 'offtopic', who: 'Dana K' },
    { id: 'm2', g: 'g1', kind: 'req', type: 'passenger', day: 5, rel: 'none', n: 3, src: 'llm', who: 'Sam R', phone: '+0 000 555-02-47' },
    { id: 'm6', g: 'g3', kind: 'noise', why: 'offer', who: 'Max T' },
    { id: 'm5', g: 'g2', kind: 'req', type: 'parcel', day: 4, rel: 'today', n: 1, src: 'llm', who: 'Lena P', phone: '+0 000 555-03-08' },
    { id: 'm4', g: 'g3', kind: 'req', type: 'passenger', day: 6, rel: 'none', n: 1, src: 'regex', who: 'Ira V', phone: '+0 000 555-04-33' },
    { id: 'm10', g: 'g1', kind: 'req', type: 'passenger', day: 5, rel: 'tomorrow', n: 1, src: 'llm', who: 'Tom B', phone: '+0 000 555-05-90' },
    { id: 'm7', g: 'g1', kind: 'req', type: 'passenger', day: 1, rel: 'none', n: 2, src: 'llm', who: 'Nina S', phone: '+0 000 555-06-21' },
    { id: 'm15', g: 'g2', kind: 'req', type: 'passenger', day: 5, rel: 'none', n: 3, src: 'llm', who: 'Sam R', phone: '+0 000 555-02-47' },
    { id: 'm8', g: 'g3', kind: 'req', type: 'parcel', day: 5, rel: 'none', n: 1, src: 'llm', who: 'Oleg F', phone: '+0 000 555-07-64' },
    { id: 'm9', g: 'g3', kind: 'noise', why: 'chatter', who: 'Dana K' },
    { id: 'm11', g: 'g2', kind: 'req', type: 'parcel', day: 5, rel: 'none', n: 1, src: 'llm', who: 'Kim L', phone: '+0 000 555-08-15' },
    { id: 'm16', g: 'g4', kind: 'req', type: 'passenger', day: 6, rel: 'none', n: 2, src: 'llm', who: 'Pia W', phone: '+0 000 555-11-39' },
    { id: 'm13', g: 'g1', kind: 'req', type: 'passenger', day: 4, rel: 'none', n: 2, src: 'regex', who: 'Rob N', phone: '+0 000 555-09-72' },
    { id: 'm12', g: 'g3', kind: 'noise', why: 'ad', who: 'Max T' },
    { id: 'm14', g: 'g1', kind: 'req', type: 'passenger', day: 4, rel: 'none', n: 2, src: 'llm', who: 'Eva D', phone: '+0 000 555-10-06' }
  ];
  var META = {};
  MSGS.forEach(function (m) { META[m.id] = m; });
  RM.META = META; RM.MSGS = MSGS;

  /* ---------- helpers ---------- */
  RM.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  RM.cityName = function (id) { var c = RM.S.cities[id]; if (!c) return '?'; return c.custom ? c.custom : t('city.' + id); };
  RM.routeName = function (r) {
    if (r.nameKey) return t(r.nameKey);
    if (r.name) return r.name;
    return RM.cityName(r.zones[0][0]) + ' → ' + RM.cityName(r.zones[1][0]);
  };
  RM.routePath = function (r) {
    var f = function (a) { return a.map(RM.cityName).join(' / '); };
    if (r.mode === 'linear') return r.stops.map(RM.cityName).join(' → ');
    return f(r.zones[0]) + ' → ' + f(r.zones[1]);
  };
  RM.clockText = function (m) { var h = Math.floor(m / 60) % 24, mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; };
  function dist(a, b) { var p = RM.S.cities[a], q = RM.S.cities[b]; return Math.round(Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2))); }
  RM.dist = dist;

  RM.parts = function (str) {
    var out = [], re = /\[([fytdq]):([^\]]*)\]/g, last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) out.push({ k: '', s: str.slice(last, m.index) });
      out.push({ k: m[1], s: m[2] }); last = re.lastIndex;
    }
    if (last < str.length) out.push({ k: '', s: str.slice(last) });
    return out;
  };
  RM.plain = function (str) { return RM.parts(str).map(function (p) { return p.s; }).join(''); };
  RM.spanOf = function (str, k) { var p = RM.parts(str); for (var i = 0; i < p.length; i++) if (p[i].k === k) return p[i].s; return ''; };
  RM.marked = function (str, on) {
    return RM.parts(str).map(function (p, i) {
      return p.k && on ? '<mark class="hl hl-' + p.k + '" style="--i:' + i + '">' + RM.esc(p.s) + '</mark>' : RM.esc(p.s);
    }).join('');
  };

  /* ---------- journal ---------- */
  RM.log = function (kind, key, p, lvl) {
    var S = RM.S;
    S.log.unshift({ id: S.log.length + 1, kind: kind, k: key, p: p || {}, lvl: lvl || 'info', time: RM.clockText(S.clock) });
    if (S.log.length > 300) S.log.length = 300;
  };
  RM.logText = function (e) {
    var p = {}, k;
    for (k in e.p) {
      if (Object.prototype.hasOwnProperty.call(e.p, k)) p[k] = /_c$/.test(k) ? RM.cityName(e.p[k]) : e.p[k];
    }
    return t(e.k, p);
  };

  /* ---------- city normalisation ---------- */
  function lev(a, b) {
    var m = a.length, n = b.length, i, j, p = [], c;
    if (!m) return n; if (!n) return m;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) {
      var prev = p[0]; p[0] = i;
      for (j = 1; j <= n; j++) {
        c = p[j];
        p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        prev = c;
      }
    }
    return p[n];
  }
  RM.ratio = function (a, b) { var mx = Math.max(a.length, b.length); return mx ? 1 - lev(a, b) / mx : 0; };
  RM.normalize = function (raw) {
    var S = RM.S, s = String(raw || '').toLowerCase().replace(/^\s+|\s+$/g, ''), id, c, best = null, r, i, names;
    if (!s) return null;
    for (id in S.cities) {
      c = S.cities[id];
      if (RM.cityName(id).toLowerCase() === s) return { id: id, how: 'exact', r: 1 };
      for (i = 0; i < c.al.length; i++) if (c.al[i].toLowerCase() === s) return { id: id, how: 'alias', r: 1 };
    }
    for (id in S.cities) {
      c = S.cities[id]; names = [RM.cityName(id)].concat(c.al);
      for (i = 0; i < names.length; i++) {
        r = RM.ratio(s, names[i].toLowerCase());
        if (r >= S.rules.fuzzy / 100 && (!best || r > best.r)) best = { id: id, how: 'fuzzy', r: r };
      }
    }
    return best;
  };

  /* ---------- LLM availability ---------- */
  RM.llmUp = function () { var c = RM.S.cfg; return c.llmOn && c.key && c.used < c.limit; };
  RM.llmWhy = function () { var c = RM.S.cfg; if (!c.llmOn) return 'off'; if (!c.key) return 'nokey'; if (c.used >= c.limit) return 'budget'; return ''; };
  RM.quietNow = function () {
    var c = RM.S.cfg; if (!c.quiet) return false;
    var m = RM.S.clock % 1440, f = +c.qFrom.slice(0, 2) * 60 + +c.qFrom.slice(3), e = +c.qTo.slice(0, 2) * 60 + +c.qTo.slice(3);
    return f > e ? (m >= f || m < e) : (m >= f && m < e);
  };

  /* ---------- matching ---------- */
  function endTier(cid, list, radius) {
    if (!cid) return null;
    if (list.indexOf(cid) >= 0) return { t: 'exact', km: 0 };
    var best = null, i, d;
    for (i = 0; i < list.length; i++) { d = dist(cid, list[i]); if (d <= radius && (!best || d < best.km)) best = { t: 'near', km: d }; }
    return best;
  }
  RM.score = function (lead, r) {
    var S = RM.S, R = S.rules, rad = r.radius || R.near, o, d, s, why = [], tier;
    if (!lead.from || !lead.to) return null;
    if (r.mode === 'linear') {
      var best = null, i, j, oi, di;
      for (i = 0; i < r.stops.length; i++) {
        o = endTier(lead.from, [r.stops[i]], rad); if (!o) continue;
        for (j = i + 1; j < r.stops.length; j++) {
          d = endTier(lead.to, [r.stops[j]], rad); if (!d) continue;
          var v = (o.t === 'exact' ? 1 : 0.6) + (d.t === 'exact' ? 1 : 0.6);
          if (!best || v > best.v) best = { v: v, o: o, d: d };
        }
      }
      if (!best) return null; o = best.o; d = best.d;
    } else {
      o = endTier(lead.from, r.zones[0], rad); d = endTier(lead.to, r.zones[1], rad);
      if (!o || !d) {
        var cc = function (id) { return S.cities[id].cc; };
        var ok1 = r.zones[0].some(function (x) { return cc(x) === cc(lead.from); });
        var ok2 = r.zones[1].some(function (x) { return cc(x) === cc(lead.to); });
        if (ok1 && ok2) {
          s = 30; tier = 'country'; why.push({ c: 'warn', k: 'why.country' });
          return finish(lead, r, s, tier, why);
        }
        return null;
      }
    }
    var val = function (x) { return x.t === 'exact' ? 1 : 1 - 0.5 * x.km / rad; };
    s = (val(o) + val(d)) * 50; tier = (o.t === 'exact' && d.t === 'exact') ? 'exact' : 'nearby';
    why.push(o.t === 'exact' ? { c: 'ok', k: 'why.o.exact' } : { c: 'warn', k: 'why.o.near', km: o.km });
    why.push(d.t === 'exact' ? { c: 'ok', k: 'why.d.exact' } : { c: 'warn', k: 'why.d.near', km: d.km });
    if (lead.fz) { s = Math.min(65, 40 + (lead.fz * 100 - 80) * 1.25); tier = 'partial'; why.push({ c: 'warn', k: 'why.fuzzy' }); }
    return finish(lead, r, s, tier, why);
  };
  function finish(lead, r, s, tier, why) {
    var R = RM.S.rules;
    if (r.types.indexOf(lead.type) < 0) { s -= R.pType; why.push({ c: 'bad', k: 'why.type' }); }
    if (DAYSETS[r.days].indexOf(lead.day) < 0) { s -= R.pDay; why.push({ c: 'bad', k: 'why.day.no', day: lead.day }); }
    else why.push({ c: 'ok', k: 'why.day.ok', day: lead.day });
    if (r.cap && r.occ >= r.cap) { s -= R.pFull; why.push({ c: 'bad', k: 'why.full' }); }
    s = Math.round(s);
    if (s < 15) return null;
    return { route: r, s: s, tier: tier, lv: s >= R.high ? 'high' : (s >= R.review ? 'medium' : 'low'), why: why };
  }
  RM.cands = function (lead) {
    var out = [];
    RM.S.routes.forEach(function (r) { if (!r.on) return; var c = RM.score(lead, r); if (c) out.push(c); });
    out.sort(function (a, b) { return b.s - a.s; });
    return out;
  };
  RM.best = function (lead) { var c = RM.cands(lead); return c.length ? c[0] : null; };
  /* tab class of a lead: unrec | high | review */
  RM.klass = function (lead) {
    if (!lead.from || !lead.to) return 'unrec';
    var b = RM.best(lead);
    if (!b) return 'unrec';
    return b.lv === 'high' ? 'high' : 'review';
  };

  /* ---------- pipeline: message -> lead ---------- */
  RM.addMsg = function () {
    var S = RM.S, m = MSGS[S.cursor % MSGS.length];
    S.cursor++; S.clock += 2 + (S.cursor % 3);
    var it = { uid: ++S.uid, mid: m.id, time: RM.clockText(S.clock), min: S.clock, state: '', lead: null, src: '', unread: true, reason: '' };
    S.items.unshift(it);
    if (S.items.length > 60) S.items.length = 60;
    RM.process(it);
    return it;
  };
  RM.process = function (it) {
    var S = RM.S, m = META[it.mid], g = null, i, txt = t('m.' + it.mid);
    for (i = 0; i < S.groups.length; i++) if (S.groups[i].id === m.g) g = S.groups[i];
    if (g && g.auto && !it.seen) { it.seen = true; RM.log('system', 'lg.group.new', { name: t('grp.' + m.g) }); }
    if (!g || !g.on) { it.state = 'ignored'; it.reason = 'group'; return; }
    var low = RM.plain(txt).toLowerCase();
    for (i = 0; i < S.excl.length; i++) {
      if (S.excl[i] && low.indexOf(S.excl[i].toLowerCase()) >= 0) { it.state = 'excluded'; it.reason = S.excl[i]; RM.log('parse', 'lg.excluded', { kw: S.excl[i] }); return; }
    }
    if (m.kind === 'noise') {
      if (S.cfg.prefilter) { it.state = 'noise'; it.reason = 'prefilter'; it.src = 'pre'; return; }
      if (RM.llmUp()) { S.cfg.used++; it.state = 'noise'; it.reason = 'llm'; it.src = 'llm'; RM.log('parse', 'lg.llm.irrelevant', {}); RM.budgetCheck(); return; }
      it.state = 'noise'; it.reason = 'noai'; it.src = 'regex'; return;
    }
    var src = m.src, why = '';
    if (src === 'llm') {
      if (RM.llmUp()) { S.cfg.used++; }
      else { src = 'failed'; why = RM.llmWhy(); RM.log('error', 'lg.llm.down.' + why, { who: m.who }, 'warn'); }
    }
    it.src = src;
    var rawF = RM.spanOf(txt, 'f'), rawT = RM.spanOf(txt, 't');
    var nf = src === 'failed' ? null : RM.normalize(rawF), nt = src === 'failed' ? null : RM.normalize(rawT);
    var lead = {
      id: 'L' + (++S.lid), uid: it.uid, mid: it.mid, from: nf ? nf.id : null, to: nt ? nt.id : null, rawF: rawF, rawT: rawT,
      hf: nf ? nf.how : '', ht: nt ? nt.how : '', fz: 0, type: m.type, day: m.day, rel: m.rel, n: m.n, who: m.who, phone: m.phone,
      src: src, status: 'new', notes: '', min: S.clock, route: null, dup: null, sent: false, edited: false
    };
    if ((nf && nf.how === 'fuzzy') || (nt && nt.how === 'fuzzy')) lead.fz = Math.min(nf && nf.how === 'fuzzy' ? nf.r : 1, nt && nt.how === 'fuzzy' ? nt.r : 1);
    if (lead.from && lead.to) {
      for (i = 0; i < S.leads.length; i++) {
        var o = S.leads[i];
        if (o.status !== 'rejected' && !o.dup && o.who === lead.who && o.from === lead.from && o.to === lead.to && o.day === lead.day && o.type === lead.type) { lead.dup = o.id; break; }
      }
    }
    S.leads.unshift(lead);
    it.state = 'lead'; it.lead = lead.id;
    RM.log('parse', src === 'failed' ? 'lg.lead.failed' : 'lg.lead', { id: lead.id, src: t('src.' + src), from_c: lead.from || 'riverton', who: m.who }, src === 'failed' ? 'warn' : 'info');
    if (lead.dup) RM.log('parse', 'lg.dup', { id: lead.id, of: lead.dup });
    if (lead.hf === 'fuzzy' || lead.ht === 'fuzzy') RM.log('parse', 'lg.fuzzy', { id: lead.id, a: lead.hf === 'fuzzy' ? rawF : rawT });
    if (RM.klass(lead) === 'high' && !lead.dup && S.cfg.tg) {
      if (RM.quietNow()) RM.log('alert', 'lg.alert.quiet', { id: lead.id });
      else RM.log('alert', 'lg.alert.sent', { id: lead.id });
    }
    RM.budgetCheck();
  };
  RM.budgetCheck = function () {
    var c = RM.S.cfg;
    if (c.used >= c.limit && !c.budgetAlerted) {
      c.budgetAlerted = true; RM.log('alert', 'lg.budget', {}, 'warn');
    }
  };
  RM.leadById = function (id) { for (var i = 0; i < RM.S.leads.length; i++) if (RM.S.leads[i].id === id) return RM.S.leads[i]; return null; };
  RM.renormalize = function () {
    var n = 0;
    RM.S.leads.forEach(function (l) {
      if (l.edited || l.src === 'failed') return;
      if (l.from && l.to) return;
      var a = RM.normalize(l.rawF), b = RM.normalize(l.rawT);
      if (!l.from && a) { l.from = a.id; l.hf = a.how; n++; }
      if (!l.to && b) { l.to = b.id; l.ht = b.how; n++; }
    });
    return n;
  };
  RM.sendReply = null;

  /* ---------- reply templates ---------- */
  RM.tplText = function (tp) { return tp.text === null ? t('tpl.def.' + tp.kind) : tp.text; };
  RM.tplName = function (tp) { return tp.name ? tp.name : t('tpl.name.' + tp.kind); };
  RM.render = function (tp, lead, cand) {
    var r = cand ? cand.route : null;
    var vars = {
      name: lead.who, from: lead.from ? RM.cityName(lead.from) : lead.rawF, to: lead.to ? RM.cityName(lead.to) : lead.rawT,
      route: r ? RM.routeName(r) : '', days: r ? t('days.' + r.days).toLowerCase() : '', time: r ? r.time : '',
      qty: t('q.' + lead.mid)
    };
    return RM.tplText(tp).replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m; });
  };
  RM.tplFor = function (lead, cand) {
    var kind = lead.status === 'rejected' ? 'decline' : (cand ? lead.type : 'noroute'), i;
    for (i = 0; i < RM.S.tpl.length; i++) if (RM.S.tpl[i].kind === kind) return RM.S.tpl[i];
    return RM.S.tpl[0];
  };

  RM.forms = {};
  RM.U = {};
}(window));
