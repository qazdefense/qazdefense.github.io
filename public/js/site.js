(function () {
  'use strict';

  // Шапка: компактнее после прокрутки
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Мобильное меню
  var burger = document.querySelector('[data-burger]');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  // Плавный пересчёт чисел в панели владельца. Итоговое значение уже стоит в HTML.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function countUp(panel) {
    if (!panel || reduce) return;
    panel.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var dec = Number(el.getAttribute('data-decimals') || 0);
      var fmt = function (n) { return n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      var start = null;
      var step = function (t) {
        if (start === null) start = t;
        var p = Math.min((t - start) / 700, 1);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target);
      };
      requestAnimationFrame(step);
    });
  }

  // Вкладки (направления, отрасли, панель владельца)
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
      countUp(document.getElementById(tab.getAttribute('aria-controls')));
      if (tab.scrollIntoView && window.matchMedia('(max-width: 960px)').matches) {
        tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });

  // Переходы между разделами главной: боковая навигация и стрелка «дальше» в каждом слайде
  var slides = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
  var snav = document.querySelector('[data-slide-nav]');
  if (slides.length > 1 && snav) {
    var dotsBox = snav.querySelector('.sn-dots');
    var current = 0;
    var go = function (i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      var top = i === 0 ? 0 : slides[i].getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    };
    var dots = slides.map(function (s, i) {
      var name = s.getAttribute('data-slide');
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', name);
      var label = document.createElement('span');
      label.className = 'sn-label';
      label.textContent = name;
      b.appendChild(label);
      b.addEventListener('click', function () { go(i); });
      li.appendChild(b);
      dotsBox.appendChild(li);
      if (i < slides.length - 1) {
        var nextName = slides[i + 1].getAttribute('data-slide');
        var next = document.createElement('button');
        next.type = 'button';
        next.className = 'slide-next';
        next.setAttribute('aria-label', 'Перейти к разделу «' + nextName + '»');
        next.title = nextName;
        next.innerHTML = '<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
        next.querySelector('span').textContent = nextName;
        next.addEventListener('click', function () { go(i + 1); });
        s.appendChild(next);
      }
      return b;
    });
    var prevBtn = snav.querySelector('[data-dir="-1"]');
    var nextBtn = snav.querySelector('[data-dir="1"]');
    prevBtn.addEventListener('click', function () { go(current - 1); });
    nextBtn.addEventListener('click', function () { go(current + 1); });
    var footer = document.querySelector('.site-footer');
    var update = function () {
      var mid = window.innerHeight * 0.45;
      var idx = 0;
      slides.forEach(function (s, i) { if (s.getBoundingClientRect().top <= mid) idx = i; });
      current = idx;
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === idx);
        if (i === idx) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === slides.length - 1;
      snav.classList.toggle('on-light', slides[idx].getAttribute('data-tone') === 'light');
      snav.classList.toggle('is-hidden', Boolean(footer) && footer.getBoundingClientRect().top < window.innerHeight * 0.6);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  // Лента автоматизации на первом экране: новые события появляются сверху
  var feedList = document.querySelector('[data-feed] ul');
  if (feedList && !reduce) {
    setInterval(function () {
      if (document.hidden) return;
      var last = feedList.lastElementChild;
      feedList.insertBefore(last, feedList.firstElementChild);
      last.classList.remove('is-new');
      void last.offsetWidth;
      last.classList.add('is-new');
    }, 3200);
  }

  // Отклик на курсор: подсветка карточек и лёгкий наклон панели владельца
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && !reduce) {
    document.querySelectorAll('.tile, .proj-card').forEach(function (el) {
      el.setAttribute('data-spot', '');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    var tilt = document.querySelector('[data-tilt]');
    if (tilt) {
      var dash = tilt.querySelector('.dash');
      var floats = tilt.querySelectorAll('.feed, .phone');
      var hero = tilt.closest('section') || tilt;
      hero.addEventListener('pointermove', function (e) {
        var r = tilt.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / r.width;
        var y = (e.clientY - (r.top + r.height / 2)) / r.height;
        x = Math.max(-1, Math.min(1, x)); y = Math.max(-1, Math.min(1, y));
        if (dash) dash.style.transform = 'rotateY(' + (x * 4) + 'deg) rotateX(' + (-y * 3) + 'deg)';
        floats.forEach(function (f, i) {
          var k = i === 0 ? 10 : -8;
          f.style.transform = 'translate(' + (x * k) + 'px, ' + (y * k) + 'px)';
        });
      });
      hero.addEventListener('pointerleave', function () {
        if (dash) dash.style.transform = '';
        floats.forEach(function (f) { f.style.transform = ''; });
      });
    }
  }

  // Просмотр картинок кейса
  document.querySelectorAll('[data-gallery] a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Просмотр изображения');
      var img = document.createElement('img');
      img.src = a.getAttribute('href');
      img.alt = '';
      box.appendChild(img);
      var close = function () { box.remove(); document.removeEventListener('keydown', onKey); };
      var onKey = function (ev) { if (ev.key === 'Escape') close(); };
      box.addEventListener('click', close);
      document.addEventListener('keydown', onKey);
      document.body.appendChild(box);
    });
  });
})();

// Статическая версия (GitHub Pages): фильтр кейсов работает в браузере по параметрам адреса
(function () {
  'use strict';
  if (!document.body.hasAttribute('data-static')) return;
  var grid = document.querySelector('[data-case-grid]');
  if (!grid) return;
  var params = new URLSearchParams(location.search);
  var ind = params.get('industry') || '';
  var dir = params.get('direction') || '';
  var shown = 0;
  grid.querySelectorAll('.case-cell').forEach(function (cell) {
    var ok = (!ind || cell.getAttribute('data-industry') === ind) &&
             (!dir || (' ' + cell.getAttribute('data-dirs') + ' ').indexOf(' ' + dir + ' ') >= 0);
    cell.hidden = !ok;
    if (ok) shown++;
  });
  document.querySelectorAll('.filters .chip').forEach(function (chip) {
    var u = new URL(chip.href, location.href);
    var row = chip.closest('.filter-row');
    var isInd = row && row.querySelector('.filter-label').textContent.indexOf('Отрасль') === 0;
    var mine = isInd ? (u.searchParams.get('industry') || '') === ind : (u.searchParams.get('direction') || '') === dir;
    chip.classList.toggle('is-active', mine);
  });
  var count = document.querySelector('[data-case-count]');
  var empty = document.querySelector('[data-case-empty]');
  if (count) {
    var n = shown, m10 = n % 10, m100 = n % 100;
    var word = m10 === 1 && m100 !== 11 ? 'кейс' : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 'кейса' : 'кейсов');
    count.textContent = n + ' ' + word;
    count.hidden = n === 0;
  }
  if (empty) empty.hidden = shown !== 0;
})();
