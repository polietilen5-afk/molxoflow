/* Recovery Desk demo modules: campaigns, rules, AI email studio, outbox. */
(function () {
  'use strict';
  const RC = window.RC, S = RC.S, t = RC.t, esc = RC.esc, UI = RC.ui;
  const DAY = 864e5;
  const confirmDlg = (title, note, submit, fn) => RC.dialog({ title, submit, fields: () => [{ type: 'info', name: 'i', text: note }], onSubmit() { fn(); } });

  /* ================= campaigns ================= */
  RC.mods.campaigns = {
    render() {
      const U = UI.campaigns;
      return RC.tabs('campaigns.tab', [['active', t('cm.active')], ['sequence', t('cm.sequence')], ['scheduler', t('cm.scheduler')]], U.tab, t('cm.tabs')) + (U.tab === 'active' ? this.active() : U.tab === 'sequence' ? this.sequence() : this.scheduler());
    },
    active() {
      const rows = S.cases.filter(c => c.status === 'campaign' || c.status === 'paused');
      const tr = rows.map(c => { const n = RC.nextStep(c); return { cls: c.status, cc: ['c-veh'], cells: [RC.caseLink(c), RC.custLink(c.cid), `<ol class="rc-mini">${c.steps.map(s => `<li class="${s.state}"><b>${s.n}</b><small>${esc(s.state === 'sent' ? RC.fmtShort(s.at) : s.state === 'planned' ? RC.fmtShort(s.due) : t('ss.' + s.state))}</small></li>`).join('')}</ol>`, c.status === 'paused' ? RC.badge('warn', t('cst.paused')) : n ? esc(RC.fmtStamp(n.due)) : '<span class="rc-muted">' + esc(t('cm.waitEnd')) + '</span>'] }; });
      return `<p class="rc-sub">${esc(t('cm.activeNote'))}</p>` + (rows.length ? RC.table([t('col.case'), t('col.customer'), t('col.steps'), t('col.next')], tr) : RC.empty(t('cm.none'), t('cm.noneHint')));
    },
    sequence() {
      const on = S.seq.filter(x => x.on), max = Math.max.apply(null, on.map(x => x.day).concat([1]));
      const cats = ['soft', 'medium', 'hard'];
      const matrix = S.seq.map((q, i) => ({ cells: [t('ov.stepN', { n: i + 1 }) + (q.on ? '' : ' (' + t('off') + ')'), t('cm.dayN', { n: q.day })].concat(cats.map(k => k === 'hard' ? `<span class="rc-muted">${esc(t('cm.manual'))}</span>` : esc(t('tpl.' + (i >= 2 ? (S.set.offer ? 'retention_offer' : 'final_notice') : i === 0 ? (k === 'soft' ? 'soft_followup' : 'medium_followup') : (k === 'soft' ? 'soft_followup' : 'medium_followup')) + '.n')))) }));
      return `<div class="rc-pane"><div class="rc-dhead"><h3 class="rc-h3">${esc(t('cm.seqH'))}</h3>${RC.btn('cm-edit', t('cm.editSeq'), { perm: 'edit', icon: 'studio' })}</div><p class="rc-sub">${esc(t('cm.seqNote'))}</p>
        <div class="rc-rail" role="img" aria-label="${esc(t('cm.railLabel'))}"><span class="rc-railline"></span>${S.seq.map((q, i) => `<span class="rc-rm ${q.on ? 'on' : 'off'}" style="left:${max ? (q.day / max * 92 + 2) : 2}%"><b>${i + 1}</b><small>${esc(t('cm.dayN', { n: q.day }))}</small></span>`).join('')}</div></div>
      <div class="rc-pane rc-mt"><h3 class="rc-h3">${esc(t('cm.matrixH'))}</h3><p class="rc-sub">${esc(t('cm.matrixNote'))}</p>${RC.table([t('cm.step'), t('cm.day'), t('cat.soft'), t('cat.medium'), t('cat.hard')], matrix)}</div>`;
    },
    scheduler() {
      const horizon = new Date(S.now.getTime() + 7 * DAY);
      const up = []; S.cases.filter(c => c.status === 'campaign').forEach(c => c.steps.forEach(s => { if (s.state === 'planned' && s.due <= horizon) up.push({ c, s }); }));
      up.sort((a, b) => a.s.due - b.s.due);
      return `<div class="rc-pane"><div class="rc-dhead"><div><h3 class="rc-h3">${esc(t('cm.clockH'))}</h3><p class="rc-big">${esc(RC.fmtDate(S.now))}, ${esc(RC.fmtTime(S.now))}</p></div><div class="rc-bset">${RC.btn('cm-t1', t('cm.run1'), { perm: 'act', icon: 'clock' })}${RC.btn('cm-t3', t('cm.run3'), { perm: 'act', ghost: true })}${RC.btn('cm-t7', t('cm.run7'), { perm: 'act', ghost: true })}</div></div>
        <ul class="rc-checks"><li class="ok">${esc(t('cm.s1', { h: S.set.hour }))}</li><li class="ok">${esc(t('cm.s2'))}</li><li class="ok">${esc(t('cm.s3', { n: S.set.cap }))}</li><li class="ok">${esc(t('cm.s4'))}</li></ul></div>
        <div class="rc-pane rc-mt"><h3 class="rc-h3">${esc(t('cm.upH'))}</h3>${up.length ? `<ul class="rc-list">${up.slice(0, 10).map(x => `<li><button type="button" class="rc-ev" data-act="open-case" data-id="${x.c.id}"><span class="rc-evb"><strong>${esc(RC.cname(x.c.cid))}</strong><span class="rc-muted">${esc(t('ov.step', { n: x.s.n, tpl: t('tpl.' + RC.stepTpl(x.c, x.s.n) + '.n') }))}</span></span>${RC.badge('info', RC.fmtStamp(x.s.due))}</button></li>`).join('')}</ul>` : RC.empty(t('cm.noUp'))}</div>`;
    },
    act(a) {
      if (a === 'cm-t1' || a === 'cm-t3' || a === 'cm-t7') { const n = { 'cm-t1': 1, 'cm-t3': 3, 'cm-t7': 7 }[a], r = RC.tick(n); RC.refresh(); RC.toast(t('sim.done', { s: r.sent, r: r.rec, l: r.lost })); }
      if (a === 'cm-edit') RC.dialog({
        title: t('cm.editSeq'), note: t('cm.editNote'), values: { d1: S.seq[0].day, d2: S.seq[1].day, d3: S.seq[2].day, o1: S.seq[0].on, o2: S.seq[1].on, o3: S.seq[2].on },
        fields: () => [1, 2, 3].reduce((acc, i) => acc.concat([{ name: 'd' + i, label: t('cm.dayOf', { n: i }), type: 'number' }, { name: 'o' + i, label: t('cm.enable', { n: i }), type: 'checkbox' }]), []),
        onSubmit(v) {
          const e = {}, days = [1, 2, 3].map(i => Number(v['d' + i])), on = [1, 2, 3].map(i => !!v['o' + i]);
          days.forEach((d, i) => { if (!(d >= 0 && d <= 30) || Math.floor(d) !== d) e['d' + (i + 1)] = t('err.day'); });
          if (!on.some(Boolean)) e.o1 = t('err.noStep');
          const act = days.filter((d, i) => on[i]);
          for (let i = 1; i < act.length; i++) if (act[i] <= act[i - 1]) { e.d2 = t('err.order'); break; }
          if (Object.keys(e).length) return e;
          S.seq = days.map((d, i) => ({ day: d, on: on[i] })); RC.act('seqEdit', {}); RC.toast(t('cm.seqSaved'));
        }
      });
    }
  };

  /* ================= rules ================= */
  RC.mods.rules = {
    render() {
      const U = UI.rules, res = RC.rule(U.code, Number(U.attempt)), r = S.rules[U.code];
      const rows = RC.CODES.map(k => { const x = S.rules[k]; return { cc: ['c-veh'], cells: [`<span class="rc-model">${esc(t('reason.' + k))}</span><span class="rc-plate rc-mono">${esc(k)}</span>`, RC.badge({ soft: 'ok', medium: 'warn', hard: 'bad' }[x.cat], t('cat.' + x.cat)), esc(t('tpl.' + x.tpl + '.n')), x.max === 0 ? '<span class="rc-muted">-</span>' : esc(t('rl.hours', { n: x.delay })), String(x.max), `<span class="c-act">${RC.btn('rl-edit', t('edit'), { perm: 'edit', ghost: true, data: `data-id="${k}"` })}</span>`] }; });
      const steps = [1, 2, 3].map(n => t('rl.stepLine', { n, tpl: t('tpl.' + (n === 1 ? r.tpl : n === 2 ? (r.cat === 'soft' ? 'soft_followup' : 'medium_followup') : (S.set.offer ? 'retention_offer' : 'final_notice')) + '.n') }));
      return `<p class="rc-sub">${esc(t('rl.note'))}</p>${RC.table([t('f.reason'), t('rl.cat'), t('rl.tpl'), t('rl.delay'), t('rl.max'), ''], rows)}
      <section class="rc-pane rc-mt"><h3 class="rc-h3">${esc(t('rl.testH'))}</h3><p class="rc-sub">${esc(t('rl.testNote'))}</p>
        <div class="rc-tools">${RC.select('rules.code', RC.CODES.map(k => [k, t('reason.' + k)]), U.code, t('f.reason'))}${RC.select('rules.attempt', [1, 2, 3, 4, 5].map(n => [String(n), t('rl.attemptN', { n })]), U.attempt, t('rl.attempt'))}</div>
        <div class="rc-result"><div><span class="rc-muted">${esc(t('rl.tpl'))}</span><b>${esc(t('tpl.' + res.tpl + '.n'))}</b></div><div><span class="rc-muted">${esc(t('rl.urgency'))}</span><b>${esc(t('urg.' + res.level))}</b></div><div><span class="rc-muted">${esc(t('rl.delay'))}</span><b>${esc(res.max === 0 ? t('rl.noRetry') : t('rl.hours', { n: res.delay }))}</b></div></div>
        <p class="rc-hint">${esc(res.max === 0 ? t('rl.hardNote') : Number(U.attempt) > 3 ? t('rl.finalNote') : t('rl.planNote'))}</p>
        <ul class="rc-checks">${steps.map(s => `<li class="ok">${esc(s)}</li>`).join('')}</ul></section>
      <section class="rc-pane rc-mt"><h3 class="rc-h3">${esc(t('rl.precH'))}</h3><ol class="rc-ol"><li>${esc(t('rl.p1'))}</li><li>${esc(t('rl.p2'))}</li><li>${esc(t('rl.p3'))}</li></ol></section>`;
    },
    act(a, el) {
      if (a === 'rl-edit') {
        const k = el.getAttribute('data-id'), x = S.rules[k];
        RC.dialog({ title: t('rl.editH', { r: t('reason.' + k) }), values: { cat: x.cat, tpl: x.tpl, delay: x.delay, max: x.max },
          fields: () => [{ name: 'cat', label: t('rl.cat'), type: 'select', options: ['soft', 'medium', 'hard'].map(c => [c, t('cat.' + c)]) }, { name: 'tpl', label: t('rl.tpl'), type: 'select', options: RC.TPLS.map(c => [c, t('tpl.' + c + '.n')]) }, { name: 'delay', label: t('rl.delay') + ' (' + t('rl.unitH') + ')', type: 'number' }, { name: 'max', label: t('rl.max'), type: 'number', hint: t('rl.maxHint') }],
          onSubmit(v) {
            const e = {}, d = Number(v.delay), m = Number(v.max);
            if (!(d >= 0 && d <= 720) || Math.floor(d) !== d) e.delay = t('err.delay');
            if (!(m >= 0 && m <= 10) || Math.floor(m) !== m) e.max = t('err.max');
            else if (v.cat === 'hard' && m !== 0) e.max = t('err.hardZero');
            else if (v.cat !== 'hard' && m === 0) e.max = t('err.softZero');
            if (Object.keys(e).length) return e;
            S.rules[k] = { cat: v.cat, tpl: v.tpl, delay: d, max: m }; RC.act('ruleEdit', { code: k }); RC.toast(t('rl.saved'));
          } });
      }
    }
  };

  /* ================= AI email studio ================= */
  const words = () => t('lint.words').split(',').map(s => s.trim()).filter(Boolean);
  const flagged = txt => { const low = txt.toLowerCase(); return words().filter(w => low.indexOf(w) >= 0); };
  RC.compose = (c, tpl, tone) => {
    const cu = RC.cust(c.cid), cat = S.rules[c.reason].cat;
    const v = { name: cu.contact.split(' ')[0], plan: t('plan.' + cu.plan), reason: t('reasonh.' + c.reason), amount: RC.fmtMoney(c.amount), link: 'recovery.demo/pay/' + RC.hex8(RC.hs(c.id)).slice(0, 6) };
    const parts = [t('gen.hi', v), t('gen.reason.' + cat, v)];
    if (tpl === 'final_notice') parts.push(t('gen.final', v)); if (tpl === 'retention_offer') { parts.push(t('gen.final', v)); parts.push(t('gen.offer', v)); }
    parts.push(t('gen.ask.' + tone, v), t('gen.help', v), t('gen.sign', v));
    return { subject: t('gen.subj.' + tone, v), body: parts.join('\n\n') };
  };
  RC.mods.studio = {
    timer: null,
    render() {
      const U = UI.studio, c = RC.caseById(U.caseId), cases = S.cases.filter(x => x.status !== 'lost');
      if (!U.caseId && cases.length) { U.caseId = cases.find(x => x.status === 'campaign') ? cases.find(x => x.status === 'campaign').id : cases[0].id; }
      const cur = RC.caseById(U.caseId);
      const bad = flagged(U.subject + ' ' + U.body), hasLink = U.body.indexOf('recovery.demo/pay') >= 0, len = U.body.length;
      const chk = [[!bad.length, t('st.chkWords')], [hasLink, t('st.chkLink')], [len > 0 && len <= 1200, t('st.chkLen', { n: len })]];
      const cu = cur ? RC.cust(cur.cid) : null;
      const prompt = cur ? t('st.prompt', { name: cu.contact.split(' ')[0], plan: t('plan.' + cu.plan), reason: t('reason.' + cur.reason), tone: t('tone.' + U.tone), words: words().join(', ') }) : '';
      return `<div class="rc-grid2 rc-studio"><section class="rc-pane"><h3 class="rc-h3">${esc(t('st.inputH'))}</h3>
        <div class="rc-form">${RC.select('studio.caseId', cases.map(x => [x.id, x.id + ' / ' + RC.cname(x.cid)]), U.caseId, t('st.case'))}${RC.select('studio.tpl', RC.TPLS.map(k => [k, t('tpl.' + k + '.n')]), U.tpl, t('st.tpl'))}${RC.select('studio.tone', ['friendly', 'neutral', 'direct'].map(k => [k, t('tone.' + k)]), U.tone, t('st.tone'))}</div>
        <div class="rc-actions">${RC.btn('st-gen', U.busy ? t('st.writing') : t('st.gen'), { perm: 'act', icon: 'spark', cls: U.busy ? 'busy' : '' })}${RC.btn('st-tpl', t('st.useTpl'), { ghost: true, icon: 'mail' })}</div>
        ${S.integ.ai.on ? '' : `<p class="rc-warn">${esc(t('st.aiOff'))}</p>`}
        <details class="rc-details"><summary>${esc(t('st.promptH'))}</summary><pre class="rc-code" tabindex="0">${esc(prompt)}</pre></details>
        <h4 class="rc-h4">${esc(t('st.guardH'))}</h4><ul class="rc-checks"><li class="ok">${esc(t('st.g1'))}</li><li class="ok">${esc(t('st.g2'))}</li><li class="ok">${esc(t('st.g3'))}</li></ul>
        <p class="rc-muted">${esc(t('st.banned'))}: <span class="rc-mono">${esc(words().join(', '))}</span></p></section>
      <section class="rc-pane"><h3 class="rc-h3">${esc(t('st.outH'))}</h3>
        <div class="rc-fld"><label for="st-subj">${esc(t('st.subject'))}</label><input id="st-subj" type="text" data-set="studio.subject" data-live="1" data-fk="stsub" value="${esc(U.subject)}" autocomplete="off"></div>
        <div class="rc-fld rc-mt"><label for="st-body">${esc(t('st.body'))}</label><textarea id="st-body" rows="11" data-set="studio.body" data-live="1" data-fk="stbody">${esc(U.body)}</textarea></div>
        <ul class="rc-lint">${chk.map(x => `<li class="${x[0] ? 'ok' : 'bad'}">${RC.ico(x[0] ? 'check' : 'warn', 15)}<span>${esc(x[1])}</span></li>`).join('')}</ul>
        ${bad.length ? `<p class="rc-warn">${esc(t('st.flagged'))}: <b>${esc(bad.join(', '))}</b></p>` : ''}
        ${U.fallback ? `<p class="rc-hint">${esc(t('st.fallback'))}</p>` : ''}
        <div class="rc-actions">${RC.btn('st-queue', t('st.queue'), { perm: 'act', icon: 'outbox' })}${RC.btn('st-save', t('st.save'), { ghost: true })}</div></section></div>
      <section class="rc-pane rc-mt"><h3 class="rc-h3">${esc(t('st.draftsH', { n: S.drafts.length }))}</h3>${S.drafts.length ? `<ul class="rc-log">${S.drafts.map(d => `<li><span class="rc-k">${esc(t('tone.' + d.tone))}</span><div class="rc-lb"><strong>${esc(d.subject)}</strong><span class="rc-muted">${esc(t('tpl.' + d.tpl + '.n'))} / ${esc(RC.fmtStamp(d.at))}</span></div>${RC.btn('st-load', t('st.load'), { ghost: true, data: `data-id="${d.id}"` })}${RC.btn('st-del', t('delete'), { ghost: true, perm: 'act', data: `data-id="${d.id}"` })}</li>`).join('')}</ul>` : RC.empty(t('st.noDrafts'))}</section>`;
    },
    type(subject, body) {
      const U = UI.studio; clearInterval(this.timer);
      if (PF.reduced) { U.subject = subject; U.body = body; U.busy = false; RC.paint(); return; }
      let i = 0; U.busy = true; U.subject = subject; U.body = ''; RC.paint();
      this.timer = setInterval(() => {
        i += 7; U.body = body.slice(0, i);
        if (i >= body.length || S.mod !== 'studio') { U.body = body; U.busy = false; clearInterval(this.timer); }
        if (S.mod === 'studio') RC.paint();
      }, 28);
    },
    act(a, el) {
      const U = UI.studio, c = RC.caseById(U.caseId);
      if (a === 'st-gen') { if (U.busy || !c) return; if (S.integ.ai.on) { U.fallback = false; const g = RC.compose(c, U.tpl, U.tone); this.type(g.subject, g.body); } else { U.fallback = true; const m = { tpl: U.tpl, caseId: c.id, cid: c.cid }, l = RC.letter(m); U.subject = l.subject; U.body = l.body; RC.paint(); } }
      if (a === 'st-tpl') { if (!c) return; const l = RC.letter({ tpl: U.tpl, caseId: c.id, cid: c.cid }); U.fallback = false; U.subject = l.subject; U.body = l.body; RC.paint(); }
      if (a === 'st-save') { if (U.body.trim().length < 20) { RC.toast(t('st.empty')); return; } S.drafts.unshift({ id: 'd' + RC.nid(), tpl: U.tpl, tone: U.tone, subject: U.subject, body: U.body, at: S.now }); RC.act('draft', {}); RC.toast(t('st.saved')); RC.paint(); }
      if (a === 'st-load') { const d = S.drafts.find(x => x.id === el.getAttribute('data-id')); if (d) { U.tpl = d.tpl; U.tone = d.tone; U.subject = d.subject; U.body = d.body; RC.paint(); } }
      if (a === 'st-del') { S.drafts = S.drafts.filter(x => x.id !== el.getAttribute('data-id')); RC.paint(); }
      if (a === 'st-queue') {
        if (!c) return;
        if (U.subject.trim().length < 3 || U.body.trim().length < 20) { RC.toast(t('st.empty')); return; }
        const bad = flagged(U.subject + ' ' + U.body); if (bad.length) { RC.toast(t('st.blocked', { w: bad.join(', ') })); return; }
        if (RC.cust(c.cid).optOut) { RC.toast(t('cs.optBlock')); return; }
        const m = RC.enqueue(c, 0, U.tpl, { manual: true, custom: { subject: U.subject.trim(), body: U.body.trim() }, tone: U.tone, who: RC.WHO[S.role] });
        UI.outbox.open = m.id; RC.toast(t('st.queued', { s: t('mst.' + m.state) })); RC.go('outbox');
      }
    }
  };

  /* ================= outbox ================= */
  const MS = ['review', 'queued', 'failed', 'bounced', 'delivered', 'opened', 'clicked', 'rejected'];
  const grp = s => s === 'delivered' || s === 'opened' || s === 'clicked' ? 'sent' : s === 'failed' || s === 'bounced' ? 'problem' : s;
  RC.mods.outbox = {
    render() {
      const U = UI.outbox, q = U.q.trim().toLowerCase();
      const rows = S.mails.filter(m => (U.st === 'all' || grp(m.state) === U.st) && (!q || RC.cname(m.cid).toLowerCase().indexOf(q) >= 0 || RC.letter(m).subject.toLowerCase().indexOf(q) >= 0));
      const cnt = k => S.mails.filter(m => grp(m.state) === k).length;
      const tr = rows.slice(0, 30).map(m => ({ attr: `data-act="ob-open" data-id="${m.id}"`, cls: U.open === m.id ? 'sel' : '', cc: ['', 'c-veh'], cells: [esc(RC.fmtStamp(m.at)), RC.custLink(m.cid), `<strong>${esc(RC.letter(m).subject)}</strong><span class="rc-muted">${esc(t('tpl.' + m.tpl + '.n'))} / ${esc(t('ov.stepN', { n: m.step || '+' }))}</span>`, RC.badge(RC.mods.cases.mTone(m.state), t('mst.' + m.state)), String(m.tries)] }));
      const sel = S.mails.find(m => m.id === U.open);
      return `<div class="rc-kpis rc-kpis4">${RC.kpi('ob-f', 'data-v="review"', cnt('review'), t('ob.review'), cnt('review') ? 'info' : '')}${RC.kpi('ob-f', 'data-v="queued"', cnt('queued'), t('ob.queued'), cnt('queued') ? 'warn' : '')}${RC.kpi('ob-f', 'data-v="problem"', cnt('problem'), t('ob.problem'), cnt('problem') ? 'bad' : '')}${RC.kpi('ob-f', 'data-v="sent"', cnt('sent'), t('ob.sent'), 'ok')}</div>
      <div class="rc-tools">${RC.search('outbox.q', U.q, t('ob.search'), 'obq')}${RC.btn(S.integ.queue.paused ? 'ob-resume' : 'ob-pause', t(S.integ.queue.paused ? 'ob.resume' : 'ob.pause'), { perm: 'act', icon: S.integ.queue.paused ? 'play' : 'pause', ghost: !S.integ.queue.paused })}</div>
      <div class="rc-tools rc-tools2">${RC.chips('outbox.st', [['all', t('f.all')], ['review', t('mst.review')], ['queued', t('mst.queued')], ['problem', t('ob.problem')], ['sent', t('ob.sent')], ['rejected', t('mst.rejected')]], U.st)}</div>
      ${S.integ.queue.paused ? `<p class="rc-warn">${esc(t('ob.pausedNote'))}</p>` : ''}${S.set.review ? `<p class="rc-hint">${esc(t('ob.reviewOn'))}</p>` : ''}
      ${rows.length ? RC.table([t('col.time'), t('col.customer'), t('ob.message'), t('col.status'), t('ob.tries')], tr) : RC.empty(t('f.none'), t('f.noneHint'))}
      ${sel ? this.detail(sel) : `<p class="rc-hint">${esc(t('ob.pick'))}</p>`}`;
    },
    detail(m) {
      const l = RC.letter(m), cu = RC.cust(m.cid), btn = [];
      if (m.state === 'review') { btn.push(RC.btn('ob-approve', t('ob.approve'), { perm: 'act', icon: 'check' })); btn.push(RC.btn('ob-reject', t('ob.reject'), { perm: 'act', ghost: true, icon: 'x' })); }
      if (m.state === 'failed') btn.push(RC.btn('ob-retry', t('ob.retry'), { perm: 'act', icon: 'reset' }));
      if (m.state === 'queued') btn.push(RC.btn('ob-resume', t('ob.resume'), { perm: 'act', icon: 'play' }));
      if (m.state === 'bounced') btn.push(RC.btn('ob-fix', t('ob.fix'), { icon: 'customers' }));
      if (m.state === 'delivered' || m.state === 'opened' || m.state === 'clicked') { btn.push(RC.btn('ob-wh', t('ob.whOpen'), { perm: 'act', ghost: true, data: 'data-w="opened"' })); btn.push(RC.btn('ob-wh', t('ob.whClick'), { perm: 'act', ghost: true, data: 'data-w="clicked"' })); btn.push(RC.btn('ob-wh', t('ob.whBounce'), { perm: 'act', ghost: true, data: 'data-w="bounced"' })); btn.push(RC.btn('ob-wh', t('ob.whSpam'), { perm: 'act', ghost: true, data: 'data-w="complaint"' })); }
      return `<section class="rc-pane rc-mt"><div class="rc-dhead"><h3 class="rc-h3">${esc(t('ob.letter'))} <span class="rc-mono">${esc(m.id)}</span></h3>${RC.badge(RC.mods.cases.mTone(m.state), t('mst.' + m.state))}</div>
        <dl class="rc-facts rc-facts3"><div><dt>${esc(t('ob.to'))}</dt><dd>${esc(cu ? cu.email : '-')}</dd></div><div><dt>${esc(t('ob.key'))}</dt><dd class="rc-mono">${esc(m.key)}</dd></div><div><dt>${esc(t('ob.origin'))}</dt><dd>${esc(t(m.custom ? 'ob.ai' : 'ob.tplSrc'))}${m.tone ? ' / ' + esc(t('tone.' + m.tone)) : ''}</dd></div></dl>
        ${m.err ? `<p class="rc-warn">${esc(t('ob.err.' + m.err))}</p>` : ''}
        <div class="rc-mailbox"><p class="rc-msubj">${esc(l.subject)}</p>${l.body.split('\n\n').map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>
        <div class="rc-actions">${btn.join('')}</div></section>`;
    },
    act(a, el) {
      const U = UI.outbox, m = S.mails.find(x => x.id === U.open);
      if (a === 'ob-open') { U.open = el.getAttribute('data-id'); RC.paint(); return; }
      if (a === 'ob-f') { U.st = el.getAttribute('data-v'); RC.paint(); return; }
      if (a === 'ob-pause') { S.integ.queue.paused = true; RC.act('qPause', {}); RC.refresh(); return; }
      if (a === 'ob-resume') { RC.resumeQueue(); RC.act('qResume', {}); RC.toast(t('ob.resumed')); RC.refresh(); return; }
      if (!m) return;
      if (a === 'ob-approve') { m.reviewed = true; RC.act('mailApproved', { cid: m.cid, caseId: m.caseId }); RC.dispatch(m); RC.toast(t('ob.approved')); RC.refresh(); }
      if (a === 'ob-reject') { m.state = 'rejected'; const c = RC.caseById(m.caseId); if (c) c.steps.forEach(s => { if (s.mail === m.id) s.state = 'skipped'; }); RC.act('mailRejected', { cid: m.cid, caseId: m.caseId }); RC.refresh(); }
      if (a === 'ob-retry') { if (!S.integ.mail.on) { RC.toast(t('ob.stillOff')); return; } RC.act('mailRetry', { cid: m.cid, caseId: m.caseId }); RC.dispatch(m); RC.toast(t('ob.retried', { s: t('mst.' + m.state) })); RC.refresh(); }
      if (a === 'ob-fix') RC.openCust(m.cid);
      if (a === 'ob-wh') {
        const w = el.getAttribute('data-w'), cu = RC.cust(m.cid);
        if (w === 'opened' || w === 'clicked') { m.state = w; RC.act(w === 'opened' ? 'mailOpened' : 'mailClicked', { cid: m.cid, caseId: m.caseId }); }
        if (w === 'bounced') { m.state = 'bounced'; cu.bounce = true; RC.act('mailBounced', { cid: m.cid, caseId: m.caseId }); }
        if (w === 'complaint') { cu.optOut = true; m.state = 'delivered'; RC.act('complaint', { cid: m.cid, caseId: m.caseId }); RC.toast(t('ob.spamDone')); }
        RC.refresh();
      }
    }
  };
}());
