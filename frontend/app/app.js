(function () {
  'use strict';

  var DEMO_VESSEL_ID = 'MH-RTN-408'; // ORCA-9 — the vessel the Crisis panel's demo scenario is built around
  var DB_NAME = 'jalavita';
  var DB_VERSION = 2;
  var API = '';

  // ---------------- IndexedDB ----------------
  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('packet')) db.createObjectStore('packet', { keyPath: 'vessel_id' });
        if (!db.objectStoreNames.contains('outbox_ack')) db.createObjectStore('outbox_ack', { keyPath: 'receipt_id' });
        if (!db.objectStoreNames.contains('outbox_catch')) db.createObjectStore('outbox_catch', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('outbox_tip')) db.createObjectStore('outbox_tip', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      // A version bump (new feature needing a new object store) can hang forever,
      // with no error and no success, if another tab/instance of this same app is
      // still open somewhere holding the old database version open. Fail loudly
      // instead of hanging silently so the UI can show something rather than freeze.
      req.onblocked = function () { reject(new Error('IndexedDB upgrade blocked — close other open tabs/instances of this app')); };
    });
  }

  function idbTx(storeName, mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, mode);
        var store = tx.objectStore(storeName);
        var result;
        Promise.resolve(fn(store)).then(function (r) { result = r; });
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  function idbPut(storeName, value) {
    return idbTx(storeName, 'readwrite', function (store) { store.put(value); });
  }
  function idbDelete(storeName, key) {
    return idbTx(storeName, 'readwrite', function (store) { store.delete(key); });
  }
  function idbGet(storeName, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function idbGetAll(storeName) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  // ---------------- i18n ----------------
  var STRINGS = {};
  var CURRENT_LANG = localStorage.getItem('jalavita_lang') || 'mr'; // most Konkan fishermen read Marathi, not English

  var EMBEDDED_FALLBACK_EN = {
    'status.nodata__SAFETY': 'I cannot advise. Contact your harbour officer.',
    'status.expired__SAFETY': "I can't verify current conditions.",
  };

  function t(key, vars) {
    var s = STRINGS[key] || STRINGS[key + '__SAFETY'] || EMBEDDED_FALLBACK_EN[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(vars[k]);
      });
    }
    return s;
  }

  function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.documentElement.lang = CURRENT_LANG;
    var langSelect = document.getElementById('lang-switch');
    if (langSelect) langSelect.value = CURRENT_LANG;
  }

  function loadLocale(lang) {
    return fetch('./i18n/' + lang + '.json')
      .then(function (r) { if (!r.ok) throw new Error('missing locale'); return r.json(); })
      .then(function (json) { STRINGS = json; })
      .catch(function () { STRINGS = STRINGS && Object.keys(STRINGS).length ? STRINGS : EMBEDDED_FALLBACK_EN; });
  }

  function setLang(lang) {
    CURRENT_LANG = lang;
    localStorage.setItem('jalavita_lang', lang);
    var speciesFilter = document.getElementById('species-lang-filter');
    if (speciesFilter) speciesFilter.value = lang;
    return loadLocale(lang).then(function () {
      applyStaticTranslations();
      render();
    });
  }

  // ---------------- Connectivity ----------------
  function isOnline() { return navigator.onLine; }

  function setConnBadge() {
    var el = document.getElementById('conn-badge');
    if (!el) return;
    var online = isOnline();
    el.classList.toggle('online', online);
    el.classList.toggle('offline', !online);
    el.textContent = online ? t('conn.online') : t('conn.offline');
  }
  window.addEventListener('online', function () { setConnBadge(); refreshPacket(); flushOutboxes(); connectSSE(); });
  window.addEventListener('offline', function () { setConnBadge(); render(); });

  // ---------------- Geofence math (mirrors backend's simple degree-distance) ----------------
  var KM_PER_DEGREE = 111.32;
  function pointToSegmentDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var lenSq = dx * dx + dy * dy;
    var t2 = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t2 = Math.max(0, Math.min(1, t2));
    var cx = ax + t2 * dx, cy = ay + t2 * dy;
    return Math.hypot(px - cx, py - cy);
  }
  function distanceToGeofenceKm(lat, lon, geofence) {
    if (!geofence || !geofence.points || geofence.points.length < 2) return null;
    var pts = geofence.points;
    var minDeg = Infinity;
    for (var i = 0; i < pts.length - 1; i++) {
      var d = pointToSegmentDist(lon, lat, pts[i].lon, pts[i].lat, pts[i + 1].lon, pts[i + 1].lat);
      if (d < minDeg) minDeg = d;
    }
    return Math.round(minDeg * KM_PER_DEGREE * 100) / 100;
  }

  // ---------------- On-device rules engine (deterministic, no network, no LLM) ----------------
  // Contract: absence of a signal is NEVER treated as safety. Missing/expired data
  // degrades to a warning, never to "all clear".
  function evaluateOffline(packet, nowMs) {
    if (!packet) {
      return { ladder: 'NODATA' };
    }
    var validUntilMs = new Date(packet.valid_until).getTime();
    var ladder = nowMs <= validUntilMs ? 'CACHED' : 'EXPIRED';

    var geofence = packet.geofences && packet.geofences[0];
    var pos = packet.position;
    var distanceKm = pos && geofence ? distanceToGeofenceKm(pos.lat, pos.lon, geofence) : null;
    var bufferKm = geofence ? geofence.buffer_km : null;
    var approachingBoundary = distanceKm != null && bufferKm != null && distanceKm <= bufferKm;

    var returnWindowMs = packet.advisory && packet.advisory.return_window_closes
      ? new Date(packet.advisory.return_window_closes).getTime() : null;
    var windowClosed = returnWindowMs != null && nowMs > returnWindowMs;

    var verdict = packet.advisory ? packet.advisory.verdict : 'CANNOT_DETERMINE';
    if (ladder === 'EXPIRED') verdict = 'CANNOT_DETERMINE';
    if (windowClosed && verdict === 'SAFE') verdict = 'CAUTION';
    if (approachingBoundary && verdict === 'SAFE') verdict = 'CAUTION';

    return {
      ladder: ladder,
      verdict: verdict,
      distanceKm: distanceKm,
      approachingBoundary: approachingBoundary,
      windowClosed: windowClosed,
      returnWindowMs: returnWindowMs,
      packet: packet,
    };
  }

  // ---------------- Packet fetch/cache ----------------
  var lastEval = null;

  function refreshPacket() {
    if (!isOnline()) return Promise.resolve(null);
    return fetch(API + '/api/packet/' + DEMO_VESSEL_ID)
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (packet) {
        return idbPut('packet', packet).then(function () { render(); return packet; });
      })
      .catch(function () { render(); return null; });
  }

  function checkStale(packet, nowMs) {
    // "DEGRADED" = online, packet fresh enough to be valid, but at least one
    // reading is old enough that we should flag it as provisional rather than hide it.
    if (!packet || !packet.advisory || !packet.advisory.readings) return null;
    var readings = packet.advisory.readings;
    var maxAgeHours = 0;
    Object.keys(readings).forEach(function (k) {
      var ev = readings[k];
      if (ev && ev.valid_time) {
        var ageH = (nowMs - new Date(ev.valid_time).getTime()) / 3600000;
        if (ageH > maxAgeHours) maxAgeHours = ageH;
      }
    });
    return maxAgeHours > 3 ? Math.round(maxAgeHours) : null;
  }

  function render() {
    var nowMs = Date.now();
    idbGet('packet', DEMO_VESSEL_ID).then(function (packet) {
      var online = isOnline();
      var evalResult;
      if (online && packet && new Date(packet.generated_at).getTime() > nowMs - 5 * 60000) {
        var staleHours = checkStale(packet, nowMs);
        evalResult = {
          ladder: staleHours ? 'DEGRADED' : 'LIVE',
          staleHours: staleHours,
          verdict: packet.advisory.verdict,
          packet: packet,
          returnWindowMs: new Date(packet.advisory.return_window_closes).getTime(),
        };
      } else if (online && packet) {
        // Online but packet not freshly re-fetched this session yet — treat as cached until refreshPacket() resolves.
        evalResult = evaluateOffline(packet, nowMs);
      } else {
        evalResult = evaluateOffline(packet, nowMs);
      }
      lastEval = evalResult;
      renderLadder(evalResult);
      renderAdvisory(evalResult);
      renderPosition(evalResult.packet);
      renderChart(evalResult);
      renderCrisisContext(evalResult);
    });
  }

  function renderLadder(ev) {
    var banner = document.getElementById('degrade-banner');
    if (!banner) return;
    banner.className = 'degrade-banner';
    if (ev.ladder === 'LIVE') {
      banner.classList.add('live');
      banner.textContent = '';
    } else if (ev.ladder === 'DEGRADED') {
      banner.classList.add('degraded');
      banner.textContent = t('status.degraded__SAFETY', { hours: ev.staleHours });
    } else if (ev.ladder === 'CACHED') {
      var p = ev.packet;
      var cachedTime = new Date(p.generated_at).toISOString().slice(11, 16);
      var untilTime = new Date(p.valid_until).toISOString().slice(11, 16);
      banner.classList.add('cached');
      banner.textContent = t('status.cached__SAFETY', { time: cachedTime, until: untilTime });
    } else if (ev.ladder === 'EXPIRED') {
      banner.classList.add('expired');
      banner.textContent = t('status.expired__SAFETY');
    } else {
      banner.classList.add('nodata');
      banner.textContent = t('status.nodata__SAFETY');
    }
  }

  function renderAdvisory(ev) {
    var hero = document.getElementById('hero-status');
    var heading = document.getElementById('hero-heading');
    var win = document.getElementById('hero-window');
    var locSub = document.getElementById('loc-sub');
    if (!hero || !heading) return;

    hero.className = 'hero-status';
    var verdict = ev.verdict || 'CANNOT_DETERMINE';

    if (ev.ladder === 'NODATA') {
      hero.classList.add('unknown');
      heading.textContent = t('status.nodata__SAFETY');
      if (win) win.textContent = '';
      if (locSub) locSub.textContent = t('conn.offline');
      updateReadings(null);
      return;
    }
    if (ev.ladder === 'EXPIRED') {
      hero.classList.add('unknown');
      heading.textContent = t('status.expired__SAFETY');
      if (win) win.textContent = '';
      if (locSub) locSub.textContent = t('status.expired__SAFETY');
      updateReadings(ev.packet ? ev.packet.advisory.readings : null);
      return;
    }

    var p = ev.packet;
    if (verdict === 'UNSAFE') {
      hero.classList.add('unsafe');
      heading.textContent = t('advisory.unsafe');
    } else if (verdict === 'CAUTION') {
      hero.classList.add('caution');
      var timeStr = p && p.advisory.return_window_closes ? new Date(p.advisory.return_window_closes).toISOString().slice(11, 16) + ' UTC' : '--';
      heading.textContent = t('advisory.caution', { time: timeStr });
    } else {
      var timeStr2 = p && p.advisory.return_window_closes ? new Date(p.advisory.return_window_closes).toISOString().slice(11, 16) + ' UTC' : '--';
      heading.textContent = t('advisory.safe_until', { time: timeStr2 });
    }

    if (win && ev.returnWindowMs) {
      var remain = Math.max(0, ev.returnWindowMs - Date.now());
      var h = Math.floor(remain / 3600000), m = Math.floor((remain % 3600000) / 60000);
      win.textContent = t('advisory.return_window', { h: h, m: m });
    } else if (win) {
      win.textContent = '';
    }

    if (locSub) {
      var strip = ev.ladder === 'LIVE' ? t('status.live') : (ev.ladder === 'DEGRADED' ? t('status.degraded__SAFETY', { hours: ev.staleHours }) : '');
      locSub.textContent = strip;
    }
    updateReadings(p ? p.advisory.readings : null);
  }

  function updateReadings(readings) {
    var map = { sst: '°C', swell: 'm', wind: 'kt' };
    Object.keys(map).forEach(function (k) {
      var valEl = document.getElementById('rc-' + k);
      var srcEl = document.getElementById('rc-' + k + '-src');
      if (!valEl) return;
      var ev = readings && readings[k];
      if (ev && ev.value != null) {
        valEl.textContent = ev.value + map[k];
        if (srcEl) srcEl.textContent = ev.source + ' · ' + ev.confidence;
      } else {
        valEl.textContent = '—';
        if (srcEl) srcEl.textContent = t('status.expired__SAFETY');
      }
    });
  }

  function renderPosition(packet) {
    var tag = document.getElementById('coord-tag');
    var coastInfo = document.getElementById('coast-info');
    if (!tag) return;
    if (packet && packet.position) {
      tag.textContent = packet.position.lat.toFixed(2) + '°N ' + packet.position.lon.toFixed(2) + '°E';
      if (coastInfo) {
        var p = packet.position;
        if (p.distance_km != null) {
          coastInfo.innerHTML = '<b></b> from ' + p.nearest_port + ' · ' + p.region;
          coastInfo.querySelector('b').textContent = '~' + p.distance_km + 'km';
        } else {
          coastInfo.textContent = 'Distance to coast unavailable — reconnect to refresh';
        }
      }
    } else {
      tag.textContent = '--';
      if (coastInfo) coastInfo.textContent = 'Distance to coast — no packet cached yet';
    }
    var smsNote = document.getElementById('sms-fallback-note');
    if (smsNote && packet) {
      smsNote.textContent = packet.sms_gateway_number
        ? t('tip.sms_fallback_configured', { number: packet.sms_gateway_number })
        : t('tip.sms_fallback_unconfigured');
    }
  }

  function renderChart(ev) {
    var headingEl = document.getElementById('route-heading-text');
    var guidanceEl = document.getElementById('guidance-text');
    if (!ev.packet) return;
    var hourly = ev.packet.hourly_forecast || [];
    var peak = hourly.reduce(function (m, h) { return h.swell_m > (m ? m.swell_m : 0) ? h : m; }, null);
    if (headingEl) headingEl.textContent = t('chart.time_from_shore', { h: hourly.length });
    if (guidanceEl && peak) {
      guidanceEl.textContent = t('chart.guidance', { heading: '240° SW', wave: peak.swell_m + 'm' });
    }
  }

  // ---------------- Twin Trip Plan (shared with the Command Deck) ----------------
  var tpMiniLocalPushUntil = 0;
  function applyTripPlanToMiniUI(plan) {
    var dSlider = document.getElementById('tp-mini-departure');
    var durSlider = document.getElementById('tp-mini-duration');
    var sSlider = document.getElementById('tp-mini-speed');
    if (dSlider) dSlider.value = plan.departure_hour;
    if (durSlider) durSlider.value = plan.duration_hours;
    if (sSlider) sSlider.value = plan.cruise_speed_kt;
    var h = Math.floor(plan.departure_hour), m = (plan.departure_hour % 1) ? '30' : '00';
    var dVal = document.getElementById('tp-mini-departure-val');
    var durVal = document.getElementById('tp-mini-duration-val');
    var sVal = document.getElementById('tp-mini-speed-val');
    if (dVal) dVal.textContent = String(h).padStart(2, '0') + ':' + m;
    if (durVal) durVal.textContent = plan.duration_hours.toFixed(1);
    if (sVal) sVal.textContent = plan.cruise_speed_kt.toFixed(1);

    var fuelEl = document.getElementById('fuel-value');
    var nrpEl = document.getElementById('nrp-value');
    if (fuelEl) fuelEl.innerHTML = plan.fuel_estimate_l + '<span style="font-size:12px;color:var(--ink-faint)">/' + plan.fuel_limit_l + 'L</span>';
    if (nrpEl) nrpEl.textContent = plan.point_of_no_return;

    var syncEl = document.getElementById('tp-mini-sync');
    if (syncEl) syncEl.textContent = plan.updated_by === 'wayfinder' ? 'by you' : 'by ' + plan.updated_by;
  }
  function fetchTripPlanMini() {
    fetch(API + '/api/trip-plan/' + DEMO_VESSEL_ID)
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (plan) { if (Date.now() > tpMiniLocalPushUntil) applyTripPlanToMiniUI(plan); })
      .catch(function () {});
  }
  function pushTripPlanMini() {
    var departure = parseFloat(document.getElementById('tp-mini-departure').value);
    var duration = parseFloat(document.getElementById('tp-mini-duration').value);
    var speed = parseFloat(document.getElementById('tp-mini-speed').value);
    tpMiniLocalPushUntil = Date.now() + 3000;
    fetch(API + '/api/trip-plan/' + DEMO_VESSEL_ID, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departure_hour: departure, duration_hours: duration, cruise_speed_kt: speed, fuel_limit_l: 50, source: 'wayfinder' }),
    }).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(applyTripPlanToMiniUI)
      .catch(function () {});
  }
  ['tp-mini-departure', 'tp-mini-duration', 'tp-mini-speed'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      var h = Math.floor(el.value), m = (el.value % 1) ? '30' : '00';
      if (id === 'tp-mini-departure') {
        document.getElementById('tp-mini-departure-val').textContent = String(h).padStart(2, '0') + ':' + m;
      } else {
        document.getElementById(id + '-val').textContent = parseFloat(el.value).toFixed(1);
      }
    });
    el.addEventListener('change', pushTripPlanMini);
  });
  fetchTripPlanMini();
  setInterval(fetchTripPlanMini, 4000);

  function renderCrisisContext(ev) {
    var distEl = document.getElementById('crisis-distance');
    var transcript = document.getElementById('crisis-transcript-text');
    if (distEl) {
      distEl.textContent = ev.distanceKm != null ? t('crisis.distance_to_boundary', { km: ev.distanceKm }) : '--';
    }
    if (transcript && ev.approachingBoundary) {
      transcript.textContent = t('crisis.transcript_body__SAFETY', { mins: 18, heading: '045° NE' });
    }
  }

  setInterval(render, 15000);

  // ---------------- Tabs ----------------
  var views = document.querySelectorAll('[data-view]');
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.dataset.tab;
      views.forEach(function (v) { v.hidden = (v.dataset.view !== name); });
      document.querySelectorAll('.tabbar .tab-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.tab === name);
      });
    });
  });

  function goToCrisis() {
    views.forEach(function (v) { v.hidden = (v.dataset.view !== 'crisis'); });
    document.querySelectorAll('.tabbar .tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === 'crisis');
    });
  }

  // ---------------- Language switcher ----------------
  var langSelect = document.getElementById('lang-switch');
  if (langSelect) {
    langSelect.value = CURRENT_LANG;
    langSelect.addEventListener('change', function () {
      setLang(langSelect.value);
    });
  }

  // ---------------- Species lookup ----------------
  var speciesInput = document.getElementById('species-input');
  var speciesResult = document.getElementById('species-result');
  var speciesLangFilter = document.getElementById('species-lang-filter');
  var debounceTimer = null;
  if (speciesLangFilter) speciesLangFilter.value = CURRENT_LANG;

  function renderSpeciesRow(row) {
    if (!row) { speciesResult.textContent = t('species.not_found'); return; }
    speciesResult.textContent = t('species.envelope', {
      name: row.vernacular_name, sci: row.scientific_name,
      sstmin: row.sst_min_c, sstmax: row.sst_max_c,
      depthmin: row.depth_min_m, depthmax: row.depth_max_m,
    });
  }
  function searchSpeciesOffline(q, lang) {
    return idbGet('packet', DEMO_VESSEL_ID).then(function (packet) {
      var rows = (packet && packet.species_lexicon) || [];
      if (lang) rows = rows.filter(function (r) { return r.language === lang; });
      var qn = q.trim().toLowerCase();
      var exact = rows.find(function (r) { return r.vernacular_name.toLowerCase() === qn; });
      if (exact) return exact;
      return rows.find(function (r) {
        var name = r.vernacular_name.toLowerCase();
        return name.indexOf(qn) !== -1 || qn.indexOf(name) !== -1;
      }) || null;
    });
  }
  function runSpeciesSearch() {
    var q = speciesInput.value;
    var lang = speciesLangFilter ? speciesLangFilter.value : '';
    if (!q.trim()) { speciesResult.textContent = ''; return; }
    if (isOnline()) {
      fetch(API + '/api/species/resolve?q=' + encodeURIComponent(q) + (lang ? '&lang=' + lang : ''))
        .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
        .then(renderSpeciesRow)
        .catch(function () { searchSpeciesOffline(q, lang).then(renderSpeciesRow); });
    } else {
      searchSpeciesOffline(q, lang).then(renderSpeciesRow);
    }
  }
  if (speciesInput) {
    speciesInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSpeciesSearch, 250);
    });
  }
  if (speciesLangFilter) {
    speciesLangFilter.addEventListener('change', function () {
      if (speciesInput.value.trim()) runSpeciesSearch();
    });
  }

  // ---------------- Climate tips (unverified — operator must review) ----------------
  var tipStatusEl = document.getElementById('tip-status');
  function sendOrQueueTip(record) {
    var p;
    if (!isOnline()) {
      p = idbPut('outbox_tip', record).then(function () {
        if (tipStatusEl) tipStatusEl.textContent = t('tip.sent') + ' (' + t('conn.offline') + ' — ' + t('fab.queued', { n: 1 }) + ')';
      });
    } else {
      p = fetch(API + '/api/tips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
        .then(function () { if (tipStatusEl) tipStatusEl.textContent = t('tip.sent'); })
        .catch(function () {
          return idbPut('outbox_tip', record).then(function () {
            if (tipStatusEl) tipStatusEl.textContent = t('tip.sent') + ' (queued)';
          });
        });
    }
    return p.catch(function (e) {
      if (tipStatusEl) tipStatusEl.textContent = t('tip.failed') + (e && e.message ? ' (' + e.message + ')' : '');
    });
  }
  document.querySelectorAll('.tip-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var pos = lastEval && lastEval.packet && lastEval.packet.position;
      var record = {
        id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
        vessel_id: DEMO_VESSEL_ID, tip_type: chip.dataset.tip,
        lat: pos ? pos.lat : null, lon: pos ? pos.lon : null, synced: false,
      };
      document.querySelectorAll('.tip-chip').forEach(function (c) { c.disabled = true; });
      if (tipStatusEl) tipStatusEl.textContent = t('tip.sending');
      sendOrQueueTip(record).finally(function () {
        document.querySelectorAll('.tip-chip').forEach(function (c) { c.disabled = false; });
      });
    });
  });

  // ---------------- FAB: hold-to-record catch report ----------------
  var fabBtn = document.getElementById('fab-report');
  var fabLabel = document.getElementById('fab-label');
  var fabBadge = document.getElementById('fab-badge');
  var mediaRecorder = null;
  var recordedChunks = [];
  var holding = false;

  function updateFabBadge() {
    idbGetAll('outbox_catch').then(function (rows) {
      var pending = rows.filter(function (r) { return !r.synced; });
      if (pending.length > 0) {
        fabBadge.hidden = false;
        fabBadge.textContent = String(pending.length);
      } else {
        fabBadge.hidden = true;
      }
    });
  }

  function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // No mic access available — still queue a text-only catch report so nothing is lost.
      queueCatchReport(null);
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      recordedChunks = [];
      try {
        mediaRecorder = new MediaRecorder(stream);
      } catch (e) {
        queueCatchReport(null);
        return;
      }
      mediaRecorder.ondataavailable = function (e) { if (e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = function () {
        stream.getTracks().forEach(function (tr) { tr.stop(); });
        var blob = recordedChunks.length ? new Blob(recordedChunks, { type: 'audio/webm' }) : null;
        queueCatchReport(blob);
      };
      mediaRecorder.start();
      holding = true;
      fabBtn.classList.add('recording');
      fabLabel.textContent = t('fab.recording');
    }).catch(function () {
      queueCatchReport(null);
    });
  }

  function stopRecording() {
    if (mediaRecorder && holding) {
      mediaRecorder.stop();
    }
    holding = false;
    fabBtn.classList.remove('recording');
    fabLabel.textContent = t('fab.hold_to_report');
  }

  function queueCatchReport(blob) {
    var pos = lastEval && lastEval.packet && lastEval.packet.position;
    var record = {
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      vessel_id: DEMO_VESSEL_ID,
      ts: new Date().toISOString(),
      lat: pos ? pos.lat : null,
      lon: pos ? pos.lon : null,
      note: blob ? 'Voice catch report (' + Math.round(blob.size / 1024) + 'KB, unsynced audio kept locally)' : 'Catch report (no audio)',
      audio: blob || null,
      synced: false,
    };
    idbPut('outbox_catch', record).then(function () {
      updateFabBadge();
      if (isOnline()) flushOutboxes();
    });
  }

  ['pointerdown'].forEach(function (evt) {
    fabBtn.addEventListener(evt, function (e) { e.preventDefault(); startRecording(); });
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
    fabBtn.addEventListener(evt, function () { if (holding) stopRecording(); });
  });

  // ---------------- Crisis ack outbox ----------------
  var currentAlertId = 'demo-static-alert';
  var ackBtn = document.getElementById('ack-btn');
  if (ackBtn) {
    ackBtn.addEventListener('click', function () {
      var receipt = {
        receipt_id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
        vessel_id: DEMO_VESSEL_ID,
        alert_id: currentAlertId,
        acknowledged_at: new Date().toISOString(),
        channel: 'app',
        language: CURRENT_LANG,
        packet_version: lastEval && lastEval.packet ? lastEval.packet.packet_version : null,
        synced: false,
      };
      idbPut('outbox_ack', receipt).then(function () {
        ackBtn.disabled = true;
        ackBtn.querySelector('span').textContent = t('crisis.acknowledged');
        if (isOnline()) flushOutboxes();
      });
    });
  }

  function flushOutboxes() {
    idbGetAll('outbox_ack').then(function (rows) {
      rows.filter(function (r) { return !r.synced; }).forEach(function (r) {
        fetch(API + '/api/ack', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receipt_id: r.receipt_id, vessel_id: r.vessel_id, alert_id: r.alert_id,
            acknowledged_at: r.acknowledged_at, channel: r.channel, language: r.language,
            packet_version: r.packet_version,
          }),
        }).then(function (res) {
          if (res.ok) { r.synced = true; idbPut('outbox_ack', r); }
        }).catch(function () { /* stays queued, will retry on next online event */ });
      });
    });
    idbGetAll('outbox_catch').then(function (rows) {
      rows.filter(function (r) { return !r.synced; }).forEach(function (r) {
        fetch(API + '/api/catch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: r.id, vessel_id: r.vessel_id, ts: r.ts, lat: r.lat, lon: r.lon, note: r.note }),
        }).then(function (res) {
          if (res.ok) { r.synced = true; idbPut('outbox_catch', r).then(updateFabBadge); }
        }).catch(function () { /* stays queued */ });
      });
    });
    idbGetAll('outbox_tip').then(function (rows) {
      rows.filter(function (r) { return !r.synced; }).forEach(function (r) {
        fetch(API + '/api/tips', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vessel_id: r.vessel_id, tip_type: r.tip_type, lat: r.lat, lon: r.lon }),
        }).then(function (res) {
          if (res.ok) idbDelete('outbox_tip', r.id);
        }).catch(function () { /* stays queued */ });
      });
    });
  }
  setInterval(function () { if (isOnline()) flushOutboxes(); }, 20000);

  // ---------------- Text-to-speech for crisis alerts ----------------
  function speak(text, lang) {
    if (!('speechSynthesis' in window)) return; // text stays visible either way — never fails silently
    var tag = lang === 'hi' ? 'hi-IN' : (lang === 'mr' ? 'mr-IN' : 'en-IN');
    var voices = speechSynthesis.getVoices();
    var voice = voices.find(function (v) { return v.lang === tag; }) || voices.find(function (v) { return v.lang.indexOf(lang) === 0; });
    var utter = new SpeechSynthesisUtterance(text);
    if (voice) utter.voice = voice;
    utter.lang = tag;
    speechSynthesis.speak(utter);
  }

  // ---------------- Live alert channel (online only) ----------------
  // Two independent paths reach the same handler: SSE push (instant, but some
  // proxies/tunnels buffer long-lived streams and silently drop it) and short
  // polling (slower, but works anywhere plain HTTP works). Whichever notices
  // a new alert first wins; the dedupe on lastSeenAlertId makes replaying the
  // same alert from the other path harmless.
  var lastSeenAlertId = null;
  var sawFirstPoll = false;

  function handleIncomingAlert(data) {
    if (!data || data.vessel_id !== DEMO_VESSEL_ID) return;
    if (data.id === lastSeenAlertId) return;
    lastSeenAlertId = data.id;
    currentAlertId = data.id;
    var transcript = document.getElementById('crisis-transcript-text');
    if (transcript) transcript.textContent = data.message;
    if (ackBtn) { ackBtn.disabled = false; ackBtn.querySelector('span').textContent = t('crisis.ack_button'); }
    goToCrisis();
    speak(data.message, data.language || CURRENT_LANG);
  }

  var sse = null;
  function connectSSE() {
    if (!isOnline() || sse) return;
    try {
      sse = new EventSource(API + '/api/events');
      sse.addEventListener('alert', function (e) { handleIncomingAlert(JSON.parse(e.data)); });
      sse.addEventListener('trip_plan', function (e) {
        try {
          var plan = JSON.parse(e.data);
          if (plan.vessel_id === DEMO_VESSEL_ID && Date.now() > tpMiniLocalPushUntil) applyTripPlanToMiniUI(plan);
        } catch (err) {}
      });
      sse.onerror = function () { if (sse) { sse.close(); sse = null; setTimeout(connectSSE, 5000); } };
    } catch (e) { /* SSE unsupported — polling below still covers it */ }
  }

  function pollForAlerts() {
    if (!isOnline()) return;
    fetch(API + '/api/alerts/latest?vessel_id=' + encodeURIComponent(DEMO_VESSEL_ID))
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (data) {
        if (!sawFirstPoll) {
          // Baseline on first poll so we don't jump to Crisis for an alert that
          // was already sitting there before this page ever loaded.
          sawFirstPoll = true;
          lastSeenAlertId = data ? data.id : null;
          return;
        }
        if (data) handleIncomingAlert(data);
      })
      .catch(function () { /* try again next tick */ });
  }
  setInterval(pollForAlerts, 4000);

  // ---------------- Service worker ----------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  // ---------------- Boot ----------------
  loadLocale(CURRENT_LANG).then(function () {
    applyStaticTranslations();
    setConnBadge();
    render();
    updateFabBadge();
    if (isOnline()) {
      refreshPacket();
      connectSSE();
      flushOutboxes();
      pollForAlerts();
    }
  });

  document.getElementById('relay-btn') && document.getElementById('relay-btn').addEventListener('click', function () {
    var btn = document.getElementById('relay-btn');
    var original = btn.innerHTML;
    btn.style.opacity = '.7';
    setTimeout(function () { btn.style.opacity = '1'; }, 1000);
  });

  window.__jalavita_debug = { render: render, evaluateOffline: evaluateOffline, refreshPacket: refreshPacket };
})();
