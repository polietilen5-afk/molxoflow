/* Auto Diagnostic demo: knowledge base, shared fictional data and state. */
(function () {
  'use strict';
  const AD = window.AD = {};
  AD.t = (k, v) => MFI18N.t(k, v);
  AD.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  AD.$ = id => document.getElementById(id);

  const DAY = 86400000;
  AD.now = new Date();
  AD.day0 = new Date(AD.now.getFullYear(), AD.now.getMonth(), AD.now.getDate()).getTime();
  AD.addDays = n => AD.day0 + n * DAY;

  /* categories and symptoms (weights point at cause ids) */
  AD.CATS = ['engine', 'brakes', 'suspension', 'electrical', 'transmission', 'other'];
  AD.CAUSES = {
    ig: { cat: 'engine', urg: 'medium', w: [1.0, 0.5], p: [[25, 60], [20, 45]] },
    fu: { cat: 'engine', urg: 'medium', w: [1.5, 0.5], p: [[15, 30], [45, 110]] },
    co: { cat: 'engine', urg: 'high', w: [1.5, 1.0], p: [[20, 55], [10, 25]] },
    pd: { cat: 'brakes', urg: 'high', w: [1.5, 0.5], p: [[35, 90], [60, 160]] },
    fl: { cat: 'brakes', urg: 'critical', w: [1.0, 0.5], p: [[8, 18], [15, 60]] },
    ca: { cat: 'brakes', urg: 'high', w: [2.0], p: [[40, 120], [8, 18]] },
    sh: { cat: 'suspension', urg: 'medium', w: [2.0], p: [[70, 180], [10, 25]] },
    bu: { cat: 'suspension', urg: 'medium', w: [1.5], p: [[12, 40], [10, 30]] },
    bj: { cat: 'suspension', urg: 'high', w: [1.5, 1.0], p: [[25, 70], [15, 45]] },
    ba: { cat: 'electrical', urg: 'medium', w: [0.5], p: [[55, 130]] },
    al: { cat: 'electrical', urg: 'high', w: [1.5], p: [[80, 220], [8, 20]] },
    wi: { cat: 'electrical', urg: 'low', w: [2.0], p: [[5, 25]] },
    go: { cat: 'transmission', urg: 'medium', w: [1.5], p: [[30, 60], [8, 20]] },
    cl: { cat: 'transmission', urg: 'high', w: [4.0], p: [[90, 260]] },
    cv: { cat: 'transmission', urg: 'medium', w: [2.0], p: [[45, 120], [5, 15]] },
    ac: { cat: 'other', urg: 'low', w: [1.0, 1.0], p: [[15, 40], [8, 20]] },
    ex: { cat: 'other', urg: 'low', w: [1.0], p: [[20, 70], [5, 15]] },
    fi: { cat: 'other', urg: 'low', w: [0.5], p: [[10, 25]] }
  };
  AD.SYM = {
    eng_rough: { cat: 'engine', w: { ig: 3, fu: 2 } },
    eng_start: { cat: 'engine', w: { ig: 2, fu: 3 } },
    eng_light: { cat: 'engine', w: { ig: 2, fu: 1, co: 1 } },
    eng_smoke: { cat: 'engine', w: { co: 3 } },
    eng_heat: { cat: 'engine', w: { co: 4 } },
    eng_power: { cat: 'engine', w: { fu: 3, ig: 1 } },
    br_squeal: { cat: 'brakes', w: { pd: 4 } },
    br_soft: { cat: 'brakes', w: { fl: 4, ca: 1 } },
    br_pull: { cat: 'brakes', w: { ca: 3, pd: 1 } },
    br_vibr: { cat: 'brakes', w: { pd: 3, ca: 1 } },
    br_burn: { cat: 'brakes', w: { ca: 4 } },
    su_knock: { cat: 'suspension', w: { bu: 3, sh: 1 } },
    su_bounce: { cat: 'suspension', w: { sh: 4 } },
    su_drift: { cat: 'suspension', w: { bj: 3, sh: 1 } },
    su_wear: { cat: 'suspension', w: { bj: 2, sh: 2 } },
    su_creak: { cat: 'suspension', w: { bj: 3, bu: 1 } },
    el_crank: { cat: 'electrical', w: { ba: 4, al: 1 } },
    el_dim: { cat: 'electrical', w: { al: 4 } },
    el_batt: { cat: 'electrical', w: { al: 4, ba: 1 } },
    el_dead: { cat: 'electrical', w: { ba: 2, wi: 3 } },
    el_glitch: { cat: 'electrical', w: { wi: 4 } },
    tr_jerk: { cat: 'transmission', w: { go: 4 } },
    tr_slip: { cat: 'transmission', w: { cl: 4 } },
    tr_hard: { cat: 'transmission', w: { cl: 3, go: 1 } },
    tr_whine: { cat: 'transmission', w: { go: 3 } },
    tr_click: { cat: 'transmission', w: { cv: 4 } },
    ot_warm: { cat: 'other', w: { ac: 4 } },
    ot_loud: { cat: 'other', w: { ex: 4 } },
    ot_smell: { cat: 'other', w: { fi: 3, ac: 1 } },
    ot_air: { cat: 'other', w: { fi: 4 } },
    ot_rattle: { cat: 'other', w: { ex: 3 } }
  };
  /* dialogue: two scripted questions per category, option boosts */
  AD.QA = {
    engine: [
      [{ ig: 1, fu: 2 }, { co: 3 }, { fu: 1, ig: 2 }],
      [{ co: 3 }, { fu: 3 }, { ig: 1 }]
    ],
    brakes: [
      [{ pd: 2 }, { pd: 2, ca: 1 }, { ca: 2, fl: 1 }],
      [{ fl: 3 }, { ca: 2 }, { pd: 1 }]
    ],
    suspension: [
      [{ bu: 2, sh: 1 }, { sh: 2, bj: 1 }, { bj: 2 }],
      [{ bj: 2 }, { bu: 2 }, { sh: 2 }]
    ],
    electrical: [
      [{ ba: 3 }, { al: 3 }, { wi: 2, ba: 1 }],
      [{ ba: 2 }, { al: 2 }, { wi: 3 }]
    ],
    transmission: [
      [{ go: 2 }, { cl: 2 }, { cv: 2 }],
      [{ cl: 3 }, { go: 2 }, { cv: 2 }]
    ],
    other: [
      [{ ac: 3 }, { ex: 3 }, { fi: 3 }],
      [{ ac: 2 }, { fi: 2 }, { ex: 2 }]
    ]
  };
  AD.OBD = [
    { c: 'P0300', cat: 'engine', sev: 'high', hint: 'ig' },
    { c: 'P0301', cat: 'engine', sev: 'medium', hint: 'ig' },
    { c: 'P0171', cat: 'engine', sev: 'medium', hint: 'fu' },
    { c: 'P0128', cat: 'engine', sev: 'low', hint: 'co' },
    { c: 'P0217', cat: 'engine', sev: 'high', hint: 'co' },
    { c: 'P0335', cat: 'engine', sev: 'medium', hint: 'ig' },
    { c: 'P0420', cat: 'other', sev: 'low', hint: 'ex' },
    { c: 'P0442', cat: 'other', sev: 'low', hint: 'fi' },
    { c: 'P0562', cat: 'electrical', sev: 'medium', hint: 'al' },
    { c: 'P0620', cat: 'electrical', sev: 'high', hint: 'al' },
    { c: 'P0700', cat: 'transmission', sev: 'medium', hint: 'go' },
    { c: 'P0730', cat: 'transmission', sev: 'high', hint: 'cl' },
    { c: 'C0035', cat: 'brakes', sev: 'high', hint: 'ca' },
    { c: 'U0100', cat: 'electrical', sev: 'high', hint: 'wi' }
  ];
  AD.MAKES = { Kestrel: 'std', Orion: 'std', Vela: 'eco', Sorrel: 'eco', Norden: 'prem', Brandt: 'prem' };
  AD.TIER = { eco: 1.0, std: 1.3, prem: 1.8 };
  AD.REGIONS = { harbor: 1.0, riverton: 1.15, upland: 0.85 };
  AD.CLASSES = { indep: { labor: 0.85, part: 0.8 }, std: { labor: 1.0, part: 1.0 }, auth: { labor: 1.35, part: 1.3 } };
  AD.RATE = 18; /* conditional units per labour hour */
  AD.DIAG_FEE = 15;
  AD.SERVICES = [
    { id: 's1', name: 'Harbor Works Garage', region: 'harbor', cls: 'std', rate: '4.6', dist: 3 },
    { id: 's2', name: 'Northline Motors', region: 'riverton', cls: 'auth', rate: '4.8', dist: 7 },
    { id: 's3', name: 'Upland Auto Care', region: 'upland', cls: 'indep', rate: '4.4', dist: 12 },
    { id: 's4', name: 'Riverton Quick Service', region: 'riverton', cls: 'indep', rate: '4.3', dist: 5 }
  ];
  AD.SLOTS = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];
  AD.REM_KINDS = { oil: [10000, 12], brake: [0, 24], cabin: [15000, 12], tyre: [0, 6], insp: [0, 12], belt: [90000, 60] };

  function seed() {
    const S = AD.S = {
      cars: [
        { id: 'c1', make: 'Kestrel', model: 'Terra 1.6', year: 2017, plate: 'AB 0000 XX', km: 148200, docs: [{ k: 'ins', d: AD.addDays(34) }, { k: 'insp', d: AD.addDays(210) }], codes: [] },
        { id: 'c2', make: 'Norden', model: 'Lyra 2.0 T', year: 2020, plate: 'CD 0000 YY', km: 61400, docs: [{ k: 'ins', d: AD.addDays(9) }, { k: 'insp', d: AD.addDays(420) }], codes: ['P0171'] }
      ],
      carSeq: 3, active: 'c1',
      diags: [
        { id: 'd1', carId: 'c1', cat: 'brakes', sym: ['br_squeal', 'br_vibr'], boost: {}, note: '', date: AD.addDays(-64), status: 'fixed', checked: {}, est: { cause: 'pd', total: [118, 212] }, bookingId: 'b1' },
        { id: 'd2', carId: 'c2', cat: 'engine', sym: ['eng_rough', 'eng_light'], boost: { ig: 2 }, note: '', date: AD.addDays(-3), status: 'open', checked: {}, est: null, bookingId: null },
        { id: 'd3', carId: 'c1', cat: 'electrical', sym: ['el_crank'], boost: { ba: 1 }, note: '', date: AD.addDays(-17), status: 'fixed', checked: {}, est: { cause: 'ba', total: [88, 160] }, bookingId: null }
      ],
      diagSeq: 4,
      bookings: [
        { id: 'b1', carId: 'c1', svc: 's1', date: AD.addDays(-58), slot: '10:30', job: 'pd', diagId: 'd1', status: 'done', note: '' }
      ],
      bookSeq: 2,
      rems: [
        { id: 'r1', carId: 'c1', kind: 'oil', every: 10000, months: 12, lastKm: 140300, lastD: AD.addDays(-240), on: true },
        { id: 'r2', carId: 'c1', kind: 'brake', every: 0, months: 24, lastKm: 120000, lastD: AD.addDays(-700), on: true },
        { id: 'r3', carId: 'c1', kind: 'cabin', every: 15000, months: 12, lastKm: 130000, lastD: AD.addDays(-380), on: true },
        { id: 'r4', carId: 'c1', kind: 'tyre', every: 0, months: 6, lastKm: 147000, lastD: AD.addDays(-170), on: false },
        { id: 'r5', carId: 'c2', kind: 'oil', every: 12000, months: 12, lastKm: 52000, lastD: AD.addDays(-300), on: true },
        { id: 'r6', carId: 'c2', kind: 'insp', every: 0, months: 12, lastKm: 40000, lastD: AD.addDays(-200), on: true }
      ],
      remSeq: 7,
      plan: { tier: 'free', used: 2 },
      set: { region: 'harbor', cls: 'std', units: 'km', nRem: true, nDiag: true, nBook: false },
      draft: null,
      log: [],
      scenario: null
    };
    S.log = [
      { ts: AD.addDays(-64), type: 'diag', k: 'lg.diag', v: { car: 'Kestrel Terra 1.6', cause: { k: 'cz.pd.n' } } },
      { ts: AD.addDays(-58), type: 'book', k: 'lg.done', v: { svc: 'Harbor Works Garage' } },
      { ts: AD.addDays(-17), type: 'diag', k: 'lg.diag', v: { car: 'Kestrel Terra 1.6', cause: { k: 'cz.ba.n' } } },
      { ts: AD.addDays(-3), type: 'diag', k: 'lg.diag', v: { car: 'Norden Lyra 2.0 T', cause: { k: 'cz.ig.n' } } }
    ];
    S.nav = { tab: 'garage', stack: [{ id: 'garage' }] };
    return S;
  }
  AD.seed = seed;
  seed();
}());
