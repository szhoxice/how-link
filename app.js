(function () {
  'use strict';

  var BOT_LINK = 'https://t.me/@neforandalt_bot';
  function getApiBase() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem('apiUrl')) ||
        (window.APP_CONFIG && window.APP_CONFIG.apiUrl) || '';
    } catch (e) { return (window.APP_CONFIG && window.APP_CONFIG.apiUrl) || ''; }
  }

  function getInitData() {
    return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';
  }

  function apiHeaders() {
    var h = { 'Content-Type': 'application/json' };
    var init = getInitData();
    if (init) h['X-Telegram-Init-Data'] = init;
    return h;
  }

  function apiGet(path) {
    return fetch(getApiBase() + path, { headers: apiHeaders() }).then(function (r) {
      if (r.status === 401) return Promise.reject({ status: 401 });
      if (!r.ok) return Promise.reject({ status: r.status });
      return r.json();
    });
  }

  function apiPost(path, body) {
    var payload = body || {};
    if (getInitData()) payload.initData = getInitData();
    return fetch(getApiBase() + path, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r.status === 401) return Promise.reject({ status: 401 });
      return r.json();
    });
  }

  function apiPatch(path, body) {
    var payload = body || {};
    if (getInitData()) payload.initData = getInitData();
    return fetch(getApiBase() + path, {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r.status === 401) return Promise.reject({ status: 401 });
      return r.json();
    });
  }

  function showScreen(name) {
    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (el) {
      el.style.display = (el.getAttribute('data-screen') === name) ? 'block' : 'none';
    });
    var sub = document.getElementById('headerSub');
    if (sub) sub.textContent = name === 'home' ? 'Взаимопомощь на дорогах' : '';
  }

  function openBot() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(BOT_LINK);
    } else {
      window.open(BOT_LINK, '_blank');
    }
  }

  var currentLocation = { lat: null, lon: null };

  function getLocation() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация недоступна'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          currentLocation.lat = pos.coords.latitude;
          currentLocation.lon = pos.coords.longitude;
          resolve(currentLocation);
        },
        function (err) { reject(err); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
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

    // Глобальный делегат: кнопки data-go
    document.getElementById('app').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-go]');
      if (!btn) return;
      e.preventDefault();
      showScreen(btn.getAttribute('data-go'));
      var screen = btn.getAttribute('data-go');
      if (screen === 'find') loadFind();
      if (screen === 'accepted') loadAccepted();
      if (screen === 'my') loadMy();
      if (screen === 'settings') loadSettings();
      if (screen === 'rating') loadRating();
    });

    document.getElementById('btnOpenBot').addEventListener('click', openBot);
    document.getElementById('btnGetLocation').addEventListener('click', function () {
      getLocation().then(function () {
        document.getElementById('createLocationHint').textContent = 'Координаты получены: ' + currentLocation.lat.toFixed(4) + ', ' + currentLocation.lon.toFixed(4);
      }).catch(function () {
        document.getElementById('createLocationHint').textContent = 'Не удалось получить координаты. Включите геолокацию.';
      });
    });
    document.getElementById('btnFindLocation').addEventListener('click', function () {
      getLocation().then(function () { loadFind(); }).catch(function () { loadFind(); });
    });

    document.getElementById('formCreate').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentLocation.lat || !currentLocation.lon) {
        document.getElementById('createLocationHint').textContent = 'Сначала нажмите «Взять мои координаты»';
        return;
      }
      var number = (document.getElementById('createNumber').value || '').trim();
      var helpType = (document.getElementById('createHelpType').value || '').trim();
      if (!helpType) return;
      var btn = document.getElementById('btnSubmitCreate');
      btn.disabled = true;
      apiPost('/api/requests', {
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        number: number || '—',
        help_type: helpType
      }).then(function (data) {
        if (data.error) {
          document.getElementById('createLocationHint').textContent = data.message || data.error;
          btn.disabled = false;
          return;
        }
        document.getElementById('createLocationHint').textContent = 'Заявка №' + data.request_number + ' создана.';
        document.getElementById('createNumber').value = '';
        document.getElementById('createHelpType').value = '';
        showScreen('home');
        btn.disabled = false;
      }).catch(function () {
        document.getElementById('createLocationHint').textContent = 'Ошибка. Попробуйте снова.';
        btn.disabled = false;
      });
    });

    document.getElementById('formSettings').addEventListener('submit', function (e) {
      e.preventDefault();
      var urlEl = document.getElementById('settingsApiUrl');
      if (urlEl && urlEl.value.trim()) {
        try { localStorage.setItem('apiUrl', urlEl.value.trim().replace(/\/$/, '')); } catch (err) {}
      }
      var radius = parseInt(document.getElementById('settingsRadius').value, 10);
      var notif = document.getElementById('settingsNotif').checked;
      var notifDist = parseInt(document.getElementById('settingsNotifDist').value, 10);
      apiPatch('/api/settings', {
        radius_km: radius,
        notifications_enabled: notif,
        notification_distance_km: notifDist
      }).then(function () {
        document.getElementById('formSettings').querySelector('button[type=submit]').textContent = 'Сохранено';
        setTimeout(function () {
          document.getElementById('formSettings').querySelector('button[type=submit]').textContent = 'Сохранить';
        }, 1500);
      }).catch(function () {
        document.getElementById('formSettings').querySelector('button[type=submit]').textContent = 'Ошибка';
      });
    });

    function tryMe() {
      apiGet('/api/me').then(function (me) {
        document.getElementById('headerSub').textContent = me.first_name ? 'Привет, ' + me.first_name + '!' : 'Взаимопомощь на дорогах';
        showScreen('home');
      }).catch(function (err) {
        showScreen('register');
        var hint = document.getElementById('registerHint');
        if (hint) {
          if (err && err.status === 401) {
            hint.textContent = 'Сессия не распознана. Откройте приложение из чата с ботом (меню бота → Приложение).';
          } else if (!getApiBase()) {
            hint.textContent = 'Укажите адрес API (HTTPS) ниже — например URL из Cloudflare Tunnel.';
          } else {
            hint.textContent = 'Не удалось подключиться к серверу. Проверьте, что бот запущен и адрес API верный (можно обновить ниже).';
          }
        }
        var inputApi = document.getElementById('registerApiUrl');
        if (inputApi) inputApi.value = getApiBase();
      });
    }
    tryMe();

    var inputApi = document.getElementById('registerApiUrl');
    var btnApply = document.getElementById('btnApplyApiUrl');
    if (inputApi && btnApply) {
      btnApply.addEventListener('click', function () {
        var url = (inputApi.value || '').trim().replace(/\/$/, '');
        if (!url) return;
        try { localStorage.setItem('apiUrl', url); } catch (e) {}
        btnApply.textContent = 'Проверка...';
        btnApply.disabled = true;
        apiGet('/api/me').then(function (me) {
          document.getElementById('headerSub').textContent = me.first_name ? 'Привет, ' + me.first_name + '!' : 'Взаимопомощь на дорогах';
          showScreen('home');
          btnApply.textContent = 'Применить и проверить';
          btnApply.disabled = false;
        }).catch(function () {
          btnApply.textContent = 'Ошибка, проверьте URL';
          btnApply.disabled = false;
          setTimeout(function () { btnApply.textContent = 'Применить и проверить'; }, 2000);
        });
      });
    }
  }

  function loadFind() {
    var list = document.getElementById('findList');
    list.innerHTML = '<p class="hint">Загрузка...</p>';
    if (!currentLocation.lat || !currentLocation.lon) {
      getLocation().catch(function () {});
    }
    var lat = currentLocation.lat;
    var lon = currentLocation.lon;
    if (!lat || !lon) {
      list.innerHTML = '<p class="hint">Нажмите «Обновить моё местоположение»</p>';
      return;
    }
    apiGet('/api/requests/nearby?lat=' + lat + '&lon=' + lon + '&radius=50').then(function (data) {
      if (!data.requests || data.requests.length === 0) {
        list.innerHTML = '<p class="hint">Нет заявок рядом</p>';
        return;
      }
      list.innerHTML = data.requests.map(function (r) {
        return '<div class="list-item" data-request-number="' + r.request_number + '">' +
          '<p><strong>№' + r.request_number + '</strong> ' + (r.help_type || '') + '</p>' +
          '<p class="list-item__meta">' + (r.distance_km || '') + ' км · ' + (r.author_name || '') + '</p>' +
          '<button type="button" class="btn btn--primary accept-btn">Принять</button></div>';
      }).join('');
      list.querySelectorAll('.accept-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var num = parseInt(btn.closest('.list-item').getAttribute('data-request-number'), 10);
          btn.disabled = true;
          apiPost('/api/requests/accept', { request_number: num }).then(function () {
            btn.textContent = 'Принято';
            loadFind();
          }).catch(function () {
            btn.disabled = false;
          });
        });
      });
    }).catch(function () {
      list.innerHTML = '<p class="hint">Ошибка загрузки</p>';
    });
  }

  function loadAccepted() {
    var list = document.getElementById('acceptedList');
    list.innerHTML = '<p class="hint">Загрузка...</p>';
    apiGet('/api/requests/accepted').then(function (data) {
      if (!data.requests || data.requests.length === 0) {
        list.innerHTML = '<p class="hint">Нет принятых заявок</p>';
        return;
      }
      list.innerHTML = data.requests.map(function (r) {
        return '<div class="list-item" data-request-number="' + r.request_number + '">' +
          '<p><strong>№' + r.request_number + '</strong> ' + (r.help_type || '') + '</p>' +
          '<p class="list-item__meta">Автор: ' + (r.author_name || '') + '</p>' +
          '<button type="button" class="btn btn--secondary cancel-btn">Отменить</button></div>';
      }).join('');
      list.querySelectorAll('.cancel-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var num = parseInt(btn.closest('.list-item').getAttribute('data-request-number'), 10);
          apiPost('/api/requests/cancel', { request_number: num }).then(function () {
            loadAccepted();
          });
        });
      });
    }).catch(function () {
      list.innerHTML = '<p class="hint">Ошибка загрузки</p>';
    });
  }

  function loadMy() {
    var list = document.getElementById('myList');
    list.innerHTML = '<p class="hint">Загрузка...</p>';
    apiGet('/api/requests/my').then(function (data) {
      if (!data.requests || data.requests.length === 0) {
        list.innerHTML = '<p class="hint">Нет активных заявок</p>';
        return;
      }
      list.innerHTML = data.requests.map(function (r) {
        var volId = (r.accepted_by && r.accepted_by[0]) ? r.accepted_by[0] : '';
        return '<div class="list-item" data-request-number="' + r.request_number + '" data-volunteer-id="' + volId + '">' +
          '<p><strong>№' + r.request_number + '</strong> ' + (r.help_type || '') + '</p>' +
          '<p class="list-item__meta">Принято: ' + (r.accepted_count || 0) + '</p>' +
          '<button type="button" class="btn btn--primary close-btn">Закрыть</button>' +
          (volId ? '<button type="button" class="btn btn--secondary rate-like-btn">👍</button><button type="button" class="btn btn--secondary rate-dislike-btn">👎</button>' : '') + '</div>';
      }).join('');
      list.querySelectorAll('.close-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var num = parseInt(btn.closest('.list-item').getAttribute('data-request-number'), 10);
          apiPost('/api/requests/close', { request_number: num }).then(function () {
            loadMy();
          });
        });
      });
      list.querySelectorAll('.rate-like-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.list-item');
          var num = parseInt(item.getAttribute('data-request-number'), 10);
          var volId = item.getAttribute('data-volunteer-id');
          if (!volId) return;
          apiPost('/api/requests/rate', { request_number: num, like: true, volunteer_id: parseInt(volId, 10) }).then(function () {
            loadMy();
          });
        });
      });
      list.querySelectorAll('.rate-dislike-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.list-item');
          var num = parseInt(item.getAttribute('data-request-number'), 10);
          var volId = item.getAttribute('data-volunteer-id');
          if (!volId) return;
          apiPost('/api/requests/rate', { request_number: num, like: false, volunteer_id: parseInt(volId, 10) }).then(function () {
            loadMy();
          });
        });
      });
    }).catch(function () {
      list.innerHTML = '<p class="hint">Ошибка загрузки</p>';
    });
  }

  function loadSettings() {
    apiGet('/api/me').then(function (me) {
      var box = document.getElementById('settingsProfile');
      box.innerHTML = '<p><strong>' + (me.first_name || '') + '</strong></p>' +
        '<p class="list-item__meta">Уровень: ' + (me.level || '') + ' · Рейтинг: ' + (me.score || 0) + '</p>' +
        '<p class="list-item__meta">Город: ' + (me.city || '—') + '</p>';
    });
    apiGet('/api/settings').then(function (s) {
      document.getElementById('settingsRadius').value = s.radius_km || 10;
      document.getElementById('settingsNotif').checked = s.notifications_enabled;
      document.getElementById('settingsNotifDist').value = s.notification_distance_km || 10;
    });
    var settingsApiUrl = document.getElementById('settingsApiUrl');
    if (settingsApiUrl) settingsApiUrl.value = getApiBase() || '';
  }

  function loadRating() {
    var list = document.getElementById('ratingList');
    list.innerHTML = '<p class="hint">Загрузка...</p>';
    apiGet('/api/rating').then(function (data) {
      if (!data.top || data.top.length === 0) {
        list.innerHTML = '<p class="hint">Пока нет данных</p>';
        return;
      }
      list.innerHTML = data.top.map(function (u, i) {
        var medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1) + '.'));
        return '<div class="list-item">' +
          '<p>' + medal + ' ' + (u.first_name || u.username || 'ID' + u.user_id) + ' — ' + (u.level || '') + '</p>' +
          '<p class="list-item__meta">Очки: ' + (u.score || 0) + '</p></div>';
      }).join('');
    }).catch(function () {
      list.innerHTML = '<p class="hint">Ошибка загрузки</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
