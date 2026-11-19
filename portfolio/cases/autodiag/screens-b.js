/* Auto Diagnostic demo: diagnosis wizard, AI dialogue, result, cost estimate. */
(function () {
  'use strict';
  const AD = window.AD, t = AD.t, esc = AD.esc, $ = AD.$, SC = AD.screens;
  const on = (root, fn) => { root.onclick = e => fn(e, sel => e.target.closest(sel)); };
  const freshDraft = () => ({ step: 1, carId: AD.S.active, cat: null, sym: [], note: '', boost: {}, chat: [], qi: 0, typing: false, hint: null });

  /* ---------- wizard ---------- */
  SC.diag = {
    title: 'ttl.diag',
    render() {
      const S = AD.S, lim = AD.limits();
      if (S.plan.tier === 'free' && S.plan.used >= lim.diags) {
        return '<div class="ad-card lock"><h4 class="ad-h">' + esc(t('lim.h')) + '</h4><p class="ad-sub">' + esc(t('lim.p', { n: lim.diags })) + '</p><button type="button" class="ad-btn wide" data-plan="1">' + esc(t('plan.see')) + '</button><button type="button" class="ad-btn ghost wide" data-hist="1">' + esc(t('lim.hist')) + '</button></div>';
      }
      if (!S.draft) S.draft = freshDraft();
      const d = S.draft;
      let h = '<ol class="ad-steps" aria-label="' + esc(t('wz.steps')) + '">' + [1, 2, 3].map(i => '<li class="' + (d.step === i ? 'on' : d.step > i ? 'done' : '') + '"' + (d.step === i ? ' aria-current="step"' : '') + '><b>' + i + '</b><span>' + esc(t('wz.s' + i)) + '</span></li>').join('') + '</ol>';
      if (d.hint) h += '<p class="ad-note">' + AD.icon('codes', 16) + esc(t('wz.fromCode', { code: d.hint })) + '</p>';
      if (d.step === 1) {
        h += '<h4 class="ad-h2">' + esc(t('f.car')) + '</h4><div class="ad-chips scroll">' + S.cars.map(c => '<button type="button" class="ad-chip" data-car="' + c.id + '" aria-pressed="' + (d.carId === c.id) + '">' + esc(AD.carName(c)) + '</button>').join('') + '</div>';
        h += '<h4 class="ad-h2">' + esc(t('wz.cat')) + '</h4><div class="ad-tiles">' + AD.CATS.map(c => '<button type="button" class="ad-tile" data-cat="' + c + '" aria-pressed="' + (d.cat === c) + '">' + esc(t('cat.' + c)) + '</button>').join('') + '</div>';
        h += '<p class="ad-err" role="alert">' + (d.err ? esc(t('err.cat')) : '') + '</p><button type="button" class="ad-btn wide" data-next="1">' + esc(t('btn.next')) + '</button>';
      } else if (d.step === 2) {
        const syms = Object.keys(AD.SYM).filter(k => AD.SYM[k].cat === d.cat);
        h += '<h4 class="ad-h2">' + esc(t('wz.sym')) + '</h4><p class="ad-muted">' + esc(t('wz.symHint')) + '</p><div class="ad-checks">' + syms.map(k => '<button type="button" class="ad-check" data-sym="' + k + '" aria-pressed="' + (d.sym.indexOf(k) >= 0) + '"><i>' + (d.sym.indexOf(k) >= 0 ? AD.icon('check', 16) : '') + '</i>' + esc(t('sy.' + k)) + '</button>').join('') + '</div>';
        h += '<p class="ad-err" role="alert">' + (d.err ? esc(t('err.sym')) : '') + '</p><div class="ad-actions"><button type="button" class="ad-btn ghost" data-prev="1">' + esc(t('btn.back')) + '</button><button type="button" class="ad-btn" data-next="1">' + esc(t('btn.next')) + '</button></div>';
      } else {
        const c = AD.car(d.carId);
        h += '<div class="ad-card"><ul class="ad-sum"><li><span>' + esc(t('f.car')) + '</span><b>' + esc(AD.carName(c)) + '</b></li><li><span>' + esc(t('wz.cat')) + '</span><b>' + esc(t('cat.' + d.cat)) + '</b></li><li><span>' + esc(t('wz.sym')) + '</span><b>' + d.sym.map(k => esc(t('sy.' + k))).join(', ') + '</b></li></ul></div>';
        h += '<label class="ad-lab" for="wz-note">' + esc(t('wz.note')) + '</label><textarea id="wz-note" rows="3" maxlength="240" placeholder="' + esc(t('wz.notePh')) + '">' + esc(d.note) + '</textarea>';
        h += '<div class="ad-actions"><button type="button" class="ad-btn ghost" data-prev="1">' + esc(t('btn.back')) + '</button><button type="button" class="ad-btn" data-start="1">' + AD.icon('chat', 18) + esc(t('wz.start')) + '</button></div>';
      }
      return h;
    },
    bind(root) {
      const S = AD.S, d = S.draft;
      on(root, (e, q) => {
        let b;
        if (q('[data-plan]')) { AD.openIn('more', 'plan'); return; }
        if (q('[data-hist]')) { AD.tab('history'); return; }
        if (!d) return;
        if ((b = q('[data-car]'))) { d.carId = b.getAttribute('data-car'); AD.render(false); }
        else if ((b = q('[data-cat]'))) { const c = b.getAttribute('data-cat'); if (d.cat !== c) { d.cat = c; d.sym = []; d.boost = d.hint ? d.boost : {}; } d.err = false; AD.render(false); }
        else if ((b = q('[data-sym]'))) { const k = b.getAttribute('data-sym'), i = d.sym.indexOf(k); if (i >= 0) d.sym.splice(i, 1); else d.sym.push(k); d.err = false; AD.render(false); }
        else if (q('[data-next]')) {
          if (d.step === 1 && !d.cat) { d.err = true; AD.render(false); return; }
          if (d.step === 2 && !d.sym.length) { d.err = true; AD.render(false); return; }
          d.step++; d.err = false; AD.render(true);
        } else if (q('[data-prev]')) { d.step--; AD.render(true); }
        else if (q('[data-start]')) { const n = $('wz-note'); d.note = n ? n.value.trim() : ''; d.chat = []; d.qi = 0; d.typing = false; AD.go('chat'); }
      });
      const n = $('wz-note'); if (n) n.oninput = () => { d.note = n.value; };
    }
  };

  /* ---------- AI dialogue (scripted, local) ---------- */
  const pushAi = (d, msg, delay) => {
    d.typing = true; AD.render(false);
    const fin = () => { if (AD.S.draft !== d) return; d.chat.push(msg); d.typing = false; if (AD.cur().id === 'chat') { AD.render(false); const s = $('ad-screen'); s.scrollTop = s.scrollHeight; } };
    if (PF.reduced) fin(); else setTimeout(fin, delay || 800);
  };
  SC.chat = {
    title: 'ttl.chat',
    render() {
      const S = AD.S, d = S.draft;
      if (!d || !d.cat) return '<p class="ad-empty">' + esc(t('chat.empty')) + '</p><button type="button" class="ad-btn wide" data-new="1">' + esc(t('gar.diag')) + '</button>';
      if (!d.chat.length && !d.typing) { d.chat.push({ type: 'hi' }); d.chat.push({ type: 'q', i: 0 }); }
      const c = AD.car(d.carId);
      const msg = m => {
        let txt, who = m.from || 'ai';
        if (m.type === 'hi') txt = t('chat.hi', { car: AD.carName(c), sym: d.sym.map(k => t('sy.' + k)).join(', ') });
        else if (m.type === 'q') txt = t('qa.' + d.cat + '.' + (m.i + 1) + '.q');
        else if (m.type === 'ans') { who = 'me'; txt = t('qa.' + d.cat + '.' + (m.i + 1) + '.o' + (m.o + 1)); }
        else if (m.type === 'free') { who = 'me'; txt = m.txt; }
        else if (m.type === 'noted') txt = t('chat.noted');
        else txt = t('chat.ready');
        return '<div class="ad-msg ' + who + '"><p>' + esc(txt) + '</p></div>';
      };
      let h = '<p class="ad-ai-note">' + AD.icon('star', 14) + esc(t('chat.who')) + '</p><div class="ad-chat" id="ad-chat" aria-live="polite">' + d.chat.map(msg).join('') + (d.typing ? '<div class="ad-msg ai typing" aria-label="' + esc(t('chat.typing')) + '"><p><i></i><i></i><i></i></p></div>' : '') + '</div>';
      const ready = d.qi >= 2, last = d.chat[d.chat.length - 1];
      if (!d.typing && !ready && last && last.type === 'q') {
        h += '<div class="ad-quick">' + [0, 1, 2].map(o => '<button type="button" class="ad-chip" data-opt="' + o + '">' + esc(t('qa.' + d.cat + '.' + (d.qi + 1) + '.o' + (o + 1))) + '</button>').join('') + '</div>';
      }
      if (ready && !d.typing) h += '<button type="button" class="ad-btn wide" data-res="1">' + AD.icon('check', 18) + esc(t('chat.show')) + '</button>';
      h += '<form class="ad-send" id="ad-send"><input id="ad-say" type="text" maxlength="120" autocomplete="off" aria-label="' + esc(t('chat.ph')) + '" placeholder="' + esc(t('chat.ph')) + '"><button type="submit" class="ad-ic fill" aria-label="' + esc(t('chat.send')) + '">' + AD.icon('send') + '</button></form>';
      return h;
    },
    bind(root) {
      const S = AD.S, d = S.draft;
      const sc = $('ad-screen'); if (d) sc.scrollTop = sc.scrollHeight;
      if (!d) { const nb = root.querySelector('[data-new]'); if (nb) nb.onclick = () => AD.tab('diagnose'); return; }
      const nb = root.querySelector('[data-new]'); if (nb) nb.onclick = () => AD.tab('diagnose');
      on(root, (e, q) => {
        let b;
        if ((b = q('[data-opt]'))) {
          const o = +b.getAttribute('data-opt'), i = d.qi, boosts = AD.QA[d.cat][i][o];
          Object.keys(boosts).forEach(k => { d.boost[k] = (d.boost[k] || 0) + boosts[k]; });
          d.chat.push({ type: 'ans', i: i, o: o }); d.qi++;
          pushAi(d, d.qi >= 2 ? { type: 'ready' } : { type: 'q', i: d.qi }, 800);
        } else if (q('[data-res]')) {
          const rec = AD.makeDiag(); S.draft = null;
          S.nav.tab = 'diagnose'; S.nav.stack = [{ id: 'diag', p: {} }, { id: 'result', p: { id: rec.id, fresh: true } }]; AD.render(true);
        }
      });
      const f = $('ad-send'); if (!f) return;
      f.onsubmit = e => {
        e.preventDefault(); const inp = $('ad-say'), v = inp.value.trim(); if (!v || d.typing) return;
        d.chat.push({ type: 'free', from: 'me', txt: v }); d.note = (d.note ? d.note + ' ' : '') + v;
        const last = d.qi >= 2 ? { type: 'ready' } : { type: 'noted' };
        pushAi(d, last, 700);
      };
    }
  };

  /* ---------- result ---------- */
  SC.result = {
    title: 'ttl.result',
    render(p) {
      const S = AD.S, d = AD.diag(p.id); if (!d) return '<p class="ad-empty">' + esc(t('empty.diag')) + '</p>';
      const an = AD.analyze(d), c = AD.car(d.carId);
      if (!p.open) p.open = an.causes[0].id;
      let h = '';
      if (an.urg === 'critical') h += '<div class="ad-banner bad" role="alert">' + AD.icon('warn', 22) + '<span><b>' + esc(t('res.stopH')) + '</b>' + esc(t('res.stopP')) + '</span></div>';
      else if (an.urg === 'high') h += '<div class="ad-banner warn" role="status">' + AD.icon('warn', 22) + '<span><b>' + esc(t('res.soonH')) + '</b>' + esc(t('res.soonP')) + '</span></div>';
      h += '<div class="ad-card"><div class="ad-row2"><span class="grow"><b>' + esc(AD.carName(c)) + '</b><small>' + esc(AD.fmtDate(d.date, true) + ' · ' + t('cat.' + d.cat)) + '</small></span>' + AD.urgBadge(an.urg) + '</div><p class="ad-sub">' + d.sym.map(k => esc(t('sy.' + k))).join(' · ') + '</p>' +
        '<div class="ad-seg" role="group" aria-label="' + esc(t('res.status')) + '">' + ['open', 'booked', 'fixed'].map(s => '<button type="button" data-st="' + s + '" aria-pressed="' + (d.status === s) + '">' + esc(t('st.' + s)) + '</button>').join('') + '</div></div>';
      h += '<h4 class="ad-h2">' + esc(t('res.causes')) + '</h4><ul class="ad-list">' + an.causes.map((x, i) => {
        const o = p.open === x.id, cz = AD.CAUSES[x.id], checks = t('cz.' + x.id + '.c').split('|');
        return '<li class="ad-card cause' + (o ? ' open' : '') + '"><button type="button" class="ad-cause-h" data-open="' + x.id + '" aria-expanded="' + o + '"><span class="grow"><b>' + (i + 1) + '. ' + esc(t('cz.' + x.id + '.n')) + '</b><span class="ad-bar" role="img" aria-label="' + esc(t('res.conf') + ' ' + x.pct + '%') + '"><i class="' + x.level + '" style="width:' + x.pct + '%"></i></span><small>' + esc(t('res.conf') + ': ' + x.pct + '% · ' + t('lvl.' + x.level)) + '</small></span>' + AD.icon('right', 18) + '</button>' +
          (o ? '<div class="ad-cause-b"><p>' + esc(t('cz.' + x.id + '.d')) + '</p><div class="ad-row2"><small class="ad-k">' + esc(t('res.urg')) + '</small>' + AD.urgBadge(cz.urg) + '</div><h5 class="ad-h3">' + esc(t('res.check')) + '</h5><ul class="ad-todo">' + checks.map((s, j) => { const key = x.id + j, ck = d.checked[key]; return '<li><button type="button" data-chk="' + key + '" aria-pressed="' + !!ck + '"><i>' + (ck ? AD.icon('check', 14) : '') + '</i>' + esc(s) + '</button></li>'; }).join('') + '</ul>' +
            '<div class="ad-actions"><button type="button" class="ad-btn sm" data-est="' + x.id + '">' + AD.icon('coin', 16) + esc(t('res.est')) + '</button><button type="button" class="ad-btn sm ghost" data-bk="' + x.id + '">' + AD.icon('cal', 16) + esc(t('res.book')) + '</button></div></div>' : '') + '</li>';
      }).join('') + '</ul>';
      if (d.est) h += '<div class="ad-card"><small class="ad-k">' + esc(t('res.saved')) + '</small><b>' + esc(t('cz.' + d.est.cause + '.n') + ': ' + AD.range(d.est.total)) + '</b></div>';
      h += '<p class="ad-disc">' + esc(t('res.disc')) + '</p>';
      return h;
    },
    bind(root, p) {
      const d = AD.diag(p.id); if (!d) return;
      on(root, (e, q) => {
        let b;
        if ((b = q('[data-open]'))) { const k = b.getAttribute('data-open'); p.open = p.open === k ? '__' : k; AD.render(false); }
        else if ((b = q('[data-chk]'))) { const k = b.getAttribute('data-chk'); d.checked[k] = !d.checked[k]; AD.render(false); }
        else if ((b = q('[data-st]'))) {
          const s = b.getAttribute('data-st'); if (s === d.status) return;
          d.status = s; AD.log('diag', 'lg.st', { car: AD.carName(AD.car(d.carId)), st: { k: 'st.' + s } }); AD.toast(t('res.stOk')); AD.render(false);
        } else if ((b = q('[data-est]'))) { AD.go('cost', { id: d.id, cause: b.getAttribute('data-est') }); }
        else if ((b = q('[data-bk]'))) { AD.openIn('more', 'book', { init: true, diagId: d.id, cause: b.getAttribute('data-bk'), carId: d.carId }); }
      });
    }
  };

  /* ---------- cost estimate ---------- */
  SC.cost = {
    title: 'ttl.cost',
    render(p) {
      const S = AD.S, d = AD.diag(p.id); if (!d) return '<p class="ad-empty">' + esc(t('empty.diag')) + '</p>';
      if (!p.region) { p.region = S.set.region; p.cls = S.set.cls; p.fee = true; }
      const an = AD.analyze(d);
      if (!p.cause) p.cause = an.causes[0].id;
      const est = AD.estimate(d, p.cause, { region: p.region, cls: p.cls, fee: p.fee });
      let h = '<div class="ad-chips scroll">' + an.causes.map(x => '<button type="button" class="ad-chip" data-cz="' + x.id + '" aria-pressed="' + (p.cause === x.id) + '">' + esc(t('cz.' + x.id + '.n')) + '</button>').join('') + '</div>';
      h += '<div class="ad-two"><div><label class="ad-lab" for="cs-reg">' + esc(t('cs.region')) + '</label><select id="cs-reg">' + Object.keys(AD.REGIONS).map(r => '<option value="' + r + '"' + (p.region === r ? ' selected' : '') + '>' + esc(t('reg.' + r)) + '</option>').join('') + '</select></div>' +
        '<div><label class="ad-lab" for="cs-cls">' + esc(t('cs.cls')) + '</label><select id="cs-cls">' + Object.keys(AD.CLASSES).map(r => '<option value="' + r + '"' + (p.cls === r ? ' selected' : '') + '>' + esc(t('cls.' + r)) + '</option>').join('') + '</select></div></div>';
      h += '<button type="button" class="ad-check" data-fee="1" aria-pressed="' + p.fee + '"><i>' + (p.fee ? AD.icon('check', 16) : '') + '</i>' + esc(t('cs.fee')) + '</button>';
      h += '<h4 class="ad-h2">' + esc(t('cs.works')) + '</h4><table class="ad-tbl"><tbody>' + est.works.map(w => '<tr><td>' + esc(w.n) + '<small>' + esc(w.h + ' ' + t('unit.h')) + '</small></td><td>' + esc(AD.range(w.r)) + '</td></tr>').join('') + (est.fee ? '<tr><td>' + esc(t('cs.feeRow')) + '</td><td>' + esc(AD.cu(est.fee)) + '</td></tr>' : '') + '</tbody></table>';
      h += '<h4 class="ad-h2">' + esc(t('cs.parts')) + '</h4><table class="ad-tbl"><tbody>' + est.parts.map(w => '<tr><td>' + esc(w.n) + '</td><td>' + esc(AD.range(w.r)) + '</td></tr>').join('') + '</tbody></table>';
      h += '<div class="ad-total"><span>' + esc(t('cs.total')) + '</span><b id="ad-total">' + esc(AD.range(est.total)) + '</b><small>' + esc(t('cs.note', { rate: Math.round(est.rate) })) + '</small></div>';
      h += '<div class="ad-actions"><button type="button" class="ad-btn" data-save="1">' + esc(t('cs.save')) + '</button><button type="button" class="ad-btn ghost" data-bk="1">' + AD.icon('cal', 16) + esc(t('res.book')) + '</button></div>';
      return h;
    },
    bind(root, p) {
      const d = AD.diag(p.id); if (!d) return;
      const reg = $('cs-reg'), cls = $('cs-cls');
      reg.onchange = () => { p.region = reg.value; AD.render(false); };
      cls.onchange = () => { p.cls = cls.value; AD.render(false); };
      on(root, (e, q) => {
        let b;
        if ((b = q('[data-cz]'))) { p.cause = b.getAttribute('data-cz'); AD.render(false); }
        else if (q('[data-fee]')) { p.fee = !p.fee; AD.render(false); }
        else if (q('[data-save]')) {
          const est = AD.estimate(d, p.cause, { region: p.region, cls: p.cls, fee: p.fee });
          d.est = { cause: p.cause, total: [Math.round(est.total[0]), Math.round(est.total[1])] };
          AD.log('diag', 'lg.est', { car: AD.carName(AD.car(d.carId)), sum: AD.range(d.est.total) }); AD.toast(t('cs.saved'));
        } else if (q('[data-bk]')) { AD.openIn('more', 'book', { init: true, diagId: d.id, cause: p.cause, carId: d.carId }); }
      });
    }
  };
}());
