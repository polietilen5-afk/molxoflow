/* Bid Radar demo: state, helpers, actions shared by all modules. */
(function () {
  'use strict';
  var BR = window.BR, I = window.MFI18N, PF = window.PF;
  var S = BR.S = BR.mkState();
  var doc = document;
  var T = BR.T = function (k, v) { return I.t(k, v); };

  /* ---------- DOM helper ---------- */
  var H = BR.h = function (tag, a) {
    var e = doc.createElement(tag), i, k, kids = [].slice.call(arguments, 2);
    if (a && (typeof a === 'string' || a.nodeType || Array.isArray(a))) { kids.unshift(a); a = null; }
    if (typeof a === 'object' && a) {
      for (k in a) {
        if (!Object.prototype.hasOwnProperty.call(a, k) || a[k] == null || a[k] === false) continue;
        if (k === 'class') e.className = a[k];
        else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), a[k]);
        else if (k === 'value') e.value = a[k];
        else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden') e[k] = !!a[k];
        else e.setAttribute(k, a[k] === true ? '' : a[k]);
      }
    }
    (function add(list) {
      for (i = 0; i < list.length; i++) {
        var c = list[i];
        if (c == null || c === false) continue;
        if (Array.isArray(c)) add(c);
        else e.appendChild(c.nodeType ? c : doc.createTextNode(String(c)));
      }
    }(kids));
    return e;
  };
  BR.icon = function (name, size) {
    var P = {
      home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
      board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
      bid: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', check: '<path d="M4 12.5l5 5L20 6.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
      shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
      tasks: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>', coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9a3 3 0 00-5 1.5c0 3 5 1.5 5 4.5a3 3 0 01-5 1.5M12 6.5v11"/>',
      chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>', book: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>',
      flow: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.5 6H13a3 3 0 013 3v.5M8.5 18H13a3 3 0 003-3v-.5"/>',
      team: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c3 0 5 2 5 5"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
      log: '<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>', bell: '<path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
      email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>', portal: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
      docu: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>', back: '<path d="M15 5l-7 7 7 7"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      plus: '<path d="M12 5v14M5 12h14"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
      down: '<path d="M12 4v12M6 12l6 6 6-6"/>', up: '<path d="M12 20V8M6 12l6-6 6 6"/>', filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>', refresh: '<path d="M20 11a8 8 0 10-2.3 6M20 4v7h-7"/>'
    };
    var s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('width', size || 16); s.setAttribute('height', size || 16);
    s.innerHTML = P[name] || '';
    return s;
  };

  /* ---------- lookups and formatting ---------- */
  var byId = BR.byId = function (id) { for (var i = 0; i < S.tenders.length; i++) if (S.tenders[i].id === id) return S.tenders[i]; return null; };
  BR.member = function (id) { for (var i = 0; i < S.members.length; i++) if (S.members[i].id === id) return S.members[i]; return null; };
  BR.role = function () { return BR.member(S.me).role; };
  BR.can = function (a) { return !!S.perms[BR.role()][a]; };
  BR.guard = function (a) { if (BR.can(a)) return true; BR.toast(T('perm.denied', { role: T('role.' + BR.role()) }), 'warn'); return false; };
  BR.tt = function (t, k) {
    if (t.raw && (k === 'title' || k === 'subject')) return t.raw;
    if (t.raw && k === 'buyer') return t.rawBuyer;
    if (k === 'buyer') return T('b.' + (((t.id - 1) % 8) + 1));
    return T('t.' + t.id + '.' + k);
  };
  BR.name = function (id) { var m = BR.member(id); return m ? m.name : '?'; };
  BR.initials = function (id) { var n = BR.name(id); return n.replace(/[^A-Z]/g, '').slice(0, 2) || n[0]; };
  var LOC = { en: 'en-GB', ru: 'ru-RU', uk: 'uk-UA' };
  BR.loc = function () { return LOC[I.lang()] || 'en-GB'; };
  BR.dayDate = function (off) { var d = new Date(BR.today.getTime()); d.setDate(d.getDate() + off); return d; };
  BR.fmt = function (off, long) { return BR.dayDate(off).toLocaleDateString(BR.loc(), long ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' }); };
  BR.ago = function (at) {
    var m = Math.max(0, Math.round((Date.now() - at) / 60000));
    if (m < 1) return T('ago.now');
    if (m < 60) return T('ago.m', { n: m });
    if (m < 1440) return T('ago.h', { n: Math.round(m / 60) });
    return T('ago.d', { n: Math.round(m / 1440) });
  };
  BR.num = function (n) { return (Math.round(n * 100) / 100).toLocaleString(BR.loc(), { maximumFractionDigits: 2 }); };
  BR.cu = function (n) { return T('cu', { n: BR.num(n) }); };
  BR.val = function (t, id) {
    switch (id) {
      case 'amount': return T('v.amount', { x: ['X', '2X', '3X'][t.amount - 1] });
      case 'delivery': return T('v.days', { n: t.delivery });
      case 'deadline': return T('v.deadline', { n: t.due });
      case 'exp': return T('v.years', { n: t.exp });
      case 'lic': return T('v.lic', { c: t.lic });
      case 'staff': return T('v.level', { n: t.staff });
      case 'warr': return T('v.months', { n: t.warr });
      case 'fin': return T('v.band', { n: t.fin });
      default: return T('v.cert');
    }
  };
  BR.have = function (id) {
    var P = S.profile;
    switch (id) {
      case 'exp': return T('p.exp', { n: P.exp });
      case 'lic': return T('p.lic', { c: ['A', 'B', 'C'].filter(function (c) { return P.lic[c]; }).join(', ') || '-' });
      case 'staff': return T('p.staff', { n: P.staff });
      case 'warr': return T('p.warr', { n: P.warr });
      case 'fin': return T('p.fin', { n: P.fin });
      default: return BR.docValid(S, 'insurance') ? T('p.ins.ok') : T('p.ins');
    }
  };
  BR.activeStage = function (t) { return ['inbox', 'analysis', 'qualified', 'bid', 'submitted'].indexOf(t.stage) >= 0; };
  BR.inPipeline = function (t) { return BR.STAGES.indexOf(t.stage) >= 0; };

  /* ---------- log / notifications / toast ---------- */
  var onChange = [];
  BR.subscribe = function (fn) { onChange.push(fn); };
  BR.changed = function (what) { for (var i = 0; i < onChange.length; i++) onChange[i](what || 'all'); };
  BR.logAdd = function (ev, k, v) { S.log.push({ at: Date.now(), who: S.me, ev: ev, k: k, v: v || {} }); };
  BR.lv = function (v) {
    var o = {};
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      var x = v[k];
      if (k === 'tid') o.title = byId(x) ? BR.tt(byId(x), 'title') : '?';
      else if (k === 'to' || k === 'from') o[k] = T('stage.' + x);
      else if (k === 'did') o.doc = T('doc.' + x);
      else if (k === 'sid') o.src = T('srcn.' + x);
      else if (k === 'mid') o.who = BR.name(x);
      else if (k === 'text' && /^cm\./.test(x)) o.text = T(x);
      else if (k === 'role') o.role = T('role.' + x);
      else o[k] = x;
    }
    return o;
  };
  BR.logText = function (e) { return T(e.k, BR.lv(e.v)); };
  BR.notifs = function () {
    var out = [], st = S.settings, i, t, e;
    if (!st.ch.email && !st.ch.messenger) return out;
    for (i = S.log.length - 1; i >= 0; i--) { e = S.log[i]; if (st.ev[e.ev] && e.ev !== 'other') out.push({ at: e.at, text: BR.logText(e), ev: e.ev, tid: e.v.tid, key: 'l' + i }); }
    if (st.ev.deadline) S.tenders.forEach(function (t) {
      if (BR.activeStage(t) && t.stage !== 'submitted' && t.due >= 0 && t.due <= st.lead) out.push({ at: Date.now() - 1000, text: T('nt.deadline', { title: BR.tt(t, 'title'), n: t.due }), ev: 'deadline', tid: t.id, key: 'd' + t.id });
    });
    if (st.ev.doc) S.docs.forEach(function (d) {
      var s = BR.docStatus(S, d.id);
      if (s === 'soon' || s === 'expired') out.push({ at: Date.now() - 2000, text: T('nt.doc.' + s, { doc: T('doc.' + d.id) }), ev: 'doc', key: 'x' + d.id });
    });
    out.sort(function (a, b) { return b.at - a.at; });
    return out;
  };
  BR.unread = function () { return BR.notifs().filter(function (n) { return n.at > S.seen && !S.read[n.key]; }).length; };
  var toastTimer = null;
  BR.toast = function (text, kind) {
    S.toast = { text: text, kind: kind || 'ok' };
    var box = doc.getElementById('toast');
    if (box) { box.textContent = text; box.className = 'toast show ' + (kind || 'ok'); }
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { var b = doc.getElementById('toast'); if (b) b.className = 'toast'; }, 3600);
  };

  /* ---------- workflow runs and parse engine ---------- */
  function mkRun(tid, kind, steps) {
    var r = { id: S.runId++, tid: tid, kind: kind, st: 'run', at: Date.now(), steps: steps.map(function (s) { return { k: s, st: 'wait' }; }), err: null };
    r.steps[0].st = 'run'; S.runs.push(r); return r;
  }
  BR.runFor = function (t, kind) { for (var i = S.runs.length - 1; i >= 0; i--) if (S.runs[i].tid === t.id && S.runs[i].kind === kind && S.runs[i].st === 'run') return S.runs[i]; return null; };
  BR.finishRun = function (r, ok) {
    if (!r) return; r.st = ok ? 'ok' : 'fail';
    r.steps.forEach(function (s) { if (ok) s.st = 'ok'; });
  };
  BR.startParse = function (t) {
    if (t.ps !== 0) return;
    var r = mkRun(t.id, 'parse', ['fetch', 'ocr', 'classify', 'extract', 'qualify', 'notify']);
    if (PF.reduced) { t.ps = 2; BR.finishRun(r, true); BR.logAdd('other', 'lg.parsed', { tid: t.id }); return; }
    t.ps = 1; t.tick = 0; t.acc = 0;
  };
  BR.restartParse = function (t) {
    t.ps = 0; t.tick = 0; t.stale = false; t.draftN = -1; t.draftDone = false; t.draft = ''; t.reviewed = false; delete t.att.form;
    BR.startParse(t);
  };
  BR.revealed = function (t) { return t.ps === 2 ? BR.fieldsOf(t).length : Math.max(0, t.tick - 1); };
  BR.finishParse = function (t) {
    if (t.ps !== 1) return;
    t.ps = 2; var r = BR.runFor(t, 'parse'); BR.finishRun(r, true);
    BR.logAdd('other', 'lg.parsed', { tid: t.id });
  };

  /* ---------- stage moves and automations ---------- */
  BR.stageOk = function (t, to) {
    if (to === 'bid' || to === 'qualified') {
      if (t.ps !== 2) return { ok: false, msg: T('mv.needparse') };
      if (to === 'bid' && S.settings.humanLow && BR.lowCount(S, t) > 0 && !t.reviewed) return { ok: false, msg: T('mv.needreview') };
    }
    if (to === 'submitted' && !t.submitted) return { ok: false, msg: T('mv.needsubmit') };
    return { ok: true };
  };
  BR.move = function (t, to, opts) {
    opts = opts || {};
    if (!BR.guard('move')) return false;
    if (t.stage === to) return false;
    var chk = BR.stageOk(t, to);
    if (!chk.ok) { BR.toast(chk.msg, 'warn'); return false; }
    if (to === 'bid' && t.ps === 2 && !BR.verdict(S, t).go && !opts.force) {
      BR.confirm(T('mv.nogo.t'), T('mv.nogo.d'), T('mv.nogo.ok'), function () { BR.move(t, to, { force: true }); });
      return false;
    }
    var from = t.stage; t.stage = to;
    BR.logAdd('stage', 'lg.moved', { tid: t.id, to: to, from: from });
    var a = S.settings.auto[to];
    if (a && a.task) {
      S.tasks.push({ id: S.taskId++, tpl: 'stage.' + to, tid: t.id, who: t.owner, due: 3, done: false, auto: 1 });
      BR.logAdd('other', 'lg.autotask', { tid: t.id, to: to });
    }
    if (a && a.notify) BR.logAdd('stage', 'lg.notified', { tid: t.id, to: to });
    BR.toast(T('mv.done', { title: BR.tt(t, 'title'), to: T('stage.' + to) }));
    BR.changed('tender');
    return true;
  };

  /* ---------- rules ---------- */
  BR.matchExc = function (t) {
    var title = (BR.tt(t, 'title') + ' ' + BR.tt(t, 'subject')).toLowerCase(), hit = null;
    S.rules.exc.forEach(function (w) { if (w && title.indexOf(w.toLowerCase()) >= 0) hit = w; });
    if (!hit && t.amount < S.rules.minAmt) hit = 'min';
    return hit;
  };
  BR.applyRules = function () {
    var n = 0;
    S.tenders.forEach(function (t) {
      if (t.stage === 'inbox') { var h = BR.matchExc(t); if (h) { t.stage = 'filtered'; t.filterWord = h; n++; BR.logAdd('other', 'lg.filtered', { tid: t.id, word: h === 'min' ? T('rule.minamt') : h }); } }
      else if (t.stage === 'filtered' && !BR.matchExc(t)) { t.stage = 'inbox'; n++; BR.logAdd('other', 'lg.restored', { tid: t.id }); }
    });
    return n;
  };
  BR.arrive = function (t, sid) {
    t.created = Date.now(); t.pa = S.ms;
    var h = BR.matchExc(t);
    if (h) { t.stage = 'filtered'; t.filterWord = h; BR.logAdd('other', 'lg.filtered', { tid: t.id, word: h === 'min' ? T('rule.minamt') : h }); return; }
    t.stage = 'inbox'; t.fresh = true;
    BR.logAdd('arrival', 'lg.arrived', { tid: t.id, sid: sid || t.src });
    if (S.settings.auto.inbox.task) S.tasks.push({ id: S.taskId++, tpl: 'stage.inbox', tid: t.id, who: t.owner, due: 2, done: false, auto: 1 });
    if (S.settings.autoParse) BR.startParse(t);
  };

  /* ---------- draft ---------- */
  BR.buildDraft = function (t) {
    var L = [T('dr.greet', { buyer: BR.tt(t, 'buyer') }), '', T('dr.intro', { subject: BR.tt(t, 'subject') }), ''];
    t.reqs.forEach(function (id) { L.push('- ' + T('dr.' + BR.effSt(S, t, id), { field: T('f.' + id), need: BR.val(t, id) })); });
    L.push('', T('dr.end'), '', T('dr.sign'));
    return L.join('\n');
  };
  BR.startDraft = function (t) {
    t.draft = BR.buildDraft(t); t.draftDone = false; delete t.att.form;
    BR.addVersion(t, t.draft);
    BR.logAdd('other', 'lg.draft', { tid: t.id, n: t.versions.length });
    mkRun(t.id, 'draft', ['fetch', 'qualify', 'draft', 'notify']);
    t.approval = 'none';
    if (PF.reduced) { t.draftN = t.draft.length; t.draftDone = true; t.att.form = true; BR.finishRun(BR.runFor(t, 'draft'), true); return; }
    t.draftN = 0;
  };
  BR.addVersion = function (t, text) { t.versions.push({ n: t.versions.length + 1, at: Date.now(), who: S.me, text: text }); };
  BR.draftText = function (t) {
    if (t.draftN >= 0 && !t.draftDone) return t.draft.slice(0, t.draftN);
    if (!t.draft && t.draftDone) t.draft = BR.buildDraft(t);
    return t.draft;
  };
  BR.checkItems = function (t) {
    var it = ['profile', 'bank', 'form', 'refs'];
    ['lic', 'staff', 'warr', 'ins'].forEach(function (k) { if (t.reqs.indexOf(k) >= 0) it.push(k); });
    return it;
  };
  BR.attached = function (t, k) {
    if (t.att[k] !== undefined) return t.att[k];
    if (k === 'form') return false;
    if (k === 'profile') return BR.docValid(S, 'quality');
    if (k === 'bank') return BR.docValid(S, 'bank');
    if (k === 'refs') return BR.docValid(S, 'refs');
    if (k === 'lic') return BR.docValid(S, 'lic' + t.lic) && BR.effSt(S, t, 'lic') === 'ok';
    if (k === 'staff') return BR.docValid(S, 'staff1') && BR.effSt(S, t, 'staff') === 'ok';
    if (k === 'ins') return BR.docValid(S, 'insurance');
    return BR.effSt(S, t, k) === 'ok';
  };
  BR.bidReady = function (t) { return BR.checkItems(t).every(function (k) { return BR.attached(t, k); }) && t.draftDone; };

  /* ---------- dialogs ---------- */
  var dlg = null;
  BR.closeDialog = function () { if (dlg) { dlg.remove(); dlg = null; } };
  BR.dialog = function (title, body, buttons) {
    BR.closeDialog();
    var root = doc.getElementById('dlgRoot'), prev = doc.activeElement;
    var box = H('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, H('h4', null, title), body, H('div', { class: 'dlg-b' }, buttons));
    dlg = H('div', { class: 'scrim', onclick: function (e) { if (e.target === dlg) BR.closeDialog(); } }, box);
    dlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { BR.closeDialog(); if (prev && prev.focus) prev.focus(); } });
    root.appendChild(dlg);
    var f = box.querySelector('input,select,textarea,button'); if (f) f.focus();
    return box;
  };
  BR.confirm = function (title, text, okLabel, onOk) {
    BR.dialog(title, H('p', null, text), [
      H('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: BR.closeDialog }, T('btn.cancel')),
      H('button', { class: 'btn btn-sm', type: 'button', onclick: function () { BR.closeDialog(); onOk(); } }, okLabel)
    ]);
  };

  /* ---------- reusable UI blocks ---------- */
  BR.btn = function (label, fn, cls, extra) {
    var o = { class: 'btn btn-sm ' + (cls || ''), type: 'button', onclick: fn };
    if (extra) for (var k in extra) o[k] = extra[k];
    return H('button', o, label);
  };
  BR.badge = function (cls, text) { return H('span', { class: 'bd ' + cls }, text); };
  BR.stBadge = function (t) {
    var s = t.submitted ? 'submitted' : (t.ps === 1 ? 'parsing' : 'ready');
    return H('span', { class: 'st st-' + s }, T('st.' + s));
  };
  BR.vdBadge = function (t) {
    if (t.ps !== 2) return null;
    var v = BR.verdict(S, t);
    return H('span', { class: 'vd ' + (v.go ? 'go' : 'nogo') }, T(v.go ? 'verdict.go' : 'verdict.nogo'));
  };
  BR.avatar = function (id) { return H('span', { class: 'av av-' + id, title: BR.name(id) }, BR.initials(id)); };
  BR.chips = function (label, opts, cur, onPick, multi) {
    var box = H('div', { class: 'chips', role: 'group', 'aria-label': label });
    opts.forEach(function (o) {
      var on = multi ? cur.indexOf(o.id) >= 0 : cur === o.id;
      box.appendChild(H('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', 'data-key': 'chip-' + label + o.id, onclick: function () { onPick(o.id); } }, o.label));
    });
    return box;
  };
  BR.tabs = function (items, cur, onPick, label) {
    var box = H('div', { class: 'mtabs', role: 'tablist', 'aria-label': label || '' });
    items.forEach(function (it) {
      box.appendChild(H('button', { type: 'button', role: 'tab', class: 'mtab', 'aria-selected': it.id === cur ? 'true' : 'false', tabindex: it.id === cur ? 0 : -1, 'data-key': 'tab-' + it.id, onclick: function () { onPick(it.id); } }, it.label));
    });
    box.addEventListener('keydown', function (e) {
      var ids = items.map(function (i) { return i.id; }), i = ids.indexOf(cur);
      if (e.key === 'ArrowRight') i = (i + 1) % ids.length; else if (e.key === 'ArrowLeft') i = (i + ids.length - 1) % ids.length; else return;
      e.preventDefault(); onPick(ids[i]); setTimeout(function () { var n = doc.querySelector('[data-key="tab-' + ids[i] + '"]'); if (n) n.focus(); }, 0);
    });
    return box;
  };
  BR.field = function (label, input, err) {
    return H('label', { class: 'fld' + (err ? ' bad' : '') }, H('span', { class: 'fld-l' }, label), input, err ? H('span', { class: 'fld-e', role: 'alert' }, err) : null);
  };
  BR.select = function (opts, cur, onPick, key) {
    var s = H('select', { class: 'sel', 'data-key': key || null, onchange: function () { onPick(s.value); } });
    opts.forEach(function (o) { s.appendChild(H('option', { value: o.id, selected: String(o.id) === String(cur) }, o.label)); });
    return s;
  };
  BR.empty = function (text) { return H('p', { class: 'empty' }, text); };
  BR.section = function (title, kids, aside) {
    return H('section', { class: 'blk' }, H('div', { class: 'blk-h' }, H('h4', null, title), aside || null), kids);
  };
  /* responsive table: header cells + rows of cells (nodes) with labels */
  BR.table = function (cols, rows, cls) {
    var t = H('div', { class: 'rt ' + (cls || ''), role: 'table', style: '--cols:' + cols.map(function (c) { return c.w || '1fr'; }).join(' ') });
    t.appendChild(H('div', { class: 'rt-h', role: 'row' }, cols.map(function (c) { return H('span', { role: 'columnheader' }, c.label); })));
    rows.forEach(function (r) {
      var row = H('div', { class: 'rt-r' + (r.cls ? ' ' + r.cls : ''), role: 'row' });
      if (r.onclick) { row.tabIndex = 0; row.setAttribute('data-key', 'row-' + r.key); row.addEventListener('click', function (e) { if (!e.target.closest('button,select,input,a,label')) r.onclick(); }); row.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target === row) r.onclick(); }); }
      r.cells.forEach(function (c, i) { row.appendChild(H('span', { class: 'rt-c', role: 'cell', 'data-l': cols[i].label }, c)); });
      t.appendChild(row);
    });
    return t;
  };
  BR.csv = function (name, rows) {
    var txt = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    try {
      var b = new Blob([txt], { type: 'text/csv' }), a = doc.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name; doc.body.appendChild(a); a.click(); a.remove();
    } catch (e) { /* ignore */ }
    BR.toast(T('exp.done', { name: name }));
  };
  BR.openTender = function (id, tab) {
    S.drawer = { id: id, tab: tab || 'analysis', pane: 'doc' };
    var t = byId(id); if (t) t.focus = null;
    BR.changed('drawer');
  };
}());
