/* Crew Ledger demo: one shared fictional dataset for every module. */
(function () {
  'use strict';
  var CL = window.CL;
  CL.CHAINS = { hire: ['hr', 'ceo'], probation: ['mgr', 'hr'], transfer: ['mgr', 'hr'], sched: ['mgr', 'hr'], rate: ['hr', 'ceo'], vacation: ['mgr', 'hr'], sick: ['hr'], unpaid: ['mgr', 'hr', 'ceo'], dismissal: ['mgr', 'hr', 'ceo'] };
  CL.EV_TYPES = ['hire', 'probation', 'transfer', 'sched', 'rate', 'vacation', 'sick', 'unpaid', 'dismissal'];
  CL.PIECE_TYPES = ['loading', 'packing', 'repair', 'delivery'];
  CL.MEMO_KINDS = ['reward', 'overtime', 'deduction', 'other'];
  CL.RULES = [
    { code: 'HR_EVENT_UNAPPROVED', sev: 'bad', waive: false },
    { code: 'HR_PROBATION_EXPIRED', sev: 'warn', waive: false },
    { code: 'HR_PROBATION_SOON', sev: 'info', waive: true },
    { code: 'HR_NO_CONTRACT', sev: 'warn', waive: true },
    { code: 'TS_NO_DATA', sev: 'bad', waive: false },
    { code: 'TS_STATE_CONFLICT', sev: 'bad', waive: false },
    { code: 'TS_ABSENCE_VS_WORK', sev: 'bad', waive: false },
    { code: 'TS_ABSENCE_NO_EVENT', sev: 'warn', waive: true },
    { code: 'TS_UNIFIED_NOT_CHECKED', sev: 'info', waive: false },
    { code: 'MEMO_NOT_APPROVED', sev: 'warn', waive: true },
    { code: 'PIECE_NOT_CONFIRMED', sev: 'warn', waive: true },
    { code: 'ON_MISMATCH', sev: 'warn', waive: true },
    { code: 'ON_KIND_UNMAPPED', sev: 'warn', waive: false }
  ];

  CL.seed = function () {
    var DB = { role: 'hr', clock: 10 * 60, seq: { ev: 20, pc: 10, mm: 10, ex: 10, bk: 30, pos: 20, dep: 10, au: 100 } };
    CL.DB = DB;
    DB.refs = {
      depts: [{ id: 'wh', code: 'WH' }, { id: 'fl', code: 'FL' }, { id: 'of', code: 'OF' }, { id: 'ws', code: 'WS' }],
      pos: ['loader', 'forklift', 'picker', 'coord', 'lead', 'driver', 'acct', 'mech', 'smech', 'hr', 'disp'].map(function (p) { return { id: p }; }),
      sched: [{ id: 'five' }, { id: 'shift' }, { id: 'part' }],
      kinds: [{ id: 'vac', code: 'V', paid: true, mapped: true }, { id: 'sick', code: 'S', paid: true, mapped: true }, { id: 'unpaid', code: 'U', paid: false, mapped: true }, { id: 'study', code: 'V', paid: true, mapped: false }, { id: 'parent', code: 'U', paid: false, mapped: true }],
      cal: { 14: 'hol' }
    };
    DB.settings = { probDays: 5, initiator: 'one', sickCompany: 5, closeDay: 3, hpd: 8, filler: 'both', importXlsx: false };
    var E = function (id, n, dept, pos, sched, st, tier, hired, extra) {
      var e = { id: id, n: n, dept: dept, pos: pos, sched: sched, st: st, tier: tier, hired: hired, contract: true, off: 0 };
      for (var k in (extra || {})) e[k] = extra[k];
      return e;
    };
    DB.emps = [
      E('e1', 'Alex M.', 'wh', 'loader', 'five', 'active', 'B', '2022-03-14'),
      E('e2', 'Maria K.', 'wh', 'forklift', 'five', 'active', 'B', '2021-08-02'),
      E('e3', 'Daniel R.', 'wh', 'picker', 'five', 'active', 'A', '2023-01-09'),
      E('e4', 'Sofia L.', 'of', 'coord', 'five', 'leave', 'C', '2020-05-18'),
      E('e5', 'Victor T.', 'wh', 'lead', 'five', 'active', 'C', '2019-11-25'),
      E('e6', 'Nina P.', 'fl', 'driver', 'shift', 'active', 'B', '2022-09-05', { off: 0 }),
      E('e7', 'Oleg S.', 'fl', 'driver', 'shift', 'active', 'B', '2021-02-15', { off: 2 }),
      E('e8', 'Emma W.', 'of', 'acct', 'five', 'active', 'C', '2018-06-11'),
      E('e9', 'Ivan B.', 'ws', 'mech', 'five', 'probation', 'A', '2026-09-21', { probEnd: '2026-12-21', contract: false }),
      E('e10', 'Clara H.', 'of', 'hr', 'five', 'probation', 'A', '2026-07-10', { probEnd: '2026-10-10' }),
      E('e11', 'Marek D.', 'ws', 'mech', 'five', 'active', 'B', '2020-10-12'),
      E('e12', 'Lena F.', 'fl', 'disp', 'five', 'active', 'C', '2023-04-03'),
      E('e13', 'Pavel G.', 'wh', 'picker', 'part', 'active', 'A', '2025-02-03'),
      E('e14', 'Irene V.', 'ws', 'mech', 'five', 'probation', 'B', '2026-07-27', { probEnd: '2026-10-26' }),
      E('e15', 'Tom N.', 'wh', 'loader', 'five', 'dismissed', 'B', '2021-05-10', { leftOn: '2026-09-30' })
    ];
    DB.cells = {};
    DB.emps.forEach(function (e) { CL.genCells(e); });
    var c = DB.cells;
    for (var d = 19; d <= 23; d++) c.e4[d] = { c: 'V', h: 0 };
    for (d = 7; d <= 9; d++) c.e6[d] = { c: 'S', h: 0 };
    c.e8[8] = { c: 'A', h: 0 };
    c.e1[6] = { c: 'O', h: 11 }; c.e2[10] = { c: 'O', h: 11 }; c.e2[13] = { c: 'O', h: 10 };
    c.e3[15] = { c: 'W', h: 16, dbl: true };
    c.e7[22] = { c: 'O', h: 14 };
    c.e12[15] = { c: '', h: 0 }; c.e12[16] = { c: '', h: 0 };
    c.e1[15] = { c: 'S', h: 0 }; c.e1[16] = { c: 'S', h: 0 };
    DB.cycles = { wh: 'forming', fl: 'forming', of: 'dept_ok', ws: 'submitted' };
    DB.unified = { st: 'open', rev: 1, versions: [] };

    var step = function (r, st, by) { return { r: r, st: st, by: by || null, at: '2026-10-19 15:00' }; };
    var A = function (id, type, emp, date, to, p, by, steps, st) { return { id: id, type: type, emp: emp, date: date, to: to || null, p: p || {}, st: st || 'applied', by: by, at: (date > '2026-10-19' ? '2026-10-19' : date) + ' 09:00', steps: steps, why: '' }; };
    DB.events = [];
    DB.emps.forEach(function (e) {
      DB.events.push(A('h' + e.id, 'hire', e.id, e.hired, null, { name: e.n }, 'hr', [step('hr', 'ok', 'hr'), step('ceo', 'ok', 'ceo')]));
    });
    DB.events.push(A('ev1', 'vacation', 'e4', '2026-10-19', '2026-10-23', {}, 'hr', [step('mgr', 'ok', 'hr'), step('hr', 'ok', 'hr')]));
    DB.events.push(A('ev2', 'rate', 'e1', '2024-02-01', null, { tier: 'B' }, 'hr', [step('hr', 'ok', 'hr'), step('ceo', 'ok', 'ceo')]));
    DB.events.push(A('ev3', 'transfer', 'e3', '2024-05-06', null, { dept: 'wh', pos: 'picker' }, 'hr', [step('mgr', 'ok', 'mgr'), step('hr', 'ok', 'hr')]));
    DB.events.push(A('ev8', 'dismissal', 'e15', '2026-09-30', null, { reason: 'own' }, 'hr', [step('mgr', 'ok', 'mgr'), step('hr', 'ok', 'hr'), step('ceo', 'ok', 'ceo')]));
    DB.events.push(A('ev4', 'vacation', 'e2', '2026-11-02', '2026-11-13', {}, 'mgr', [step('mgr', 'ok', 'mgr'), step('hr', 'wait')], 'pending'));
    DB.events.push(A('ev5', 'transfer', 'e13', '2026-10-26', null, { dept: 'fl', pos: 'driver' }, 'hr', [step('mgr', 'wait'), step('hr', 'ok', 'hr')], 'pending'));
    DB.events.push(A('ev6', 'rate', 'e5', '2026-10-01', null, { tier: 'B' }, 'hr', [step('hr', 'ok', 'hr'), step('ceo', 'wait')], 'pending'));
    DB.events.push(A('ev7', 'hire', null, '2026-10-22', null, { name: 'Rita S.', dept: 'ws', pos: 'mech', sched: 'five' }, 'hr', [step('hr', 'ok', 'hr'), step('ceo', 'wait')], 'pending'));
    DB.events.sort(function (a, b) { return a.date < b.date ? 1 : -1; });

    DB.pieces = [
      { id: 'pc1', type: 'loading', date: '2026-10-12', qty: 120, unit: 'pallets', shares: [{ emp: 'e1', pct: 50 }, { emp: 'e2', pct: 50 }], st: 'confirmed', price: 'B', by: 'mgr', confirmedBy: 'hr', dept: 'wh' },
      { id: 'pc2', type: 'packing', date: '2026-10-15', qty: 300, unit: 'boxes', shares: [{ emp: 'e3', pct: 40 }, { emp: 'e13', pct: 30 }, { emp: 'e5', pct: 30 }], st: 'draft', price: '', by: 'mgr', dept: 'wh' },
      { id: 'pc3', type: 'repair', date: '2026-10-17', qty: 6, unit: 'units', shares: [{ emp: 'e11', pct: 60 }, { emp: 'e14', pct: 40 }], st: 'draft', price: 'A', by: 'hr', dept: 'ws' }
    ];
    DB.memos = [
      { id: 'mm1', emp: 'e5', kind: 'overtime', month: '2026-09', reason: 'Extra weekend shifts during the stock count.', file: 'basis-0001.pdf', st: 'submitted', by: 'mgr', priced: true },
      { id: 'mm2', emp: 'e2', kind: 'reward', month: '2026-09', reason: 'Zero damage claims for the quarter.', file: 'basis-0002.docx', st: 'approved', by: 'hr', priced: true, decidedBy: 'ceo' },
      { id: 'mm3', emp: 'e6', kind: 'deduction', month: '2026-10', reason: 'Fuel card overuse, to be confirmed.', file: '', st: 'draft', by: 'hr', priced: false }
    ];

    DB.rules = {}; CL.RULES.forEach(function (r) { DB.rules[r.code] = { on: true, sev: r.sev }; });
    DB.waived = {}; DB.lastRun = '2026-10-20 08:05';
    DB.sync = {
      sets: [{ id: 'staff', st: 'ok', at: '2026-10-20 02:10', skipped: 0 }, { id: 'abs', st: 'ok', at: '2026-10-20 02:10', skipped: 0 }, { id: 'org', st: 'ok', at: '2026-10-20 02:10', skipped: 0 }, { id: 'pos', st: 'partial', at: '2026-10-20 02:11', skipped: 1 }],
      req: { st: 'idle', at: null },
      disc: [
        { id: 'sd1', kind: 'field', emp: 'e6', field: 'dept', ours: 'fl', theirs: 'wh', st: 'open' },
        { id: 'sd2', kind: 'field', emp: 'e9', field: 'hired', ours: '2026-09-21', theirs: '2026-09-22', st: 'open' },
        { id: 'sd3', kind: 'field', emp: 'e11', field: 'pos', ours: 'mech', theirs: 'smech', st: 'open' },
        { id: 'sd4', kind: 'absence', emp: 'e1', type: 'sick', from: '2026-10-15', to: '2026-10-16', st: 'open' }
      ]
    };
    DB.backups = { keep: 14, prune: false, files: true, entries: [], restores: [{ at: '2026-10-01 03:20', st: 'ok' }, { at: '2026-09-01 03:10', st: 'ok' }], decided: {} };
    for (var i = 14; i >= 0; i--) {
      var day = 20 - i; if (day < 1) continue;
      DB.backups.entries.push({ id: 'b' + day, at: '2026-10-' + CL.pad2(day) + ' 02:30', st: day === 11 ? 'warn' : 'ok', files: day !== 11 });
    }
    DB.backups.entries.reverse();
    DB.exports = [{ id: 'ex1', at: '2026-10-02 11:20', role: 'hr', rep: 'abs', rows: 9 }, { id: 'ex2', at: '2026-10-05 09:15', role: 'acc', rep: 'ts', rows: 14 }];
    DB.audit = [];
    var au = function (t, role, mod, key, vars) { DB.audit.push({ t: t, role: role, mod: mod, key: key, vars: vars || {}, ref: null }); };
    au('2026-10-19 16:40', 'hr', 'events', 'event.create', { type: '~ev.t.rate', name: 'Victor T.' });
    au('2026-10-19 16:12', 'mgr', 'events', 'event.create', { type: '~ev.t.vacation', name: 'Maria K.' });
    au('2026-10-19 15:50', 'hr', 'events', 'event.approve', { type: '~ev.t.vacation', name: 'Sofia L.' });
    au('2026-10-19 11:05', 'ceo', 'memos', 'memo.approve', { name: 'Maria K.' });
    au('2026-10-18 17:30', 'mgr', 'piece', 'piece.confirm', { id: 'pc1' });
    au('2026-10-17 10:02', 'hr', 'ts', 'ts.sync', { n: 3 });
    au('2026-10-16 09:20', 'hr', 'settings', 'settings.save', { key: '~set.probDays', from: '7', to: '5' });
    au('2026-10-15 14:44', 'acc', 'sync', 'sync.request', {});
    return DB;
  };
  CL.DB = CL.seed();
}());
