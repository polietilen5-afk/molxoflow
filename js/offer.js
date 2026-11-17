/* Molxo Flow: коммерческое предложение из плана и цен владельца. Без DOM и без сети.
   Язык предложения - язык интерфейса (MF.t). Цены берутся только из MF.CONFIG.prices через MF.formatPrice;
   нет цены или валюты - строка «стоимость уточним», цифры не выдумываются. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./core.js'); require('./texts.js'); require('./texts.uk.js'); require('./texts.en.js');
    require('./lang.js'); require('./config.js'); require('./catalog.js'); require('./wizard.js');
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // Предложение { title, lines, text }; пока цель не выбрана, в нём только заголовок и пометка об этом.
  MF.buildOffer = function (w, plan, opts) {
    var onPage = !!(opts && opts.onPage);
    var wz = w && typeof w === 'object' && w.answers && typeof w.answers === 'object' ? w : MF.emptyWizard();
    var pl = plan && typeof plan === 'object' ? plan : MF.buildPlan(wz);
    var title = MF.t('offer.title');
    // onPage: на странице предложения оговорка и уровни уже показаны блоками выше, в черновике они не повторяются; в копии и файле остаются.
    var lines = onPage ? [title] : [title, MF.t('offer.prelim')];
    if (!pl.ready) {
      lines.push('', MF.t('req.notReady'), '', MF.t('offer.footer'));
      return { title: title, lines: lines, text: lines.join('\n') };
    }
    var industry = byId(MF.INDUSTRIES, wz.industry);
    lines.push('', MF.t('req.goal', { name: MF.wizardAnswerText(wz, 'goal') }));
    if (industry) lines.push(MF.t('req.industry', { name: MF.t(industry.titleKey) }));
    var business = typeof wz.answers.business === 'string' && wz.answers.business !== MF.WIZARD_SKIP ? wz.answers.business.trim() : '';
    if (business) lines.push(MF.t('req.business', { text: business.replace(/\s*\n\s*/g, ' ') }));

    lines.push('', MF.t('req.opps'));
    pl.opportunities.forEach(function (o, i) {
      var s = byId(MF.SOLUTIONS, o.solutionId);
      lines.push(MF.t('req.opp', { index: i + 1, name: MF.t(s.titleKey), direction: MF.t('dir.' + o.direction + '.title'), changes: MF.t(s.changesKey) }));
    });

    var prices = pl.prices || {};
    var anyPrice = false;
    ['start', 'grow', 'scale'].forEach(function (l) { if (prices[l]) anyPrice = true; });
    if (!onPage) {
      lines.push('', MF.t('offer.scope'));
      // Цен нет вовсе: «стоимость уточним» стоит один раз (price.unknown ниже), а не в каждой строке уровня.
      ['start', 'grow', 'scale'].forEach(function (l) {
        var items = (pl.tiers[l] || []).map(function (k) { return MF.t(k); }).join('; ');
        if (!anyPrice) lines.push(MF.t('offer.tierNoPrice', { level: MF.t('tier.' + l + '.title'), items: items }));
        else lines.push(MF.t('offer.tier', { level: MF.t('tier.' + l + '.title'), price: prices[l] || MF.t('offer.priceTbd'), items: items }));
      });
    }
    if (!anyPrice) lines.push('', MF.t('price.unknown') + '.');
    if (pl.intelligenceNotice) lines.push('', MF.t('notice.intelligence'));
    lines.push('', MF.t('offer.footer'));
    return { title: title, lines: lines, text: lines.join('\n') };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
