(function () {
  'use strict';

  var DATA = window.CONF_DATA || {};
  var S = DATA.settings || {};
  var SESSIONS = (DATA.sessions || []).filter(function (s) { return s.date && s.startMin != null; });
  var KEYNOTES = DATA.keynotes || [];
  var ROOMS = DATA.rooms || [];
  var PARTNERS = DATA.partners || [];
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NARROW = window.matchMedia('(max-width: 899px)');

  /* Colors per session format. Unknown formats get a neutral slate. */
  var FORMAT_COLORS = {
    'keynote': '#00205B',
    'workshop': '#1F6F8B',
    'research-talks': '#6A4C93',
    'roundtable': '#B5651D',
    'panel': '#BF0D3E',
    'levelup': '#2E7D4F',
    'magic-stem': '#2F5DA8',
    'meals-gatherings': '#6B7385'
  };

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slug(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function color(format) { return FORMAT_COLORS[slug(format)] || '#5A6478'; }
  function safeUrl(u) { return /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : ''; }
  function extLink(url, label, cls) {
    url = safeUrl(url);
    return url ? '<a class="' + (cls || '') + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>' : '';
  }
  function paras(text) {
    return String(text || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function parseDate(iso) { var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function fmtDate(iso, opts) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || '';
    return parseDate(iso).toLocaleDateString('en-US', opts || { weekday: 'long', month: 'long', day: 'numeric' });
  }
  function fmtTime(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM');
  }
  function range(s) { return s.endMin != null ? fmtTime(s.startMin) + ' – ' + fmtTime(s.endMin) : fmtTime(s.startMin); }
  function initials(name) {
    return String(name || '').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; })
      .filter(function (c) { return /[A-Za-z]/.test(c); }).slice(0, 2).join('').toUpperCase();
  }
  function uniq(arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); }

  var STAR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';
  var STAR_OUTLINE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';

  /* ---------- my schedule (kept in this browser only) ---------- */
  var STAR_KEY = 'conf-schedule-' + slug((S.shortName || 'conf') + '-' + (S.year || ''));
  var starred = {};
  try { (JSON.parse(localStorage.getItem(STAR_KEY) || '[]') || []).forEach(function (id) { starred[id] = true; }); } catch (e) {}
  function saveStars() { try { localStorage.setItem(STAR_KEY, JSON.stringify(Object.keys(starred))); } catch (e) {} }
  function starCount() { return SESSIONS.filter(function (s) { return starred[s.id]; }).length; }

  /* ---------- page shell ---------- */
  function renderShell() {
    var brand = [S.shortName, S.year].filter(Boolean).join(' ') || S.conferenceName || 'Conference';
    $('#brand').textContent = brand;

    var nav = [];
    if (KEYNOTES.length) nav.push('<a class="nav-link" href="#keynotes" data-scroll>Keynotes</a>');
    nav.push('<a class="nav-link" href="#program" data-scroll>Program</a>');
    if (ROOMS.length || S.venue) nav.push('<a class="nav-link" href="#venue" data-scroll>Venue</a>');
    if (PARTNERS.length) nav.push('<a class="nav-link" href="#partners" data-scroll>Partners</a>');
    nav.push(extLink(S.registerUrl, S.registerLabel || 'Register', 'btn btn-primary'));
    $('#nav').innerHTML = nav.join('');

    var facts = [];
    if (S.dateLabel) facts.push('<div><dt>When</dt><dd>' + esc(S.dateLabel) + '</dd></div>');
    if (S.location) facts.push('<div><dt>Where</dt><dd>' + esc(S.location) + '</dd></div>');

    $('#hero').innerHTML =
      '<div class="wrap">' +
        '<p class="hero-edition">' + esc([S.edition, S.conferenceName].filter(Boolean).join(' ')) + '</p>' +
        '<h1 class="hero-theme">' + esc(S.theme || S.conferenceName || brand) + '</h1>' +
        (S.subtitle ? '<p class="hero-sub">' + esc(S.subtitle) + '</p>' : '') +
        (facts.length ? '<dl class="hero-facts">' + facts.join('') + '</dl>' : '') +
        '<div class="hero-actions">' +
          extLink(S.registerUrl, S.registerLabel || 'Register', 'btn btn-primary') +
          '<a class="btn btn-light" href="#program" data-scroll>Browse the program</a>' +
        '</div>' +
      '</div>';

    if (S.welcomeText) {
      var w = $('#welcome');
      w.hidden = false;
      w.innerHTML = '<div class="wrap">' +
        '<h2 class="section-title">' + esc(S.welcomeHeading || 'Welcome') + '</h2>' +
        '<div class="prose">' + paras(S.welcomeText) +
        (S.welcomeSignature ? '<p class="signature">' + esc(S.welcomeSignature) + '</p>' : '') +
        '</div></div>';
    }

    var foot = $('#footer');
    foot.innerHTML = '<div class="wrap">' +
      '<div><p class="footer-title">' + esc([S.edition, S.conferenceName].filter(Boolean).join(' ')) + '</p>' +
      (S.host ? '<p style="margin:0">Hosted by ' + esc(S.host) + '</p>' : '') +
      (/^[^\s@]+@[^\s@]+$/.test(S.contactEmail || '') ? '<p style="margin:.35rem 0 0">Questions? <a href="mailto:' + esc(S.contactEmail) + '">' + esc(S.contactEmail) + '</a></p>' : '') +
      '</div>' +
      (S.hashtag ? '<p class="footer-tag">' + esc(S.hashtag) + '</p>' : '') +
      '</div>';
  }

  /* ---------- keynotes ---------- */
  function renderKeynotes() {
    if (!KEYNOTES.length) return;
    var el = $('#keynotes');
    el.hidden = false;
    el.innerHTML = '<div class="wrap">' +
      '<h2 class="section-title">Keynote speakers</h2>' +
      '<p class="section-lede">' + esc(keynoteLede()) + '</p>' +
      '<div class="keynotes">' + KEYNOTES.map(function (k, i) {
        var when = [fmtDate(k.date), k.time].filter(Boolean).join(', ');
        var photo = safeUrl(k.photoUrl)
          ? '<img class="keynote-photo" src="' + esc(safeUrl(k.photoUrl)) + '" alt="">'
          : '<span class="monogram" aria-hidden="true">' + esc(initials(k.name)) + '</span>';
        var long = String(k.abstract || '').length > 420;
        return '<article class="keynote">' +
          (when ? '<div class="keynote-when">' + esc(when) + '</div>' : '') +
          '<div class="keynote-person">' + photo + '<div><h3>' + esc(k.name) + '</h3>' +
            '<p class="keynote-role">' + esc(k.role) + (k.affiliation ? '<br>' + esc(k.affiliation) : '') + '</p></div></div>' +
          (k.talkTitle ? '<p class="keynote-talk">' + esc(k.talkTitle) + '</p>' : '') +
          '<div class="keynote-abstract' + (long ? ' is-clamped' : '') + '" id="abstract-' + i + '">' + paras(k.abstract) + '</div>' +
          (long ? '<button class="text-btn" data-expand="abstract-' + i + '" aria-expanded="false">Read the full abstract</button>' : '') +
        '</article>';
      }).join('') + '</div></div>';
  }
  function keynoteLede() {
    var rooms = uniq(SESSIONS.filter(function (s) { return slug(s.format) === 'keynote'; }).map(function (s) { return s.room; }));
    return rooms.length === 1 ? 'Each keynote takes place in the ' + rooms[0] + '.' : 'Open to everyone attending, in person or online.';
  }

  /* ---------- program ---------- */
  var DAYS = uniq(SESSIONS.map(function (s) { return s.date; })).sort();
  var FORMATS = uniq(SESSIONS.map(function (s) { return s.format; })).sort(function (a, b) {
    // Keynote first, meals last, everything else alphabetical.
    var rank = function (f) { return slug(f) === 'keynote' ? 0 : slug(f) === 'meals-gatherings' ? 2 : 1; };
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  var today = new Date();
  var todayIso = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);

  var state = {
    day: DAYS.indexOf(todayIso) >= 0 ? todayIso : DAYS[0],
    view: 'grid',
    q: '',
    formats: {},
    mine: false
  };

  function anyFormat() { return Object.keys(state.formats).length > 0; }
  function filtersActive() { return !!state.q || anyFormat() || state.mine; }
  function haystack(s) {
    return [s.title, s.presenters, s.room, s.format, s.description]
      .concat((s.talks || []).map(function (t) { return t.title + ' ' + t.presenters; }))
      .join(' ').toLowerCase();
  }
  function matches(s) {
    if (state.mine && !starred[s.id]) return false;
    if (anyFormat() && !state.formats[s.format]) return false;
    if (state.q) {
      var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      var h = haystack(s);
      if (!words.every(function (w) { return h.indexOf(w) >= 0; })) return false;
    }
    return true;
  }

  function renderProgramFrame() {
    var el = $('#program');
    if (!SESSIONS.length) {
      el.innerHTML = '<div class="wrap"><h2 class="section-title" id="program-title">Program</h2>' +
        '<p class="section-lede">The full program will be posted here soon.</p></div>';
      return;
    }
    el.innerHTML = '<div class="wrap">' +
      '<div class="program-head">' +
        '<div><h2 class="section-title" id="program-title">Program</h2>' +
        '<p class="section-lede">' + esc(SESSIONS.length + ' sessions across ' + DAYS.length + (DAYS.length === 1 ? ' day' : ' days') + '. Select a session for details, or star it to build your own schedule.') + '</p></div>' +
        extLink(S.platformUrl, S.platformLabel || 'Read the abstracts', 'btn btn-outline') +
      '</div>' +
      '<div class="day-tabs" role="tablist" aria-label="Conference days">' + DAYS.map(function (d) {
        return '<button class="day-tab" role="tab" data-day="' + d + '" aria-controls="program-body">' +
          '<strong>' + esc(fmtDate(d, { weekday: 'long' })) + '</strong><span>' + esc(fmtDate(d, { month: 'long', day: 'numeric' })) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="program-tools">' +
        '<label class="search"><span class="sr-only">Search sessions</span>' +
          '<input id="program-search" type="search" placeholder="Search titles, presenters, or rooms" autocomplete="off"></label>' +
        '<div class="seg view-toggle" role="group" aria-label="Layout">' +
          '<button data-view="grid">By room</button><button data-view="list">List</button></div>' +
        '<button class="mine-toggle" data-mine aria-pressed="false">My schedule (<span id="mine-count">0</span>)</button>' +
      '</div>' +
      '<div class="format-filters" role="group" aria-label="Filter by session format">' + FORMATS.map(function (f) {
        return '<button class="chip" data-format="' + esc(f) + '" aria-pressed="false" style="--fmt:' + color(f) + '">' + esc(f) + '</button>';
      }).join('') + '</div>' +
      '<p class="filter-status" id="filter-status" aria-live="polite"></p>' +
      '<div id="program-body" role="tabpanel"></div>' +
      (S.timezoneLabel ? '<p class="tz-note">' + esc(S.timezoneLabel) + '</p>' : '') +
    '</div>';
  }

  function slotsFor(day) {
    var byStart = {};
    SESSIONS.forEach(function (s) {
      if (s.date !== day) return;
      (byStart[s.startMin] = byStart[s.startMin] || []).push(s);
    });
    return Object.keys(byStart).map(Number).sort(function (a, b) { return a - b; }).map(function (start) {
      var items = byStart[start];
      var ends = items.map(function (s) { return s.endMin; }).filter(function (v) { return v != null; });
      return { start: start, end: ends.length ? Math.max.apply(null, ends) : null, items: items };
    });
  }

  // Columns for the grid: rooms that host parallel sessions. Rooms used only for
  // all-conference events (breakfast, keynotes) get a full-width row instead.
  function roomsFor(day, slots) {
    var parallel = [];
    slots.forEach(function (slot) {
      if (slot.items.length > 1) slot.items.forEach(function (s) { parallel.push(s.room); });
    });
    var used = uniq(parallel.length ? parallel : SESSIONS.filter(function (s) { return s.date === day; }).map(function (s) { return s.room; }));
    var ordered = ROOMS.map(function (r) { return r.name; }).filter(function (n) { return used.indexOf(n) >= 0; });
    return ordered.concat(used.filter(function (n) { return ordered.indexOf(n) < 0; }));
  }

  function starButton(s) {
    var on = !!starred[s.id];
    return '<button class="star" data-star="' + esc(s.id) + '" aria-pressed="' + on + '" aria-label="' +
      (on ? 'Remove from my schedule: ' : 'Add to my schedule: ') + esc(s.title) + '">' + (on ? STAR_ICON : STAR_OUTLINE) + '</button>';
  }

  function card(s, opts) {
    opts = opts || {};
    var talks = s.talks || [];
    var people = talks.length ? talks.length + ' talks' : s.presenters;
    return '<article class="card' + (opts.wide ? ' is-wide' : '') + (opts.dim ? ' is-dim' : '') + (s.featured ? ' is-featured' : '') +
      '" style="--fmt:' + color(s.format) + '">' +
      (slug(s.title) === slug(s.format) ? '' : '<span class="card-format">' + esc(s.format) + (s.featured ? ', featured' : '') + '</span>') +
      '<button class="card-open" data-open="' + esc(s.id) + '">' + esc(s.title) + '</button>' +
      (people ? '<div class="card-people">' + esc(people) + '</div>' : '') +
      (talks.length && !opts.compact ? '<ol class="card-talks">' + talks.map(function (t) { return '<li>' + esc(t.title) + '</li>'; }).join('') + '</ol>' : '') +
      (opts.meta ? '<div class="card-meta">' + esc(opts.meta) + '</div>' : '') +
      starButton(s) +
    '</article>';
  }

  function renderGrid(slots, rooms) {
    var html = '<div class="grid-scroll"><table class="grid"><thead><tr><th scope="col" class="time-col"><span class="sr-only">Time</span></th>' +
      rooms.map(function (r) { return '<th scope="col">' + esc(r) + '</th>'; }).join('') + '</tr></thead><tbody>';
    slots.forEach(function (slot) {
      html += '<tr><th scope="row" class="time-col">' + esc(fmtTime(slot.start)) +
        (slot.end != null ? '<small>to ' + esc(fmtTime(slot.end)) + '</small>' : '') + '</th>';
      if (slot.items.length === 1) {
        var s = slot.items[0];
        html += '<td class="wide" colspan="' + rooms.length + '">' + card(s, { wide: true, dim: !matches(s), meta: s.room }) + '</td>';
      } else {
        rooms.forEach(function (r) {
          var here = slot.items.filter(function (s) { return s.room === r; });
          html += '<td>' + here.map(function (s) {
            return card(s, { dim: !matches(s), meta: s.endMin != null && s.endMin !== slot.end ? 'Ends ' + fmtTime(s.endMin) : '' });
          }).join('') + '</td>';
        });
      }
      html += '</tr>';
    });
    return html + '</tbody></table></div>';
  }

  function renderList(slots) {
    var html = '';
    slots.forEach(function (slot) {
      var items = slot.items.filter(matches);
      if (!items.length) return;
      html += '<section class="slot"><h3 class="slot-time">' + esc(fmtTime(slot.start)) +
        (slot.end != null ? '<small>to ' + esc(fmtTime(slot.end)) + '</small>' : '') + '</h3><div class="slot-items">' +
        items.map(function (s) { return card(s, { meta: s.room + (s.endMin != null && s.endMin !== slot.end ? ', ends ' + fmtTime(s.endMin) : '') }); }).join('') +
        '</div></section>';
    });
    return html;
  }

  function renderProgram() {
    if (!SESSIONS.length) return;
    var body = $('#program-body');
    var slots = slotsFor(state.day);
    var daySessions = SESSIONS.filter(function (s) { return s.date === state.day; });
    var shown = daySessions.filter(matches).length;
    var view = NARROW.matches ? 'list' : state.view;

    // Controls reflect state
    Array.prototype.forEach.call(document.querySelectorAll('.day-tab'), function (b) {
      var on = b.getAttribute('data-day') === state.day;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === state.view);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (b) {
      b.setAttribute('aria-pressed', !!state.formats[b.getAttribute('data-format')]);
    });
    $('[data-mine]').setAttribute('aria-pressed', state.mine);
    $('#mine-count').textContent = starCount();

    var status = $('#filter-status');
    status.innerHTML = filtersActive()
      ? esc('Showing ' + shown + ' of ' + daySessions.length + ' sessions on ' + fmtDate(state.day, { weekday: 'long' }) + '.') +
        '<button class="text-btn" data-clear>Clear filters</button>'
      : '';

    if (!shown) {
      body.innerHTML = '<div class="empty">' + (state.mine && !starCount()
        ? '<p>Your schedule is empty. Star sessions in the program to add them here.</p><button class="btn btn-outline" data-mine>Show all sessions</button>'
        : '<p>No sessions on this day match your filters.</p><button class="btn btn-outline" data-clear>Clear filters</button>') + '</div>';
      return;
    }
    body.innerHTML = view === 'grid' ? renderGrid(slots, roomsFor(state.day, slots)) : renderList(slots);
  }

  /* ---------- session details ---------- */
  function findSession(id) { for (var i = 0; i < SESSIONS.length; i++) if (SESSIONS[i].id === id) return SESSIONS[i]; return null; }
  function keynoteFor(s) {
    if (slug(s.format) !== 'keynote') return null;
    for (var i = 0; i < KEYNOTES.length; i++) {
      var k = KEYNOTES[i];
      if ((s.presenters && k.name && s.presenters.indexOf(k.name) >= 0) || (k.talkTitle && k.talkTitle === s.title)) return k;
    }
    return null;
  }
  function calendarUrl(s) {
    var d = s.date.replace(/-/g, '');
    var t = function (min) { return d + 'T' + ('0' + Math.floor(min / 60)).slice(-2) + ('0' + (min % 60)).slice(-2) + '00'; };
    var params = {
      action: 'TEMPLATE',
      text: s.title + (S.shortName ? ' (' + [S.shortName, S.year].filter(Boolean).join(' ') + ')' : ''),
      dates: t(s.startMin) + '/' + t(s.endMin != null ? s.endMin : s.startMin + 60),
      details: [s.presenters, (s.talks || []).map(function (x) { return x.title + (x.presenters ? ' (' + x.presenters + ')' : ''); }).join('\n')].filter(Boolean).join('\n\n'),
      location: [s.room, S.location].filter(Boolean).join(', ')
    };
    if (S.timezone) params.ctz = S.timezone;
    return 'https://calendar.google.com/calendar/render?' + Object.keys(params).map(function (k) {
      return k + '=' + encodeURIComponent(params[k]);
    }).join('&');
  }

  var dialog = $('#session-dialog');
  var lastFocus = null;

  function openSession(id) {
    var s = findSession(id);
    if (!s) return;
    var k = keynoteFor(s);
    var on = !!starred[s.id];
    dialog.style.setProperty('--fmt', color(s.format));
    dialog.innerHTML =
      '<div class="dlg-body">' +
        '<div class="dlg-format">' + esc(s.format) + (s.featured ? ', featured session' : '') + '</div>' +
        '<h2 class="dlg-title" id="dlg-title">' + esc(s.title) + '</h2>' +
        '<p class="dlg-when">' + esc(fmtDate(s.date) + ', ' + range(s)) + '</p>' +
        '<p class="dlg-where">' + esc(s.room || '') + '</p>' +
        (s.presenters ? '<p class="dlg-people">' + esc(s.presenters) + (k && k.affiliation ? ', ' + esc(k.affiliation) : '') + '</p>' : '') +
        ((s.talks || []).length ? '<ol class="dlg-talks">' + s.talks.map(function (t) {
          return '<li><strong>' + esc(t.title) + '</strong>' + (t.presenters ? '<span>' + esc(t.presenters) + '</span>' : '') + '</li>';
        }).join('') + '</ol>' : '') +
        '<div class="dlg-text">' + paras(s.description) + (k ? paras(k.abstract) : '') + '</div>' +
      '</div>' +
      '<div class="dlg-actions">' +
        '<button class="btn ' + (on ? 'btn-outline' : 'btn-primary') + '" data-star="' + esc(s.id) + '" aria-pressed="' + on + '">' +
          (on ? 'Remove from my schedule' : 'Add to my schedule') + '</button>' +
        extLink(calendarUrl(s), 'Add to Google Calendar', 'btn btn-outline') +
        '<button class="btn btn-outline close" data-close>Close</button>' +
      '</div>';
    lastFocus = document.activeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    $('.dlg-title', dialog).setAttribute('tabindex', '-1');
    $('.dlg-title', dialog).focus();
  }
  function closeDialog() {
    if (dialog.open) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
  }
  dialog.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });

  function toggleStar(id) {
    if (starred[id]) delete starred[id]; else starred[id] = true;
    saveStars();
    renderProgram();
    if (dialog.open) {
      var focusedInDialog = dialog.contains(document.activeElement);
      openSessionRefresh(id, focusedInDialog);
    } else {
      var btn = document.querySelector('.star[data-star="' + cssEscape(id) + '"]');
      if (btn) btn.focus();
    }
  }
  function openSessionRefresh(id, keepFocus) {
    var keep = lastFocus;
    openSession(id);
    lastFocus = keep;
    if (keepFocus) { var b = $('[data-star]', dialog); if (b) b.focus(); }
  }
  function cssEscape(v) { return window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"'); }

  /* ---------- venue & partners ---------- */
  function renderVenue() {
    if (!ROOMS.length && !S.venue) return;
    var el = $('#venue');
    el.hidden = false;
    var groups = [];
    var byBuilding = {};
    ROOMS.forEach(function (r) {
      var b = r.building || 'Rooms';
      if (!byBuilding[b]) { byBuilding[b] = []; groups.push(b); }
      byBuilding[b].push(r);
    });
    el.innerHTML = '<div class="wrap">' +
      '<h2 class="section-title">Venue</h2>' +
      (S.venue ? '<p class="section-lede">' + esc(S.venue) + '</p>' : '') +
      '<div class="venue-grid">' + groups.map(function (b) {
        return '<div class="building"><h3>' + esc(b) + '</h3><ul class="rooms">' + byBuilding[b].map(function (r) {
          return '<li>' + esc(r.name) + (r.notes ? '<span>' + esc(r.notes) + '</span>' : '') + '</li>';
        }).join('') + '</ul></div>';
      }).join('') + '</div>' +
      (safeUrl(S.mapUrl) || safeUrl(S.platformUrl) ? '<div class="venue-actions">' +
        extLink(S.mapUrl, 'Open the campus map', 'btn btn-outline') +
        extLink(S.platformUrl, S.platformLabel || 'Read the abstracts', 'btn btn-outline') + '</div>' : '') +
    '</div>';
  }

  function renderPartners() {
    if (!PARTNERS.length) return;
    var el = $('#partners');
    el.hidden = false;
    var order = [];
    var byType = {};
    PARTNERS.forEach(function (p) {
      if (!byType[p.type]) { byType[p.type] = []; order.push(p.type); }
      byType[p.type].push(p);
    });
    var heading = { Host: 'Hosted by', Partner: 'Partner schools', Sponsor: 'Sponsors' };
    el.innerHTML = '<div class="wrap"><h2 class="section-title">Partners</h2>' +
      '<p class="section-lede">Presenters and attendees come from across the region thanks to these institutions.</p>' +
      order.map(function (type) {
        return '<div class="partner-group"><h3>' + esc(heading[type] || type) + '</h3><ul class="partners">' +
          byType[type].map(function (p) {
            var inner = safeUrl(p.logoUrl) ? '<img src="' + esc(safeUrl(p.logoUrl)) + '" alt="' + esc(p.name) + '">' : esc(p.name);
            return '<li>' + (safeUrl(p.url) ? '<a href="' + esc(safeUrl(p.url)) + '" target="_blank" rel="noopener">' + inner + '</a>' : inner) + '</li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div>';
  }

  /* ---------- events ---------- */
  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var top = target.getBoundingClientRect().top + window.pageYOffset - ($('.site-header').offsetHeight || 0);
    window.scrollTo({ top: id === 'top' ? 0 : top, behavior: REDUCED ? 'auto' : 'smooth' });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-scroll],[data-open],[data-star],[data-close],[data-day],[data-view],[data-format],[data-mine],[data-clear],[data-expand]');
    if (!t) return;
    if (t.hasAttribute('data-scroll')) { e.preventDefault(); scrollToId((t.getAttribute('href') || '#top').slice(1)); return; }
    if (t.hasAttribute('data-open')) { openSession(t.getAttribute('data-open')); return; }
    if (t.hasAttribute('data-star')) { toggleStar(t.getAttribute('data-star')); return; }
    if (t.hasAttribute('data-close')) { closeDialog(); return; }
    if (t.hasAttribute('data-day')) { state.day = t.getAttribute('data-day'); renderProgram(); return; }
    if (t.hasAttribute('data-view')) { state.view = t.getAttribute('data-view'); renderProgram(); return; }
    if (t.hasAttribute('data-format')) {
      var f = t.getAttribute('data-format');
      if (state.formats[f]) delete state.formats[f]; else state.formats[f] = true;
      renderProgram(); return;
    }
    if (t.hasAttribute('data-mine')) { state.mine = !state.mine; renderProgram(); return; }
    if (t.hasAttribute('data-clear')) {
      state.q = ''; state.formats = {}; state.mine = false;
      var input = $('#program-search'); if (input) input.value = '';
      renderProgram(); return;
    }
    if (t.hasAttribute('data-expand')) {
      var box = document.getElementById(t.getAttribute('data-expand'));
      var open = box.classList.toggle('is-clamped') === false;
      t.setAttribute('aria-expanded', open);
      t.textContent = open ? 'Show less' : 'Read the full abstract';
    }
  });

  // Arrow keys move between day tabs.
  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('.day-tab');
    if (!tab || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    var i = DAYS.indexOf(state.day) + (e.key === 'ArrowRight' ? 1 : -1);
    if (i < 0 || i >= DAYS.length) return;
    state.day = DAYS[i];
    renderProgram();
    document.querySelector('.day-tab[data-day="' + state.day + '"]').focus();
  });

  var searchTimer;
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'program-search') return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { state.q = e.target.value.trim(); renderProgram(); }, 150);
  });

  if (NARROW.addEventListener) NARROW.addEventListener('change', renderProgram);
  else if (NARROW.addListener) NARROW.addListener(renderProgram);

  /* ---------- go ---------- */
  renderShell();
  renderKeynotes();
  renderProgramFrame();
  renderProgram();
  renderVenue();
  renderPartners();
})();
