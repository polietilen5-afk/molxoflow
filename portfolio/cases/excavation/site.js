/* The contractor website inside the browser frame: 11 pages, live estimate configurator, request form.
   Type-led design: giant headlines, colour blocks, marquee, sticky service column, dark step list, project lane, receipt.
   Rendering is string based, events are delegated, scroll effects read the scroll container of the frame. */
(function (w) {
  'use strict';
  var EX = w.EX, t = EX.t, esc = EX.esc, $ = EX.$, S = EX.S, doc = w.document;
  var site = EX.site = {};
  var P = { page: 'home', svc: 'pit', menu: false, from: 'home', projFilter: 'all', areaQ: '', thanks: null, faqOpen: {}, chk: {} };
  var W = { type: 'pit', size: 60, acc: 'open', tim: 'month', extras: [], name: '', contact: '', area: '', note: '', consent: false, err: null };
  var F = { name: '', contact: '', area: '', service: '', note: '', consent: false, err: null };
  site.P = P; site.W = W;

  var TICK = [['pit', 60, 'open', 'month'], ['trench', 40, 'tight', 'flex'], ['grade', 600, 'hard', 'urgent'], ['drive', 120, 'open', 'month'], ['demo', 60, 'tight', 'month']];
  var PHEAD = { services: 'hot', service: 'ink', projects: 'lime', equipment: 'paper', areas: 'hot', process: 'ink', pricing: 'lime', faq: 'hot', guide: 'paper', contact: 'lime', thanks: 'lime' };
  var NAV = ['services', 'projects', 'process', 'pricing', 'areas'];

  function reduced() { return !!(w.PF && w.PF.reduced); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function go(a, v) { return '<a href="#" data-go="' + a + '"' + (v ? ' data-v="' + v + '"' : '') + '>'; }
  function ar() { return '<span class="ar" aria-hidden="true">→</span>'; }
  function btn(label, goto, v, cls) { return '<a href="#" class="wbtn ' + (cls || '') + '" data-go="' + goto + '"' + (v ? ' data-v="' + v + '"' : '') + '><span>' + esc(label) + '</span>' + ar() + '</a>'; }
  var SIMG = { pit: 'basement-dig', trench: 'trenching', grade: 'residential-grading', drive: 'driveway', demo: 'concrete', add: 'land-clearing' };
  /* fixed 16:9 frame (width/height attributes + aspect-ratio) so nothing jumps while the file loads */
  function pic(name, cls, eager) {
    return '<figure class="ph' + (cls ? ' ' + cls : '') + '"><img src="img/' + name + '.webp" width="960" height="540" alt="' + esc(t('img.' + name)) + '" decoding="async"' + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + '></figure>';
  }
  function pgName(p) { return t('pg.' + p + '.nav'); }
  function sName(s) { return t('sv.' + s + '.n'); }
  function unit(s) { return EX.SERV[s].unit; }
  function words(text, cls) {
    var a = String(text).split(' '), i, h = '';
    for (i = 0; i < a.length; i++) h += '<span class="' + (cls || 'wd') + '" style="--i:' + i + '">' + esc(a[i]) + '</span> ';
    return h;
  }

  /* ---------- header / footer / shared blocks ---------- */
  function header() {
    var i, h = '<header class="w-head"><a href="#" class="w-brand" data-go="home"><b>' + esc(t('site.brand.a')) + '</b><span>' + esc(t('site.brand.b')) + '</span></a>';
    h += '<nav class="w-nav' + (P.menu ? ' open' : '') + '" id="wNav" aria-label="' + esc(t('site.nav')) + '">';
    for (i = 0; i < NAV.length; i++) h += '<a href="#" data-go="' + NAV[i] + '"' + (P.page === NAV[i] || (NAV[i] === 'services' && P.page === 'service') ? ' aria-current="page"' : '') + '><span>' + esc(pgName(NAV[i])) + '</span></a>';
    h += '<a href="#" class="wbtn hot sm" data-go="contact" data-v="nav"><span>' + esc(t('site.cta')) + '</span>' + ar() + '</a></nav>';
    h += '<button type="button" class="w-burger" data-act="menu" aria-expanded="' + P.menu + '" aria-controls="wNav" aria-label="' + esc(t('site.menu')) + '"><span></span><span></span><span></span></button><i class="w-pg" id="wPg"></i></header>';
    return h;
  }
  function footer() {
    return '<footer class="w-foot"><div class="w-foot-g"><div><p class="w-brand"><b>' + esc(t('site.brand.a')) + '</b><span>' + esc(t('site.brand.b')) + '</span></p><p class="w-fsm">' + esc(t('foot.about')) + '</p></div>' +
      '<div><h4>' + esc(t('foot.company')) + '</h4><ul><li>' + go('equipment') + esc(pgName('equipment')) + '</a></li><li>' + go('faq') + esc(pgName('faq')) + '</a></li><li>' + go('guide') + esc(pgName('guide')) + '</a></li><li>' + go('process') + esc(pgName('process')) + '</a></li></ul></div>' +
      '<div><h4>' + esc(t('foot.contact')) + '</h4><ul><li>+0 000 000-00-00</li><li>office@example.test</li><li>' + esc(t('foot.hours')) + '</li></ul></div></div>' +
      '<p class="w-mark" aria-hidden="true">' + esc(t('site.brand.a')) + '</p><p class="w-fsm w-legal">' + esc(t('foot.legal')) + ' ' + esc(t('img.note')) + '</p></footer>';
  }
  function crumbs(cur, extra) {
    return '<nav class="w-crumbs" aria-label="' + esc(t('site.crumbs')) + '">' + go('home') + esc(pgName('home')) + '</a><i>/</i>' + (extra ? go('services') + esc(pgName('services')) + '</a><i>/</i>' : '') + '<span>' + esc(cur) + '</span></nav>';
  }
  function pagehead(cur, extra, eye, h1, lead) {
    return '<section class="w-pagehead ph-' + PHEAD[P.page] + '"><div class="w-in">' + crumbs(cur, extra) + (eye ? '<p class="w-eye">' + esc(eye) + '</p>' : '') +
      '<h1 class="ph-h" aria-label="' + esc(h1) + '"><span aria-hidden="true">' + wordsMasked(h1) + '</span></h1>' + (lead ? '<p class="w-lead">' + esc(lead) + '</p>' : '') + '</div></section>';
  }
  function wordsMasked(text) {
    var a = String(text).split(' '), i, h = '';
    for (i = 0; i < a.length; i++) h += '<span class="hw"><span style="--i:' + i + '">' + esc(a[i]) + '</span></span> ';
    return h;
  }
  function band(title, text, label, goto, v) {
    return '<section class="w-band"><div class="w-in"><h2 class="rv">' + esc(title) + '</h2><div class="bd-r rv"><p>' + esc(text) + '</p>' + btn(label, goto, v, 'hot') + '</div></div></section>';
  }
  function contactBand() {
    return '<section class="cband"><div class="w-in"><h2 class="cb-h rv">' + esc(t('ctb.h')) + '</h2><p class="cb-ph rv" aria-label="' + esc(t('ct.phone')) + '">+0 000 000-00-00</p>' +
      '<div class="cb-g rv"><div><p>' + esc(t('ctb.p')) + '</p>' + btn(t('site.cta'), 'contact', 'home', '') + '</div>' +
      '<dl><div><dt>' + esc(t('ct.mail')) + '</dt><dd>office@example.test</dd></div><div><dt>' + esc(t('ct.hours')) + '</dt><dd>' + esc(t('foot.hours')) + '</dd></div></dl></div></div></section>';
  }

  /* ---------- home ---------- */
  function marquee() {
    var i, set = '';
    for (i = 0; i < EX.SERV_IDS.length; i++) set += '<span>' + esc(sName(EX.SERV_IDS[i])) + '</span><i></i>' + (i < 4 ? '<span class="o">' + esc(t('pr.' + (i + 1) + '.h')) + '</span><i></i>' : '');
    return '<div class="w-marq" aria-hidden="true"><div class="mq-trk"><div class="mq-set">' + set + '</div><div class="mq-set dup">' + set + '</div></div></div>';
  }
  function tickText(k) {
    var a = TICK[k], e = EX.estimate(a[0], a[1], a[2], a[3]);
    return { job: sName(a[0]) + ' · ' + a[1] + ' ' + unit(a[0]), lo: e.lo, hi: e.hi };
  }
  function projCard(n, k) {
    var s = ['pit', 'drive', 'trench', 'demo'][n - 1], a = ['north', 'east', 'harbor', 'west'][n - 1];
    return '<article class="pcard pc' + ((k || n - 1) % 4) + '">' + pic(SIMG[s], 'pc-ph') + '<div class="pc-body"><div class="pc-top"><span class="pc-n">' + pad(n) + '</span><p class="w-eye">' + esc(sName(s)) + ' · ' + esc(EX.area(a).name) + '</p></div><h3>' + esc(t('pj.' + n + '.h')) + '</h3><dl class="w-facts"><div><dt>' + esc(t('pj.challenge')) + '</dt><dd>' + esc(t('pj.' + n + '.c')) + '</dd></div><div><dt>' + esc(t('pj.approach')) + '</dt><dd>' + esc(t('pj.' + n + '.a')) + '</dd></div><div><dt>' + esc(t('pj.outcome')) + '</dt><dd>' + esc(t('pj.' + n + '.o')) + '</dd></div></dl></div></article>';
  }
  function procBlock(head) {
    var i, h = '<section class="proc"><div class="w-in"><p class="w-eye">05 ' + esc(t('num.3')) + '</p><h2 class="proc-h rv">' + esc(head) + '</h2><ol class="pr-l">';
    for (i = 1; i <= 5; i++) h += '<li class="pr rv"><span class="pn" aria-hidden="true">' + pad(i) + '</span><div class="pt"><h3>' + esc(t('ps.' + i + '.h')) + '</h3><p>' + esc(t('ps.' + i + '.p')) + '</p></div></li>';
    return h + '</ol></div></section>';
  }
  function pHome() {
    var i, s, k = t('home.rot').split('|'), t0 = tickText(0), h = '';
    h += '<section class="w-hero" id="heroS"><div class="w-in hero-in"><div class="hero-g"><div class="hero-l"><p class="hero-meta"><span>' + esc(t('home.eye')) + '</span></p>';
    h += '<h1 class="hero-h" aria-label="' + esc(t('home.h1')) + '"><span class="ln" aria-hidden="true" style="--i:0"><span class="ln-i">' + esc(t('home.l1')) + '</span></span>' +
      '<span class="ln rot" aria-hidden="true" style="--i:1"><span class="ln-i" id="rotBox">';
    for (i = 0; i < k.length; i++) h += '<span class="rw' + (i === 0 ? ' on' : '') + '">' + esc(k[i]) + '</span>';
    h += '</span></span><span class="ln" aria-hidden="true" style="--i:2"><span class="ln-i">' + esc(t('home.l3')) + '</span></span></h1>';
    h += '<p class="w-lead">' + esc(t('home.lead')) + '</p><div class="w-row">' + btn(t('home.cta1'), 'pricing', 'home', 'hot') + btn(t('home.cta2'), 'contact', 'home', 'ghost') + '</div></div>';
    h += '<div class="hero-r">' + pic('hero-excavator', 'hero-ph', true);
    h += '<div class="tick" role="img" aria-label="' + esc(t('tick.k')) + '"><p class="tk"><i></i>' + esc(t('tick.k')) + '</p><p class="tj" id="tkJob">' + esc(t0.job) + '</p><p class="tv"><span id="tkLo">' + EX.fmt(t0.lo) + '</span> – <span id="tkHi">' + EX.fmt(t0.hi) + '</span></p><p class="tu">' + esc(t('est.u')) + '</p></div></div></div></div></section>';
    h += marquee();

    h += '<section class="w-sec pick"><div class="w-in"><div class="pick-h rv"><h2>' + esc(t('quick.h')) + '</h2><p class="w-lead">' + esc(t('quick.p')) + '</p></div><form data-form="quick" novalidate><div class="pick-g" role="radiogroup" aria-label="' + esc(t('quick.h')) + '">';
    for (i = 0; i < EX.SERV_IDS.length; i++) { s = EX.SERV_IDS[i]; h += '<button type="button" role="radio" class="tile rv" style="--d:' + (i * 70) + 'ms" aria-checked="' + (W.type === s) + '" data-quick="' + s + '"><span class="n">' + pad(i + 1) + '</span><span class="nm">' + esc(sName(s)) + '</span><span class="u">' + esc(t('per', { unit: unit(s) })) + '</span>' + ar() + '</button>'; }
    h += '</div><div class="pick-go rv"><button type="submit" class="wbtn hot"><span>' + esc(t('quick.go')) + '</span>' + ar() + '</button></div></form></div></section>';

    var nums = [['num.1', 5], ['num.2', EX.AREAS.length], ['num.3', 5], ['num.4', 1]];
    h += '<section class="facts"><div class="w-in"><ul class="fx">';
    for (i = 0; i < nums.length; i++) h += '<li class="rv" style="--d:' + (i * 90) + 'ms"><b class="cnt" data-to="' + nums[i][1] + '">' + nums[i][1] + '</b><span>' + esc(t(nums[i][0])) + '</span></li>';
    h += '</ul></div></section>';

    h += '<section class="w-sec svs"><div class="w-in svs-g"><div class="svs-l"><div class="svs-s"><h2 class="rv">' + esc(t('home.svc')) + '</h2><p class="w-fsm rv">' + esc(t('home.svc.p')) + '</p><ol class="svs-nav">';
    for (i = 0; i < EX.SERV_IDS.length; i++) h += '<li><button type="button" data-sv="' + i + '"' + (i === 0 ? ' aria-current="true"' : '') + '><span class="n">' + pad(i + 1) + '</span><span class="nm">' + esc(sName(EX.SERV_IDS[i])) + '</span></button></li>';
    h += '</ol>' + go('services') + '<span>' + esc(t('home.all')) + '</span>' + ar() + '</a></div></div><div class="svs-r">';
    for (i = 0; i < EX.SERV_IDS.length; i++) {
      s = EX.SERV_IDS[i];
      h += '<article class="svc c' + i + ' rv" data-svc="' + i + '">' + pic(SIMG[s], 'sv-ph') + '<div class="sv-body"><div class="sv-top"><span class="sv-n">' + pad(i + 1) + '</span><span class="sv-u">' + esc(t('per', { unit: unit(s) })) + '</span></div><h3>' + esc(sName(s)) + '</h3><p class="sv-p">' + esc(t('sv.' + s + '.p')) + '</p><ul class="w-tick">';
      for (var j = 1; j <= 3; j++) h += '<li><i aria-hidden="true">✓</i>' + esc(t('sv.' + s + '.i' + j)) + '</li>';
      h += '</ul><div class="sv-act">' + btn(t('svc.open'), 'service', s, 'light') + '<a href="#" class="sv-lnk" data-go="pricing" data-v="home" data-pre="' + s + '"><span>' + esc(t('svc.est')) + '</span>' + ar() + '</a></div></div></article>';
    }
    h += '</div></div></section>';

    h += procBlock(t('home.how'));

    h += '<section class="w-sec lane-s"><div class="w-in"><div class="lane-h"><h2 class="rv">' + esc(t('home.proj')) + '</h2><div class="lane-c"><button type="button" class="ln-b" data-lane="-1" aria-label="' + esc(t('proj.prev')) + '">←</button><button type="button" class="ln-b" data-lane="1" aria-label="' + esc(t('proj.next')) + '">→</button></div></div></div>';
    h += '<div class="lane" id="lane" tabindex="0" role="group" aria-label="' + esc(t('home.proj')) + '">' + projCard(1) + projCard(2) + projCard(3) + projCard(4) + '</div><div class="w-in"><p class="w-fsm lane-hint">' + esc(t('proj.hint')) + ' ' + go('projects') + esc(t('home.all')) + '</a></p></div></section>';

    h += '<section class="quote"><div class="w-in"><p class="w-eye rv">' + esc(t('home.q.by')) + '</p><blockquote class="bq" id="bq">' + words(t('home.q'), 'qw') + '</blockquote><ul class="prom">';
    for (i = 1; i <= 4; i++) h += '<li class="rv" style="--d:' + (i * 80) + 'ms"><b>' + esc(t('pr.' + i + '.h')) + '</b><span>' + esc(t('pr.' + i + '.p')) + '</span></li>';
    h += '</ul></div></section>';

    h += '<section class="w-sec faq-s"><div class="w-in w-narrow"><div class="w-sh"><h2 class="rv">' + esc(t('home.faq')) + '</h2>' + go('faq') + '<span>' + esc(t('home.all')) + '</span>' + ar() + '</a></div>' + faqList(3) + '</div></section>';
    h += contactBand();
    return h;
  }

  /* ---------- inner pages ---------- */
  function pServices() {
    var i, j, s, h = pagehead(pgName('services'), false, '', t('pg.services.h1'), t('pg.services.p')) + '<section class="w-sec"><div class="w-in"><div class="w-cards2">';
    for (i = 0; i < EX.SERV_IDS.length; i++) {
      s = EX.SERV_IDS[i];
      h += '<article class="svc c' + i + ' rv" style="--d:' + (i % 2 * 80) + 'ms">' + pic(SIMG[s], 'sv-ph') + '<div class="sv-body"><div class="sv-top"><span class="sv-n">' + pad(i + 1) + '</span><span class="sv-u">' + esc(t('basis', { unit: unit(s) })) + '</span></div><h2>' + esc(sName(s)) + '</h2><p class="sv-p">' + esc(t('sv.' + s + '.s')) + '</p><ul class="w-tick">';
      for (j = 1; j <= 3; j++) h += '<li><i aria-hidden="true">✓</i>' + esc(t('sv.' + s + '.i' + j)) + '</li>';
      h += '</ul><div class="sv-act">' + btn(t('svc.open'), 'service', s, 'light') + '</div></div></article>';
    }
    h += '<article class="svc c5 rv">' + pic(SIMG.add, 'sv-ph') + '<div class="sv-body"><div class="sv-top"><span class="sv-n">+</span></div><h2>' + esc(t('addons.h')) + '</h2><ul class="w-tick">';
    for (j = 1; j <= 4; j++) h += '<li><i aria-hidden="true">✓</i>' + esc(t('addons.' + j)) + '</li>';
    h += '</ul><div class="sv-act">' + btn(t('site.cta'), 'contact', 'services', 'hot') + '</div></div></article></div></div></section>';
    return h + contactBand();
  }
  function pService() {
    var s = P.svc, i, h = pagehead(sName(s), true, t('per', { unit: unit(s) }), sName(s), t('sv.' + s + '.p'));
    h += '<section class="w-sec"><div class="w-in w-two"><div>' + pic(SIMG[s], 'wide-ph rv') + '<h2 class="rv">' + esc(t('svc.incl')) + '</h2><ul class="w-tick big">';
    for (i = 1; i <= 3; i++) h += '<li class="rv" style="--d:' + (i * 70) + 'ms"><i aria-hidden="true">✓</i>' + esc(t('sv.' + s + '.i' + i)) + '</li>';
    h += '</ul><h2 class="rv">' + esc(t('svc.know')) + '</h2><ul class="w-dots">';
    for (i = 1; i <= 2; i++) h += '<li class="rv">' + esc(t('sv.' + s + '.k' + i)) + '</li>';
    h += '</ul><h2 class="rv">' + esc(t('svc.other')) + '</h2><div class="w-chips">';
    for (i = 0; i < EX.SERV_IDS.length; i++) if (EX.SERV_IDS[i] !== s) h += '<a href="#" class="w-chip" data-go="service" data-v="' + EX.SERV_IDS[i] + '">' + esc(sName(EX.SERV_IDS[i])) + '</a>';
    h += '</div></div><aside class="w-side rv"><h3>' + esc(t('svc.side')) + '</h3><dl><div><dt>' + esc(t('svc.basis')) + '</dt><dd>' + esc(t('per', { unit: unit(s) })) + '</dd></div><div><dt>' + esc(t('svc.visit')) + '</dt><dd>' + esc(t('svc.visit.v')) + '</dd></div><div><dt>' + esc(t('svc.reply')) + '</dt><dd>' + esc(t('svc.reply.v')) + '</dd></div></dl>' +
      '<a href="#" class="wbtn hot block" data-go="pricing" data-v="service" data-pre="' + s + '"><span>' + esc(t('svc.est')) + '</span>' + ar() + '</a><a href="#" class="wbtn light block" data-go="contact" data-v="service" data-pre="' + s + '"><span>' + esc(t('svc.ask')) + '</span>' + ar() + '</a></aside></div></section>';
    return h;
  }
  function projGrid() {
    var i, h = '', types = ['pit', 'drive', 'trench', 'demo'], shown = 0;
    for (i = 1; i <= 4; i++) if (P.projFilter === 'all' || P.projFilter === types[i - 1]) { h += projCard(i, shown); shown++; }
    if (!shown) h += '<p class="w-empty">' + esc(t('pj.none')) + '</p>';
    return h;
  }
  function pProjects() {
    var i, h = pagehead(pgName('projects'), false, '', t('pg.projects.h1'), t('pg.projects.p')) + '<section class="w-sec"><div class="w-in"><div class="w-chips" role="group" aria-label="' + esc(t('pj.filter')) + '">';
    h += '<button type="button" class="w-chip" aria-pressed="' + (P.projFilter === 'all') + '" data-pf="all">' + esc(t('all')) + '</button>';
    for (i = 0; i < EX.SERV_IDS.length; i++) h += '<button type="button" class="w-chip" aria-pressed="' + (P.projFilter === EX.SERV_IDS[i]) + '" data-pf="' + EX.SERV_IDS[i] + '">' + esc(sName(EX.SERV_IDS[i])) + '</button>';
    return h + '</div><div class="w-cards2 pj-grid" id="projGrid">' + projGrid() + '</div></div></section>' + contactBand();
  }
  function pEquipment() {
    var ids = ['mini', 'loader', 'breaker', 'tipper', 'laser'], i, j, h = pagehead(pgName('equipment'), false, '', t('pg.equipment.h1'), t('pg.equipment.p')) + '<section class="w-sec"><div class="w-in"><div class="pair">' + pic('skid-steer', 'rv') + pic('land-clearing', 'rv') + '</div><ul class="w-eq">';
    for (i = 0; i < ids.length; i++) {
      h += '<li class="rv"><span class="eq-n">' + pad(i + 1) + '</span><h2>' + esc(t('eq.' + ids[i] + '.n')) + '</h2><dl class="w-facts row">';
      for (j = 1; j <= 3; j++) h += '<div><dt>' + esc(t('eq.f' + j)) + '</dt><dd>' + esc(t('eq.' + ids[i] + '.' + j)) + '</dd></div>';
      h += '</dl></li>';
    }
    return h + '</ul><p class="w-fsm">' + esc(t('eq.note')) + '</p></div></section>' + contactBand();
  }
  function areaLists() {
    var g, i, n, q = P.areaQ.toLowerCase(), h = '';
    for (g = 1; g <= 2; g++) {
      h += '<div><h2>' + esc(t('area.g' + g)) + '</h2><p class="w-fsm">' + esc(t('area.g' + g + '.p')) + '</p><ul class="w-arealist">';
      n = 0;
      for (i = 0; i < EX.AREAS.length; i++) if (EX.AREAS[i].g === g && EX.AREAS[i].name.toLowerCase().indexOf(q) >= 0) { n++; h += '<li><span>' + esc(EX.AREAS[i].name) + '</span><a href="#" data-go="contact" data-v="areas" data-area="' + EX.AREAS[i].id + '"><span>' + esc(t('area.ask')) + '</span>' + ar() + '</a></li>'; }
      if (!n) h += '<li class="w-empty">' + esc(t('area.none')) + '</li>';
      h += '</ul></div>';
    }
    return h;
  }
  function pAreas() {
    return pagehead(pgName('areas'), false, '', t('pg.areas.h1'), t('pg.areas.p')) + '<section class="w-sec"><div class="w-in"><label class="w-fld narrow"><span>' + esc(t('area.search')) + '</span><input type="search" id="areaQ" value="' + esc(P.areaQ) + '" autocomplete="off"></label><div class="w-two even" id="areaLists">' + areaLists() + '</div><p class="w-fsm">' + esc(t('area.else')) + '</p></div></section>' + contactBand();
  }
  function pProcess() {
    var i, h = pagehead(pgName('process'), false, '', t('pg.process.h1'), t('pg.process.p')) + procBlock(t('pg.process.nav'));
    h += '<section class="w-sec"><div class="w-in w-two even"><div><h2 class="rv">' + esc(t('ps.need')) + '</h2><ul class="w-tick big">';
    for (i = 1; i <= 4; i++) h += '<li class="rv"><i aria-hidden="true">✓</i>' + esc(t('ps.need.' + i)) + '</li>';
    h += '</ul></div><div><h2 class="rv">' + esc(t('ps.never')) + '</h2><ul class="w-dots">';
    for (i = 1; i <= 3; i++) h += '<li class="rv">' + esc(t('ps.never.' + i)) + '</li>';
    return h + '</ul></div></div></section>' + band(t('band.h'), t('band.p'), t('band.cta'), 'pricing', 'process');
  }
  function faqList(n) {
    var i, h = '<div class="w-faq">';
    for (i = 1; i <= n; i++) h += '<details class="rv" data-faq="' + i + '"' + (P.faqOpen[i] ? ' open' : '') + '><summary><span>' + esc(t('fq.' + i + '.q')) + '</span></summary><p>' + esc(t('fq.' + i + '.a')) + '</p></details>';
    return h + '</div>';
  }
  function pFaq() {
    return pagehead(pgName('faq'), false, '', t('pg.faq.h1'), t('pg.faq.p')) + '<section class="w-sec"><div class="w-in w-narrow">' + faqList(6) + '</div></section>' + band(t('faq.band.h'), t('faq.band.p'), t('site.cta'), 'contact', 'faq');
  }
  function doneCount() { var n = 0, i; for (i = 1; i <= 5; i++) if (P.chk[i]) n++; return n; }
  function pGuide() {
    var i, h = pagehead(pgName('guide'), false, t('gd.meta'), t('pg.guide.h1'), t('pg.guide.p')) + '<section class="w-sec"><div class="w-in w-two"><article class="w-article">';
    for (i = 1; i <= 4; i++) h += '<h2 class="rv"><span class="gn">' + pad(i) + '</span>' + esc(t('gd.' + i + '.h')) + '</h2><p class="rv">' + esc(t('gd.' + i + '.p')) + '</p>';
    h += '</article><aside class="w-side"><h3>' + esc(t('gd.check')) + '</h3><ul class="w-checks">';
    for (i = 1; i <= 5; i++) h += '<li><label><input type="checkbox" data-chk="' + i + '"' + (P.chk[i] ? ' checked' : '') + '><span>' + esc(t('gd.c' + i)) + '</span></label></li>';
    h += '</ul><p class="w-fsm" id="gdDone" aria-live="polite">' + esc(t('gd.done', { n: doneCount(), total: 5 })) + '</p><a href="#" class="wbtn hot block" data-go="contact" data-v="guide"><span>' + esc(t('gd.cta')) + '</span>' + ar() + '</a></aside></div></section>';
    return h;
  }

  /* ---------- estimate configurator (pricing page) ---------- */
  function calc() {
    var T = EX.SERV[W.type], base = T.rate * W.size, acc = EX.ACC[W.acc], tim = EX.TIM[W.tim], L = [], i, raw, e = EX.estimate(W.type, W.size, W.acc, W.tim, W.extras);
    L.push({ k: 'w:' + W.type, n: t('rc.work', { name: sName(W.type), size: W.size, unit: T.unit, rate: T.rate }), a: base, first: true });
    L.push({ k: 'm', n: t('rc.mob'), a: 150 });
    if (acc !== 1) L.push({ k: 'a:' + W.acc, n: t('rc.acc', { name: t('acc.' + W.acc) }), a: base * (acc - 1) });
    if (tim !== 1) L.push({ k: 't:' + W.tim, n: t('rc.tim', { name: t('tim.' + W.tim) }), a: base * acc * (tim - 1) });
    for (i = 0; i < W.extras.length; i++) L.push({ k: 'x:' + W.extras[i], n: t('ex.' + W.extras[i]), a: base * acc * tim * EX.EXTRA[W.extras[i]] });
    raw = 0; for (i = 0; i < L.length; i++) raw += L[i].a;
    return { lines: L, raw: raw, e: e, days: EX.days(W.type, W.size, W.acc) };
  }
  function tween(el, to, instant, fn) {
    if (!el) return;
    fn = fn || EX.fmt;
    if (el._raf) { w.cancelAnimationFrame(el._raf); el._raf = 0; }
    var from = el._v == null ? 0 : el._v, t0 = null;
    el._v = to;
    if (instant || reduced() || from === to || !w.requestAnimationFrame) { el.textContent = fn(to); return; }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / 560), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fn(from + (to - from) * e);
      if (p < 1) el._raf = w.requestAnimationFrame(step); else el._raf = 0;
    }
    el._raf = w.requestAnimationFrame(step);
  }
  var rcKeys = {};
  function updRc(instant) {
    var ul = $('rcL'); if (!ul) return;
    var c = calc(), i, L, h = '', keys = {}, sign;
    for (i = 0; i < c.lines.length; i++) {
      L = c.lines[i]; keys[L.k] = 1;
      sign = L.first ? '' : (L.a < 0 ? '− ' : '+ ');
      h += '<li class="' + (rcKeys[L.k] && !instant ? '' : 'new') + '" style="--i:' + i + '"><span class="n">' + esc(L.n) + '</span><span class="d" aria-hidden="true"></span><b>' + sign + EX.fmt(Math.abs(L.a)) + '</b></li>';
    }
    rcKeys = keys; ul.innerHTML = h;
    tween($('rcSub'), c.raw, instant);
    tween($('rcLo'), c.e.lo, instant); tween($('rcHi'), c.e.hi, instant);
    tween($('rcDays'), c.days, instant, function (v) { return t('rc.daysv', { n: Math.round(v) }); });
    var m = $('rcMini'); if (m) m.textContent = EX.fmt(c.e.lo) + ' – ' + EX.fmt(c.e.hi);
  }
  function pct(r) { r.style.setProperty('--pct', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); }
  function syncSize() {
    var T = EX.SERV[W.type], r = $('wzRng'); if (!r) return;
    r.min = T.min; r.max = T.max; r.step = T.step; r.value = W.size;
    $('wzNum').textContent = W.size; $('wzUnit').textContent = T.unit; $('wzMin').textContent = T.min; $('wzMax').textContent = T.max; pct(r);
  }
  function opt(name, id, label, sub, on, extraCls) {
    return '<label class="w-opt ' + (extraCls || '') + '"><input type="radio" name="' + name + '" value="' + id + '"' + (on ? ' checked' : '') + '><span><b>' + esc(label) + '</b>' + (sub ? '<em>' + esc(sub) + '</em>' : '') + '</span></label>';
  }
  function fld(id, label, val, type, err, extra) {
    return '<label class="w-fld' + (err ? ' bad' : '') + '"><span>' + esc(label) + '</span><input type="' + (type || 'text') + '" id="' + id + '" value="' + esc(val) + '"' + (err ? ' aria-invalid="true" aria-describedby="' + id + 'E"' : '') + (extra || '') + '>' + (err ? '<small id="' + id + 'E" role="alert">' + esc(t('err.' + err)) + '</small>' : '') + '</label>';
  }
  function areaSelect(id, val, err) {
    var i, h = '<label class="w-fld' + (err ? ' bad' : '') + '"><span>' + esc(t('f.area')) + '</span><select id="' + id + '"' + (err ? ' aria-invalid="true" aria-describedby="' + id + 'E"' : '') + '><option value="">' + esc(t('f.choose')) + '</option>';
    for (i = 0; i < EX.AREAS.length; i++) h += '<option value="' + EX.AREAS[i].id + '"' + (val === EX.AREAS[i].id ? ' selected' : '') + '>' + esc(EX.AREAS[i].name) + '</option>';
    return h + '<option value="other"' + (val === 'other' ? ' selected' : '') + '>' + esc(t('f.other')) + '</option></select>' + (err ? '<small id="' + id + 'E" role="alert">' + esc(t('err.' + err)) + '</small>' : '') + '</label>';
  }
  function consent(id, on, err) {
    return '<label class="w-consent' + (err ? ' bad' : '') + '"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (err ? ' aria-invalid="true" aria-describedby="' + id + 'E"' : '') + '><span>' + esc(t('f.consent')) + '</span></label>' + (err ? '<small class="w-err" id="' + id + 'E" role="alert">' + esc(t('err.consent')) + '</small>' : '');
  }
  function configurator() {
    var i, T = EX.SERV[W.type], h = '<div class="cx"><div class="cx-main">';
    h += '<fieldset class="cx-b"><legend><span class="no">01</span>' + esc(t('wz.s1')) + '</legend><div class="w-opts">';
    for (i = 0; i < EX.SERV_IDS.length; i++) h += opt('wtype', EX.SERV_IDS[i], sName(EX.SERV_IDS[i]), t('wz.b', { unit: unit(EX.SERV_IDS[i]) }), W.type === EX.SERV_IDS[i]);
    h += '</div></fieldset>';
    h += '<fieldset class="cx-b"><legend><span class="no">02</span>' + esc(t('wz.s2')) + '</legend><div class="w-size"><p class="big"><span id="wzNum">' + W.size + '</span> <small id="wzUnit">' + T.unit + '</small></p><input type="range" id="wzRng" min="' + T.min + '" max="' + T.max + '" step="' + T.step + '" value="' + W.size + '" aria-label="' + esc(t('wz.size')) + '"><div class="w-rng"><span id="wzMin">' + T.min + '</span><span id="wzMax">' + T.max + '</span></div><p class="w-fsm">' + esc(t('wz.sizehelp')) + '</p></div></fieldset>';
    h += '<fieldset class="cx-b"><legend><span class="no">03</span>' + esc(t('wz.s3')) + '</legend><div class="w-opts three">';
    ['open', 'tight', 'hard'].forEach(function (k) { h += opt('wacc', k, t('acc.' + k), t('acc.' + k + '.p'), W.acc === k); });
    h += '</div></fieldset>';
    h += '<fieldset class="cx-b"><legend><span class="no">04</span>' + esc(t('wz.s4')) + '</legend><div class="w-opts three">';
    ['flex', 'month', 'urgent'].forEach(function (k) { h += opt('wtim', k, t('tim.' + k), t('tim.' + k + '.p'), W.tim === k); });
    h += '</div><p class="w-fsm sp">' + esc(t('wz.extras')) + '</p><div class="w-sw">';
    ['haul', 'clear'].forEach(function (k) { h += '<button type="button" class="sw" role="switch" aria-checked="' + (W.extras.indexOf(k) >= 0) + '" data-extra="' + k + '"><i></i><span>' + esc(t('ex.' + k)) + '</span></button>'; });
    h += '</div></fieldset>';
    h += '<fieldset class="cx-b"><legend><span class="no">05</span>' + esc(t('wz.s5')) + '</legend><div class="cx-form">' +
      fld('wName', t('f.name'), W.name, 'text', W.err && W.err.name, ' autocomplete="name"') + fld('wContact', t('f.contact'), W.contact, 'text', W.err && W.err.contact, ' autocomplete="off"') + areaSelect('wArea', W.area, W.err && W.err.area) +
      '<label class="w-fld"><span>' + esc(t('f.note')) + '</span><textarea id="wNote">' + esc(W.note) + '</textarea></label></div>' + consent('wConsent', W.consent, W.err && W.err.consent) +
      '<button type="button" class="wbtn hot" data-wz="send"><span>' + esc(t('wz.send')) + '</span>' + ar() + '</button></fieldset>';
    h += '<div class="rc-mini" aria-hidden="true"><span>' + esc(t('rc.mini')) + '</span><b id="rcMini"></b><span>' + esc(t('est.u')) + '</span></div></div>';
    h += '<aside class="rc" aria-live="polite"><div class="rc-in"><p class="rc-k"><i></i>' + esc(t('rc.h')) + '</p><p class="w-fsm rc-s">' + esc(t('cx.live')) + '</p><ul class="rc-l" id="rcL"></ul>' +
      '<p class="rc-row"><span>' + esc(t('rc.sub')) + '</span><b id="rcSub">0</b></p>' +
      '<div class="rc-tot"><p class="k">' + esc(t('rc.range')) + '</p><p class="v"><span id="rcLo">0</span> – <span id="rcHi">0</span></p><p class="u">' + esc(t('est.u')) + '</p></div>' +
      '<p class="rc-row d"><span>' + esc(t('rc.days')) + '</span><b id="rcDays">0</b></p><p class="n">' + esc(t('est.n')) + '</p></div></aside></div>';
    return h;
  }
  function pPricing() {
    var i, h = pagehead(pgName('pricing'), false, '', t('pg.pricing.h1'), t('pg.pricing.p')) + '<section class="w-sec cx-s"><div class="w-in">' + configurator() + '</div></section>';
    h += '<section class="w-sec alt"><div class="w-in"><h2 class="rv">' + esc(t('fac.h')) + '</h2><div class="w-table" role="table" aria-label="' + esc(t('fac.h')) + '"><div role="row" class="hd"><span role="columnheader">' + esc(t('fac.c1')) + '</span><span role="columnheader">' + esc(t('fac.c2')) + '</span><span role="columnheader">' + esc(t('fac.c3')) + '</span></div>';
    for (i = 1; i <= 4; i++) h += '<div role="row" class="rv"><b role="cell">' + esc(t('fac.' + i + '.n')) + '</b><span role="cell">' + esc(t('fac.' + i + '.w')) + '</span><span role="cell">' + esc(t('fac.' + i + '.e')) + '</span></div>';
    return h + '</div><p class="w-fsm">' + esc(t('est.n')) + '</p></div></section>';
  }

  /* ---------- contact / thanks ---------- */
  function pContact() {
    var i, h = pagehead(pgName('contact'), false, '', t('pg.contact.h1'), t('pg.contact.p')) + '<section class="w-sec"><div class="w-in w-two"><form class="w-form" data-form="contact" novalidate><h2>' + esc(t('ct.form')) + '</h2>' +
      fld('fName', t('f.name'), F.name, 'text', F.err && F.err.name, ' autocomplete="name"') + fld('fContact', t('f.contact'), F.contact, 'text', F.err && F.err.contact, ' autocomplete="off"') + areaSelect('fArea', F.area, F.err && F.err.area);
    h += '<label class="w-fld' + (F.err && F.err.service ? ' bad' : '') + '"><span>' + esc(t('f.service')) + '</span><select id="fService"' + (F.err && F.err.service ? ' aria-invalid="true" aria-describedby="fServiceE"' : '') + '><option value="">' + esc(t('f.choose')) + '</option>';
    for (i = 0; i < EX.SERV_IDS.length; i++) h += '<option value="' + EX.SERV_IDS[i] + '"' + (F.service === EX.SERV_IDS[i] ? ' selected' : '') + '>' + esc(sName(EX.SERV_IDS[i])) + '</option>';
    h += '<option value="unsure"' + (F.service === 'unsure' ? ' selected' : '') + '>' + esc(t('f.unsure')) + '</option></select>' + (F.err && F.err.service ? '<small id="fServiceE" role="alert">' + esc(t('err.service')) + '</small>' : '') + '</label>';
    h += '<label class="w-fld"><span>' + esc(t('f.note')) + '</span><textarea id="fNote">' + esc(F.note) + '</textarea></label>' + consent('fConsent', F.consent, F.err && F.err.consent) + '<button type="submit" class="wbtn hot"><span>' + esc(t('ct.send')) + '</span>' + ar() + '</button></form>';
    h += '<aside class="w-side"><h3>' + esc(t('ct.direct')) + '</h3><dl><div><dt>' + esc(t('ct.phone')) + '</dt><dd class="big">+0 000 000-00-00</dd></div><div><dt>' + esc(t('ct.mail')) + '</dt><dd>office@example.test</dd></div><div><dt>' + esc(t('ct.hours')) + '</dt><dd>' + esc(t('foot.hours')) + '</dd></div></dl><h3>' + esc(t('ct.next')) + '</h3><ol class="w-mini"><li>' + esc(t('ct.n1')) + '</li><li>' + esc(t('ct.n2')) + '</li><li>' + esc(t('ct.n3')) + '</li></ol></aside></div></section>';
    return h;
  }
  function pThanks() {
    var r = P.thanks ? EX.find(P.thanks) : null;
    if (!r) return '<section class="w-pagehead ph-lime"><div class="w-in"><h1 class="ph-h">' + esc(t('pg.thanks.h1')) + '</h1><div class="w-row">' + btn(pgName('home'), 'home') + '</div></div></section>';
    return pagehead(r.ref, false, r.ref, t('th.h', { name: r.name.split(' ')[0] }), t('th.p')) + '<section class="w-sec"><div class="w-in w-two"><div><h2>' + esc(t('th.auto')) + '</h2><blockquote class="w-quote">' + esc(t('th.auto.t', { name: r.name.split(' ')[0], ref: r.ref })) + '</blockquote></div><aside class="w-side"><h3>' + esc(t('th.steps')) + '</h3><ol class="w-mini"><li>' + esc(t('th.s1')) + '</li><li>' + esc(t('th.s2')) + '</li><li>' + esc(t('th.s3')) + '</li></ol>' + btn(t('th.panel'), 'panel', '', 'hot block') + btn(pgName('home'), 'home', '', 'light block') + '</aside></div></section>';
  }

  var BUILD = { home: pHome, services: pServices, service: pService, projects: pProjects, equipment: pEquipment, areas: pAreas, process: pProcess, pricing: pPricing, faq: pFaq, guide: pGuide, contact: pContact, thanks: pThanks };
  site.path = function () { return P.page === 'service' ? EX.PATH.service + EX.SLUG[P.svc] : EX.PATH[P.page]; };

  /* ---------- motion layer: reveals, counters, rotator, ticker, scroll effects ---------- */
  var R = { io: null, hio: null, ro: null, scroller: null, raf: 0, rot: 0, tick: 0, ri: 0, ti: 0, heroVis: false, resize: 0 };
  function scroller() { var vp = $('vp'); return vp && w.getComputedStyle(vp).overflowY === 'auto' ? vp : null; }
  function stop() {
    if (R.io) { R.io.disconnect(); R.io = null; }
    if (R.hio) { R.hio.disconnect(); R.hio = null; }
    if (R.ro) { R.ro.disconnect(); R.ro = null; }
    if (R.scroller) { R.scroller.removeEventListener('scroll', onScrollEv); R.scroller = null; }
    if (R.rot) { w.clearInterval(R.rot); R.rot = 0; }
    if (R.tick) { w.clearInterval(R.tick); R.tick = 0; }
    if (R.raf) { w.cancelAnimationFrame(R.raf); R.raf = 0; }
    R.heroVis = false;
  }
  site.stop = stop;
  function runCount(c) {
    var to = +c.getAttribute('data-to');
    if (reduced()) { c.textContent = to; return; }
    c._v = 0; c.textContent = '0';
    tween(c, to, false, function (v) { return String(Math.round(v)); });
  }
  function view() {
    var r = scroller();
    if (r) return { top: r.getBoundingClientRect().top, h: r.clientHeight };
    return { top: 0, h: w.innerHeight };
  }
  function scrollRoot(top) {
    var r = scroller(), o = { top: top, behavior: reduced() ? 'auto' : 'smooth' };
    if (r) r.scrollTo(o); else w.scrollTo(o);
  }
  function scrollToEl(el, off) {
    var r = scroller(), er = el.getBoundingClientRect();
    if (r) scrollRoot(r.scrollTop + er.top - r.getBoundingClientRect().top - off);
    else scrollRoot(w.pageYOffset + er.top - off);
  }
  function stickTop() { return parseFloat(($('siteRoot') && $('siteRoot').style.getPropertyValue('--stick')) || 0) || 0; }
  function onScrollEv() { if (!R.raf) R.raf = w.requestAnimationFrame(function () { R.raf = 0; onScroll(); }); }
  function onScroll() {
    var root = $('siteRoot'); if (!root) return;
    var sc = scroller(), v = view(), i, pg = $('wPg'), p;
    if (pg) {
      if (sc) p = sc.scrollTop / Math.max(1, sc.scrollHeight - sc.clientHeight);
      else { var rr = root.getBoundingClientRect(); p = -rr.top / Math.max(1, rr.height - w.innerHeight); }
      pg.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)) + ')';
    }
    var cards = root.querySelectorAll('.svs-r .svc');
    if (cards.length) {
      var act = 0, lim = v.top + stickTop() + 84 + 300;
      for (i = 0; i < cards.length; i++) if (cards[i].getBoundingClientRect().top <= lim) act = i;
      var bs = root.querySelectorAll('.svs-nav button');
      for (i = 0; i < bs.length; i++) { if (i === act) bs[i].setAttribute('aria-current', 'true'); else bs[i].removeAttribute('aria-current'); }
    }
    var bq = $('bq');
    if (bq) {
      var qw = bq.querySelectorAll('.qw'), k = (v.top + v.h * 0.9 - bq.getBoundingClientRect().top) / (v.h * 0.55);
      k = Math.max(0, Math.min(1, k)); var n = Math.round(k * qw.length);
      for (i = 0; i < qw.length; i++) { if (i < n) qw[i].classList.add('on'); else qw[i].classList.remove('on'); }
    }
  }
  function fitAll() {
    var root = $('siteRoot'); if (!root) return;
    var els = root.querySelectorAll('.fit'), i, el, box, cs, avail, fs;
    for (i = 0; i < els.length; i++) {
      el = els[i]; el.style.fontSize = '';
      box = el.closest('.w-in'); if (!box) continue;
      cs = w.getComputedStyle(box);
      avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var ew = Math.max(el.offsetWidth, el.scrollWidth);
      if (avail > 0 && ew > avail) {
        fs = parseFloat(w.getComputedStyle(el).fontSize) * avail / ew * 0.985;
        el.style.fontSize = fs.toFixed(2) + 'px';
      }
    }
  }
  function wire() {
    stop();
    var root = $('siteRoot'); if (!root) return;
    var sc = scroller(), i, IO = w.IntersectionObserver;
    root.style.setProperty('--stick', sc ? '0px' : ((doc.querySelector('.pf-top') ? doc.querySelector('.pf-top').offsetHeight : 0) + 'px'));
    if (IO && !reduced()) {
      R.io = new IO(function (es) {
        var j, e, c;
        for (j = 0; j < es.length; j++) {
          e = es[j]; if (!e.isIntersecting) continue;
          e.target.classList.add('in'); R.io.unobserve(e.target);
          c = e.target.querySelector('.cnt'); if (c) runCount(c);
        }
      }, { root: sc, rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
      var rv = root.querySelectorAll('.rv, .pr'); for (i = 0; i < rv.length; i++) R.io.observe(rv[i]);
    } else {
      var all = root.querySelectorAll('.rv, .pr'); for (i = 0; i < all.length; i++) all[i].classList.add('in');
    }
    R.scroller = sc || w; R.scroller.addEventListener('scroll', onScrollEv, { passive: true });
    var hero = $('heroS');
    if (hero && IO) { R.hio = new IO(function (es) { R.heroVis = es[es.length - 1].isIntersecting; }, { root: sc, threshold: 0.05 }); R.hio.observe(hero); }
    if (hero && !reduced()) {
      var rw = root.querySelectorAll('.rw');
      R.rot = w.setInterval(function () {
        if (!R.heroVis || doc.hidden || !rw.length) return;
        rw[R.ri].classList.remove('on'); rw[R.ri].classList.add('out');
        var prev = rw[R.ri]; w.setTimeout(function () { prev.classList.remove('out'); }, 700);
        R.ri = (R.ri + 1) % rw.length; rw[R.ri].classList.add('on');
      }, 2300);
      R.tick = w.setInterval(function () {
        if (!R.heroVis || doc.hidden) return;
        R.ti = (R.ti + 1) % TICK.length;
        var d = tickText(R.ti), j = $('tkJob'); if (!j) return;
        j.textContent = d.job; tween($('tkLo'), d.lo); tween($('tkHi'), d.hi);
      }, 3400);
    }
    if (w.ResizeObserver && $('vp')) { var pend = 0; R.ro = new w.ResizeObserver(function () { if (pend) return; pend = w.requestAnimationFrame(function () { pend = 0; fitAll(); onScroll(); }); }); R.ro.observe($('vp')); }
    fitAll(); if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fitAll(); });
    onScroll();
    if ($('rcL')) updRc(!!W.err);
    var rg = $('wzRng'); if (rg) pct(rg);
  }
  site.wire = function () { if ($('siteRoot')) wire(); };
  w.addEventListener('resize', function () { if (R.resize) w.clearTimeout(R.resize); R.resize = w.setTimeout(function () { var p = $('pane-site'); if (p && !p.hidden) site.wire(); }, 220); });

  /* ---------- render / navigation ---------- */
  site.render = function () {
    var pane = $('pane-site'); if (!pane) return;
    stop(); rcKeys = {};
    pane.innerHTML = '<div class="site' + (reduced() ? '' : ' mo') + '" id="siteRoot"><a href="#" class="w-skip" data-act="skip">' + esc(t('a11y.skip')) + '</a>' + header() + '<main id="wMain" tabindex="-1" class="pg-' + P.page + '">' + BUILD[P.page]() + '</main>' + footer() + '</div>';
    var u = $('barUrl'); if (u) u.textContent = site.path();
    wire();
  };
  function toTop() {
    var vp = $('vp'), r = vp.getBoundingClientRect();
    vp.scrollTop = 0;
    if (r.top < 60 || r.top > w.innerHeight * 0.6) w.scrollTo({ top: r.top + w.pageYOffset - 70, behavior: 'auto' });
  }
  site.go = function (page, v, opts) {
    opts = opts || {};
    if (page === 'service') P.svc = v || P.svc;
    if (page === 'pricing' || page === 'contact') {
      if (v && v !== 'nav') P.from = v; else if (!v) P.from = P.page;
      if (opts.pre && EX.SERV[opts.pre]) { if (page === 'pricing') { W.type = opts.pre; W.size = EX.SERV[opts.pre].def; } else F.service = opts.pre; }
      if (opts.area) F.area = opts.area;
    }
    P.page = page; P.menu = false; site.render(); toTop();
    var m = $('wMain'); if (m && opts.focus !== false) m.focus({ preventScroll: true });
    EX.changed('page');
  };

  function validate(d) {
    var err = {}, any = false;
    if (!d.name || d.name.replace(/\s/g, '').length < 2) { err.name = 'name'; any = true; }
    var c = d.contact || '', digits = c.replace(/\D/g, '');
    if (!(/^\S+@\S+\.\S+$/.test(c.replace(/^\s+|\s+$/g, '')) || digits.length >= 7)) { err.contact = 'contact'; any = true; }
    if (!d.area) { err.area = 'area'; any = true; }
    if (d.needService && !d.service) { err.service = 'service'; any = true; }
    if (!d.consent) { err.consent = 'consent'; any = true; }
    return any ? err : null;
  }
  function firstBad() { var f = doc.querySelector('#pane-site [aria-invalid="true"]'); if (f) { f.focus({ preventScroll: true }); if (f.scrollIntoView) f.scrollIntoView({ block: 'center', behavior: 'auto' }); } }
  function submitWizard() {
    var e = EX.estimate(W.type, W.size, W.acc, W.tim, W.extras), err = validate({ name: W.name, contact: W.contact, area: W.area, consent: W.consent });
    if (err) { W.err = err; site.render(); firstBad(); return; }
    var r = EX.createRequest({ name: W.name.replace(/^\s+|\s+$/g, ''), contact: W.contact, area: W.area, service: W.type, size: W.size, acc: W.acc, tim: W.tim, extras: W.extras.slice(), lo: e.lo, hi: e.hi, note: W.note, source: P.from === 'nav' ? 'pricing' : P.from, channel: 'wizard' });
    W.type = 'pit'; W.size = EX.SERV.pit.def; W.acc = 'open'; W.tim = 'month'; W.extras = []; W.name = ''; W.contact = ''; W.area = ''; W.note = ''; W.consent = false; W.err = null;
    P.thanks = r.id; site.go('thanks', null);
  }
  function submitForm() {
    var err = validate({ name: F.name, contact: F.contact, area: F.area, service: F.service, needService: true, consent: F.consent });
    if (err) { F.err = err; site.render(); firstBad(); return; }
    var sv = EX.SERV[F.service] ? F.service : null;
    var r = EX.createRequest({ name: F.name.replace(/^\s+|\s+$/g, ''), contact: F.contact, area: F.area, service: sv, note: F.note, source: P.from === 'nav' ? 'contact' : P.from, channel: 'form' });
    F = { name: '', contact: '', area: '', service: '', note: '', consent: false, err: null };
    P.thanks = r.id; site.go('thanks', null);
  }

  site.bind = function () {
    var pane = $('pane-site');
    pane.addEventListener('click', function (e) {
      var el = e.target.closest('a,button,summary,label,input'); if (!el) return;
      if (el.tagName === 'A' && el.getAttribute('data-act') === 'skip') { e.preventDefault(); var m = $('wMain'); if (m) m.focus(); return; }
      if (el.hasAttribute('data-go')) {
        e.preventDefault(); var g = el.getAttribute('data-go');
        if (g === 'panel') { EX.showTab('panel'); return; }
        site.go(g, el.getAttribute('data-v'), { pre: el.getAttribute('data-pre'), area: el.getAttribute('data-area') }); return;
      }
      var a = el.getAttribute('data-act');
      if (a === 'menu') { P.menu = !P.menu; var nv = $('wNav'); if (nv) nv.classList.toggle('open', P.menu); el.setAttribute('aria-expanded', String(P.menu)); return; }
      if (el.hasAttribute('data-quick')) {
        W.type = el.getAttribute('data-quick'); W.size = EX.SERV[W.type].def;
        var ts = pane.querySelectorAll('[data-quick]'), i; for (i = 0; i < ts.length; i++) ts[i].setAttribute('aria-checked', String(ts[i] === el));
        return;
      }
      if (el.hasAttribute('data-sv')) { var cs = pane.querySelectorAll('.svs-r .svc'), c = cs[+el.getAttribute('data-sv')]; if (c) scrollToEl(c, stickTop() + 84); return; }
      if (el.hasAttribute('data-lane')) { var ln = $('lane'); if (ln) ln.scrollBy({ left: +el.getAttribute('data-lane') * Math.min(440, ln.clientWidth * 0.8), behavior: reduced() ? 'auto' : 'smooth' }); return; }
      if (el.hasAttribute('data-pf')) {
        P.projFilter = el.getAttribute('data-pf');
        var pf = pane.querySelectorAll('[data-pf]'), j; for (j = 0; j < pf.length; j++) pf[j].setAttribute('aria-pressed', String(pf[j] === el));
        $('projGrid').innerHTML = projGrid(); return;
      }
      if (el.hasAttribute('data-extra')) {
        var k = el.getAttribute('data-extra'), ix = W.extras.indexOf(k);
        if (ix >= 0) W.extras.splice(ix, 1); else W.extras.push(k);
        el.setAttribute('aria-checked', String(W.extras.indexOf(k) >= 0)); updRc(); return;
      }
      if (el.getAttribute('data-wz') === 'send') submitWizard();
    });
    pane.addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target.getAttribute('data-form');
      if (f === 'quick') { P.from = 'home'; site.go('pricing', 'home'); return; }
      if (f === 'contact') submitForm();
    });
    pane.addEventListener('input', function (e) {
      var el = e.target, id = el.id;
      if (id === 'wzRng') { W.size = +el.value; $('wzNum').textContent = W.size; pct(el); updRc(); }
      else if (id === 'wName') W.name = el.value; else if (id === 'wContact') W.contact = el.value; else if (id === 'wNote') W.note = el.value;
      else if (id === 'fName') F.name = el.value; else if (id === 'fContact') F.contact = el.value; else if (id === 'fNote') F.note = el.value;
      else if (id === 'areaQ') { P.areaQ = el.value; $('areaLists').innerHTML = areaLists(); }
    });
    pane.addEventListener('change', function (e) {
      var el = e.target, id = el.id;
      if (el.name === 'wtype') { W.type = el.value; W.size = EX.SERV[W.type].def; syncSize(); updRc(); }
      else if (el.name === 'wacc') { W.acc = el.value; updRc(); } else if (el.name === 'wtim') { W.tim = el.value; updRc(); }
      else if (id === 'wArea') W.area = el.value; else if (id === 'wConsent') W.consent = el.checked;
      else if (id === 'fArea') F.area = el.value; else if (id === 'fService') F.service = el.value; else if (id === 'fConsent') F.consent = el.checked;
      else if (el.hasAttribute('data-chk')) { P.chk[el.getAttribute('data-chk')] = el.checked; var d = $('gdDone'); if (d) d.textContent = t('gd.done', { n: doneCount(), total: 5 }); }
    });
    pane.addEventListener('toggle', function (e) { var d = e.target; if (d.hasAttribute && d.hasAttribute('data-faq')) P.faqOpen[d.getAttribute('data-faq')] = d.open; }, true);
  };
}(window));
