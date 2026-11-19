/* Recovery Desk demo: fictional data, shared state and the recovery engine (rules, scheduler, mail queue, events). */
(function () {
  'use strict';
  const RC = window.RC = {};
  const DAY = 864e5, HOUR = 36e5;
  const t = (k, v) => MFI18N.t(k, v);
  RC.t = t;
  RC.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LOC = { en: 'en-GB', ru: 'ru-RU', uk: 'uk-UA' };
  const loc = () => LOC[MFI18N.lang()] || 'en-GB';
  RC.fmtDate = d => new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  RC.fmtShort = d => new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short' }).format(d);
  RC.fmtTime = d => new Intl.DateTimeFormat(loc(), { hour: '2-digit', minute: '2-digit' }).format(d);
  RC.fmtNum = n => new Intl.NumberFormat(loc()).format(n);
  RC.fmtMoney = n => t('cu', { n: RC.fmtNum(n) });
  const mk = (days, h, m) => { const b = new Date(); return new Date(b.getFullYear(), b.getMonth(), b.getDate() + days, h == null ? 10 : h, m || 0, 0); };
  RC.mk = mk;
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  RC.sameDay = sameDay;
  RC.fmtStamp = d => { const n = RC.S.now; return sameDay(d, n) ? t('d.today', { t: RC.fmtTime(d) }) : sameDay(d, new Date(n.getTime() - DAY)) ? t('d.yday', { t: RC.fmtTime(d) }) : RC.fmtShort(d) + ', ' + RC.fmtTime(d); };
  const hs = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  RC.hs = hs;
  const hex8 = n => (n >>> 0).toString(16).padStart(8, '0');
  RC.hex8 = hex8;

  RC.CODES = ['expired_card', 'authentication_required', 'processing_error', 'incorrect_cvc', 'insufficient_funds', 'card_declined', 'stolen_card', 'fraud_detected'];
  RC.TPLS = ['soft_followup', 'medium_followup', 'final_notice', 'retention_offer'];
  RC.PLANS = { starter: 19, pro: 49, team: 129 };
  RC.ROLES = ['admin', 'support', 'finance'];
  RC.WHO = { admin: 'Alex M.', support: 'Dana K.', finance: 'Sam P.' };

  const CU = [
    ['Pinecrest Studio', 'Alex M.', 'pro', 14], ['Lantern Books', 'Dana K.', 'starter', 9], ['Orbit Fitness', 'Sam P.', 'team', 22],
    ['Quill and Co', 'Rita L.', 'pro', 5], ['Meridian Clinic', 'Noah B.', 'team', 30], ['Harbor Bakery', 'Mia T.', 'starter', 3],
    ['Tidewater Tools', 'Leo V.', 'pro', 11], ['Foxglove Florals', 'Eva S.', 'starter', 7], ['Cobalt Analytics', 'Max D.', 'team', 18],
    ['Juniper Learning', 'Nora F.', 'pro', 26], ['Redwood Repairs', 'Jon H.', 'starter', 2], ['Skyline Travel', 'Ava C.', 'pro', 8],
    ['Maple Street Dental', 'Tim W.', 'team', 13], ['Bluebird Print', 'Ben R.', 'starter', 16], ['Summit Coaching', 'Ivy N.', 'pro', 4],
    ['Copperleaf Cafe', 'Hugo P.', 'starter', 10], ['Nimbus Games', 'Kai Z.', 'pro', 19], ['Ironbridge Legal', 'Zoe A.', 'team', 24],
    ['Willow Wellness', 'Ola G.', 'pro', 6], ['Delta Drones', 'Ray Q.', 'team', 12], ['Sundial Studio', 'Uma J.', 'starter', 1],
    ['Brook and Barrel', 'Finn O.', 'pro', 15], ['Atlas Courier', 'Gus E.', 'team', 28], ['Honeycomb Labs', 'Pia Y.', 'starter', 20],
    ['Lumen Pottery', 'Cleo B.', 'pro', 21], ['Fieldnote Press', 'Omar T.', 'starter', 17], ['Kestrel Outdoor', 'Lena S.', 'team', 9], ['Pebble Workshop', 'Ned K.', 'pro', 6]
  ];
  /* case seeds: [customer index, reason, status, opened days ago, fate (the email step after which the customer updates the card; 0 = never)] */
  const SEED = [
    [1, 'expired_card', 'recovered', 20, 1], [3, 'insufficient_funds', 'recovered', 17, 2], [5, 'authentication_required', 'recovered', 15, 1], [7, 'expired_card', 'recovered', 12, 1],
    [9, 'card_declined', 'recovered', 11, 3], [11, 'processing_error', 'recovered', 9, 1], [13, 'insufficient_funds', 'recovered', 8, 2], [15, 'expired_card', 'recovered', 6, 2],
    [17, 'card_declined', 'lost', 22, 0], [19, 'insufficient_funds', 'lost', 18, 0], [21, 'incorrect_cvc', 'lost', 14, 0],
    [0, 'expired_card', 'campaign', 4, 3], [2, 'insufficient_funds', 'campaign', 2, 3], [4, 'card_declined', 'campaign', 1, 2], [6, 'expired_card', 'campaign', 0, 2],
    [8, 'authentication_required', 'campaign', 3, 0], [10, 'incorrect_cvc', 'campaign', 5, 0], [12, 'processing_error', 'campaign', 1, 2], [14, 'insufficient_funds', 'campaign', 3, 3], [16, 'expired_card', 'campaign', 0, 2],
    [18, 'card_declined', 'paused', 3, 0], [20, 'expired_card', 'paused', 2, 0],
    [22, 'fraud_detected', 'attention', 0, 0], [23, 'stolen_card', 'attention', 1, 0]
  ];

  RC.S = {};
  function build() {
    const S = RC.S;
    Object.keys(S).forEach(k => { delete S[k]; });
    Object.assign(S, {
      role: 'admin', mod: 'overview', sel: null, ctab: 'timeline', csel: null, now: mk(0, 10), seqN: 1000, mailN: 2000,
      customers: [], cases: [], events: [], mails: [], audit: [], drafts: [], users: [],
      rules: {
        expired_card: { cat: 'soft', tpl: 'soft_followup', delay: 48, max: 3 }, authentication_required: { cat: 'soft', tpl: 'soft_followup', delay: 24, max: 2 },
        processing_error: { cat: 'soft', tpl: 'soft_followup', delay: 1, max: 5 }, incorrect_cvc: { cat: 'soft', tpl: 'soft_followup', delay: 24, max: 2 },
        insufficient_funds: { cat: 'medium', tpl: 'medium_followup', delay: 72, max: 2 }, card_declined: { cat: 'medium', tpl: 'medium_followup', delay: 48, max: 2 },
        stolen_card: { cat: 'hard', tpl: 'final_notice', delay: 0, max: 0 }, fraud_detected: { cat: 'hard', tpl: 'final_notice', delay: 0, max: 0 }
      },
      seq: [{ day: 0, on: true }, { day: 2, on: true }, { day: 5, on: true }],
      set: { review: false, hour: 9, cap: 5, offer: false },
      integ: { provider: { on: true, secretOk: true, since: mk(-40, 11) }, mail: { on: true, domain: true }, ai: { on: true }, queue: { paused: false }, db: { backup: mk(-1, 3) } }
    });
    CU.forEach((c, i) => {
      const slug = c[0].toLowerCase().replace(/[^a-z]+/g, '');
      S.customers.push({ id: 'c' + (i + 1), name: c[0], contact: c[1], email: c[1].split(' ')[0].toLowerCase().replace('.', '') + '@' + slug + '.example', plan: c[2], months: c[3], status: 'active', lang: ['en', 'en', 'en', 'ru', 'uk'][i % 5], optOut: false, bounce: false, last4: String(1000 + hs(c[0]) % 9000), exp: { m: 1 + hs(c[0] + 'm') % 12, y: mk(0).getFullYear() + 1 + hs(c[0] + 'y') % 3 } });
    });
    S.customers[18].bounce = true; S.customers[20].optOut = true;
    S.users = [
      { id: 'u1', name: 'Alex M.', role: 'admin', email: 'alex@brightlane.example', active: true, last: mk(0, 9) },
      { id: 'u2', name: 'Dana K.', role: 'support', email: 'dana@brightlane.example', active: true, last: mk(-1, 17) },
      { id: 'u3', name: 'Sam P.', role: 'finance', email: 'sam@brightlane.example', active: true, last: mk(-2, 12) },
      { id: 'u4', name: 'Rita L.', role: 'support', email: 'rita@brightlane.example', active: false, last: mk(-30, 15) }
    ];
    /* seed history runs through the same engine, in chronological order */
    SEED.map((s, i) => ({ s, at: mk(-s[3], s[3] === 0 ? 8 : 9, 10 + i) })).sort((a, b) => a.at - b.at).forEach(x => {
      const s = x.s, cu = S.customers[s[0]];
      const c = RC.openCase(cu.id, s[1], RC.PLANS[cu.plan], { at: x.at, fate: s[4], source: 'webhook' });
      if (s[2] === 'paused') { c.status = 'paused'; RC.log('paused', { who: 'Dana K.', cid: cu.id, caseId: c.id, at: new Date(x.at.getTime() + 8 * HOUR) }); }
    });
    S.cases.forEach(c => { if (c.status === 'campaign' && c.fate === 0 && RC.allSent(c) && RC.lastSent(c) <= new Date(S.now.getTime() - 2 * DAY)) RC.markLost(c, new Date(RC.lastSent(c).getTime() + 2 * DAY)); });
    for (let i = 0; i < 6; i++) { const cu = S.customers[24 + (i % 4)]; RC.pushEvent({ id: 'ev_' + hex8(hs('paid' + i)), type: 'invoice.paid', cid: cu.id, at: mk(-i, 4 + i), amount: RC.PLANS[cu.plan], status: 'processed' }); }
    RC.log('ruleEdit', { who: 'Alex M.', code: 'expired_card', at: mk(-9, 14) }); RC.log('setEdit', { who: 'Alex M.', at: mk(-12, 11) });
    RC.log('connect', { who: 'Alex M.', sys: 'provider', at: mk(-40, 11) }); RC.log('invite', { who: 'Alex M.', name: 'Sam P.', at: mk(-30, 10) });
    S.audit.sort((a, b) => b.at - a.at); S.events.sort((a, b) => b.at - a.at); S.mails.sort((a, b) => b.at - a.at);
    S.cases.sort((a, b) => b.opened - a.opened);
  }
  RC.reset = () => { build(); };

  RC.cust = id => RC.S.customers.find(c => c.id === id);
  RC.cname = id => { const c = RC.cust(id); return c ? c.name : '-'; };
  RC.caseById = id => RC.S.cases.find(c => c.id === id);
  RC.openOf = cid => RC.S.cases.find(c => c.cid === cid && (c.status === 'campaign' || c.status === 'paused' || c.status === 'attention'));
  RC.mailById = id => RC.S.mails.find(m => m.id === id);
  RC.can = p => { const r = RC.S.role; return r === 'admin' ? true : r === 'support' ? (p === 'act' || p === 'view') : p === 'view'; };
  RC.MODS_BY_ROLE = { admin: null, support: ['overview', 'events', 'cases', 'customers', 'campaigns', 'rules', 'studio', 'outbox', 'portal', 'analytics', 'audit'], finance: ['overview', 'events', 'cases', 'customers', 'campaigns', 'analytics', 'audit'] };
  RC.modVisible = m => { const l = RC.MODS_BY_ROLE[RC.S.role]; return !l || l.indexOf(m) >= 0; };

  /* ---------- log: audit and case timeline share one store ---------- */
  RC.log = (key, o) => {
    const S = RC.S; o = o || {};
    const vars = Object.assign({}, o); delete vars.who; delete vars.at; delete vars.cid; delete vars.caseId;
    S.audit.unshift({ id: 'a' + (++S.seqN), at: o.at || S.now, who: o.who || 'system', key, vars, cid: o.cid || null, caseId: o.caseId || null });
  };
  RC.act = (key, o) => RC.log(key, Object.assign({ who: RC.WHO[RC.S.role] }, o));
  RC.auditText = e => {
    const v = Object.assign({}, e.vars);
    if (v.reason) v.reason = t('reason.' + v.reason);
    if (v.code) v.code = t('reason.' + v.code);
    if (v.tpl) v.tpl = t('tpl.' + v.tpl + '.n');
    if (v.via) v.via = t('via.' + v.via);
    if (v.sys) v.sys = t('sys.' + v.sys);
    if (v.amount != null) v.amount = RC.fmtMoney(v.amount);
    if (v.role) v.role = t('role.' + v.role);
    v.cust = e.cid ? RC.cname(e.cid) : t('anon');
    return t('a.' + e.key, v);
  };
  RC.pushEvent = e => { RC.S.events.unshift(e); return e; };

  /* ---------- rules ---------- */
  RC.rule = (code, attempt) => {
    const r = RC.S.rules[code] || RC.S.rules.card_declined;
    if (attempt > 3) return { tpl: 'final_notice', delay: 0, level: 'critical', max: 1, cat: r.cat };
    if (r.max === 0) return { tpl: 'final_notice', delay: 0, level: 'critical', max: 0, cat: r.cat };
    return { tpl: attempt === 1 ? r.tpl : (r.cat === 'soft' ? 'soft_followup' : 'medium_followup'), delay: r.delay, level: r.cat === 'soft' ? 'low' : 'medium', max: r.max, cat: r.cat };
  };
  RC.stepTpl = (c, n) => { const r = RC.S.rules[c.reason]; if (n >= 3) return RC.S.set.offer ? 'retention_offer' : 'final_notice'; if (n === 1) return r.tpl; return r.cat === 'soft' ? 'soft_followup' : 'medium_followup'; };
  const fateFor = (cid, reason) => { const r = RC.S.rules[reason], k = hs(cid + reason) % 6; return r.cat === 'soft' ? [1, 1, 2, 2, 3, 0][k] : r.cat === 'medium' ? [2, 3, 3, 0, 2, 0][k] : 0; };
  const dueAt = (open, day) => day === 0 ? open : new Date(open.getFullYear(), open.getMonth(), open.getDate() + day, RC.S.set.hour, 0, 0);

  /* ---------- cases ---------- */
  RC.openCase = (cid, reason, amount, o) => {
    const S = RC.S; o = o || {}; const at = o.at || S.now, cu = RC.cust(cid);
    const c = { id: 'FP-' + (++S.seqN), cid, amount, reason, status: 'campaign', opened: at, steps: [], fate: o.fate != null ? o.fate : fateFor(cid, reason), source: o.source || 'manual', recovered: null, lost: null, notes: [] };
    S.seq.forEach((q, i) => { if (q.on) c.steps.push({ n: i + 1, day: q.day, state: 'planned', due: dueAt(at, q.day), mail: null }); });
    S.cases.unshift(c);
    if (cu.status === 'active') cu.status = 'past_due';
    if (!o.noEvent) RC.pushEvent({ id: 'ev_' + hex8(hs(c.id + 'f')), type: 'invoice.payment_failed', cid, caseId: c.id, at, amount, reason, status: 'processed' });
    RC.log('caseOpened', { reason, amount, cid, caseId: c.id, who: o.who || 'system', at });
    if (S.rules[reason] && S.rules[reason].max === 0) { c.status = 'attention'; RC.log('attention', { reason, cid, caseId: c.id, at }); }
    else { RC.log('campaign', { n: c.steps.length, cid, caseId: c.id, at }); RC.sendDue(c); }
    return c;
  };
  RC.weekMails = cid => RC.S.mails.filter(m => m.cid === cid && m.state !== 'rejected' && m.at > new Date(RC.S.now.getTime() - 7 * DAY)).length;
  RC.sendDue = c => {
    if (c.status !== 'campaign') return 0; let n = 0;
    c.steps.forEach(s => { if (c.status === 'campaign' && s.state === 'planned' && s.due <= RC.S.now) { RC.sendStep(c, s, s.due > c.opened ? s.due : c.opened); n++; } });
    return n;
  };
  RC.sendStep = (c, s, at) => {
    const cu = RC.cust(c.cid);
    if (cu.optOut) { s.state = 'skipped'; RC.log('skipOpt', { step: s.n, cid: c.cid, caseId: c.id, at }); return null; }
    if (RC.weekMails(c.cid) >= RC.S.set.cap) { s.state = 'skipped'; RC.log('skipCap', { step: s.n, cid: c.cid, caseId: c.id, at }); return null; }
    s.state = 'sent'; s.at = at;
    const m = RC.enqueue(c, s.n, RC.stepTpl(c, s.n), { at }); s.mail = m.id; return m;
  };
  RC.enqueue = (c, step, tpl, o) => {
    const S = RC.S; o = o || {}; const at = o.at || S.now;
    const m = { id: 'M-' + (++S.mailN), caseId: c.id, cid: c.cid, step, tpl, tone: o.tone || null, custom: o.custom || null, state: 'queued', at, sentAt: null, tries: 0, key: 'dun-' + c.id + '-s' + step + (o.manual ? '-m' : ''), err: null, manual: !!o.manual };
    S.mails.unshift(m);
    RC.log('mailQ', { step, tpl, cid: c.cid, caseId: c.id, at, who: o.who });
    RC.dispatch(m, at); return m;
  };
  RC.dispatch = (m, at) => {
    const S = RC.S;
    if (S.integ.queue.paused) { m.state = 'queued'; return; }
    if (!S.integ.mail.on) { m.state = 'failed'; m.err = 'provider'; m.tries++; RC.log('mailFail', { cid: m.cid, caseId: m.caseId, at: at || S.now }); return; }
    if (S.set.review && !m.reviewed) { m.state = 'review'; RC.log('mailReview', { cid: m.cid, caseId: m.caseId, at: at || S.now }); return; }
    RC.deliver(m, at);
  };
  RC.deliver = (m, at) => {
    const S = RC.S, cu = RC.cust(m.cid), c = RC.caseById(m.caseId); at = at || S.now; m.tries++; m.err = null;
    if (cu.bounce) { m.state = 'bounced'; m.sentAt = at; RC.log('mailBounce', { cid: m.cid, caseId: m.caseId, at }); return; }
    m.state = 'delivered'; m.sentAt = at;
    const clicked = c && c.fate === m.step && m.step > 0;
    if (clicked) m.state = 'clicked'; else if (hs(m.id) % 4 !== 0) m.state = 'opened';
    RC.log('mailSent', { step: m.step, tpl: m.tpl, cid: m.cid, caseId: m.caseId, at });
    if (clicked && c.status === 'campaign') RC.recover(c, 'portal', m.step, new Date(at.getTime() + 3 * HOUR));
  };
  RC.recover = (c, via, step, at) => {
    const cu = RC.cust(c.cid); at = at || RC.S.now;
    c.status = 'recovered'; c.recovered = { at, step: step || 0, via };
    c.steps.forEach(s => { if (s.state === 'planned') s.state = 'cancelled'; });
    cu.status = 'active';
    if (via === 'portal') { cu.exp = { m: 1 + hs(cu.id + 'n') % 12, y: RC.S.now.getFullYear() + 3 }; cu.last4 = String(1000 + hs(cu.name + 'n') % 9000); }
    RC.pushEvent({ id: 'ev_' + hex8(hs(c.id + 'pm')), type: via === 'portal' ? 'payment_method.updated' : 'invoice.paid', cid: c.cid, caseId: c.id, at, amount: c.amount, status: 'processed' });
    if (via === 'portal') RC.pushEvent({ id: 'ev_' + hex8(hs(c.id + 'paid')), type: 'invoice.paid', cid: c.cid, caseId: c.id, at: new Date(at.getTime() + 60000), amount: c.amount, status: 'processed' });
    RC.log(via === 'manual' ? 'recoveredManual' : 'recovered', { via, step: step || 0, amount: c.amount, cid: c.cid, caseId: c.id, at });
  };
  RC.markLost = (c, at) => {
    const cu = RC.cust(c.cid); at = at || RC.S.now;
    c.status = 'lost'; c.lost = { at }; cu.status = 'canceled'; c.steps.forEach(s => { if (s.state === 'planned') s.state = 'cancelled'; });
    RC.pushEvent({ id: 'ev_' + hex8(hs(c.id + 'cancel')), type: 'subscription.canceled', cid: c.cid, caseId: c.id, at, amount: c.amount, status: 'processed' });
    RC.log('lost', { amount: c.amount, cid: c.cid, caseId: c.id, at });
  };
  RC.allSent = c => c.steps.length > 0 && c.steps.every(s => s.state !== 'planned');
  RC.lastSent = c => c.steps.reduce((a, s) => (s.at && (!a || s.at > a) ? s.at : a), null) || c.opened;
  RC.nextStep = c => c.steps.find(s => s.state === 'planned') || null;
  RC.health = cu => { if (cu.status === 'canceled') return 'failed'; const o = RC.openOf(cu.id); return !o ? 'healthy' : o.status === 'campaign' ? 'recovering' : 'at_risk'; };

  /* ---------- scheduler: the demo clock moves one day at a time ---------- */
  RC.tick = days => {
    const S = RC.S, before = { m: S.mails.length, r: S.cases.filter(c => c.status === 'recovered').length, l: S.cases.filter(c => c.status === 'lost').length };
    for (let i = 0; i < days; i++) {
      S.now = new Date(S.now.getTime() + DAY);
      S.cases.slice().forEach(c => {
        if (c.status !== 'campaign') return;
        RC.sendDue(c);
        if (c.status === 'campaign' && RC.allSent(c) && RC.lastSent(c) <= new Date(S.now.getTime() - 2 * DAY)) RC.markLost(c, S.now);
      });
    }
    const res = { sent: S.mails.length - before.m, rec: S.cases.filter(c => c.status === 'recovered').length - before.r, lost: S.cases.filter(c => c.status === 'lost').length - before.l };
    RC.act('tick', { n: days, sent: res.sent, rec: res.rec, lost: res.lost });
    return res;
  };
  RC.resumeQueue = () => { RC.S.integ.queue.paused = false; RC.S.mails.filter(m => m.state === 'queued').reverse().forEach(m => RC.dispatch(m)); };

  /* ---------- incoming payment events ---------- */
  RC.receive = o => {
    const S = RC.S;
    if (!S.integ.provider.on) return { err: 'off' };
    const id = o.id || 'ev_' + hex8(hs('in' + (++S.seqN) + o.cid));
    const ev = { id, type: 'invoice.payment_failed', cid: o.cid, at: S.now, amount: o.amount, reason: o.reason, status: 'processed', caseId: null };
    if (!S.integ.provider.secretOk) { ev.status = 'rejected'; RC.pushEvent(ev); RC.act('evRejected', { cid: o.cid }); return { ev }; }
    if (S.events.some(e => e.id === id && e.status !== 'duplicate')) { ev.status = 'duplicate'; RC.pushEvent(ev); RC.log('evDup', { cid: o.cid, at: S.now }); return { ev }; }
    const ex = RC.openOf(o.cid);
    if (ex) { ev.status = 'merged'; ev.caseId = ex.id; RC.pushEvent(ev); RC.log('evMerged', { reason: o.reason, cid: o.cid, caseId: ex.id }); return { ev, c: ex }; }
    const c = RC.openCase(o.cid, o.reason, o.amount, { source: 'webhook', who: 'system', noEvent: true });
    ev.caseId = c.id; RC.pushEvent(ev); RC.log('evOk', { reason: o.reason, amount: o.amount, cid: o.cid, caseId: c.id });
    return { ev, c };
  };

  RC.deleteCustomer = cid => {
    const S = RC.S, n = RC.cname(cid), ids = S.cases.filter(c => c.cid === cid).map(c => c.id);
    S.mails = S.mails.filter(m => m.cid !== cid && ids.indexOf(m.caseId) < 0);
    S.cases = S.cases.filter(c => c.cid !== cid);
    S.events.forEach(e => { if (e.cid === cid) e.cid = null; });
    S.audit.forEach(a => { if (a.cid === cid) { a.cid = null; if (a.caseId) a.caseId = null; } });
    S.customers = S.customers.filter(c => c.id !== cid);
    RC.act('deleted', { ref: hex8(hs(n)).slice(0, 6) });
  };
  RC.nid = () => ++RC.S.seqN;
  build();
}());
