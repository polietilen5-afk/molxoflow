/* Molxo Flow: факты владельца. Единственное место, где владелец вписывает свои данные. Без DOM.
   contact: пусто = канал связи не настроен; адрес с @ даёт письмо, «tg:имя» даёт ссылку на Telegram.
   prices: null = «стоимость уточним после обсуждения»; число = цена в рублях за уровень. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};

  MF.CONFIG = {
    contact: '',
    prices: { start: null, grow: null, scale: null }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MF;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
