/* Modules: public booking page (client side), reminders and templates. */
(function (w) {
  'use strict';
  var BK = w.BK, T = BK.T, el = BK.el, icon = BK.icon;
  BK.ud({ pg: { step: 1, svc: null, staff: 'any', date: null, time: null, name: '', phone: '', note: '', consent: false, code: null, err: {} }, pgDev: 'desk', remTab: 'queue', remF: 'queued', mgCode: '' });
  function pg() { return BK.UI.pg; }
  function pgReset() { BK.UI.pg = { step: 1, svc: null, staff: 'any', date: null, time: null, name: '', phone: '', note: '', consent: false, code: null, err: {} }; }

  function steps(cur) {
    var L = ['pub.s1', 'pub.s2', 'pub.s3', 'pub.s4'];
    return el('ol', { cls: 'steps', 'aria-label': T('pub.progress') }, L.map(function (k, i) { return el('li', { cls: i + 1 < cur ? 'done' : i + 1 === cur ? 'cur' : '', 'aria-current': i + 1 === cur ? 'step' : null }, [el('i', { text: String(i + 1) }), el('span', { text: T(k) })]); }));
  }
  function back(to) { return el('button', { type: 'button', cls: 'lnk backl', onclick: function () { pg().step = to; BK.render('.pubframe h4'); } }, [icon('back'), T('pub.back')]); }

  function pubBody(P) {
    var D = BK.DB, S = D.settings, out = el('div', { cls: 'pubbody' });
    if (P.step === 5) {
      var b = BK.byCode(P.code);
      var ok = el('div', { cls: 'pubok' }, [el('div', { cls: 'bigok' }, [icon('check')]), el('h4', { tabindex: '-1', text: b && b.status === 'confirmed' ? T('pub.doneT') : T('pub.sentT') }), el('p', { text: b && b.status === 'confirmed' ? T('pub.doneP') : T('pub.sentP', { name: S.name }) })]);
      if (b) ok.appendChild(el('dl', { cls: 'kv' }, [
        el('div', {}, [el('dt', { text: T('f.code') }), el('dd', { text: b.code })]), el('div', {}, [el('dt', { text: T('f.status') }), el('dd', {}, [BK.stBadge(b.status)])]),
        el('div', {}, [el('dt', { text: T('f.service') }), el('dd', { text: BK.svcName(b.svc) })]), el('div', {}, [el('dt', { text: T('f.when') }), el('dd', { text: BK.when(b) })]),
        el('div', {}, [el('dt', { text: T('f.staff') }), el('dd', { text: BK.staffName(b.staff) })]), el('div', {}, [el('dt', { text: T('pub.where') }), el('dd', { text: S.addr })])]));
      ok.appendChild(el('ul', { cls: 'next' }, [T('pub.n1'), T('pub.n2'), T('pub.n3')].map(function (x) { return el('li', {}, [icon('arrow'), el('span', { text: x })]); })));
      ok.appendChild(el('div', { cls: 'acts' }, [BK.btn(T('pub.another'), function () { pgReset(); BK.render('.pubframe h4'); }, 'btn-ghost'), BK.modOK('list') ? BK.btn(T('pub.seeAdmin'), function () { BK.go('list', { lf: { st: 'all', per: 'up', src: 'web', staff: 'all', q: P.code } }); }) : null]));
      out.appendChild(ok); return out;
    }
    out.appendChild(steps(P.step));
    if (P.step === 1) {
      out.appendChild(el('h4', { tabindex: '-1', text: T('pub.h1') }));
      out.appendChild(el('ul', { cls: 'svcl' }, D.services.filter(function (s) { return s.on; }).map(function (s) {
        return el('li', {}, [el('button', { type: 'button', cls: 'svcb' + (P.svc === s.id ? ' on' : ''), onclick: function () { P.svc = s.id; P.staff = 'any'; P.date = null; P.time = null; P.step = 2; BK.render('.pubframe h4'); } }, [
          el('span', {}, [el('b', { text: BK.svcName(s.id) }), el('small', { text: s.name ? '' : T('svcd.' + s.id) })]), el('span', { cls: 'pr' }, [el('b', { text: BK.cu(s.price) }), el('small', { text: s.dur + ' ' + T('min') })])])]);
      })));
    } else if (P.step === 2) {
      out.appendChild(back(1)); out.appendChild(el('h4', { tabindex: '-1', text: T('pub.h2') }));
      var opts = [{ id: 'any', name: T('pub.anyone'), sub: T('pub.anySub') }].concat(BK.offering(P.svc).map(function (s) { return { id: s.id, name: s.name, sub: T('title.' + s.title) }; }));
      out.appendChild(el('ul', { cls: 'svcl' }, opts.map(function (o) {
        var nx = BK.firstSlots(P.svc, 1)[0];
        return el('li', {}, [el('button', { type: 'button', cls: 'svcb' + (P.staff === o.id ? ' on' : ''), onclick: function () { P.staff = o.id; P.step = 3; P.date = null; P.time = null; BK.render('.pubframe h4'); } }, [el('span', {}, [el('b', { text: o.name }), el('small', { text: o.sub })]), el('span', { cls: 'pr' }, [el('small', { text: o.id === 'any' && nx ? T('pub.nextFree', { when: BK.fmt(nx.d, 'dm') + ' ' + BK.hhmm(nx.t) }) : '' })])])]);
      })));
    } else if (P.step === 3) {
      out.appendChild(back(2)); out.appendChild(el('h4', { tabindex: '-1', text: T('pub.h3') }));
      var days = [], i, d;
      for (i = 0; i <= S.lead; i++) { d = BK.addDays(BK.TODAY, i); days.push({ d: d, n: BK.slotsFor(P.svc, P.staff, d).length }); }
      if (!P.date) { var f1 = days.filter(function (x) { return x.n; })[0]; if (f1) P.date = f1.d; }
      out.appendChild(el('div', { cls: 'daystrip', role: 'group', 'aria-label': T('f.date') }, days.map(function (x) {
        return el('button', { type: 'button', cls: 'dbtn' + (P.date === x.d ? ' on' : ''), disabled: !x.n, 'aria-pressed': P.date === x.d ? 'true' : 'false', onclick: function () { P.date = x.d; P.time = null; BK.render('.dbtn.on'); } }, [el('small', { text: BK.fmt(x.d, 'wd') }), el('b', { text: x.d.slice(8) }), el('small', { text: x.n ? T('pub.slotsN', { n: x.n }) : T('pub.full') })]);
      })));
      var ss = P.date ? BK.slotsFor(P.svc, P.staff, P.date) : [];
      out.appendChild(el('div', { cls: 'times', role: 'group', 'aria-label': T('f.time') }, ss.length ? ss.map(function (x) {
        return el('button', { type: 'button', cls: 'tbtn' + (P.time === x.t ? ' on' : ''), 'aria-pressed': P.time === x.t ? 'true' : 'false', onclick: function () { P.time = x.t; P.staffAssigned = x.staff; P.step = 4; BK.render('.pubframe h4'); } }, [BK.hhmm(x.t)]);
      }) : [el('p', { cls: 'lead-s', text: T('pub.noTimes') })]));
    } else {
      out.appendChild(back(3)); out.appendChild(el('h4', { tabindex: '-1', text: T('pub.h4') }));
      out.appendChild(el('p', { cls: 'sumline' }, [el('b', { text: BK.svcName(P.svc) }), ' · ' + BK.fmt(P.date, 'full') + ', ' + BK.hhmm(P.time) + ' · ' + BK.staffName(P.staffAssigned)]));
      var form = BK.form([
        { k: 'name', label: T('f.name'), req: true, minlen: 2, maxlength: 40, value: P.name },
        { k: 'phone', label: T('f.phone'), type: 'tel', req: true, pattern: /^\+?[\d\s()-]{7,20}$/, patternMsg: 'v.phone', help: T('f.phoneHelp'), value: P.phone },
        { k: 'note', label: T('f.note'), type: 'textarea', rows: 2, maxlength: 160, value: P.note }
      ]);
      var cb = el('input', { type: 'checkbox', id: 'pgc' }); cb.checked = P.consent;
      var cerr = el('span', { cls: 'err', role: 'alert' });
      out.appendChild(form.node);
      out.appendChild(el('label', { cls: 'consent', 'for': 'pgc' }, [cb, ' ' + T('pub.consent')])); out.appendChild(cerr);
      out.appendChild(el('div', { cls: 'acts' }, [BK.btn(T('pub.submit'), function () {
        var v = form.get(); P.name = v.name; P.phone = v.phone; P.note = v.note; P.consent = cb.checked;
        var ok = form.validate();
        if (!cb.checked) { cerr.textContent = T('pub.consentReq'); if (ok) cb.focus(); ok = false; } else cerr.textContent = '';
        if (!ok) return;
        var r = BK.book({ svc: P.svc, staff: P.staffAssigned, date: P.date, time: P.time, name: P.name, phone: P.phone, note: P.note, src: 'web' });
        if (!r.ok) { BK.toast(T('pub.taken')); P.step = 3; P.time = null; BK.render('.pubframe h4'); return; }
        P.code = r.b.code; P.step = 5; BK.render('.pubframe h4');
      })]));
    }
    return out;
  }
  BK.registerMod('page', { icon: 'globe', render: function (box) {
    var D = BK.DB, S = D.settings, P = pg();
    box.appendChild(BK.head(T('pub.h'), T('pub.sub'), []));
    box.appendChild(el('div', { cls: 'cal-bar' }, [
      el('span', { cls: 'urlbar' }, [icon('globe'), 'book.example/' + (BK.niche === 'clinic' ? 'harbor-dental' : 'northline-auto')]),
      BK.tabs([['desk', T('pub.desk')], ['phone', T('pub.phone')]], BK.UI.pgDev, function (t) { BK.UI.pgDev = t; BK.render('[data-tab="' + t + '"]'); }, T('pub.device'))
    ]));
    if (!S.pub) { box.appendChild(el('div', { cls: 'empty' }, [el('b', { text: T('pub.offT') }), el('span', { text: T('pub.offP') })])); return; }
    var frame = el('div', { cls: 'pubframe ' + BK.UI.pgDev + (S.style === 'soft' ? ' soft' : '') }, []);
    frame.appendChild(el('header', { cls: 'pubhead' }, [el('div', {}, [el('b', { cls: 'pn', text: S.name }), el('small', { text: S.addr })]), el('div', { cls: 'ph' }, [el('small', { text: BK.expand('{hours}') }), el('small', { text: S.phone })])]));
    frame.appendChild(pubBody(P));
    if (P.step !== 5) {
      var mg = el('div', { cls: 'manage' }, [el('h5', { text: T('pub.manage') })]);
      var inp = el('input', { cls: 'in', type: 'text', maxlength: 10, 'aria-label': T('pub.code'), placeholder: 'BD-0000', value: BK.UI.mgCode });
      var er = el('span', { cls: 'err', role: 'alert' });
      mg.appendChild(el('div', { cls: 'acts' }, [inp, BK.btn(T('pub.cancelByCode'), function () {
        BK.UI.mgCode = inp.value;
        var b = BK.byCode(inp.value);
        if (!b) { er.textContent = T('pub.noCode'); return; }
        if (!BK.active(b)) { er.textContent = T('pub.notActive', { st: T('st.' + b.status) }); return; }
        if (BK.setStatus(b, 'cancelled', 'reason.plans', 'client')) { BK.toast(T('toast.cancelled', { code: b.code })); BK.UI.mgCode = ''; BK.render('.pubframe h4'); }
      }, 'btn-ghost'), er]));
      frame.appendChild(mg);
    }
    box.appendChild(frame);
    box.appendChild(el('p', { cls: 'hint-s', text: T('pub.hint') }));
  } });

  /* ---------- reminders ---------- */
  var CH = { tg: 'ch.tg', sms: 'ch.sms', mail: 'ch.mail' };
  BK.registerMod('rem', { icon: 'bell', badge: function () { return BK.reminders().filter(function (x) { return x.st === 'queued' && x.when - BK.nowAbs() < 1440; }).length; }, render: function (box) {
    var U = BK.UI, D = BK.DB, S = D.settings;
    box.appendChild(BK.head(T('rem.h'), T('rem.sub')));
    var all = BK.reminders();
    box.appendChild(BK.tabs([['queue', T('rem.tabQ'), all.filter(function (x) { return x.st === 'queued'; }).length], ['rules', T('rem.tabR')], ['tpl', T('rem.tabT')]], U.remTab, function (t) { U.remTab = t; BK.render('[data-tab="' + t + '"]'); }, T('rem.h')));
    if (U.remTab === 'queue') {
      var f = U.remF;
      box.appendChild(el('div', { cls: 'tabs sub', role: 'group', 'aria-label': T('f.status') }, ['queued', 'sent', 'skipped'].map(function (s) {
        return el('button', { type: 'button', cls: 'chip' + (f === s ? ' on' : ''), 'aria-pressed': f === s ? 'true' : 'false', onclick: function () { U.remF = s; BK.render('.chip.on'); } }, [T('rem.st.' + s), el('em', { cls: 'cnt', text: String(all.filter(function (x) { return x.st === s; }).length) })]);
      })));
      var rows = all.filter(function (x) { return x.st === f; });
      if (f !== 'queued') rows = rows.slice().reverse();
      box.appendChild(BK.table([
        { h: T('rem.when'), f: function (x) { return BK.whenLabel(x.when); } },
        { h: T('rem.kind'), f: function (x) { return T('rem.k.' + x.kind); } },
        { h: T('f.client'), f: function (x) { return BK.clientName(x.b.client); } },
        { h: T('rem.visit'), f: function (x) { return el('button', { type: 'button', cls: 'lnk', text: BK.when(x.b), onclick: function () { BK.bookingCard(x.b.id); } }); } },
        { h: T('rem.via'), f: function (x) { var c = BK.client(x.b.client); return T(CH[c ? c.ch : 'tg']); } },
        { h: '', f: function (x) {
          return el('span', { cls: 'acts' }, [
            BK.link(T('rem.preview'), function () { BK.dialog(T('rem.preview'), el('div', {}, [el('p', { cls: 'dlg-p', text: T('rem.to', { name: BK.clientName(x.b.client) }) }), el('blockquote', { cls: 'quote', text: BK.remText(x) })])); }),
            x.st === 'queued' ? BK.link(T('rem.sendNow'), function () { D.remState[x.key] = 'sent'; BK.notify('remind', { name: BK.clientName(x.b.client), kind: x.kind }, x.b.id); BK.log('rem', 'rem.send', { name: BK.clientName(x.b.client) }, x.b.id); BK.toast(T('toast.remSent')); BK.render(); }) : null,
            x.st === 'queued' ? BK.link(T('rem.skip'), function () { D.remState[x.key] = 'skipped'; BK.log('rem', 'rem.skip', { name: BK.clientName(x.b.client) }, x.b.id); BK.render(); }) : null]);
        } }
      ], rows.slice(0, 40), { empty: T('rem.empty'), emptyHint: T('rem.emptyHint') }));
    } else if (U.remTab === 'rules') {
      var tg = function (label, key, help) {
        return el('div', { cls: 'rrow' }, [el('button', { type: 'button', cls: 'tog' + (S.rem[key] ? ' on' : ''), role: 'switch', 'aria-checked': S.rem[key] ? 'true' : 'false', onclick: function () { S.rem[key] = !S.rem[key]; BK.log('rem', 'rem.rule', { what: label, on: S.rem[key] ? T('on') : T('off') }); BK.render('.tog'); } }, [el('i'), el('span', { text: label })]), el('small', { text: help })]);
      };
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('rem.rules') }), tg(T('rem.k.h24'), 'h24', T('rem.h24help')), tg(T('rem.k.h2'), 'h2', T('rem.h2help')), tg(T('rem.k.review'), 'review', T('rem.reviewhelp'))]));
      box.appendChild(el('p', { cls: 'hint-s', text: T('rem.rulesHint') }));
    } else {
      var sample = all.filter(function (x) { return x.st === 'queued'; })[0] || all[0];
      ['h24', 'h2', 'review'].forEach(function (k) {
        var ta = el('textarea', { cls: 'in ta', rows: 3, maxlength: 240, 'aria-label': T('rem.k.' + k) }); ta.value = D.tpl[k] || T('tpl.' + k);
        var pv = el('blockquote', { cls: 'quote' });
        function prev() { var it = sample ? { b: sample.b, kind: k } : null; var save = D.tpl[k]; D.tpl[k] = ta.value; pv.textContent = it ? BK.remText(it) : ta.value; D.tpl[k] = save; }
        ta.addEventListener('input', prev); prev();
        box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('rem.k.' + k) }), el('div', { cls: 'fl' }, [ta, el('small', { text: T('rem.vars') })]), pv, el('div', { cls: 'acts' }, [
          BK.btn(T('dlg.save'), function () { D.tpl[k] = ta.value.trim() && ta.value !== T('tpl.' + k) ? ta.value.trim() : null; BK.log('rem', 'rem.tpl', { what: T('rem.k.' + k) }); BK.toast(T('toast.saved')); BK.render(); }, 'btn-sm'),
          BK.btn(T('rem.resetTpl'), function () { D.tpl[k] = null; BK.render(); }, 'btn-ghost')])]));
      });
    }
  } });
}(window));
