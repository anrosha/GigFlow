(function () {
  'use strict';

  var STORAGE_KEY = 'gigflow.bookings';
  var STATUSES = ['Inquiry', 'Offer Sent', 'Confirmed', 'Cancelled'];

  var bookings = load();

  var form = document.getElementById('booking-form');
  var els = {
    id: document.getElementById('booking-id'),
    client: document.getElementById('client'),
    songs: document.getElementById('songs'),
    date: document.getElementById('date'),
    location: document.getElementById('location'),
    type: document.getElementById('type'),
    price: document.getElementById('price'),
    status: document.getElementById('status'),
    notes: document.getElementById('notes'),
    error: document.getElementById('form-error'),
    submit: document.getElementById('submit-btn'),
    cancelEdit: document.getElementById('cancel-edit-btn'),
    formTitle: document.getElementById('form-title'),
    filter: document.getElementById('filter'),
    sort: document.getElementById('sort'),
    list: document.getElementById('booking-list'),
    upcoming: document.getElementById('upcoming-list')
  };

  /* ---------- storage ---------- */
  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch (e) {
      alert('Could not save data. Browser storage may be unavailable.');
    }
  }

  /* ---------- formatting ---------- */
  function formatPrice(n) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function formatDate(iso) {
    var p = iso.split('-');
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function slug(status) {
    return 's-' + status.toLowerCase().replace(/\s+/g, '-');
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- rendering ---------- */
  function renderStats() {
    var confirmed = bookings.filter(function (b) { return b.status === 'Confirmed'; });
    var open = bookings.filter(function (b) { return b.status === 'Inquiry' || b.status === 'Offer Sent'; });
    var sum = function (arr) { return arr.reduce(function (t, b) { return t + b.price; }, 0); };

    document.getElementById('stat-total').textContent = bookings.length;
    document.getElementById('stat-confirmed').textContent = confirmed.length;
    document.getElementById('stat-expected').textContent = formatPrice(sum(confirmed));
    document.getElementById('stat-potential').textContent = formatPrice(sum(open));
  }

  function renderUpcoming() {
    var today = todayISO();
    var items = bookings
      .filter(function (b) { return b.status === 'Confirmed' && b.date >= today; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });

    els.upcoming.innerHTML = '';
    if (!items.length) {
      var li = el('li', 'empty', 'No upcoming confirmed performances yet. Time to book some gigs!');
      li.style.cssText = 'background:none;border-left:none;padding:0;';
      els.upcoming.appendChild(li);
      return;
    }
    items.forEach(function (b) {
      var li = el('li');
      var left = el('span');
      var strong = el('strong', null, formatDate(b.date));
      left.appendChild(strong);
      left.appendChild(document.createTextNode(' – ' + b.client));
      li.appendChild(left);
      li.appendChild(el('span', null, b.location + ' · ' + formatPrice(b.price)));
      els.upcoming.appendChild(li);
    });
  }

  function renderList() {
    var filter = els.filter.value;
    var dir = els.sort.value === 'asc' ? 1 : -1;
    var items = bookings
      .filter(function (b) { return filter === 'all' || b.status === filter; })
      .sort(function (a, b) { return dir * a.date.localeCompare(b.date); });

    els.list.innerHTML = '';
    if (!items.length) {
      els.list.appendChild(el('p', 'empty', bookings.length ? 'No bookings match this filter.' : 'No bookings yet. Add your first booking above.'));
      return;
    }

    items.forEach(function (b) {
      var card = el('article', 'booking ' + slug(b.status));

      var top = el('div', 'booking-top');
      top.appendChild(el('h3', null, b.client));
      top.appendChild(el('span', 'badge ' + slug(b.status), b.status));
      card.appendChild(top);

      card.appendChild(el('div', 'meta', formatDate(b.date) + ' · ' + b.location));
      card.appendChild(el('div', 'meta', 'Event type: ' + b.type));
      card.appendChild(el('div', 'price', formatPrice(b.price)));
      if (b.songs) card.appendChild(el('p', 'notes songs', 'Songs: ' + b.songs.replace(/\n+/g, ', ')));
      if (b.notes) card.appendChild(el('p', 'notes', b.notes));

      var actions = el('div', 'booking-actions');
      var sel = el('select');
      sel.setAttribute('aria-label', 'Change status for ' + b.client);
      STATUSES.forEach(function (s) {
        var o = el('option', null, s);
        if (s === b.status) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        b.status = sel.value;
        save();
        render();
      });
      actions.appendChild(sel);

      var edit = el('button', 'btn small', 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', function () { startEdit(b.id); });
      actions.appendChild(edit);

      var del = el('button', 'btn small danger', 'Delete');
      del.type = 'button';
      del.addEventListener('click', function () {
        if (confirm('Delete the booking for ' + b.client + '?')) {
          bookings = bookings.filter(function (x) { return x.id !== b.id; });
          if (els.id.value === b.id) resetForm();
          save();
          render();
        }
      });
      actions.appendChild(del);

      card.appendChild(actions);
      els.list.appendChild(card);
    });
  }

  function render() {
    renderStats();
    renderUpcoming();
    renderList();
  }

  /* ---------- form ---------- */
  function resetForm() {
    form.reset();
    els.id.value = '';
    els.error.textContent = '';
    els.submit.textContent = 'Add Booking';
    els.formTitle.textContent = 'Add Booking';
    els.cancelEdit.hidden = true;
  }

  function startEdit(id) {
    var b = bookings.find(function (x) { return x.id === id; });
    if (!b) return;
    els.id.value = b.id;
    els.client.value = b.client;
    els.songs.value = b.songs || '';
    els.date.value = b.date;
    els.location.value = b.location;
    els.type.value = b.type;
    els.price.value = b.price;
    els.status.value = b.status;
    els.notes.value = b.notes || '';
    els.error.textContent = '';
    els.submit.textContent = 'Save Changes';
    els.formTitle.textContent = 'Edit Booking';
    els.cancelEdit.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.client.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var client = els.client.value.trim();
    var location = els.location.value.trim();
    var date = els.date.value;
    var price = parseFloat(els.price.value);

    if (!client || !date || !location || els.price.value === '') {
      els.error.textContent = 'Please fill in client, date, location and price.';
      return;
    }
    if (isNaN(price) || price < 0) {
      els.error.textContent = 'Please enter a valid price (0 or more).';
      return;
    }

    var data = {
      client: client,
      songs: els.songs.value.trim(),
      date: date,
      location: location,
      type: els.type.value,
      price: Math.round(price * 100) / 100,
      status: els.status.value,
      notes: els.notes.value.trim()
    };

    if (els.id.value) {
      var existing = bookings.find(function (x) { return x.id === els.id.value; });
      if (existing) Object.assign(existing, data);
    } else {
      data.id = newId();
      bookings.push(data);
    }

    save();
    resetForm();
    render();
  });

  els.cancelEdit.addEventListener('click', resetForm);
  els.filter.addEventListener('change', renderList);
  els.sort.addEventListener('change', renderList);

  render();
})();
