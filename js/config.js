/* Molxo Flow: факты владельца. Единственное место, где владелец вписывает свои данные. Без DOM.

   ВЛАДЕЛЬЦУ: ниже пустые места, которые нужно заполнить своими данными; до этого сайт ничего не выдумывает.
   contact: пусто = канал связи не настроен; адрес с @ даёт письмо, «tg:имя» даёт ссылку на Telegram.
   prices: null = «стоимость уточним после обсуждения»; число = цена «от» за уровень (START, GROW, SCALE).
   currency: валюта для цен и для диапазонов бюджета (например 'USD'); пока пусто, цена на сайте не показывается.
   bot: имя Telegram-бота в виде 'tg:имя'; пусто = карточки бота нет.
   cases, reviews, guarantees: списки { title: '…', text: '…' }; пустой список = блок на сайте скрыт; показываются первые 6.
   После правки файла выполните: node tools/build-site.js */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};

  MF.CONFIG = {
    contact: 'tg:Molxo1',
    prices: { start: null, grow: null, scale: null },
    currency: '',
    bot: '',
    cases: [],
    reviews: [],
    guarantees: []
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
