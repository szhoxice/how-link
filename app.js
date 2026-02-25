(function () {
  'use strict';

  // Ссылка на бота (при своём боте замените на t.me/your_bot)
  var BOT_LINK = 'https://t.me/helponwheels_bot';

  function openBotStart(startParam) {
    var url = BOT_LINK + '?start=' + encodeURIComponent(startParam);
    if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  function init() {
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.themeParams && tg.themeParams.bg_color) {
        document.documentElement.style.setProperty('--bg', tg.themeParams.bg_color);
      }
    }

    var cards = document.getElementById('cards');
    if (!cards) return;

    cards.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-start]');
      if (!a) return;
      e.preventDefault();
      var start = a.getAttribute('data-start');
      if (start) openBotStart(start);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
