/* Fleet Desk demo: shared fictional data, state and rules engine. */
(function () {
  'use strict';
  const FD = window.FD = {};
  const DAY = 864e5;
  const t = (k, v) => MFI18N.t(k, v);
  FD.t = t;
  FD.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mid = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = mid(new Date());
  FD.today = today;
  FD.addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 9, 0, 0);
  FD.daysTo = d => Math.round((mid(d) - today) / DAY);
  FD.sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const LOC = { en: 'en-GB', ru: 'ru-RU', uk: 'uk-UA' };
  const loc = () => LOC[MFI18N.lang()] || 'en-GB';
  FD.fmtDate = d => new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  FD.fmtShort = d => new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short' }).format(d);
  FD.fmtTime = d => new Intl.DateTimeFormat(loc(), { hour: '2-digit', minute: '2-digit' }).format(d);
  FD.fmtNum = n => new Intl.NumberFormat(loc()).format(n);
  FD.fmtKm = n => t('km', { n: FD.fmtNum(n) });
  FD.fmtCu = n => t('cu', { n: FD.fmtNum(n) });
  FD.fmtStamp = d => FD.sameDay(d, new Date()) ? t('n.today', { t: FD.fmtTime(d) }) : FD.sameDay(d, FD.addDays(new Date(), -1)) ? t('n.yday', { t: FD.fmtTime(d) }) : FD.fmtShort(d) + ', ' + FD.fmtTime(d);
  FD.loc = loc;
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  /* ---------- reference data ---------- */
  const DEPTS = ['dispatch', 'field', 'warehouse', 'sales'];
  const S = FD.S = {
    role: 'admin', mod: 'overview', sel: null, vtab: 'docs',
    depts: DEPTS.map((id, i) => ({ id, name: null, head: 'p' + (24 + i) })),
    companies: [
      { id: 'c1', name: 'Northline Logistics', code: 'NL-001' },
      { id: 'c2', name: 'Northline Freight', code: 'NL-002' },
      { id: 'c3', name: 'Harbor Works Ltd', code: 'HW-001' }
    ],
    cp: [
      { id: 'k1', name: 'Harbor Works Garage', type: 'garage' },
      { id: 'k2', name: 'Quickline Service', type: 'garage' },
      { id: 'k3', name: 'Eastgate Auto', type: 'garage' },
      { id: 'k4', name: 'Northside Tyres', type: 'garage' },
      { id: 'k5', name: 'Beacon Insurance', type: 'insurer' },
      { id: 'k6', name: 'Safeguard Mutual', type: 'insurer' },
      { id: 'k7', name: 'Riverton Inspection Lab', type: 'lab' },
      { id: 'k8', name: 'Metro Test Centre', type: 'lab' },
      { id: 'k9', name: 'Northline Leasing', type: 'owner' }
    ],
    people: [], vehicles: [], repairs: [], fuel: [], cards: [], audit: [], feed: [], notified: {}, xlog: [],
    rules: {}, settings: { hour: 8, protect: true, merge: false },
    integ: { fuel: { on: true, status: 'ok', last: FD.addDays(today, 0) }, messenger: { on: true }, team: { on: true }, mail: { on: true }, backup: { last: FD.addDays(today, -1), ok: true } },
    imp: { stage: 'idle', rows: [] }, lastCheck: null, seq: 100
  };
  FD.deptName = id => { const d = S.depts.find(x => x.id === id); return d ? (d.name || t('dept.' + id)) : '-'; };
  FD.person = id => S.people.find(p => p.id === id);
  FD.pname = id => { const p = FD.person(id); return p ? p.name : '-'; };
  FD.vehicle = id => S.vehicles.find(v => v.id === id);
  FD.cpName = id => { const c = S.cp.find(x => x.id === id); return c ? c.name : '-'; };
  FD.companyName = id => { const c = S.companies.find(x => x.id === id); return c ? c.name : '-'; };
  FD.nid = p => p + (++S.seq);

  const NAMES = ['Alex M.', 'Dana K.', 'Sam P.', 'Rita L.', 'Noah B.', 'Mia T.', 'Leo V.', 'Eva S.', 'Max D.', 'Nora F.', 'Jon H.', 'Ava C.', 'Tim W.', 'Ben R.'];
  const SEED = [
    ['AB 0101 XX', 'Ridgeback P4', 'pickup', 'field', 2021, 84210, 40, 4200, 210, 210, 95, 320],
    ['AB 0207 XX', 'Cargo V2', 'van', 'dispatch', 2020, 132900, 6, 600, 58, 58, -4, 150],
    ['AB 0315 XX', 'Metro S', 'sedan', 'sales', 2022, 41200, 60, 3100, 12, 12, 240, 80],
    ['AB 0422 XX', 'Haul T7', 'truck', 'warehouse', 2019, 215400, 33, 2500, 300, null, 21, 45],
    ['AB 0538 XX', 'Ridgeback P4', 'pickup', 'field', 2021, 67880, 75, 5100, 140, 140, 180, 9],
    ['AB 0644 XX', 'Cargo V2', 'van', 'dispatch', 2020, 98310, 25, 1800, -11, -11, 120, 200],
    ['AB 0759 XX', 'Metro S', 'sedan', 'sales', 2023, 29800, 120, 9000, 280, 280, 330, 190],
    ['AB 0861 XX', 'Haul T9', 'truck', 'warehouse', 2018, 301200, 11, 900, 88, null, 47, 170],
    ['AB 0973 XX', 'Trailmate P2', 'pickup', 'field', 2019, 112500, 18, 2200, 175, 175, 60, 260],
    ['AB 1086 XX', 'Cargo V3', 'van', 'dispatch', 2023, 54300, 90, 6000, 200, 200, 210, 120],
    ['AB 1194 XX', 'Metro S', 'sedan', 'sales', 2022, 38650, 55, 4800, 29, 29, 190, 220],
    ['AB 1203 XX', 'Haul T7', 'truck', 'warehouse', 2020, 176400, -9, -300, 150, null, 130, 95],
    ['AB 1317 XX', 'Ridgeback P4', 'pickup', 'field', 2022, 52100, 100, 7000, 230, 230, 205, 240],
    ['AB 1425 XX', 'Cargo V2', 'van', 'dispatch', 2021, 88700, 45, 3500, 130, 130, 150, -2]
  ];
  const NORM = { pickup: 11.5, van: 10.2, sedan: 7.4, truck: 22 };
  const VIN_AL = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  const COLORS = ['white', 'silver', 'graphite', 'blue', 'red'];
  const ENG = { pickup: ['diesel', 2.4, 110], van: ['diesel', 2.0, 96], sedan: ['petrol', 1.6, 90], truck: ['diesel', 7.2, 250] };
  const SHOPS = ['k1', 'k2', 'k3', 'k4'];
  const NOTES = ['sv.oil', 'sv.brakes', 'sv.tyres', 'sv.susp', 'sv.coolant', 'sv.lights'];

  /* people */
  const ROLEPERSON = { admin: 'p15', manager: 'p16', mechanic: 'p17', head: 'p24' };
  NAMES.forEach((n, i) => S.people.push({ id: 'p' + (i + 1), name: n, dept: SEED[i][3], role: 'driver', msgr: i % 5 !== 3, active: true }));
  S.people.push({ id: 'p15', name: 'Kim A.', dept: 'dispatch', role: 'admin', msgr: true, active: true });
  S.people.push({ id: 'p16', name: 'Pat R.', dept: 'dispatch', role: 'manager', msgr: true, active: true });
  S.people.push({ id: 'p17', name: 'Jo T.', dept: 'field', role: 'mechanic', msgr: true, active: true });
  S.people.push({ id: 'p18', name: 'Lee S.', dept: 'warehouse', role: 'mechanic', msgr: false, active: true });
  S.people.push({ id: 'p19', name: 'Gus L.', dept: 'sales', role: 'driver', msgr: false, active: false });
  S.people.push({ id: 'p20', name: 'Zed K.', dept: 'field', role: 'driver', msgr: true, active: true });
  S.people.push({ id: 'p24', name: 'Ola N.', dept: 'dispatch', role: 'head', msgr: true, active: true });
  S.people.push({ id: 'p25', name: 'Vic H.', dept: 'field', role: 'head', msgr: true, active: true });
  S.people.push({ id: 'p26', name: 'Ira Z.', dept: 'warehouse', role: 'head', msgr: false, active: true });
  S.people.push({ id: 'p27', name: 'Bo Q.', dept: 'sales', role: 'head', msgr: true, active: true });
  FD.ROLEPERSON = ROLEPERSON;

  /* vehicles */
  const staleOdo = { 6: 52, 12: 38 };
  S.vehicles = SEED.map((s, i) => {
    const r = rng(1000 + i * 77);
    let vin = 'FD'; for (let k = 0; k < 15; k++) vin += VIN_AL[Math.floor(r() * VIN_AL.length)];
    const e = ENG[s[2]];
    const v = {
      id: 'v' + (i + 1), plate: s[0], model: s[1], type: s[2], dept: s[3], driver: 'p' + (i + 1), year: s[4], odo: s[5], vin,
      color: COLORS[i % 5], fuel: e[0], vol: e[1], power: e[2], gear: i % 3 === 1 ? 'auto' : 'manual', company: 'c' + (i % 3 === 2 ? 2 : (i % 7 === 6 ? 3 : 1)),
      reg: 'RC ' + (100200 + i * 137), state: 'active', card: null,
      normS: Math.round(NORM[s[2]] * 10) / 10, normW: Math.round(NORM[s[2]] * 1.08 * 10) / 10,
      svc: { date: FD.addDays(today, s[6]), km: s[5] + s[7] },
      docs: {}, svcLog: [], odoLog: []
    };
    [['ins', 8, 'k5'], ['comp', 9, 'k6'], ['insp', 10, 'k7'], ['poa', 11, 'k9']].forEach(([k, j, cp], x) => {
      const n = s[j];
      v.docs[k] = n === null ? null : { date: FD.addDays(today, n), num: k.toUpperCase() + '-' + (4000 + i * 13 + x), cp: k === 'insp' ? (i % 2 ? 'k8' : 'k7') : (k === 'poa' ? null : (i % 2 ? 'k6' : 'k5')), scan: (i + x) % 4 !== 0 };
    });
    for (let k = 0; k < 3; k++) v.svcLog.push({ kind: k === 1 ? 'repair' : 'service', note: NOTES[(i * 2 + k * 3) % 6], date: FD.addDays(today, -(28 + k * 71 + (i % 5) * 4)), km: s[5] - 2400 - k * 6200, shop: SHOPS[(i + k) % 4] });
    const last = staleOdo[i] || (3 + (i * 2) % 14);
    v.odoLog = [{ date: FD.addDays(today, -(last + 60)), km: s[5] - 1800 }, { date: FD.addDays(today, -(last + 30)), km: s[5] - 900 }, { date: FD.addDays(today, -last), km: s[5] }];
    return v;
  });
  S.vehicles[1].state = 'repair';

  /* fuel log and cards */
  S.vehicles.forEach((v, i) => {
    const r = rng(500 + i * 31); let cursor = v.odo - 120; const bump = (i === 3 || i === 8 || i === 11) ? 1.2 : 1;
    for (let f = 0; f < 6; f++) {
      const gap = 420 + Math.floor(r() * 360), cons = Math.round(NORM[v.type] * (0.9 + r() * 0.16) * bump * 10) / 10;
      S.fuel.push({ id: 'f' + v.id + f, vid: v.id, date: FD.addDays(today, -(2 + f * 5 + Math.floor(r() * 3))), station: 'Station ' + (10 + Math.floor(r() * 30)), litres: Math.round(gap * cons / 100), odo: cursor, cons, card: 'fc' + (i + 1) });
      cursor -= gap;
    }
    S.cards.push({ id: 'fc' + (i + 1), num: 'FC ••• ' + (4100 + i * 37), status: 'active', vid: v.id, limit: 400 + (i % 4) * 100 });
    v.card = 'fc' + (i + 1);
  });
  S.fuel.sort((a, b) => b.date - a.date);
  S.cards.push({ id: 'fc15', num: 'FC ••• 9120', status: 'free', vid: null, limit: 400 });
  S.cards.push({ id: 'fc16', num: 'FC ••• 9144', status: 'free', vid: null, limit: 500 });
  S.cards.push({ id: 'fc17', num: 'FC ••• 9187', status: 'blocked', vid: null, limit: 400 });

  /* repairs */
  const P = (n, q, an) => ({ name: n, qty: q, analog: an || '' });
  S.repairs = [
    { id: 'R-101', vid: 'v2', status: 'inwork', title: 'rp.brakes', shop: 'k1', opened: FD.addDays(today, -3), started: FD.addDays(today, -2), closed: null, cost: 0, parts: [P('Brake pads front', 1, 'Pads set B-2'), P('Brake disc', 2, '')] },
    { id: 'R-102', vid: 'v6', status: 'requested', title: 'rp.susp', shop: 'k2', opened: FD.addDays(today, -2), started: null, closed: null, cost: 0, parts: [P('Control arm', 1, 'Arm A-7')] },
    { id: 'R-103', vid: 'v12', status: 'approved', title: 'rp.leak', shop: 'k3', opened: FD.addDays(today, -5), started: null, closed: null, cost: 0, parts: [P('Gearbox seal kit', 1, ''), P('Gear oil 5 L', 2, 'Oil G-5')] },
    { id: 'R-098', vid: 'v4', status: 'done', title: 'rp.tyres', shop: 'k4', opened: FD.addDays(today, -40), started: FD.addDays(today, -39), closed: FD.addDays(today, -37), cost: 1240, parts: [P('Tyre 215/75', 4, 'Tyre T-4')] },
    { id: 'R-095', vid: 'v9', status: 'done', title: 'rp.lights', shop: 'k2', opened: FD.addDays(today, -28), started: FD.addDays(today, -27), closed: FD.addDays(today, -24), cost: 480, parts: [P('Headlight unit', 1, '')] },
    { id: 'R-090', vid: 'v1', status: 'done', title: 'rp.coolant', shop: 'k1', opened: FD.addDays(today, -60), started: FD.addDays(today, -59), closed: FD.addDays(today, -58), cost: 310, parts: [P('Coolant 10 L', 1, '')] },
    { id: 'R-104', vid: 'v8', status: 'requested', title: 'rp.brakes', shop: 'k3', opened: FD.addDays(today, -1), started: null, closed: null, cost: 0, parts: [P('Brake pads rear', 1, 'Pads set B-9')] },
    { id: 'R-087', vid: 'v3', status: 'rejected', title: 'rp.paint', shop: 'k2', opened: FD.addDays(today, -35), started: null, closed: null, cost: 0, parts: [] }
  ];

  /* rules N1..N10 */
  const R = (id, ev, thr, unit, role, ch, on) => { S.rules[id] = { id, ev, thr, unit, role, ch: { messenger: ch[0], team: ch[1], email: ch[2] }, on }; };
  R('N1', 'ins', 30, 'd', 'manager', [1, 0, 1], true);
  R('N2', 'comp', 30, 'd', 'manager', [1, 1, 0], true);
  R('N3', 'svckm', 1000, 'km', 'mechanic', [1, 0, 0], true);
  R('N4', 'svc', 14, 'd', 'mechanic', [1, 0, 0], true);
  R('N5', 'insp', 30, 'd', 'manager', [0, 1, 1], true);
  R('N6', 'poa', 30, 'd', 'head', [1, 0, 1], true);
  R('N7', 'dev', 10, '%', 'head', [0, 1, 0], true);
  R('N8', 'stale', 30, 'd', 'mechanic', [1, 0, 0], true);
  R('N9', 'wait', 2, 'd', 'manager', [1, 1, 0], true);
  R('N10', 'fail', 1, 'x', 'admin', [0, 1, 1], true);
  FD.RULE_OF = { ins: 'N1', comp: 'N2', svckm: 'N3', svc: 'N4', insp: 'N5', poa: 'N6' };
  FD.DOC_KINDS = ['ins', 'comp', 'insp', 'poa'];

  /* ---------- statuses ---------- */
  const RANK = { overdue: 0, soon: 1, ok: 2 };
  FD.RANK = RANK;
  FD.thr = kind => S.rules[FD.RULE_OF[kind]].thr;
  FD.itemState = (kind, days, kmLeft) => {
    if (kind === 'svckm') return kmLeft < 0 ? 'overdue' : (kmLeft <= FD.thr('svckm') ? 'soon' : 'ok');
    return days < 0 ? 'overdue' : (days <= FD.thr(kind) ? 'soon' : 'ok');
  };
  FD.items = v => {
    const out = [];
    FD.DOC_KINDS.forEach(k => { const d = v.docs[k]; if (d) { const n = FD.daysTo(d.date); out.push({ kind: k, date: d.date, days: n, state: FD.itemState(k, n) }); } });
    const sn = FD.daysTo(v.svc.date);
    out.push({ kind: 'svc', date: v.svc.date, days: sn, state: FD.itemState('svc', sn) });
    const left = v.svc.km - v.odo, est = Math.round(left / 120);
    out.push({ kind: 'svckm', date: FD.addDays(today, est), days: est, state: FD.itemState('svckm', 0, left), km: true, left });
    return out;
  };
  FD.sum = v => {
    const its = FD.items(v); let worst = 'ok', next = its[0];
    its.forEach(i => { if (RANK[i.state] < RANK[worst]) worst = i.state; if (i.days < next.days) next = i; });
    return { state: worst, next, items: its };
  };
  FD.scoped = () => S.role === 'head' ? S.vehicles.filter(v => v.dept === 'dispatch') : S.vehicles;
  FD.dayText = n => n < 0 ? t('d.overdue', { n: -n }) : (n === 0 ? t('d.today') : t('d.left', { n }));
  FD.itemText = i => i.km ? (i.left < 0 ? t('d.kmOver', { n: FD.fmtNum(-i.left) }) : t('d.kmLeft', { n: FD.fmtNum(i.left) })) : FD.dayText(i.days);
  FD.kindLabel = k => t('doc.' + k);

  /* consumption */
  FD.normOf = v => (today.getMonth() >= 10 || today.getMonth() <= 2) ? v.normW : v.normS;
  FD.avgCons = v => { const fs = S.fuel.filter(f => f.vid === v.id).slice(0, 4); return fs.length ? Math.round(fs.reduce((a, f) => a + f.cons, 0) / fs.length * 10) / 10 : 0; };
  FD.dev = v => { const n = FD.normOf(v); return n ? Math.round((FD.avgCons(v) / n - 1) * 100) : 0; };
  FD.lastOdoDate = v => v.odoLog[v.odoLog.length - 1].date;

  /* ---------- permissions ---------- */
  const ROLES = ['admin', 'manager', 'mechanic', 'head'];
  const MODS = {
    overview: ROLES, vehicles: ROLES, deadlines: ROLES, repairs: ['admin', 'manager', 'mechanic'], fuel: ['admin', 'manager', 'mechanic'],
    directories: ['admin', 'manager'], notifications: ['admin', 'manager'], reports: ['admin', 'manager', 'head'], import: ['admin'], integrations: ['admin'], access: ['admin'], audit: ['admin']
  };
  const ACTS = {
    'vehicle.add': ['admin', 'manager'], 'vehicle.edit': ['admin', 'manager'], 'doc.edit': ['admin', 'manager'], 'svc.log': ['admin', 'manager', 'mechanic'],
    mileage: ['admin', 'manager', 'mechanic'], 'repair.create': ['admin', 'manager', 'mechanic'], 'repair.approve': ['admin', 'manager'], 'repair.work': ['admin', 'mechanic'],
    'fuel.add': ['admin', 'manager', 'mechanic'], 'card.manage': ['admin', 'manager'], 'dir.edit': ['admin', 'manager'], 'rules.edit': ['admin'], 'notif.run': ['admin', 'manager'],
    export: ROLES, settings: ['admin'], import: ['admin'], integ: ['admin']
  };
  FD.ROLES = ROLES; FD.MODS = MODS; FD.ACTS = ACTS;
  FD.can = a => (ACTS[a] || []).indexOf(S.role) >= 0;
  FD.modVisible = m => MODS[m].indexOf(S.role) >= 0;
  FD.me = () => FD.person(ROLEPERSON[S.role]).name;

  /* ---------- audit ---------- */
  FD.audit = (key, vars, vid) => { S.audit.unshift({ at: new Date(), who: FD.me(), role: S.role, key, vars: vars || {}, vid: vid || null }); };
  (function seedAudit() {
    const add = (d, who, role, key, vars, vid) => S.audit.push({ at: FD.addDays(today, d), who, role, key, vars, vid });
    add(-2, 'Pat R.', 'manager', 'doc', { doc: 'insp', plate: S.vehicles[8].plate }, 'v9');
    add(-3, 'Jo T.', 'mechanic', 'repstart', { id: 'R-101', plate: S.vehicles[1].plate }, 'v2');
    add(-3, 'Pat R.', 'manager', 'repapprove', { id: 'R-101', plate: S.vehicles[1].plate }, 'v2');
    add(-4, 'Jo T.', 'mechanic', 'odo', { km: FD.fmtNum(S.vehicles[0].odo), plate: S.vehicles[0].plate }, 'v1');
    add(-6, 'Kim A.', 'admin', 'rule', { id: 'N5', thr: 30 });
    add(-9, 'Kim A.', 'admin', 'import', { n: 12 });
    add(-12, 'Pat R.', 'manager', 'cardbind', { card: S.cards[2].num, plate: S.vehicles[2].plate }, 'v3');
    add(-20, 'Kim A.', 'admin', 'dirAdd', { what: 'k8' });
    S.vehicles.forEach((v, i) => {
      S.audit.push({ at: FD.addDays(today, -(300 + i * 9)), who: 'Kim A.', role: 'admin', key: 'vadd', vars: { plate: v.plate }, vid: v.id });
      S.audit.push({ at: FD.addDays(today, -(70 + i * 5)), who: 'Pat R.', role: 'manager', key: 'driver', vars: { plate: v.plate, name: FD.pname(v.driver) }, vid: v.id });
    });
    S.audit.sort((a, b) => b.at - a.at);
  }());

  /* ---------- notification engine ---------- */
  const roleOf = rule => S.rules[rule].role;
  FD.candidates = () => {
    const out = [], R = S.rules;
    const push = (rule, v, kind, state, days, extra) => { const key = rule + '|' + v.id + '|' + kind + '|' + state; if (!S.notified[key]) out.push(Object.assign({ key, rule, v, kind, state, days }, extra || {})); };
    S.vehicles.forEach(v => {
      const its = FD.items(v);
      const find = k => its.find(i => i.kind === k);
      [['N1', 'ins'], ['N2', 'comp'], ['N5', 'insp'], ['N6', 'poa'], ['N4', 'svc'], ['N3', 'svckm']].forEach(([rid, k]) => {
        if (!R[rid].on) return;
        const it = find(k); if (!it || it.state === 'ok') return;
        if (S.settings.merge && rid === 'N2' && R.N1.on && find('ins') && find('ins').state !== 'ok') return;
        push(rid, v, S.settings.merge && rid === 'N1' && v.docs.comp && find('comp').state !== 'ok' ? 'insboth' : k, it.state, it.days, { left: it.left });
      });
      if (R.N7.on) { const d = FD.dev(v); if (d > R.N7.thr) push('N7', v, 'dev', 'overdue', 0, { pct: d }); }
      if (R.N8.on) { const age = -FD.daysTo(FD.lastOdoDate(v)); if (age > R.N8.thr) push('N8', v, 'stale', 'soon', age, { age }); }
    });
    if (R.N9.on) S.repairs.forEach(r => { if (r.status === 'requested' && -FD.daysTo(r.opened) >= R.N9.thr) { const v = FD.vehicle(r.vid); push('N9', v, 'wait:' + r.id, 'soon', -FD.daysTo(r.opened), { rid: r.id }); } });
    if (R.N10.on && S.integ.fuel.status === 'error') push('N10', S.vehicles[0], 'fail', 'overdue', 0, { sys: 'fuel', global: true });
    out.sort((a, b) => FD.RANK[a.state] - FD.RANK[b.state] || a.days - b.days);
    return out;
  };
  FD.chOk = ch => S.integ[ch === 'messenger' ? 'messenger' : (ch === 'team' ? 'team' : 'mail')].on;
  FD.sendCand = (c, fresh) => {
    S.notified[c.key] = true;
    const rule = S.rules[c.rule], chs = ['messenger', 'team', 'email'].filter(k => rule.ch[k]);
    const res = {}; chs.forEach(k => { res[k] = FD.chOk(k) ? 'sent' : 'failed'; });
    const e = { id: FD.nid('m'), at: fresh === false ? c.at : new Date(), rule: c.rule, vid: c.v.id, kind: c.kind, days: c.days, left: c.left, pct: c.pct, rid: c.rid, sys: c.sys, role: rule.role, res, test: false };
    S.feed.unshift(e); return e;
  };
  FD.msgText = e => {
    const v = FD.vehicle(e.vid), plate = v ? v.plate : '';
    if (e.test) return t('n.msg.test', { rule: e.rule });
    if (e.rule === 'N7') return t('n.msg.dev', { plate, n: e.pct });
    if (e.rule === 'N8') return t('n.msg.stale', { plate, n: e.days });
    if (e.rule === 'N9') return t('n.msg.wait', { plate, id: e.rid });
    if (e.rule === 'N10') return t('n.msg.fail');
    if (e.rule === 'N3') return e.left < 0 ? t('n.msg.kmOver', { plate, n: FD.fmtNum(-e.left) }) : t('n.msg.km', { plate, n: FD.fmtNum(e.left) });
    const doc = e.kind === 'insboth' ? t('doc.insboth') : t('doc.' + e.kind);
    return t(e.days < 0 ? 'n.msg.overdue' : (e.days === 0 ? 'n.msg.today' : 'n.msg.soon'), { plate, doc, n: Math.abs(e.days) });
  };
  /* seed the journal: first candidates already delivered earlier */
  (function () {
    const c = FD.candidates();
    for (let i = 0; i < 5 && i < c.length; i++) {
      c[i].at = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (i < 3 ? 0 : 1), 8, i * 3);
      FD.sendCand(c[i], false);
    }
    S.feed.reverse();
    S.feed.reverse();
    S.xlog = [
      { at: FD.addDays(today, 0), sys: 'fuel', n: 7, ok: true, who: 'job' },
      { at: FD.addDays(today, -1), sys: 'fuel', n: 11, ok: true, who: 'job' },
      { at: FD.addDays(today, -1), sys: 'backup', n: 1, ok: true, who: 'job' },
      { at: FD.addDays(today, -9), sys: 'sheet', n: 12, ok: true, who: 'Kim A.' }
    ];
  }());
}());
