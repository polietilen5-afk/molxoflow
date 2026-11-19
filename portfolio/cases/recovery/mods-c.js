/* Recovery Desk demo modules: customer update page, analytics, integrations, settings and privacy, access, audit. */
(function () {
  'use strict';
  const RC = window.RC, S = RC.S, t = RC.t, esc = RC.esc, UI = RC.ui;
  const DAY = 864e5;
  const confirmDlg = (title, note, submit, fn) => RC.dialog({ title, submit, fields: () => [{ type: 'info', name: 'i', text: note }], onSubmit() { fn(); } });
  const isOpen = c => c.status === 'campaign' || c.status === 'paused' || c.status === 'attention';

  /* ================= customer update page ================= */
  const P = { vals: { num: '', exp: '', cvc: '', nm: '' }, err: {} };
  RC.mods.portal = {
    render() {
      const U = UI.portal, open = S.cases.filter(isOpen);
      let c = RC.caseById(U.caseId);
      if (!c && open.length) { c = open.find(x => x.status === 'campaign') || open[0]; U.caseId = c.id; }
      if (!c) return RC.empty(t('pt.none'), t('pt.noneHint')) + `<div class="rc-actions">${RC.btn('goto', t('ov.g1b'), { data: 'data-mod="events"' })}</div>`;
      const cu = RC.cust(c.cid), opts = S.cases.filter(x => isOpen(x) || x.id === c.id).map(x => [x.id, x.id + ' / ' + RC.cname(x.cid)]);
      const link = 'recovery.demo/pay/' + RC.hex8(RC.hs(c.id)).slice(0, 6);
      let view;
      const done = c.status === 'recovered' || U.step === 'done';
      if (done) view = `<div class="rc-okbox"><span class="rc-okic">${RC.ico('check', 26)}</span><h4>${esc(t('pt.doneH'))}</h4><p>${esc(t('pt.doneP', { amount: RC.fmtMoney(c.amount), card: cu.last4 }))}</p>
        <dl class="rc-facts rc-facts3"><div><dt>${esc(t('col.plan'))}</dt><dd>${esc(t('plan.' + cu.plan))}</dd></div><div><dt>${esc(t('col.amount'))}</dt><dd>${esc(RC.fmtMoney(c.amount))}</dd></div><div><dt>${esc(t('pt.next'))}</dt><dd>${esc(RC.fmtDate(new Date(S.now.getTime() + 30 * DAY)))}</dd></div></dl></div>`;
      else if (U.step === 'busy') view = `<div class="rc-busy"><span class="rc-spin" aria-hidden="true"></span><p>${esc(t('pt.busy'))}</p></div>`;
      else {
        const e = P.err, f = (n, label, ph, extra) => `<div class="rc-fld"><label for="pt-${n}">${esc(label)}</label><input id="pt-${n}" name="${n}" type="text" inputmode="numeric" value="${esc(P.vals[n])}" placeholder="${esc(ph)}" autocomplete="off" ${e[n] ? 'aria-invalid="true" aria-describedby="pt-' + n + '-e"' : ''} ${extra || ''}>${e[n] ? `<span class="rc-err" id="pt-${n}-e" role="alert">${esc(e[n])}</span>` : ''}</div>`;
        view = `${U.step === 'fail' ? `<p class="rc-warn">${esc(t('pt.declined'))}</p>` : ''}<form id="pt-form" novalidate class="rc-form rc-payform">${f('num', t('pt.card'), '0000 0000 0000 0000', 'maxlength="23"')}<div class="rc-row2">${f('exp', t('pt.exp'), 'MM/YY', 'maxlength="5"')}${f('cvc', t('pt.cvc'), '000', 'maxlength="4"')}</div>${f('nm', t('pt.name'), 'Alex M.')}
          <label class="rc-check"><input type="checkbox" id="pt-decline" ${U.decline ? 'checked' : ''}><span>${esc(t('pt.simDecline'))}</span></label>
          <button type="submit" class="btn">${esc(t('pt.pay', { amount: RC.fmtMoney(c.amount) }))}</button><p class="rc-hint">${esc(t('pt.demoHint'))}</p></form>`;
      }
      return `<div class="rc-tools">${RC.select('portal.caseId', opts, c.id, t('st.case'))}</div><p class="rc-sub">${esc(t('pt.lead'))}</p>
        <div class="rc-grid2 rc-portal"><section class="rc-cust" aria-label="${esc(t('pt.frameLabel'))}"><p class="rc-curl rc-mono">${esc(link)}</p>
          <p class="rc-cbrand">Brightlane</p><h4 class="rc-ptitle">${esc(t('pt.title'))}</h4><p class="rc-pbody">${esc(t('pt.body', { name: cu.contact.split(' ')[0], amount: RC.fmtMoney(c.amount), plan: t('plan.' + cu.plan), reason: t('reasonh.' + c.reason) }))}</p>${view}</section>
        <section class="rc-pane"><h3 class="rc-h3">${esc(t('pt.sideH'))}</h3><ul class="rc-checks"><li class="ok">${esc(t('pt.s1'))}</li><li class="ok">${esc(t('pt.s2'))}</li><li class="ok">${esc(t('pt.s3'))}</li><li class="ok">${esc(t('pt.s4'))}</li></ul>
          <dl class="rc-facts rc-facts3"><div><dt>${esc(t('col.case'))}</dt><dd class="rc-mono">${esc(c.id)}</dd></div><div><dt>${esc(t('col.status'))}</dt><dd>${esc(t('cst.' + c.status))}</dd></div><div><dt>${esc(t('col.card'))}</dt><dd class="rc-mono">•• ${esc(cu.last4)} / ${esc(RC.cardExp(cu))}</dd></div></dl>
          <div class="rc-actions">${RC.btn('pt-case', t('pt.toCase'), { ghost: true, icon: 'cases' })}${c.status === 'recovered' ? '' : ''}</div></section></div>`;
    },
    after(root) {
      const form = root.querySelector('#pt-form'); if (!form) return;
      form.addEventListener('input', e => { if (e.target.name) P.vals[e.target.name] = e.target.value; });
      form.querySelector('#pt-decline').addEventListener('change', e => { UI.portal.decline = e.target.checked; });
      form.addEventListener('submit', e => {
        e.preventDefault(); const U = UI.portal, c = RC.caseById(U.caseId), v = P.vals, er = {};
        const digits = v.num.replace(/\s+/g, '');
        if (!/^\d{12,19}$/.test(digits)) er.num = t('err.card');
        const m = /^(\d{2})\/?(\d{2})$/.exec(v.exp.trim());
        if (!m || +m[1] < 1 || +m[1] > 12) er.exp = t('err.exp'); else { const y = 2000 + +m[2], now = S.now; if (y < now.getFullYear() || (y === now.getFullYear() && +m[1] < now.getMonth() + 1)) er.exp = t('err.expPast'); }
        if (!/^\d{3,4}$/.test(v.cvc.trim())) er.cvc = t('err.cvc');
        if (v.nm.trim().length < 2) er.nm = t('err.short');
        P.err = er;
        if (Object.keys(er).length) { RC.paint(); const bad = RC.$('rc-mod').querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
        U.step = 'busy'; RC.paint();
        setTimeout(() => {
          if (U.decline) { U.step = 'fail'; RC.log('portalDecline', { cid: c.cid, caseId: c.id }); }
          else { const sent = c.steps.filter(s => s.state === 'sent').length; U.step = 'done'; RC.recover(c, 'portal', sent); P.vals = { num: '', exp: '', cvc: '', nm: '' }; }
          RC.refresh();
        }, PF.reduced ? 0 : 1300);
      });
    },
    onset() { UI.portal.step = 'form'; P.err = {}; },
    act(a) { if (a === 'pt-case') { const c = RC.caseById(UI.portal.caseId); if (c) RC.openCaseCard(c.id); } }
  };

  /* ================= analytics ================= */
  RC.mods.analytics = {
    render() {
      const U = UI.analytics;
      return RC.tabs('analytics.tab', [['summary', t('an.summary')], ['reasons', t('an.reasons')], ['steps', t('an.steps')]], U.tab, t('an.tabs')) + `<p class="rc-sub">${esc(t('an.note'))}</p>` + this[U.tab]();
    },
    stats() {
      const rec = S.cases.filter(c => c.status === 'recovered'), lost = S.cases.filter(c => c.status === 'lost'), open = S.cases.filter(isOpen);
      const days = rec.map(c => (c.recovered.at - c.opened) / DAY), avg = days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0;
      return { rec, lost, open, rate: rec.length + lost.length ? Math.round(rec.length / (rec.length + lost.length) * 100) : 0, avg, sum: rec.reduce((a, c) => a + c.amount, 0), lostSum: lost.reduce((a, c) => a + c.amount, 0), openSum: open.reduce((a, c) => a + c.amount, 0) };
    },
    summary() {
      const s = this.stats(), weeks = [];
      for (let i = 5; i >= 0; i--) { const to = new Date(S.now.getTime() - i * 7 * DAY), from = new Date(to.getTime() - 7 * DAY); weeks.push({ from, to, v: s.rec.filter(c => c.recovered.at > from && c.recovered.at <= to).reduce((a, c) => a + c.amount, 0) }); }
      const mx = Math.max.apply(null, weeks.map(w => w.v).concat([1]));
      return `<div class="rc-kpis rc-kpis4">${RC.kpi('', 'disabled', s.rate + '%', t('an.rate'), 'ok')}${RC.kpi('', 'disabled', RC.fmtMoney(s.sum), t('an.recAmt'), 'ok')}${RC.kpi('', 'disabled', s.rec.length ? s.avg.toFixed(1) : '-', t('an.avgDays'), 'info')}${RC.kpi('', 'disabled', RC.fmtMoney(s.openSum), t('an.openAmt'), 'warn')}</div>
      <div class="rc-grid2"><section class="rc-pane"><h3 class="rc-h3">${esc(t('an.weekly'))}</h3><div class="rc-cols" role="img" aria-label="${esc(t('an.weekly'))}">${weeks.map(w => `<div class="rc-col"><b>${w.v ? esc(RC.fmtNum(w.v)) : '0'}</b><span class="rc-colbar"><i style="height:${Math.max(3, w.v / mx * 100)}%"></i></span><small>${esc(RC.fmtShort(w.from))}</small></div>`).join('')}</div></section>
        <section class="rc-pane"><h3 class="rc-h3">${esc(t('an.outcome'))}</h3><ul class="rc-bars">${[['rec', s.rec.length, ''], ['lost', s.lost.length, 'bad'], ['open', s.open.length, 'info']].map(x => `<li><span class="rc-bl">${esc(t('an.o.' + x[0]))}</span><span class="rc-bw">${RC.bar(S.cases.length ? x[1] / S.cases.length * 100 : 0, x[2])}</span><b>${x[1]}</b></li>`).join('')}</ul><p class="rc-hint">${esc(t('an.lostAmt', { n: RC.fmtMoney(s.lostSum) }))}</p></section></div>`;
    },
    reasons() {
      const rows = RC.CODES.map(k => { const g = S.cases.filter(c => c.reason === k), r = g.filter(c => c.status === 'recovered').length, l = g.filter(c => c.status === 'lost').length, o = g.filter(isOpen).length; return { k, n: g.length, r, l, o, rate: r + l ? Math.round(r / (r + l) * 100) : null }; }).filter(x => x.n);
      return RC.table([t('f.reason'), t('an.cases'), t('an.o.rec'), t('an.o.lost'), t('an.o.open'), t('an.rate')], rows.map(x => ({ cc: ['c-veh'], cells: [`<span class="rc-model">${esc(t('reason.' + x.k))}</span><span class="rc-plate">${esc(t('cat.' + S.rules[x.k].cat))}</span>`, String(x.n), String(x.r), String(x.l), String(x.o), x.rate == null ? '<span class="rc-muted">-</span>' : `<span class="rc-devc">${RC.bar(x.rate, x.rate >= 50 ? '' : 'warn')}<b class="rc-mono">${x.rate}%</b></span>`] })));
    },
    steps() {
      const rec = S.cases.filter(c => c.status === 'recovered'), by = [1, 2, 3, 0].map(n => rec.filter(c => c.recovered.step === n || (n === 0 && !c.recovered.step)));
      const plans = ['starter', 'pro', 'team'].map(p => { const g = S.cases.filter(c => RC.cust(c.cid) && RC.cust(c.cid).plan === p); return { p, n: g.length, r: g.filter(c => c.status === 'recovered').reduce((a, c) => a + c.amount, 0) }; });
      const mx = Math.max.apply(null, plans.map(x => x.r).concat([1]));
      return `<div class="rc-grid2"><section class="rc-pane"><h3 class="rc-h3">${esc(t('an.byStep'))}</h3><ul class="rc-bars">${by.map((g, i) => `<li><span class="rc-bl">${esc(i < 3 ? t('ov.stepN', { n: i + 1 }) : t('an.manualRec'))}</span><span class="rc-bw">${RC.bar(rec.length ? g.length / rec.length * 100 : 0, i === 3 ? 'info' : '')}</span><b>${g.length}</b></li>`).join('')}</ul><p class="rc-hint">${esc(t('an.stepHint'))}</p></section>
        <section class="rc-pane"><h3 class="rc-h3">${esc(t('an.byPlan'))}</h3><ul class="rc-bars">${plans.map(x => `<li><span class="rc-bl">${esc(t('plan.' + x.p))}</span><span class="rc-bw">${RC.bar(x.r / mx * 100, '')}</span><b>${esc(RC.fmtMoney(x.r))}</b></li>`).join('')}</ul></section></div>`;
    }
  };

  /* ================= integrations ================= */
  RC.mods.integrations = {
    render() {
      const I = S.integ, ev = S.events.slice(0, 4);
      const card = (k, on, body, actions) => `<section class="rc-pane rc-integ"><div class="rc-dhead"><h3 class="rc-h3">${RC.ico(k.ic, 18)} ${esc(t('ig.' + k.id))}</h3>${RC.badge(on ? 'ok' : 'bad', t(on ? 'ig.on' : 'ig.off'))}</div><p class="rc-sub">${esc(t('ig.' + k.id + '.d'))}</p>${body}<div class="rc-actions">${actions}</div></section>`;
      return `<div class="rc-grid2">
        ${card({ id: 'provider', ic: 'events' }, I.provider.on, `<ul class="rc-checks"><li class="${I.provider.on ? 'ok' : 'bad'}">${esc(t('ig.p.conn'))}</li><li class="rc-mono ok">recovery.demo/hooks/payments</li><li class="${I.provider.secretOk ? 'ok' : 'bad'}">${esc(t(I.provider.secretOk ? 'ig.p.secretOk' : 'ig.p.secretBad'))}</li></ul>${RC.sw('secret', I.provider.secretOk, t('ig.p.secretSw'), 'edit')}`, (I.provider.on ? RC.btn('ig-disc', t('ig.disconnect'), { perm: 'edit', ghost: true }) : RC.btn('ig-conn', t('ig.connect'), { perm: 'edit' })) + RC.btn('ig-ping', t('ig.ping'), { perm: 'edit', ghost: true }))}
        ${card({ id: 'mail', ic: 'mail' }, I.mail.on, `<ul class="rc-checks"><li class="ok">${esc(t('ig.m.dom'))}</li><li class="ok">${esc(t('ig.m.hooks'))}</li><li class="${I.mail.on ? 'ok' : 'bad'}">${esc(t(I.mail.on ? 'ig.m.up' : 'ig.m.down'))}</li></ul>`, RC.btn('ig-mail', t(I.mail.on ? 'ig.simOut' : 'ig.restore'), { perm: 'edit', ghost: I.mail.on }))}
        ${card({ id: 'ai', ic: 'spark' }, I.ai.on, `<ul class="rc-checks"><li class="${I.ai.on ? 'ok' : 'bad'}">${esc(t(I.ai.on ? 'ig.a.up' : 'ig.a.down'))}</li><li class="ok">${esc(t('ig.a.guard'))}</li></ul>`, RC.btn('ig-ai', t(I.ai.on ? 'ig.simOut' : 'ig.restore'), { perm: 'edit', ghost: I.ai.on }))}
        ${card({ id: 'queue', ic: 'outbox' }, !I.queue.paused, `<ul class="rc-checks"><li class="${I.queue.paused ? 'warn' : 'ok'}">${esc(t(I.queue.paused ? 'ig.q.paused' : 'ig.q.run'))}</li><li class="ok">${esc(t('ig.q.retry'))}</li><li class="ok">${esc(t('ig.q.idem'))}</li></ul>`, RC.btn(I.queue.paused ? 'ig-qres' : 'ig-qpause', t(I.queue.paused ? 'ob.resume' : 'ob.pause'), { perm: 'edit', ghost: !I.queue.paused }))}
        ${card({ id: 'db', ic: 'audit' }, true, `<ul class="rc-checks"><li class="ok">${esc(t('ig.d.last', { d: RC.fmtStamp(I.db.backup) }))}</li><li class="ok">${esc(t('ig.d.rls'))}</li></ul>`, RC.btn('ig-backup', t('ig.backup'), { perm: 'edit', ghost: true }))}
        <section class="rc-pane"><h3 class="rc-h3">${esc(t('ig.logH'))}</h3><ul class="rc-log">${ev.map(e => `<li><span class="rc-k rc-mono">${esc(e.id.slice(3, 9))}</span><div class="rc-lb"><strong>${esc(t('evt.' + e.type))}</strong><span class="rc-muted">${esc(RC.fmtStamp(e.at))}</span></div>${RC.badge({ processed: 'ok', merged: 'info', duplicate: 'warn', rejected: 'bad' }[e.status], t('est.' + e.status))}</li>`).join('')}</ul></section></div>`;
    },
    act(a, el) {
      const I = S.integ;
      if (a === 'sw') { I.provider.secretOk = !I.provider.secretOk; RC.act('toggle', { sys: 'provider' }); RC.toast(t(I.provider.secretOk ? 'ig.secretFixed' : 'ig.secretBroken')); RC.refresh(); }
      if (a === 'ig-conn') RC.dialog({ title: t('ig.connectH'), note: t('ig.connectNote'), submit: t('ig.allow'), fields: () => [{ type: 'info', name: 'i1', text: t('ig.scope1') }, { type: 'info', name: 'i2', text: t('ig.scope2') }, { type: 'info', name: 'i3', text: t('ig.scope3') }], onSubmit() { I.provider.on = true; I.provider.secretOk = true; RC.act('connect', { sys: 'provider' }); RC.toast(t('ig.connected')); } });
      if (a === 'ig-disc') confirmDlg(t('ig.discH'), t('ig.discNote'), t('ig.disconnect'), () => { I.provider.on = false; RC.act('disconnect', { sys: 'provider' }); });
      if (a === 'ig-ping') { if (!I.provider.on) { RC.toast(t('ev.off')); return; } RC.pushEvent({ id: 'ev_' + RC.hex8(RC.hs('ping' + RC.nid())), type: 'ping', cid: null, at: S.now, amount: null, status: I.provider.secretOk ? 'processed' : 'rejected' }); RC.act('testEvent', {}); RC.toast(t(I.provider.secretOk ? 'ig.pingOk' : 'ev.rejected')); RC.refresh(); }
      if (a === 'ig-mail') { I.mail.on = !I.mail.on; RC.act('toggle', { sys: 'mail' }); if (I.mail.on) { RC.toast(t('ig.mailBack')); } RC.refresh(); }
      if (a === 'ig-ai') { I.ai.on = !I.ai.on; RC.act('toggle', { sys: 'ai' }); RC.refresh(); }
      if (a === 'ig-qpause') { I.queue.paused = true; RC.act('qPause', {}); RC.refresh(); }
      if (a === 'ig-qres') { RC.resumeQueue(); RC.act('qResume', {}); RC.refresh(); }
      if (a === 'ig-backup') { I.db.backup = S.now; RC.act('backup', {}); RC.toast(t('ig.backupDone')); RC.refresh(); }
    }
  };

  /* ================= settings and privacy ================= */
  RC.mods.privacy = {
    render() {
      const U = UI.privacy;
      return RC.tabs('privacy.tab', [['policy', t('pv.policy')], ['optouts', t('pv.optouts')], ['data', t('pv.data')]], U.tab, t('pv.tabs')) + this[U.tab]();
    },
    policy() {
      const st = S.set;
      return `<div class="rc-pane"><div class="rc-dhead"><h3 class="rc-h3">${esc(t('pv.sendH'))}</h3>${RC.btn('pv-edit', t('edit'), { perm: 'edit', ghost: true })}</div>
        <dl class="rc-facts rc-facts3"><div><dt>${esc(t('pv.hour'))}</dt><dd>${String(st.hour).padStart(2, '0')}:00</dd></div><div><dt>${esc(t('pv.cap'))}</dt><dd>${esc(t('pv.capV', { n: st.cap }))}</dd></div><div><dt>${esc(t('pv.unsub'))}</dt><dd>${esc(t('pv.always'))}</dd></div></dl>
        ${RC.sw('review', st.review, t('pv.review'), 'edit')}<p class="rc-hint">${esc(t('pv.reviewHint'))}</p>${RC.sw('offer', st.offer, t('pv.offer'), 'edit')}<p class="rc-hint">${esc(t('pv.offerHint'))}</p></div>
        <div class="rc-pane rc-mt"><h3 class="rc-h3">${esc(t('pv.guardH'))}</h3><ul class="rc-checks"><li class="ok">${esc(t('pv.g1'))}</li><li class="ok">${esc(t('pv.g2'))}</li><li class="ok">${esc(t('pv.g3'))}</li><li class="ok">${esc(t('pv.g4'))}</li></ul></div>`;
    },
    optouts() {
      const rows = S.customers.filter(c => c.optOut || c.bounce).map(c => ({ cc: ['c-veh'], cells: [RC.custLink(c.id), c.optOut ? RC.badge('warn', t('cu.optout')) : '', c.bounce ? RC.badge('bad', t('cu.bounce')) : '', `<span class="c-act">${c.optOut ? RC.btn('pv-in', t('pv.resub'), { perm: 'act', ghost: true, data: `data-id="${c.id}"` }) : ''}</span>`] }));
      return `<p class="rc-sub">${esc(t('pv.optNote'))}</p>` + (rows.length ? RC.table([t('col.customer'), t('pv.cOpt'), t('pv.cBounce'), ''], rows) : RC.empty(t('pv.noOpt')));
    },
    data() {
      const cu = S.customers.find(c => c.id === UI.privacy.cid) || S.customers[0];
      if (!cu) return RC.empty(t('f.none'));
      UI.privacy.cid = cu.id;
      const n = { c: S.cases.filter(c => c.cid === cu.id).length, m: S.mails.filter(m => m.cid === cu.id).length, e: S.events.filter(e => e.cid === cu.id).length };
      return `<p class="rc-sub">${esc(t('pv.dataNote'))}</p><div class="rc-tools">${RC.select('privacy.cid', S.customers.map(c => [c.id, c.name]), cu.id, t('f.customer'))}</div>
        <div class="rc-pane"><dl class="rc-facts rc-facts3"><div><dt>${esc(t('pv.nCases'))}</dt><dd>${n.c}</dd></div><div><dt>${esc(t('pv.nMails'))}</dt><dd>${n.m}</dd></div><div><dt>${esc(t('pv.nEvents'))}</dt><dd>${n.e}</dd></div></dl>
        <div class="rc-actions">${RC.btn('pv-export', t('pv.export'), { perm: 'edit', ghost: true, icon: 'download' })}${RC.btn('pv-del', t('pv.delete'), { perm: 'edit', icon: 'x' })}</div></div>`;
    },
    act(a, el) {
      const st = S.set;
      if (a === 'sw') { const k = el.getAttribute('data-name'); st[k] = !st[k]; RC.act('setEdit', {}); RC.refresh(); return; }
      if (a === 'pv-in') { const cu = RC.cust(el.getAttribute('data-id')); cu.optOut = false; RC.act('optin', { cid: cu.id }); RC.refresh(); return; }
      if (a === 'pv-edit') RC.dialog({ title: t('pv.sendH'), values: { hour: st.hour, cap: st.cap }, fields: () => [{ name: 'hour', label: t('pv.hour'), type: 'number', hint: t('pv.hourHint') }, { name: 'cap', label: t('pv.cap'), type: 'number', hint: t('pv.capHint') }],
        onSubmit(v) { const e = {}, h = Number(v.hour), c = Number(v.cap); if (!(h >= 0 && h <= 23) || Math.floor(h) !== h) e.hour = t('err.hour'); if (!(c >= 1 && c <= 10) || Math.floor(c) !== c) e.cap = t('err.cap'); if (Object.keys(e).length) return e; st.hour = h; st.cap = c; RC.act('setEdit', {}); RC.toast(t('saved')); } });
      const cu = RC.cust(UI.privacy.cid);
      if (a === 'pv-export' && cu) {
        const obj = { customer: { id: 'cu_' + RC.hex8(RC.hs(cu.id)).slice(0, 8), plan: cu.plan, status: cu.status }, cases: S.cases.filter(c => c.cid === cu.id).map(c => ({ id: c.id, reason: c.reason, status: c.status, amount: c.amount })), emails: S.mails.filter(m => m.cid === cu.id).map(m => ({ id: m.id, template: m.tpl, state: m.state })), events: S.events.filter(e => e.cid === cu.id).map(e => ({ id: e.id, type: e.type })) };
        RC.act('export', { cid: cu.id });
        RC.dialog({ title: t('pv.exportH'), submit: t('close'), fields: () => [{ type: 'info', name: 'i', html: true, text: `<pre class="rc-code" tabindex="0">${esc(JSON.stringify(obj, null, 2))}</pre>` }], onSubmit() { } });
      }
      if (a === 'pv-del' && cu) RC.dialog({ title: t('pv.delH', { n: cu.name }), note: t('pv.delNote'), submit: t('pv.delGo'), values: { word: '' }, fields: () => [{ name: 'word', label: t('pv.typeDel'), hint: t('pv.typeHint') }],
        onSubmit(v) { if ((v.word || '').trim() !== 'DELETE') return { word: t('pv.typeErr') }; const nm = cu.name; RC.deleteCustomer(cu.id); S.csel = null; S.sel = null; UI.privacy.cid = null; RC.toast(t('pv.deleted', { n: nm })); } });
    }
  };

  /* ================= access ================= */
  const MATRIX = [['view', [1, 1, 1]], ['act', [1, 1, 0]], ['studio', [1, 1, 0]], ['edit', [1, 0, 0]], ['integ', [1, 0, 0]], ['priv', [1, 0, 0]], ['users', [1, 0, 0]]];
  RC.mods.access = {
    render() {
      const U = UI.access;
      const tabs = RC.tabs('access.tab', [['users', t('ac.users')], ['matrix', t('ac.matrix')]], U.tab, t('ac.tabs'));
      if (U.tab === 'matrix') return tabs + `<p class="rc-sub">${esc(t('ac.matrixNote'))}</p>` + RC.table([t('ac.perm')].concat(RC.ROLES.map(r => t('role.' + r))), MATRIX.map(m => ({ cells: [esc(t('ac.p.' + m[0]))].concat(m[1].map(v => v ? `<span class="rc-yes">${RC.ico('check', 16)}<span class="sr">${esc(t('ac.yes'))}</span></span>` : `<span class="rc-muted">-<span class="sr">${esc(t('ac.no'))}</span></span>`)) })));
      const rows = S.users.map(u => ({ cls: u.active ? '' : 'off', cc: ['c-veh'], cells: [`<span class="rc-model">${esc(u.name)}</span><span class="rc-plate">${esc(u.email)}</span>`, esc(t('role.' + u.role)), RC.badge(u.active ? 'ok' : 'warn', t(u.active ? 'ac.active' : 'ac.off')), esc(RC.fmtStamp(u.last)), `<span class="c-act">${RC.btn('ac-role', t('ac.change'), { perm: 'edit', ghost: true, data: `data-id="${u.id}"` })}${RC.btn('ac-tog', t(u.active ? 'ac.deact' : 'ac.react'), { perm: 'edit', ghost: true, data: `data-id="${u.id}"` })}</span>`] }));
      return tabs + `<div class="rc-tools">${RC.btn('ac-invite', t('ac.invite'), { perm: 'edit', icon: 'plus' })}</div>` + RC.table([t('ac.user'), t('ac.role'), t('col.status'), t('ac.last'), ''], rows);
    },
    act(a, el) {
      const u = S.users.find(x => x.id === el.getAttribute('data-id'));
      const admins = () => S.users.filter(x => x.role === 'admin' && x.active).length;
      if (a === 'ac-invite') RC.dialog({ title: t('ac.invite'), values: { name: '', email: '', role: 'support' }, fields: () => [{ name: 'name', label: t('ac.user') }, { name: 'email', label: t('f.email') }, { name: 'role', label: t('ac.role'), type: 'select', options: RC.ROLES.map(r => [r, t('role.' + r)]) }],
        onSubmit(v) { const e = {}; if (v.name.trim().length < 2) e.name = t('err.short'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = t('err.email'); else if (S.users.some(x => x.email === v.email.trim().toLowerCase())) e.email = t('err.dupEmail'); if (Object.keys(e).length) return e; S.users.push({ id: 'u' + RC.nid(), name: v.name.trim(), role: v.role, email: v.email.trim().toLowerCase(), active: true, last: S.now }); RC.act('invite', { name: v.name.trim() }); RC.toast(t('ac.invited')); } });
      if (a === 'ac-role' && u) RC.dialog({ title: t('ac.changeH', { n: u.name }), values: { role: u.role }, fields: () => [{ name: 'role', label: t('ac.role'), type: 'select', options: RC.ROLES.map(r => [r, t('role.' + r)]) }],
        onSubmit(v) { if (u.role === 'admin' && v.role !== 'admin' && u.active && admins() < 2) return { role: t('err.lastAdmin') }; u.role = v.role; RC.act('role', { name: u.name, role: v.role }); RC.toast(t('saved')); } });
      if (a === 'ac-tog' && u) { if (u.active && u.role === 'admin' && admins() < 2) { RC.toast(t('err.lastAdmin')); return; } u.active = !u.active; RC.act(u.active ? 'userOn' : 'userOff', { name: u.name }); RC.refresh(); }
    }
  };

  /* ================= audit ================= */
  const AG = { cases: ['caseOpened', 'attention', 'campaign', 'recovered', 'recoveredManual', 'lost', 'paused', 'resumed', 'started', 'paidManual', 'closed', 'note', 'skipOpt', 'skipCap', 'evOk', 'evMerged', 'evDup', 'evRejected', 'portalDecline'], mail: ['mailQ', 'mailSent', 'mailFail', 'mailReview', 'mailBounce', 'mailApproved', 'mailRejected', 'mailRetry', 'mailOpened', 'mailClicked', 'mailBounced', 'complaint', 'draft', 'qPause', 'qResume'], privacy: ['optout', 'optin', 'custEdit', 'deleted', 'export'] };
  const group = k => AG.cases.indexOf(k) >= 0 ? 'cases' : AG.mail.indexOf(k) >= 0 ? 'mail' : AG.privacy.indexOf(k) >= 0 ? 'privacy' : 'config';
  RC.mods.audit = {
    render() {
      const U = UI.audit, q = U.q.trim().toLowerCase();
      const who = ['all', 'system'].concat(S.users.map(u => u.name));
      const rows = S.audit.filter(e => (U.who === 'all' || e.who === U.who) && (U.ent === 'all' || group(e.key) === U.ent) && (!q || RC.auditText(e).toLowerCase().indexOf(q) >= 0)).slice(0, 80);
      const tr = rows.map(e => ({ cells: [esc(RC.fmtStamp(e.at)), esc(e.who === 'system' ? t('who.system') : e.who), esc(RC.auditText(e)), e.caseId && RC.caseById(e.caseId) ? RC.caseLink(RC.caseById(e.caseId)) : ''] }));
      return `<p class="rc-sub">${esc(t('au.note'))}</p><div class="rc-tools">${RC.search('audit.q', U.q, t('au.search'), 'auq')}${RC.select('audit.who', who.map(w => [w, w === 'all' ? t('f.all') : w === 'system' ? t('who.system') : w]), U.who, t('au.who'))}</div>
      <div class="rc-tools rc-tools2">${RC.chips('audit.ent', [['all', t('f.all')], ['cases', t('au.g.cases')], ['mail', t('au.g.mail')], ['config', t('au.g.config')], ['privacy', t('au.g.privacy')]], U.ent)}</div>
      <p class="rc-count">${esc(t('f.count', { n: rows.length }))}</p>${rows.length ? RC.table([t('col.time'), t('au.who'), t('au.action'), t('col.case')], tr) : RC.empty(t('f.none'), t('f.noneHint'))}`;
    }
  };
}());
