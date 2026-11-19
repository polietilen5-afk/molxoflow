/* Modules: piecework orders and service memos (draft > confirmed / approved), no amounts shown. */
(function () {
  'use strict';
  var CL = window.CL, T = CL.T, el = CL.el;
  CL.ud({ pcStatus: 'all', mmStatus: 'all', mmQ: '' });
  var PS_KIND = { draft: 'warn', confirmed: 'ok', cancelled: 'bad' };
  var MS_KIND = { draft: 'info', submitted: 'warn', approved: 'ok', rejected: 'bad', cancelled: 'bad' };

  /* ---------- piecework ---------- */
  function pcVisible() { return CL.DB.pieces.filter(function (p) { return CL.role() !== 'mgr' || p.dept === CL.MGR_DEPT; }); }
  function pcCanConfirm(p) { var r = CL.role(); return p.st === 'draft' && p.price && r !== 'acc' && p.by !== r && (r !== 'mgr' || p.dept === CL.MGR_DEPT); }
  function pcDetail(p) {
    var body = el('div', { cls: 'detail' });
    var dl = el('dl', { cls: 'kv' });
    [[T('f.type'), T('pt.' + p.type)], [T('f.date'), p.date], [T('piece.qty'), p.qty + ' ' + T('u.' + p.unit)], [T('f.status'), T('ps.' + p.st)], [T('piece.price'), p.price ? (CL.can('price') ? T('piece.tariff', { t: p.price }) : T('piece.priceSet')) : T('piece.priceNone')], [T('f.createdBy'), T('role.' + p.by)]].forEach(function (r) { dl.appendChild(el('div', {}, [el('dt', { text: r[0] }), el('dd', { text: r[1] })])); });
    body.appendChild(dl);
    body.appendChild(el('h4', { cls: 'sub-h', text: T('piece.shares') }));
    body.appendChild(CL.table([{ h: T('f.employee'), f: function (s) { return CL.emp(s.emp).n; } }, { h: T('piece.sharePct'), f: function (s) { return s.pct + ' %'; } }], p.shares));
    if (p.st === 'confirmed') body.appendChild(el('p', { cls: 'note-ok' }, [CL.icon('check'), el('span', { text: T('piece.immutable') })]));
    var btns = [];
    if (p.st === 'draft' && !p.price && CL.can('price')) btns.push({ text: T('piece.setPrice'), onclick: function () { priceDialog(p); } });
    if (pcCanConfirm(p)) btns.push({ text: T('piece.confirm'), onclick: function () { p.st = 'confirmed'; p.confirmedBy = CL.role(); CL.log('piece', 'piece.confirm', { id: p.id.toUpperCase() }, p.id); CL.toast(T('toast.pcConfirmed')); CL.render(); } });
    if (p.st === 'draft' && p.price && !pcCanConfirm(p)) body.appendChild(el('p', { cls: 'lead-s', text: T('piece.cantConfirm') }));
    if (p.st === 'draft' && (CL.role() === 'hr' || p.by === CL.role())) btns.push({ text: T('piece.cancel'), ghost: true, onclick: function () { p.st = 'cancelled'; CL.log('piece', 'piece.cancel', { id: p.id.toUpperCase() }, p.id); CL.render(); } });
    if (p.st === 'confirmed' && CL.isIn('hr', 'ceo')) btns.push({ text: T('piece.storno'), ghost: true, onclick: function () { p.st = 'cancelled'; CL.log('piece', 'piece.storno', { id: p.id.toUpperCase() }, p.id); CL.toast(T('toast.pcStorno')); CL.render(); } });
    btns.push({ text: T('dlg.close'), ghost: true });
    CL.dialog(T('pt.' + p.type) + ' ' + p.id.toUpperCase(), body, btns, { wide: true });
  }
  function priceDialog(p) {
    var form = CL.form([{ k: 'tier', label: T('piece.tariffLevel'), type: 'select', opts: [['A', T('rate.tier', { t: 'A' })], ['B', T('rate.tier', { t: 'B' })], ['C', T('rate.tier', { t: 'C' })]], req: true, help: T('piece.tariffHelp') }]);
    CL.dialog(T('piece.setPrice'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('dlg.save'), onclick: function () { if (!form.validate()) return false; p.price = form.get().tier; CL.log('piece', 'piece.price', { id: p.id.toUpperCase() }, p.id); CL.toast(T('toast.saved')); CL.render(); } }]);
  }
  function newPiece() {
    if (!CL.isIn('hr', 'mgr')) { CL.toast(T('toast.noAccess')); return; }
    var emps = CL.visibleEmps().filter(function (e) { return e.st !== 'dismissed'; });
    var f = [
      { k: 'type', label: T('f.type'), type: 'select', opts: CL.PIECE_TYPES.map(function (t) { return [t, T('pt.' + t)]; }), req: true },
      { k: 'date', label: T('f.date'), type: 'date', req: true, value: CL.TODAY },
      { k: 'qty', label: T('piece.qty'), type: 'number', min: 1, max: 100000, req: true, value: '10' },
      { k: 'unit', label: T('piece.unit'), type: 'select', opts: ['pallets', 'boxes', 'units', 'trips'].map(function (u) { return [u, T('u.' + u)]; }), req: true },
      { k: 'e1', label: T('piece.worker', { n: 1 }), type: 'select', opts: emps.map(function (e) { return [e.id, e.n]; }), req: true },
      { k: 'p1', label: T('piece.sharePct') + ' 1', type: 'number', min: 1, max: 100, req: true, value: '50' },
      { k: 'e2', label: T('piece.worker', { n: 2 }), type: 'select', opts: [['', '-']].concat(emps.map(function (e) { return [e.id, e.n]; })) },
      { k: 'p2', label: T('piece.sharePct') + ' 2', type: 'number', min: 0, max: 100, value: '50' }
    ];
    var form = CL.form(f, function (v) {
      var er = {}, tot = Number(v.p1) + (v.e2 ? Number(v.p2 || 0) : 0);
      if (v.e2 && v.e2 === v.e1) er.e2 = { key: 'v.sameWorker' };
      if (tot !== 100) er.p1 = { key: 'v.sum100', vars: { n: tot } };
      if (v.date > CL.TODAY) er.date = { key: 'v.future' };
      return er;
    });
    CL.dialog(T('piece.new'), el('div', {}, [el('p', { cls: 'dlg-p', text: T('piece.newHint') }), form.node]), [{ text: T('dlg.cancel'), ghost: true }, { text: T('dlg.save'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get(), sh = [{ emp: v.e1, pct: Number(v.p1) }];
      if (v.e2) sh.push({ emp: v.e2, pct: Number(v.p2) });
      var p = { id: CL.nextId('pc'), type: v.type, date: v.date, qty: Number(v.qty), unit: v.unit, shares: sh, st: 'draft', price: '', by: CL.role(), dept: CL.emp(v.e1).dept };
      CL.DB.pieces.unshift(p); CL.log('piece', 'piece.create', { id: p.id.toUpperCase() }, p.id); CL.toast(T('toast.pcCreated')); CL.render();
    } }]);
  }
  CL.registerMod('piece', {
    icon: 'piece',
    badge: function () { return CL.tasks().filter(function (t) { return t.k === 'pc' || t.k === 'pp'; }).length; },
    render: function (box) {
      var U = CL.UI;
      box.appendChild(CL.head(T('m.piece'), T('piece.sub'), CL.isIn('hr', 'mgr') ? [CL.btn(T('piece.new'), newPiece)] : []));
      var f = el('div', { cls: 'filters' });
      var sS = el('select', { cls: 'in', 'aria-label': T('f.status') }, [el('option', { value: 'all', text: T('f.allStatuses') })].concat(['draft', 'confirmed', 'cancelled'].map(function (s) { return el('option', { value: s, text: T('ps.' + s) }); })));
      sS.value = U.pcStatus; sS.addEventListener('change', function () { U.pcStatus = sS.value; CL.render('.mod select'); });
      f.appendChild(sS); box.appendChild(f);
      var rows = pcVisible().filter(function (p) { return U.pcStatus === 'all' || p.st === U.pcStatus; });
      box.appendChild(CL.table([
        { h: T('f.id'), f: function (p) { return CL.link(p.id.toUpperCase(), function () { pcDetail(p); }); } },
        { h: T('f.type'), f: function (p) { return T('pt.' + p.type); } }, { h: T('f.date'), f: function (p) { return p.date; } },
        { h: T('piece.qty'), f: function (p) { return p.qty + ' ' + T('u.' + p.unit); } },
        { h: T('piece.workers'), f: function (p) { return p.shares.map(function (s) { return CL.emp(s.emp).n; }).join(', '); } },
        { h: T('piece.price'), f: function (p) { return p.price ? CL.badge('ok', T('piece.priceSet')) : CL.badge('warn', T('piece.priceNone')); } },
        { h: T('f.status'), f: function (p) { return CL.badge(PS_KIND[p.st], T('ps.' + p.st)); } }
      ], rows, { empty: T('piece.none') }));
      box.appendChild(el('p', { cls: 'hint-s', text: T('piece.rule') }));
    }
  });

  /* ---------- memos ---------- */
  function mmVisible() { return CL.DB.memos.filter(function (m) { return CL.inScope(m.emp); }); }
  function mmDetail(m) {
    var e = CL.emp(m.emp), body = el('div', { cls: 'detail' }), dl = el('dl', { cls: 'kv' });
    [[T('f.employee'), e.n], [T('f.type'), T('mk.' + m.kind)], [T('memo.month'), m.month], [T('f.status'), T('ms.' + m.st)], [T('memo.amount'), m.priced ? (CL.can('price') ? T('memo.amountSet') : T('memo.amountMarked')) : T('memo.amountNone')], [T('memo.basis'), m.file || T('memo.noFile')], [T('f.createdBy'), T('role.' + m.by)]].forEach(function (r) { dl.appendChild(el('div', {}, [el('dt', { text: r[0] }), el('dd', { text: r[1] })])); });
    body.appendChild(dl);
    body.appendChild(el('h4', { cls: 'sub-h', text: T('memo.reason') }));
    body.appendChild(el('p', { text: m.reason }));
    if (m.st === 'rejected' && m.why) body.appendChild(el('p', { cls: 'note-r', text: T('ev.rejectedWhy', { why: m.why }) }));
    if (m.st === 'approved') body.appendChild(el('p', { cls: 'note-ok' }, [CL.icon('check'), el('span', { text: T('memo.inCalc') })]));
    var btns = [], r = CL.role();
    if ((m.st === 'draft' || m.st === 'rejected') && (m.by === r || r === 'hr')) { btns.push({ text: T('memo.submit'), onclick: function () {
      if (!m.file) { CL.toast(T('toast.memoNoFile')); return false; }
      m.st = 'submitted'; CL.log('memos', 'memo.submit', { name: e.n }, m.id); CL.toast(T('toast.memoSubmitted')); CL.render(); } });
    }
    if (m.st !== 'approved' && !m.priced && CL.can('price')) btns.push({ text: T('memo.setAmount'), onclick: function () { m.priced = true; CL.log('memos', 'memo.amount', { name: e.n }, m.id); CL.toast(T('toast.saved')); CL.render(); } });
    if (m.st === 'submitted' && r === 'ceo' && m.by !== 'ceo') {
      btns.push({ text: T('memo.approve'), onclick: function () { if (!m.priced) { CL.toast(T('toast.memoNoAmount')); return false; } m.st = 'approved'; m.decidedBy = 'ceo'; CL.log('memos', 'memo.approve', { name: e.n }, m.id); CL.toast(T('toast.memoApproved')); CL.render(); } });
      btns.push({ text: T('memo.reject'), ghost: true, onclick: function () {
        var form = CL.form([{ k: 'why', label: T('ev.rejectReason'), type: 'textarea', req: true, minlen: 5 }]);
        CL.dialog(T('memo.reject'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('memo.reject'), onclick: function () { if (!form.validate()) return false; m.st = 'rejected'; m.why = form.get().why; CL.log('memos', 'memo.reject', { name: e.n }, m.id); CL.render(); } }]);
      } });
    }
    if (m.st === 'submitted' && r === 'ceo' && m.by === 'ceo') body.appendChild(el('p', { cls: 'lead-s', text: T('memo.notSelf') }));
    if (m.st === 'approved' && r === 'ceo') btns.push({ text: T('memo.storno'), ghost: true, onclick: function () { m.st = 'cancelled'; CL.log('memos', 'memo.storno', { name: e.n }, m.id); CL.render(); } });
    if (m.st === 'draft' && (m.by === r || r === 'hr')) btns.push({ text: T('memo.cancel'), ghost: true, onclick: function () { m.st = 'cancelled'; CL.log('memos', 'memo.cancel', { name: e.n }, m.id); CL.render(); } });
    btns.push({ text: T('dlg.close'), ghost: true });
    CL.dialog(T('memo.title', { name: e.n }), body, btns, { wide: true });
  }
  function newMemo() {
    if (!CL.isIn('hr', 'mgr')) { CL.toast(T('toast.noAccess')); return; }
    var form = CL.form([
      { k: 'emp', label: T('f.employee'), type: 'select', opts: CL.visibleEmps().filter(function (e) { return e.st !== 'dismissed'; }).map(function (e) { return [e.id, e.n]; }), req: true },
      { k: 'kind', label: T('f.type'), type: 'select', opts: CL.MEMO_KINDS.map(function (k) { return [k, T('mk.' + k)]; }), req: true },
      { k: 'month', label: T('memo.month'), type: 'select', opts: [['2026-10', T('month.name')], ['2026-09', T('month.prev')]], req: true },
      { k: 'reason', label: T('memo.reason'), type: 'textarea', req: true, minlen: 15, help: T('memo.reasonHelp') },
      { k: 'file', label: T('memo.basisName'), help: T('memo.basisHelp'), pattern: /^[\w-]+\.(pdf|jpg|png|docx|xlsx)$/i, patternMsg: 'v.fileType' }
    ]);
    CL.dialog(T('memo.new'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('dlg.save'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get(), m = { id: CL.nextId('mm'), emp: v.emp, kind: v.kind, month: v.month, reason: v.reason, file: v.file, st: 'draft', by: CL.role(), priced: false };
      CL.DB.memos.unshift(m); CL.log('memos', 'memo.create', { name: CL.emp(v.emp).n }, m.id); CL.toast(T('toast.memoCreated')); CL.render();
    } }]);
  }
  CL.registerMod('memos', {
    icon: 'memo',
    badge: function () { return CL.tasks().filter(function (t) { return t.k === 'mm' || t.k === 'mp'; }).length; },
    render: function (box) {
      var U = CL.UI;
      box.appendChild(CL.head(T('m.memos'), T('memo.sub'), CL.isIn('hr', 'mgr') ? [CL.btn(T('memo.new'), newMemo)] : []));
      var f = el('div', { cls: 'filters' });
      var q = el('input', { type: 'search', cls: 'in', placeholder: T('memo.search'), 'aria-label': T('memo.search'), value: U.mmQ });
      var sS = el('select', { cls: 'in', 'aria-label': T('f.status') }, [el('option', { value: 'all', text: T('f.allStatuses') })].concat(['draft', 'submitted', 'approved', 'rejected', 'cancelled'].map(function (s) { return el('option', { value: s, text: T('ms.' + s) }); })));
      sS.value = U.mmStatus;
      var out = el('div');
      function fill() {
        out.innerHTML = ''; var qq = U.mmQ.toLowerCase();
        out.appendChild(CL.table([
          { h: T('f.employee'), f: function (m) { return CL.link(CL.emp(m.emp).n, function () { mmDetail(m); }); } },
          { h: T('f.type'), f: function (m) { return T('mk.' + m.kind); } }, { h: T('memo.month'), f: function (m) { return m.month; } },
          { h: T('memo.basis'), f: function (m) { return m.file || '-'; } },
          { h: T('memo.amount'), f: function (m) { return m.priced ? CL.badge('ok', T('memo.amountMarked')) : CL.badge('warn', T('memo.amountNone')); } },
          { h: T('f.status'), f: function (m) { return CL.badge(MS_KIND[m.st], T('ms.' + m.st)); } }
        ], mmVisible().filter(function (m) { return (U.mmStatus === 'all' || m.st === U.mmStatus) && (!qq || CL.emp(m.emp).n.toLowerCase().indexOf(qq) >= 0); }), { empty: T('memo.none') }));
      }
      q.addEventListener('input', function () { U.mmQ = q.value; fill(); });
      sS.addEventListener('change', function () { U.mmStatus = sS.value; fill(); });
      f.appendChild(el('label', { cls: 'search' }, [CL.icon('search'), q])); f.appendChild(sS);
      box.appendChild(f); box.appendChild(out); fill();
      box.appendChild(el('p', { cls: 'hint-s', text: T('memo.rule') }));
    }
  });
}());
