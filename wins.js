/* Окна приложений, нарисованные в canvas. Данные вымышлены. ES5. Все тексты берутся из словарей через MFI18N.t.
   Два макета: широкий (1024x640) и компактный для вертикальных экранов (390x640, кегль не меньше 16 при ширине окна на весь экран:
   на телефоне 1 пиксель текстуры примерно равен 0,9 CSS-пикселя, текст остаётся чётким и читаемым). Телефон-окно: 480x960 и 360x720. */
(function (w) {
  'use strict';
  var C = {
    bg: '#0b0d11', s1: '#12151b', s2: '#191d25', s3: '#232834', line: 'rgba(255,255,255,0.10)',
    text: '#eceff4', muted: '#a1a9b8', faint: '#6f7788', accent: '#ffb23e', ink: '#1a1000', ok: '#5bd08a'
  };
  var SANS = '"Manrope", "Segoe UI", system-ui, sans-serif';
  var MONO = '"JetBrains Mono", Consolas, monospace';
  var FIN = 1e9;
  var NSC = 6;
  var SKEYS = ['name', 'biz', 'c1', 'a1', 'c2', 'a2', 'topic', 'what', 'when', 'title', 'sub', 'note'];

  function T(k) { return w.MFI18N.t(k); }
  var cache = { lang: '', list: [] };
  function scen(i) {
    var L = w.MFI18N.lang(), o, k;
    if (cache.lang !== L) { cache = { lang: L, list: [] }; }
    if (!cache.list[i]) {
      o = {};
      for (k = 0; k < SKEYS.length; k++) { o[SKEYS[k]] = T('sc.' + (i + 1) + '.' + SKEYS[k]); }
      cache.list[i] = o;
    }
    return cache.list[i];
  }
  var S = null, SI = 0;
  function LP(t, def) { return t >= FIN ? FIN : t % (w.MXW.period || def); }
  /* pick: любое нечисловое или отрицательное t даёт сценарий 0 (ловушка NaN/undefined) */
  function pick(t) {
    var i;
    if (!(t < FIN) || !(t >= 0)) { SI = 0; S = scen(0); return; }
    i = Math.floor(t / (w.MXW.period || 13000)) % NSC;
    SI = i >= 0 && i < NSC ? i : 0;
    S = scen(SI);
  }
  /* соседние сценарии для карточек-наполнителей CRM (настоящий текст вместо серых полос) */
  function other(k) { return scen((SI + k) % NSC); }
  /* текст в несколько строк (до n), по центру по вертикали вокруг y */
  function tx2(c, s, x, y, size, col, weight, maxW, n, lh) {
    var ls = wrap(c, s, maxW, size, weight), i, y0;
    if (ls.length > n) { ls = ls.slice(0, n); ls[n - 1] = ls[n - 1].replace(/\s+$/, '') + '…'; }
    y0 = y - (ls.length - 1) * lh / 2;
    for (i = 0; i < ls.length; i++) { tx(c, ls[i], x, y0 + i * lh, size, col, weight, 'left', null, maxW); }
  }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(v) { v = cl(v, 0, 1); return 1 - Math.pow(1 - v, 3); }
  function ph(t, a, d) { return ease((t - a) / d); }
  function rr(c, x, y, W, H, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + W - r, y); c.arcTo(x + W, y, x + W, y + r, r);
    c.lineTo(x + W, y + H - r); c.arcTo(x + W, y + H, x + W - r, y + H, r);
    c.lineTo(x + r, y + H); c.arcTo(x, y + H, x, y + H - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
  }
  function fillRR(c, x, y, W, H, r, col) { rr(c, x, y, W, H, r); c.fillStyle = col; c.fill(); }
  function strokeRR(c, x, y, W, H, r, col) { rr(c, x + 0.5, y + 0.5, W - 1, H - 1, r); c.strokeStyle = col; c.lineWidth = 1; c.stroke(); }
  function fnt(size, weight, font) { return (weight || 500) + ' ' + size + 'px ' + (font || SANS); }
  function mw(c, s, size, weight, font) { c.font = fnt(size, weight, font); return c.measureText(s).width; }
  /* текст; при заданном maxW сначала слегка сжимается шрифт (до 82%), затем многоточие */
  function tx(c, s, x, y, size, col, weight, align, font, maxW) {
    s = String(s);
    c.font = fnt(size, weight, font);
    if (maxW && c.measureText(s).width > maxW) {
      size = size * Math.max(0.82, maxW / c.measureText(s).width);
      c.font = fnt(size, weight, font);
      if (c.measureText(s).width > maxW) {
        while (s.length > 1 && c.measureText(s + '…').width > maxW) { s = s.slice(0, -1); }
        s = s.replace(/\s+$/, '') + '…';
      }
    }
    c.fillStyle = col; c.textAlign = align || 'left'; c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }
  function wrap(c, s, maxW, size, weight) {
    var words = s.split(' '), lines = [], cur = '', i, t;
    c.font = fnt(size, weight);
    for (i = 0; i < words.length; i++) {
      t = cur ? cur + ' ' + words[i] : words[i];
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else { cur = t; }
    }
    if (cur) { lines.push(cur); }
    return lines;
  }
  function chrome(c, W, H, title) {
    c.clearRect(0, 0, W, H);
    fillRR(c, 0, 0, W, H, 22, C.s1);
    c.save(); rr(c, 0, 0, W, H, 22); c.clip();
    fillRR(c, 0, 0, W, 52, 0, C.s2);
    c.fillStyle = C.line; c.fillRect(0, 52, W, 1);
    var i;
    for (i = 0; i < 3; i++) { c.beginPath(); c.arc(26 + i * 20, 26, 6, 0, 6.2832); c.fillStyle = C.s3; c.fill(); }
    tx(c, title, 108, 26, W < 700 ? 16 : 15, C.muted, 500, 'left', null, W - 130);
    c.restore();
    strokeRR(c, 0, 0, W, H, 22, C.line);
  }
  function check(c, x, y, r, col) {
    c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fillStyle = col; c.fill();
    c.beginPath(); c.moveTo(x - r * 0.42, y); c.lineTo(x - r * 0.1, y + r * 0.34); c.lineTo(x + r * 0.46, y - r * 0.32);
    c.strokeStyle = C.ink; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  function bar(c, x, y, W, col) { fillRR(c, x, y, W, 8, 4, col || C.s3); }
  function demoTag(c, W, H) { tx(c, T('demo'), 24, H - 18, W < 700 ? 14 : 12, C.faint, 500, 'left', MONO, W - 48); }

  /* сообщения чата: общий код для обоих макетов. g = { cx, rx, maxW, size, lh, y0 } */
  function chatMsgs(c, W, H, t, g) {
    var script = [
      { who: 'c', at: 700, s: S.c1 },
      { who: 'a', at: 2800, s: S.a1 },
      { who: 'c', at: 6600, s: S.c2 },
      { who: 'a', at: 8400, s: S.a2 }
    ];
    var loopT = LP(t, 13000), y = g.y0, i, n, s, a = 1, str, lines, bw, bh, used, part;
    for (i = 0; i < script.length; i++) {
      s = script[i];
      if (loopT < s.at - (s.who === 'a' ? 1100 : 0)) { break; }
      if (s.who === 'a' && loopT < s.at) {
        fillRR(c, g.rx - 92, y, 92, 38, 19, C.accent);
        for (n = 0; n < 3; n++) {
          c.beginPath(); c.arc(g.rx - 92 + 28 + n * 18, y + 19 - Math.abs(Math.sin(loopT / 160 + n)) * 4, 4, 0, 6.2832); c.fillStyle = C.ink; c.fill();
        }
        break;
      }
      str = s.s;
      if (s.who === 'a') { str = s.s.substr(0, Math.floor(cl((loopT - s.at) / 38, 0, s.s.length))); }
      else { a = ph(loopT, s.at, 300); }
      lines = wrap(c, s.s, g.maxW, g.size, 500);
      bw = 0;
      for (n = 0; n < lines.length; n++) { bw = Math.max(bw, mw(c, lines[n], g.size, 500)); }
      bw += 36; bh = lines.length * g.lh + 22;
      if (s.who === 'c') {
        c.globalAlpha = a;
        fillRR(c, g.cx, y, bw, bh, 18, C.s3);
        for (n = 0; n < lines.length; n++) { tx(c, lines[n], g.cx + 18, y + 22 + n * g.lh, g.size, C.text, 500); }
        c.globalAlpha = 1;
      } else {
        fillRR(c, g.rx - bw, y, bw, bh, 18, C.accent);
        used = 0;
        for (n = 0; n < lines.length; n++) {
          part = str.substr(used, lines[n].length + 1).replace(/\s+$/, '');
          if (part.length > lines[n].length) { part = part.substr(0, lines[n].length); }
          tx(c, part, g.rx - bw + 18, y + 22 + n * g.lh, g.size, C.ink, 600);
          used += lines[n].length + 1;
        }
      }
      y += bh + 14;
    }
  }

  /* 1. Мессенджер */
  function drawChat(c, W, H, t) {
    var i, y, names, CM = W < 700;
    pick(t);
    chrome(c, W, H, T('win.chat'));
    c.save(); rr(c, 0, 53, W, H - 53, 22); c.clip();
    if (CM) {
      fillRR(c, 0, 53, W, 70, 0, C.s1);
      c.fillStyle = C.line; c.fillRect(0, 123, W, 1);
      c.beginPath(); c.arc(50, 88, 22, 0, 6.2832); c.fillStyle = C.accent; c.fill();
      tx(c, S.name.charAt(0), 50, 89, 19, C.ink, 700, 'center');
      tx(c, S.name, 86, 78, 19, C.text, 700, 'left', null, 150);
      tx(c, T('chat.online'), 86, 101, 15, C.ok, 500);
      tx(c, S.biz, W - 18, 88, 15, C.muted, 600, 'right', null, 150);
      chatMsgs(c, W, H, t, { cx: 16, rx: W - 16, maxW: 262, size: 17, lh: 24, y0: 142 });
      fillRR(c, 16, H - 78, W - 32, 48, 24, C.s2);
      strokeRR(c, 16, H - 78, W - 32, 48, 24, C.line);
      tx(c, T('chat.input'), 40, H - 54, 16, C.faint, 500);
    } else {
      c.fillStyle = C.bg; c.fillRect(0, 53, 250, H);
      c.fillStyle = C.line; c.fillRect(250, 53, 1, H);
      names = [S.name, T('chat.n2'), T('chat.n3'), T('chat.n4')];
      for (i = 0; i < names.length; i++) {
        y = 76 + i * 70;
        if (i === 0) { fillRR(c, 12, y - 8, 226, 62, 12, C.s2); }
        c.beginPath(); c.arc(46, y + 23, 18, 0, 6.2832); c.fillStyle = i === 0 ? C.accent : C.s3; c.fill();
        tx(c, names[i].charAt(0), 46, y + 24, 16, i === 0 ? C.ink : C.muted, 700, 'center');
        tx(c, names[i], 76, y + 14, 15, i === 0 ? C.text : C.muted, 700, 'left', null, 150);
        tx(c, i === 0 ? S.c1 : T('inbox.' + i + '.p'), 76, y + 38, 12, C.faint, 500, 'left', null, 150);
      }
      fillRR(c, 251, 53, W - 251, 64, 0, C.s1);
      c.fillStyle = C.line; c.fillRect(251, 117, W - 251, 1);
      tx(c, S.name, 280, 77, 17, C.text, 700, 'left', null, 300);
      tx(c, S.biz, W - 28, 77, 13, C.faint, 500, 'right', MONO, 260);
      tx(c, T('chat.online'), 280, 98, 13, C.ok, 500);
      chatMsgs(c, W, H, t, { cx: 280, rx: W - 40, maxW: 380, size: 16, lh: 24, y0: 150 });
      fillRR(c, 276, H - 78, W - 276 - 26, 46, 23, C.s2);
      strokeRR(c, 276, H - 78, W - 276 - 26, 46, 23, C.line);
      tx(c, T('chat.input'), 300, H - 55, 15, C.faint, 500);
    }
    c.restore();
    demoTag(c, W, H);
  }

  /* 2. Входящие */
  function drawInbox(c, W, H, t) {
    var CM = W < 700;
    var rows = [
      ['src.mail', 'inbox.1.s', 'inbox.1.p', '10:42'],
      ['src.tg', 'inbox.2.s', 'inbox.2.p', '10:31'],
      ['src.site', 'inbox.3.s', 'inbox.3.p', '10:18'],
      ['src.mail', 'inbox.4.s', 'inbox.4.p', '09:55'],
      ['src.tg', 'inbox.5.s', 'inbox.5.p', '09:40']
    ];
    var i, y, a, r, q, tm = LP(t, 9000), ch = ['inbox.all', 'src.mail', 'src.tg', 'src.site'], x = 28, cw;
    var rh = CM ? 106 : 68, rs = CM ? 116 : 78, mg = CM ? 16 : 20;
    pick(t);
    chrome(c, W, H, T('win.inbox'));
    for (i = 0; i < ch.length; i++) {
      cw = CM ? mw(c, T(ch[i]), 15, 600) + 26 : 106;
      if (!CM) { x = 28 + i * 118; }
      fillRR(c, x, 74, cw, 36, 18, i === 0 ? C.s3 : C.s1);
      strokeRR(c, x, 74, cw, 36, 18, C.line);
      tx(c, T(ch[i]), x + cw / 2, 92, CM ? 15 : 14, i === 0 ? C.text : C.muted, 600, 'center', null, cw - 14);
      if (CM) { x += cw + 8; }
    }
    var slide = ph(tm, 1200, 600);
    for (i = 0; i < rows.length + 1; i++) {
      r = i === 0 ? [T('src.site'), T('inbox.new'), S.name + ': ' + S.topic.toLowerCase(), T('now')] : [T(rows[i - 1][0]), T(rows[i - 1][1]), T(rows[i - 1][2]), rows[i - 1][3]];
      if (i === 0 && slide <= 0) { continue; }
      y = i === 0 ? (CM ? 130 : 134) : (CM ? 130 : 134) + (i - 1) * rs + slide * rs;
      if (y > H - (CM ? 70 : 60)) { continue; }
      a = i === 0 ? slide : 1;
      c.globalAlpha = a;
      fillRR(c, mg, y, W - 2 * mg, rh, 12, i === 0 ? C.s2 : C.s1);
      if (i === 0) { fillRR(c, mg, y + 10, 4, rh - 20, 2, C.accent); }
      strokeRR(c, mg, y, W - 2 * mg, rh, 12, C.line);
      if (CM) {
        fillRR(c, 34, y + 12, 92, 26, 13, C.s3);
        tx(c, r[0], 80, y + 25, 14, C.muted, 600, 'center', null, 82);
        tx(c, r[3], W - 32, y + 25, 15, C.faint, 500, 'right', MONO);
        tx(c, r[1], 34, y + 58, 18, C.text, 700, 'left', null, W - 68);
        tx(c, r[2], 34, y + 86, 16, C.muted, 500, 'left', null, W - 68);
        if (i === 0 && tm > 2800) {
          q = ph(tm, 2800, 400);
          c.globalAlpha = q;
          fillRR(c, 138, y + 12, 124, 26, 13, C.accent);
          tx(c, T('inbox.done'), 200, y + 25, 14, C.ink, 700, 'center', null, 112);
        }
      } else {
        fillRR(c, 44, y + 22, 92, 24, 12, C.s3);
        tx(c, r[0], 90, y + 34, 12, C.muted, 600, 'center', null, 80);
        tx(c, r[1], 156, y + 22, 16, C.text, 700, 'left', null, W - 156 - 220);
        tx(c, r[2], 156, y + 47, 14, C.muted, 500, 'left', null, W - 156 - 60);
        tx(c, r[3], W - 44, y + 22, 13, C.faint, 500, 'right', MONO);
        if (i === 0 && tm > 2800) {
          q = ph(tm, 2800, 400);
          c.globalAlpha = q;
          fillRR(c, W - 44 - 150, y + 38, 150, 24, 12, C.accent);
          tx(c, T('inbox.done'), W - 44 - 75, y + 50, 12, C.ink, 700, 'center', null, 136);
        }
      }
      c.globalAlpha = 1;
    }
    demoTag(c, W, H);
  }

  /* 3. Панель агента */
  function drawAgent(c, W, H, t) {
    var CM = W < 700;
    var acts = ['agent.a1', 'agent.a2', 'agent.a3', 'agent.a4', 'agent.a5'];
    var tm = LP(t, 9000), i, y, d, x, step = tm >= FIN ? 99 : Math.floor((tm - 500) / 1000);
    var aw = CM ? W - 40 : 500, ay = CM ? 128 : 172, ast = CM ? 52 : 66, ah = CM ? 46 : 54, as = CM ? 16 : 15, ax = CM ? 20 : 28;
    pick(t);
    chrome(c, W, H, T('win.agent'));
    fillRR(c, ax, CM ? 68 : 74, CM ? 200 : 190, CM ? 40 : 36, CM ? 20 : 18, C.s3);
    c.beginPath(); c.arc(ax + 24, CM ? 88 : 92, 5 + (t >= FIN ? 0 : Math.sin(tm / 260) * 1.5), 0, 6.2832); c.fillStyle = C.accent; c.fill();
    tx(c, T('agent.on'), ax + 38, CM ? 88 : 92, CM ? 16 : 14, C.text, 700, 'left', null, CM ? 150 : 140);
    if (!CM) { tx(c, T('agent.feed'), 32, 142, 13, C.faint, 500, 'left', MONO, 300); }
    for (i = 0; i < acts.length; i++) {
      y = ay + i * ast;
      var on = i <= step;
      fillRR(c, ax, y, aw, ah, 12, !on ? C.s1 : (i === step && t < FIN ? C.s3 : C.s2));
      strokeRR(c, ax, y, aw, ah, 12, C.line);
      if (on) {
        if (i < step || t >= FIN) { check(c, ax + 26, y + ah / 2, 12, C.ok); }
        else { c.beginPath(); c.arc(ax + 26, y + ah / 2, 11, tm / 180, tm / 180 + 4.2); c.strokeStyle = C.accent; c.lineWidth = 3; c.stroke(); }
      }
      if (CM) { tx2(c, T(acts[i]), ax + 54, y + ah / 2, as, on ? C.text : C.faint, on ? 600 : 500, aw - 66, 2, 19); }
      else { tx(c, T(acts[i]), 76, y + ah / 2, as, on ? C.text : C.faint, on ? 600 : 500, 'left', null, aw - 66); }
    }
    var f = [['agent.f1', S.topic], ['agent.f2', S.what], ['agent.f3', S.when], ['agent.f4', S.name]];
    if (CM) {
      fillRR(c, 20, 396, W - 40, 192, 16, C.s2);
      strokeRR(c, 20, 396, W - 40, 192, 16, C.line);
      tx(c, T('agent.got'), 38, 418, 14, C.faint, 500, 'left', MONO, W - 76);
      for (i = 0; i < f.length; i++) {
        x = 38 + (i % 2) * 168; y = 434 + Math.floor(i / 2) * 78;
        d = t >= FIN ? 1 : ph(tm, 1400 + i * 900, 400);
        tx(c, T(f[i][0]), x, y + 8, 15, C.muted, 500, 'left', null, 150);
        fillRR(c, x, y + 22, 154, 38, 9, C.bg);
        c.globalAlpha = d;
        tx(c, f[i][1], x + 10, y + 41, 16, C.text, 700, 'left', null, 136);
        c.globalAlpha = 1;
      }
    } else {
      fillRR(c, 560, 128, W - 560 - 28, 372, 16, C.s2);
      strokeRR(c, 560, 128, W - 560 - 28, 372, 16, C.line);
      tx(c, T('agent.got'), 584, 158, 13, C.faint, 500, 'left', MONO, W - 560 - 76);
      for (i = 0; i < f.length; i++) {
        y = 190 + i * 72;
        d = t >= FIN ? 1 : ph(tm, 1400 + i * 900, 400);
        tx(c, T(f[i][0]), 584, y + 8, 13, C.muted, 500, 'left', null, W - 584 - 52);
        fillRR(c, 584, y + 24, W - 584 - 52, 34, 9, C.bg);
        c.globalAlpha = d;
        tx(c, f[i][1], 598, y + 42, 15, C.text, 700, 'left', null, W - 584 - 80);
        c.globalAlpha = 1;
      }
    }
    demoTag(c, W, H);
  }

  /* 4. Документ */
  function drawDoc(c, W, H, t) {
    var CM = W < 700;
    var tm = LP(t, 9000), i, y, d, hw, px = CM ? 20 : 40, pw = CM ? W - 40 : 520;
    var fy = CM ? [116, 170, 224] : [300, 380, 460];
    pick(t);
    chrome(c, W, H, T('win.doc'));
    fillRR(c, px, CM ? 68 : 74, pw, CM ? 212 : 520, 8, '#eceae4');
    var inks = '#c4c1b8', lx = px + (CM ? 22 : 36);
    fillRR(c, lx, CM ? 84 : 100, CM ? 190 : 220, 14, 4, '#2c2f38');
    if (!CM) { for (i = 0; i < 4; i++) { fillRR(c, lx, 156 + i * 22, 420 - (i % 2) * 90, 8, 4, inks); } }
    var fl = [[T('doc.f1'), S.name], [T('doc.f2'), S.what], [T('doc.f3'), S.when]];
    var maxv = pw - (CM ? 56 : 90);
    for (i = 0; i < fl.length; i++) {
      y = fy[i];
      tx(c, fl[i][0], lx, y - 4, CM ? 14 : 13, '#6b6e78', 600, 'left', null, maxv);
      tx(c, fl[i][1], lx, y + 20, CM ? 19 : 18, '#1c1e25', 700, 'left', null, maxv);
      hw = Math.min(maxv, mw(c, fl[i][1], CM ? 19 : 18, 700)) + 14;
      d = t >= FIN ? 1 : ph(tm, 1000 + i * 1500, 500);
      c.globalAlpha = 0.9 * d;
      c.fillStyle = C.accent; c.globalCompositeOperation = 'multiply';
      c.fillRect(lx - 6, y + 6, hw * d, 28);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    if (!CM) { for (i = 0; i < 2; i++) { fillRR(c, lx, 520 + i * 22, 380 - i * 110, 8, 4, inks); } }
    var rx = CM ? 20 : 600, rw = CM ? W - 40 : W - 600 - 32;
    tx(c, T('doc.fields'), rx + (CM ? 4 : 0), CM ? 302 : 100, CM ? 14 : 13, C.faint, 500, 'left', MONO, rw);
    for (i = 0; i < 3; i++) {
      y = CM ? 320 + i * 74 : 130 + i * 110;
      d = t >= FIN ? 1 : ph(tm, 1500 + i * 1500, 500);
      fillRR(c, rx, y, rw, CM ? 66 : 92, 14, C.s2);
      strokeRR(c, rx, y, rw, CM ? 66 : 92, 14, C.line);
      tx(c, fl[i][0], rx + (CM ? 20 : 24), y + (CM ? 21 : 28), CM ? 14 : 13, C.muted, 500, 'left', null, rw - 90);
      c.globalAlpha = d;
      tx(c, fl[i][1], rx + (CM ? 20 : 24), y + (CM ? 45 : 62), CM ? 18 : 17, C.text, 700, 'left', null, rw - 90);
      check(c, rx + rw - (CM ? 32 : 36), y + (CM ? 33 : 46), 13, C.ok);
      c.globalAlpha = 1;
    }
    var by = CM ? 550 : 466;
    fillRR(c, rx, by, rw, CM ? 50 : 52, 12, C.accent);
    tx(c, T('doc.write'), rx + rw / 2, by + (CM ? 25 : 26), CM ? 16 : 15, C.ink, 700, 'center', null, rw - 24);
    demoTag(c, W, H);
  }

  /* 5. CRM, канбан. Карточки-наполнители берут настоящие заявки из соседних сценариев */
  function drawCrm(c, W, H, t) {
    var CM = W < 700;
    var cols = ['crm.c1', 'crm.c2', 'crm.c3', 'crm.c4'], i, j, x, y, cw = CM ? 169 : 226, tm = LP(t, 11000), o, kk = 1;
    var nc = CM ? 2 : 4, cnt = CM ? [3, 3] : [2, 3, 2, 3], rs = CM ? 112 : 104, ch = CM ? 104 : 92, g0 = CM ? 20 : 24;
    pick(t);
    chrome(c, W, H, T('win.crm'));
    if (CM) { fillRR(c, 20, 66, W - 40, 38, 19, C.s1); strokeRR(c, 20, 66, W - 40, 38, 19, C.line); tx(c, T('crm.search'), 42, 86, 16, C.faint, 500, 'left', null, W - 90); }
    else { fillRR(c, W - 260, 70, 232, 34, 17, C.s1); strokeRR(c, W - 260, 70, 232, 34, 17, C.line); tx(c, T('crm.search'), W - 238, 87, 13, C.faint, 500, 'left', null, 200); }
    for (i = 0; i < nc; i++) {
      x = g0 + i * (cw + 12);
      fillRR(c, x, 118, cw, H - 118 - 56, 14, C.bg);
      tx(c, T(cols[i]), x + 14, 142, CM ? 16 : 14, C.text, 700, 'left', null, cw - 28);
      for (j = 0; j < cnt[i]; j++) {
        y = 168 + j * rs;
        if (i === 0 && j === 0) { y = 168 + rs; }
        if (CM && i === 0 && j === 2) { y = 168 + 2 * rs; }
        if (y + ch > H - 62) { continue; }
        fillRR(c, x + 10, y, cw - 20, ch, 12, C.s2);
        strokeRR(c, x + 10, y, cw - 20, ch, 12, C.line);
        o = other(kk); kk = kk % 5 + 1;
        if (CM) {
          tx2(c, o.title, x + 22, y + 32, 16, C.text, 700, cw - 44, 2, 19);
          tx2(c, o.sub, x + 22, y + ch - 22, 14, C.muted, 500, cw - 44, 1, 17);
        } else {
          tx(c, o.title, x + 26, y + 26, 14, C.text, 700, 'left', null, cw - 52);
          tx(c, o.sub, x + 26, y + 52, 13, C.muted, 500, 'left', null, cw - 52);
          fillRR(c, x + 26, y + 66, 54, 14, 7, C.s3);
        }
      }
    }
    var show = t >= FIN ? 1 : ph(tm, 800, 500);
    var mv = t >= FIN ? 1 : ph(tm, 2800, 1400);
    var cx0 = g0 + 10, cx1 = g0 + (cw + 12) + 10;
    var cx = cx0 + (cx1 - cx0) * mv, cy = 168 - (1 - show) * 24;
    var lift = Math.sin(mv * 3.1416) * 8, tw = cw - 20 - (CM ? 28 : 36);
    if (show > 0) {
      c.globalAlpha = show;
      fillRR(c, cx, cy - lift, cw - 20, ch, 12, C.s3);
      strokeRR(c, cx, cy - lift, cw - 20, ch, 12, C.accent);
      fillRR(c, cx, cy - lift + 12, 4, ch - 24, 2, C.accent);
      if (CM) {
        tx2(c, S.title, cx + 16, cy - lift + 30, 16, C.text, 700, tw, 2, 19);
        tx2(c, S.sub, cx + 16, cy - lift + 62, 14, C.muted, 500, tw, 1, 17);
        var bw2 = mw(c, T('crm.agent'), 13, 700) + 20;
        fillRR(c, cx + 16, cy - lift + 76, bw2, 20, 10, C.accent);
        tx(c, T('crm.agent'), cx + 16 + bw2 / 2, cy - lift + 86, 13, C.ink, 700, 'center');
      } else {
        tx(c, S.title, cx + 18, cy - lift + 26, 14, C.text, 700, 'left', null, tw);
        tx(c, S.sub, cx + 18, cy - lift + 50, 13, C.muted, 500, 'left', null, tw);
        var bw = Math.max(70, mw(c, T('crm.agent'), 11, 700) + 22);
        fillRR(c, cx + 18, cy - lift + 64, bw, 18, 9, C.accent);
        tx(c, T('crm.agent'), cx + 18 + bw / 2, cy - lift + 73, 11, C.ink, 700, 'center');
      }
      c.globalAlpha = 1;
    }
    var ta = t >= FIN ? 1 : ph(tm, 4700, 400) * (1 - ph(tm, 9600, 500));
    if (ta > 0) {
      var tgw = CM ? 320 : 300, tgx = CM ? (W - tgw) / 2 : W - 300, tgy = H - 118 + (1 - ta) * 16;
      c.globalAlpha = ta;
      fillRR(c, tgx, tgy, tgw, 54, 14, C.text);
      check(c, tgx + 30, tgy + 27, 12, C.ok);
      tx(c, T('crm.created'), tgx + 54, tgy + 27, CM ? 17 : 15, C.bg, 700, 'left', null, tgw - 70);
      c.globalAlpha = 1;
    }
    demoTag(c, W, H);
  }

  /* 6. Телефон с уведомлением */
  function drawPhoneW(c, W, H, t) {
    var tm = LP(t, 8000), i, a, y, k, ls;
    pick(t);
    c.clearRect(0, 0, W, H);
    fillRR(c, 0, 0, W, H, 54, C.bg);
    strokeRR(c, 0, 0, W, H, 54, C.line);
    tx(c, T('phone.day'), W / 2, 118, 18, C.muted, 600, 'center', null, W - 60);
    tx(c, '10:42', W / 2, 190, 88, C.text, 700, 'center');
    var n = [['Molxo CRM', T('phone.new'), S.note, 800], [T('win.chat'), T('phone.reply'), S.c2, 2400]];
    for (i = 0; i < n.length; i++) {
      a = t >= FIN ? 1 : ph(tm, n[i][3], 500);
      if (i === 1 && tm < FIN && tm > 6800) { a *= 1 - ph(tm, 6800, 400); }
      y = 300 + i * 190 + (1 - a) * 30;
      c.globalAlpha = a;
      fillRR(c, 28, y, W - 56, 170, 26, C.s2);
      strokeRR(c, 28, y, W - 56, 170, 26, i === 0 ? C.accent : C.line);
      fillRR(c, 52, y + 24, 36, 36, 10, i === 0 ? C.accent : C.s3);
      tx(c, i === 0 ? 'M' : 'T', 70, y + 43, 18, i === 0 ? C.ink : C.muted, 700, 'center');
      tx(c, n[i][0], 102, y + 36, 15, C.muted, 600, 'left', null, 170);
      tx(c, T('now'), W - 52, y + 36, 13, C.faint, 500, 'right', MONO);
      tx(c, n[i][1], 52, y + 88, 22, C.text, 700, 'left', null, W - 56 - 48);
      ls = wrap(c, n[i][2], W - 56 - 48, 17, 500);
      for (k = 0; k < ls.length && k < 2; k++) {
        tx(c, (k === 1 && ls.length > 2) ? ls[k] + '…' : ls[k], 52, y + 122 + k * 24, 17, C.muted, 500, 'left', null, W - 56 - 48);
      }
      c.globalAlpha = 1;
    }
    fillRR(c, W / 2 - 60, H - 24, 120, 5, 3, C.s3);
    tx(c, T('demo'), W / 2, H - 56, 12, C.faint, 500, 'center', MONO, W - 40);
  }

  /* 6б. Телефон, компактный макет 360x720 (кегль крупнее) */
  function drawPhoneC(c, W, H, t) {
    var CM = true;
    var tm = LP(t, 8000), i, a, y, k, ls, pad = CM ? 20 : 28, nh = CM ? 168 : 170, ns = CM ? 182 : 190, bs = CM ? 18 : 17;
    pick(t);
    c.clearRect(0, 0, W, H);
    fillRR(c, 0, 0, W, H, CM ? 44 : 54, C.bg);
    strokeRR(c, 0, 0, W, H, CM ? 44 : 54, C.line);
    tx(c, T('phone.day'), W / 2, CM ? 104 : 118, CM ? 19 : 18, C.muted, 600, 'center', null, W - 60);
    tx(c, '10:42', W / 2, CM ? 170 : 190, CM ? 78 : 88, C.text, 700, 'center');
    var n = [['Molxo CRM', T('phone.new'), S.note, 800], [T('win.chat'), T('phone.reply'), S.c2, 2400]];
    for (i = 0; i < n.length; i++) {
      a = t >= FIN ? 1 : ph(tm, n[i][3], 500);
      if (i === 1 && tm < FIN && tm > 6800) { a *= 1 - ph(tm, 6800, 400); }
      y = (CM ? 252 : 300) + i * ns + (1 - a) * 30;
      c.globalAlpha = a;
      fillRR(c, pad, y, W - pad * 2, nh, 26, C.s2);
      strokeRR(c, pad, y, W - pad * 2, nh, 26, i === 0 ? C.accent : C.line);
      fillRR(c, pad + 22, y + 22, 36, 36, 10, i === 0 ? C.accent : C.s3);
      tx(c, i === 0 ? 'M' : 'T', pad + 40, y + 41, 18, i === 0 ? C.ink : C.muted, 700, 'center');
      tx(c, n[i][0], pad + 72, y + 34, CM ? 17 : 15, C.muted, 600, 'left', null, CM ? 150 : 170);
      tx(c, T('now'), W - pad - 22, y + 34, CM ? 15 : 13, C.faint, 500, 'right', MONO);
      tx(c, n[i][1], pad + 22, y + 86, CM ? 23 : 22, C.text, 700, 'left', null, W - pad * 2 - 44);
      ls = wrap(c, n[i][2], W - pad * 2 - 44, bs, 500);
      for (k = 0; k < ls.length && k < 2; k++) {
        tx(c, (k === 1 && ls.length > 2) ? ls[k] + '…' : ls[k], pad + 22, y + 120 + k * (bs + 6), bs, C.muted, 500, 'left', null, W - pad * 2 - 44);
      }
      c.globalAlpha = 1;
    }
    fillRR(c, W / 2 - 60, H - 24, 120, 5, 3, C.s3);
    tx(c, T('demo'), W / 2, H - 52, CM ? 14 : 12, C.faint, 500, 'center', MONO, W - 40);
  }

  var LIST = [
    { id: 'chat', W: 1024, H: 640, ww: 4.8, wh: 3.0, pos: [0, 0, 0], ry: 0, draw: drawChat },
    { id: 'inbox', W: 1024, H: 640, ww: 4.4, wh: 2.75, pos: [-4.7, 0.5, -3.2], ry: 0.34, draw: drawInbox },
    { id: 'agent', W: 1024, H: 640, ww: 4.6, wh: 2.875, pos: [0.3, -0.1, -7], ry: -0.06, draw: drawAgent },
    { id: 'doc', W: 1024, H: 640, ww: 4.4, wh: 2.75, pos: [4.7, 0.3, -9.6], ry: -0.36, draw: drawDoc },
    { id: 'crm', W: 1024, H: 640, ww: 5.4, wh: 3.375, pos: [0, 0, -13.5], ry: 0, draw: drawCrm },
    { id: 'phone', W: 480, H: 960, ww: 1.9, wh: 3.8, pos: [0.1, -0.1, -18.2], ry: 0, draw: function (c, W, H, t) { if (W < 400) { drawPhoneC(c, W, H, t); } else { drawPhoneW(c, W, H, t); } } }
  ];
  /* компактный макет для вертикальных экранов: окно уже и выше (390x640), кегль не меньше 16 */
  function setMode(compact) {
    LIST.forEach(function (d) {
      if (d.id === 'phone') { d.W = compact ? 360 : 480; d.H = compact ? 720 : 960; return; }
      d.W = compact ? 390 : 1024;
      d.H = compact ? 640 : 640;
      d.wh = d.ww * d.H / d.W;
    });
    w.MXW.compact = !!compact;
  }

  w.MXW = {
    FIN: FIN, period: 0, list: LIST, compact: false, setMode: setMode,
    paint: function (cv, def, t, scale) {
      var c = cv.getContext('2d');
      c.setTransform(scale, 0, 0, scale, 0, 0);
      def.draw(c, def.W, def.H, t);
    }
  };
}(window));
