/* Booking Desk demo data and the booking engine (slots, conflicts, reminders). Everything is fictional and generated in the browser. */
(function (w) {
  'use strict';
  var BK = w.BK, T = BK.T;

  /* ---------- slot engine ---------- */
  BK.hoursOf = function (st, iso) {
    if (!st || !st.on || st.off.indexOf(iso) >= 0) return null;
    return st.hours[BK.dow(iso)] || null;
  };
  function clash(staffId, iso, t, dur, ignoreId) {
    var L = BK.DB.bookings, i, b;
    for (i = 0; i < L.length; i++) {
      b = L[i];
      if (b.staff !== staffId || b.date !== iso || b.id === ignoreId || !BK.occupying(b)) continue;
      if (t < b.time + b.dur && t + dur > b.time) return true;
    }
    return false;
  }
  /* free start times of one specialist on a day; opts.noPast skips lead-time rules (seed, history) */
  BK.slots = function (staffId, iso, dur, ignoreId, opts) {
    opts = opts || {};
    var st = BK.staff(staffId), h = BK.hoursOf(st, iso), D = BK.DB, step = D.settings.interval, out = [], t;
    if (!h) return out;
    if (!opts.noPast) {
      if (iso < BK.TODAY || BK.dayNo(iso) - BK.dayNo(BK.TODAY) > D.settings.lead) return out;
    }
    for (t = h[0]; t + dur <= h[1]; t += step) {
      if (st.brk && t < st.brk[1] && t + dur > st.brk[0]) continue;
      if (!opts.noPast && iso === BK.TODAY && t < BK.NOW + 60) continue;
      if (clash(staffId, iso, t, dur, ignoreId)) continue;
      out.push(t);
    }
    return out;
  };
  BK.offering = function (svcId) { return BK.DB.staff.filter(function (s) { return s.on && s.svcs.indexOf(svcId) >= 0; }); };
  /* slots for a service with "any specialist": [{t, staff}] with the least busy specialist chosen */
  BK.slotsFor = function (svcId, staffId, iso) {
    var s = BK.svc(svcId), list = staffId && staffId !== 'any' ? [BK.staff(staffId)] : BK.offering(svcId), map = {}, out = [];
    if (!s || !s.on) return out;
    list.forEach(function (st) {
      if (!st) return;
      var load = BK.DB.bookings.filter(function (b) { return b.staff === st.id && b.date === iso && BK.active(b); }).length;
      BK.slots(st.id, iso, s.dur).forEach(function (t) { if (!map[t] || load < map[t].load) map[t] = { t: t, staff: st.id, load: load }; });
    });
    Object.keys(map).map(Number).sort(function (a, b) { return a - b; }).forEach(function (t) { out.push({ t: t, staff: map[t].staff }); });
    return out;
  };
  BK.firstSlots = function (svcId, n, from) {
    var out = [], d = from || BK.TODAY, i, ss;
    for (i = 0; i < BK.DB.settings.lead && out.length < n; i++) {
      ss = BK.slotsFor(svcId, 'any', BK.addDays(d, i));
      ss.slice(0, 2).forEach(function (x) { if (out.length < n) out.push({ d: BK.addDays(d, i), t: x.t, staff: x.staff }); });
    }
    return out;
  };
  BK.freeToday = function () {
    var n = 0;
    BK.DB.staff.forEach(function (s) { n += BK.slots(s.id, BK.TODAY, BK.DB.settings.interval).length; });
    return n;
  };
  /* active bookings that no longer fit the team schedule (time off added, hours changed) */
  BK.conflicts = function () {
    return BK.DB.bookings.filter(function (b) {
      if (!BK.active(b) || b.date < BK.TODAY) return false;
      var st = BK.staff(b.staff), h = BK.hoursOf(st, b.date);
      if (!h) return true;
      if (b.time < h[0] || b.time + b.dur > h[1]) return true;
      return !!(st.brk && b.time < st.brk[1] && b.time + b.dur > st.brk[0]);
    });
  };

  /* ---------- clients ---------- */
  BK.digits = function (p) { return String(p).replace(/\D/g, ''); };
  BK.findClient = function (phone) {
    var d = BK.digits(phone), L = BK.DB.clients, i;
    for (i = 0; i < L.length; i++) if (BK.digits(L[i].phone) === d) return L[i];
    return null;
  };
  BK.clientStats = function (id) {
    var L = BK.DB.bookings.filter(function (b) { return b.client === id; }), s = { all: L.length, done: 0, noshow: 0, cancelled: 0, last: null, next: null };
    L.forEach(function (b) {
      if (b.status === 'done') { s.done++; if (!s.last || b.date + b.time > s.last.date + s.last.time) s.last = b; }
      else if (b.status === 'noshow') s.noshow++;
      else if (b.status === 'cancelled') s.cancelled++;
      else if (BK.active(b) && BK.abs(b.date, b.time) >= BK.nowAbs() && (!s.next || BK.abs(b.date, b.time) < BK.abs(s.next.date, s.next.time))) s.next = b;
    });
    return s;
  };
  BK.clientNote = function (c) { return c.note || (c.noteKey ? T(c.noteKey) : ''); };

  /* ---------- booking lifecycle (used by every channel: admin, public page, assistant, bot) ---------- */
  function codeOf(n) { return 'BD-' + (1000 + n); }
  BK.byCode = function (code) {
    code = String(code || '').trim().toUpperCase();
    for (var i = 0; i < BK.DB.bookings.length; i++) if (BK.DB.bookings[i].code === code) return BK.DB.bookings[i];
    return null;
  };
  /* o: {svc, staff, date, time, name, phone, client, src, note, status, noPast} -> {ok, b} | {err} */
  BK.book = function (o) {
    var s = BK.svc(o.svc), D = BK.DB, st, c, b, n;
    if (!s || !s.on) return { err: 'svc' };
    st = BK.staff(o.staff);
    if (!st || BK.slots(st.id, o.date, s.dur, null, { noPast: !!o.noPast }).indexOf(o.time) < 0) return { err: 'taken' };
    c = o.client ? BK.client(o.client) : BK.findClient(o.phone);
    if (!c) {
      c = { id: BK.nextId('c'), name: o.name, phone: o.phone, tags: ['new'], note: '', extra: '', ch: 'tg', created: BK.TODAY };
      D.clients.push(c);
      if (!o.quiet) BK.log('cli', 'client.new', { name: c.name }, c.id, o.src === 'web' || o.src === 'bot' || o.src === 'ai' ? 'client' : null);
    }
    n = D.seq.b = (D.seq.b || 0) + 1;
    b = { id: 'b' + n, code: codeOf(n), date: o.date, time: o.time, dur: s.dur, svc: s.id, staff: st.id, client: c.id, src: o.src, note: o.note || '', status: o.status || (o.src === 'manual' || o.src === 'phone' ? 'confirmed' : (D.settings.autoConfirm ? 'confirmed' : 'pending')), created: o.created || BK.stamp() };
    D.bookings.push(b);
    if (!o.quiet) {
      BK.log('list', 'booking.new', { code: b.code, name: c.name, svc: b.svc, d: b.date, tm: b.time, src: b.src }, b.id, o.src === 'web' || o.src === 'bot' || o.src === 'ai' ? 'client' : null);
      BK.notify('new', { code: b.code, name: c.name, svc: b.svc, d: b.date, tm: b.time, staff: st.name, src: b.src }, b.id);
    }
    return { ok: true, b: b };
  };
  var NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['done', 'noshow', 'cancelled'] };
  BK.canSet = function (b, st) { return !!NEXT[b.status] && NEXT[b.status].indexOf(st) >= 0; };
  BK.setStatus = function (b, st, reason, actor) {
    if (!BK.canSet(b, st)) return false;
    b.status = st; if (reason) b.reason = reason;
    var c = BK.client(b.client);
    BK.log('list', 'booking.st', { code: b.code, st: st, name: c ? c.name : '' }, b.id, actor || null);
    if (st === 'cancelled') BK.notify('cancel', { code: b.code, name: c ? c.name : '', svc: b.svc, d: b.date, tm: b.time }, b.id);
    return true;
  };
  BK.move = function (b, date, time, staffId, actor) {
    var s = BK.svc(b.svc);
    if (BK.slots(staffId, date, s ? s.dur : b.dur, b.id).indexOf(time) < 0) return false;
    b.date = date; b.time = time; b.staff = staffId;
    BK.log('list', 'booking.move', { code: b.code, d: date, tm: time }, b.id, actor || null);
    BK.notify('moved', { code: b.code, name: BK.clientName(b.client), d: date, tm: time }, b.id);
    return true;
  };

  /* ---------- reminders: derived from bookings and rules, so a rule change reshapes the queue ---------- */
  BK.RULES = [['h24', 1440], ['h2', 120]];
  BK.reminders = function () {
    var D = BK.DB, out = [], now = BK.nowAbs();
    D.bookings.forEach(function (b) {
      if (b.date < BK.TODAY) return;
      var at = BK.abs(b.date, b.time);
      if (BK.active(b)) BK.RULES.forEach(function (r) {
        if (!D.settings.rem[r[0]]) return;
        var when = at - r[1], key = b.id + '|' + r[0], st = D.remState[key] || (when <= now ? 'sent' : 'queued');
        if (at <= now && !D.remState[key]) st = 'sent';
        out.push({ key: key, kind: r[0], b: b, when: when, st: st });
      });
      if (b.status === 'done' && D.settings.rem.review) {
        var when2 = at + b.dur + 60, k2 = b.id + '|review';
        out.push({ key: k2, kind: 'review', b: b, when: when2, st: D.remState[k2] || (when2 <= now ? 'sent' : 'queued') });
      }
    });
    out.sort(function (a, b) { return a.when - b.when; });
    return out;
  };
  BK.remText = function (it) {
    var b = it.b, c = BK.client(b.client), D = BK.DB, tpl = D.tpl[it.kind] || T('tpl.' + it.kind);
    return BK.fill(tpl, { name: c ? c.name : '', svc: BK.svcName(b.svc), date: BK.fmt(b.date, 'dm'), time: BK.hhmm(b.time), place: D.settings.name });
  };
  BK.fill = function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(v, k) ? v[k] : m; }); };
  BK.whenLabel = function (abs) {
    var d = Math.floor(abs / 1440), m = abs - d * 1440, iso = BK.addDays(BK.TODAY, d - BK.dayNo(BK.TODAY));
    return BK.fmt(iso, 'dm') + ', ' + BK.hhmm(m);
  };

  /* ---------- seed ---------- */
  function rng(seed) { var s = seed; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  function hrs(a, b, sat) { return { 0: [a, b], 1: [a, b], 2: [a, b], 3: [a, b], 4: [a, b], 5: sat || null, 6: null }; }
  var M = function (h, m) { return h * 60 + (m || 0); };

  BK.seed = function (niche) {
    var prev = BK.DB, r = rng(niche === 'clinic' ? 7001 : 9127), isC = niche === 'clinic';
    var db = {
      niche: niche, role: 'owner', clock: BK.NOW + 1, seq: { b: 0, c: 0, a: 0, k: 100, s: 100 }, me: 's1',
      settings: { name: isC ? 'Harbor Dental' : 'Northline Auto', addr: 'Example Street 12, Riverton', phone: '+0 000 000-00-00', accent: isC ? '#4cc3a6' : '#ffb23e', style: 'precision', interval: 30, lead: 14, autoConfirm: false, pub: true, ai: true, bot: true,
        tg: { on: true, new: true, cancel: true, moved: true, handoff: true, remind: true }, rem: { h24: true, h2: true, review: true, ch: 'tg' } },
      services: [], staff: [], clients: [], bookings: [], audit: [], feed: [], remState: {}, tpl: { h24: null, h2: null, review: null },
      kb: [], unanswered: [], chats: { bot: { msgs: [], flow: null }, ai: { msgs: [], flow: null } }, persona: 'c2', pubSeen: 0
    };
    BK.DB = db;
    try {
      db.services = isC
        ? [{ id: 'chk', dur: 30, price: 40, on: true }, { id: 'cln', dur: 60, price: 70, on: true }, { id: 'fil', dur: 60, price: 90, on: true }, { id: 'wht', dur: 90, price: 180, on: true }, { id: 'con', dur: 30, price: 25, on: true }, { id: 'eme', dur: 30, price: 60, on: true }]
        : [{ id: 'dia', dur: 60, price: 45, on: true }, { id: 'oil', dur: 30, price: 55, on: true }, { id: 'brk', dur: 90, price: 120, on: true }, { id: 'tyr', dur: 60, price: 35, on: true }, { id: 'ins', dur: 120, price: 95, on: true }, { id: 'ac', dur: 60, price: 80, on: true }];
      db.staff = isC
        ? [{ id: 's1', name: 'Dr. Lena K.', title: 'dentist', hours: hrs(M(9), M(17), [M(9), M(14)]), brk: [M(13), M(14)], off: ['2026-11-24'], svcs: ['chk', 'cln', 'fil', 'con', 'eme'], on: true },
          { id: 's2', name: 'Dr. Marco V.', title: 'ortho', hours: { 0: null, 1: [M(10), M(18)], 2: [M(10), M(18)], 3: [M(10), M(18)], 4: [M(10), M(18)], 5: [M(10), M(15)], 6: null }, brk: [M(14), M(15)], off: [], svcs: ['chk', 'fil', 'wht', 'con'], on: true },
          { id: 's3', name: 'Sam R.', title: 'hyg', hours: hrs(M(9), M(17)), brk: [M(12, 30), M(13, 30)], off: [], svcs: ['cln', 'wht'], on: true }]
        : [{ id: 's1', name: 'Tom B.', title: 'mech', hours: hrs(M(8), M(17), [M(8), M(13)]), brk: [M(12), M(13)], off: ['2026-11-24'], svcs: ['dia', 'oil', 'brk', 'ins', 'ac'], on: true },
          { id: 's2', name: 'Ruth G.', title: 'diag', hours: hrs(M(9), M(18)), brk: [M(13), M(14)], off: [], svcs: ['dia', 'ins', 'ac'], on: true },
          { id: 's3', name: 'Noah D.', title: 'tyre', hours: hrs(M(8), M(16), [M(8), M(13)]), brk: [M(12), M(12, 30)], off: [], svcs: ['tyr', 'oil', 'brk'], on: true }];
      var names = ['Alex M.', 'Mia R.', 'Jon P.', 'Eva L.', 'Nora S.', 'Leo T.', 'Ada W.', 'Omar H.', 'Kate B.', 'Ben C.', 'Zoe F.', 'Luka D.', 'Iris N.', 'Paul Q.'];
      var vehs = ['veh.hatch', 'veh.wagon', 'veh.suv', 'veh.sedan', 'veh.van'];
      var tags = { 0: ['vip'], 1: ['regular'], 2: ['regular'], 4: ['vip'], 6: ['regular'], 7: ['new'], 11: ['new'], 12: ['regular'] };
      names.forEach(function (n, i) {
        db.clients.push({ id: 'c' + (i + 1), name: n, phone: '+0 000 000-00-' + BK.pad2(10 + i * 3), tags: tags[i] || [], note: '', noteKey: i === 1 ? 'cnote.1' : i === 4 ? 'cnote.2' : '', extra: isC ? '' : vehs[i % 5], plate: isC ? '' : 'AB ' + BK.pad2(i + 1) + '00 XX', ch: i % 4 === 3 ? 'sms' : 'tg', created: BK.addDays(BK.TODAY, -60 + i * 3) });
      });
      db.seq.c = names.length;
      var W = [0.42, 0.25, 0.1, 0.13, 0.1], SRC = ['web', 'bot', 'ai', 'phone', 'manual'];
      function pickSrc() { var x = r(), a = 0, i; for (i = 0; i < W.length; i++) { a += W[i]; if (x < a) return SRC[i]; } return 'web'; }
      var off, st, d, cnt, k, svc, sl, t, b, status, x;
      for (off = -21; off <= 11; off++) {
        d = BK.addDays(BK.TODAY, off);
        if (BK.dow(d) === 6) continue;
        for (var si = 0; si < db.staff.length; si++) {
          st = db.staff[si];
          cnt = off > 3 ? 1 + Math.floor(r() * 3) : 2 + Math.floor(r() * 3);
          for (k = 0; k < cnt; k++) {
            svc = BK.svc(st.svcs[Math.floor(r() * st.svcs.length)]);
            sl = BK.slots(st.id, d, svc.dur, null, { noPast: true });
            if (!sl.length) continue;
            t = sl[Math.floor(r() * sl.length)];
            x = r();
            if (d < BK.TODAY) status = x < 0.82 ? 'done' : x < 0.9 ? 'noshow' : 'cancelled';
            else if (d === BK.TODAY) status = t + svc.dur <= BK.NOW ? 'done' : 'confirmed';
            else status = x < 0.18 ? 'pending' : 'confirmed';
            var cl = db.clients[Math.floor(r() * db.clients.length)];
            var res = BK.book({ svc: svc.id, staff: st.id, date: d, time: t, client: cl.id, src: pickSrc(), status: status, noPast: true, quiet: true, created: BK.addDays(d, -1 - Math.floor(r() * 3)) + ' ' + BK.hhmm(M(9) + Math.floor(r() * 500)) });
            if (res.ok && status === 'cancelled') res.b.reason = 'reason.plans';
          }
        }
      }
      /* a few guaranteed requests waiting for confirmation, so the demo always has something to approve */
      var pend = db.bookings.filter(function (q) { return q.date > BK.TODAY && q.status !== 'cancelled'; }).sort(function (a, b2) { return a.date < b2.date ? -1 : a.date > b2.date ? 1 : a.time - b2.time; });
      for (k = 0; k < 4 && k < pend.length; k++) { pend[k].status = 'pending'; pend[k].src = k % 2 ? 'bot' : 'web'; pend[k].created = BK.TODAY + ' ' + BK.hhmm(M(8, 10) + k * 17); }
      /* the demo persona always has one upcoming booking, so the bot and the assistant can show and cancel it */
      var pc = BK.client(db.persona), has = db.bookings.some(function (q) { return q.client === pc.id && BK.active(q) && q.date >= BK.TODAY; });
      if (!has) { var fs = BK.firstSlots(db.services[0].id, 1, BK.addDays(BK.TODAY, 2))[0]; if (fs) BK.book({ svc: db.services[0].id, staff: fs.staff, date: fs.d, time: fs.t, client: pc.id, src: 'bot', status: 'confirmed', quiet: true, created: BK.TODAY + ' 07:55' }); }
      /* audit: recent creations and today's finished visits */
      db.bookings.filter(function (q) { return q.created >= BK.addDays(BK.TODAY, -3); }).sort(function (a, b2) { return a.created < b2.created ? 1 : -1; }).slice(0, 7).forEach(function (q) {
        db.audit.push({ t: q.created, role: q.src === 'web' || q.src === 'bot' || q.src === 'ai' ? 'client' : 'admin', mod: 'list', key: 'booking.new', vars: { code: q.code, name: BK.clientName(q.client), svc: q.svc, d: q.date, tm: q.time, src: q.src }, ref: q.id });
        if (q.status === 'pending') db.feed.push({ t: q.created, kind: 'new', vars: { code: q.code, name: BK.clientName(q.client), svc: q.svc, d: q.date, tm: q.time, staff: BK.staffName(q.staff), src: q.src }, ref: q.id, muted: false });
      });
      db.audit.push({ t: BK.TODAY + ' 08:00', role: 'system', mod: 'rem', key: 'rem.sent', vars: { n: 6 }, ref: null });
      db.audit.push({ t: BK.addDays(BK.TODAY, -2) + ' 17:42', role: 'owner', mod: 'svc', key: 'svc.price', vars: { svc: db.services[0].id }, ref: null });
      db.audit.sort(function (a, b2) { return a.t < b2.t ? 1 : -1; });
      db.feed.sort(function (a, b2) { return a.t < b2.t ? 1 : -1; });
      db.feed.unshift({ t: BK.TODAY + ' 09:12', kind: 'handoff', vars: { q: 'una.1' }, ref: null, muted: false });
      /* knowledge base and the queue of questions the assistant could not answer */
      ['hours', 'price', 'addr', 'cancel', 'pay', isC ? 'prepC' : 'prepA'].forEach(function (id, i) { db.kb.push({ id: id, on: true, built: true }); });
      db.unanswered.push({ id: 'u1', qk: 'una.1', ch: 'ai', t: BK.TODAY + ' 09:12' }, { id: 'u2', qk: 'una.2', ch: 'bot', t: BK.addDays(BK.TODAY, -1) + ' 18:40' });
      db.clock = BK.NOW + 1;
    } finally { /* keep the new DB active only through BK.DBS; the caller assigns it */ BK.DB = prev; }
    return db;
  };
  BK.niche = 'clinic';
  BK.DBS = { clinic: BK.seed('clinic'), auto: BK.seed('auto') };
  BK.DB = BK.DBS[BK.niche];
}(window));
