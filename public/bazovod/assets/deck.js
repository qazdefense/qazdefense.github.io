// Базовод (движок сайта Кабинета сотрудника): интерактивный маршрут из assets/roadmap.json и листание сайта как презентации.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  // Переводы - assets/i18n.js; без него (или для русского) строки остаются как есть
  var L = window.I18N || { lang: "ru", t: function (s, v) { return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k]; }) : s; },
    plural: function (n, ru) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? ru[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? ru[1] : ru[2]; },
    loc: function (o) { return o; } };
  var T = L.t;
  function status(s) { return T({ done: "Сделано", next: "В работе", plan: "В плане" }[s]); }
  function when(m, paren) { return m.approx ? (paren ? T("{date} (ориентировочно)", { date: m.date }) : T("{date}, ориентировочно", { date: m.date })) : m.date; }


  // Число растет от 0 до значения, когда маршрут появляется на экране
  function countUp(node, to) {
    if (reduce) { node.textContent = to; return; }
    var t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 1200);
      node.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- Маршрут ----------
  function buildRoute(host, data) {
    var ms = data.milestones.map(L.loc);
    var done = ms.filter(function (m) { return m.status === "done"; });
    var next = ms.filter(function (m) { return m.status === "next"; });
    var fin = function (p, m) { return m.status === "done" || p[2] === 1; };
    var itemsDone = ms.reduce(function (n, m) { return n + m.items.filter(function (p) { return fin(p, m); }).length; }, 0);
    var itemsNext = next.reduce(function (n, m) { return n + m.items.filter(function (p) { return !fin(p, m); }).length; }, 0);

    var stats = el("div", "route-stats");
    [[done.length, T("из {total} этапов пройдено", { total: ms.length })],
     [itemsDone, L.plural(itemsDone, ["задача сделана", "задачи сделаны", "задач сделано"], "@features")],
     [itemsNext, T("в работе сейчас")]].forEach(function (s) {
      var d = el("div", "stat");
      var b = el("b", null, "0");
      b.dataset.to = s[0];
      d.appendChild(b);
      d.appendChild(el("span", null, s[1]));
      stats.appendChild(d);
    });
    host.appendChild(stats);

    // Дорога: волна через все остановки
    var W = 1200, H = 260, padX = 70, n = ms.length;
    var pts = ms.map(function (m, i) {
      return { x: padX + i * (W - 2 * padX) / (n - 1), y: i % 2 ? 172 : 98 };
    });
    var d = "M " + pts[0].x + " " + pts[0].y;
    for (var i = 1; i < n; i++) {
      var a = pts[i - 1], b2 = pts[i], cx = (b2.x - a.x) / 2;
      d += " C " + (a.x + cx) + " " + a.y + ", " + (b2.x - cx) + " " + b2.y + ", " + b2.x + " " + b2.y;
    }

    var scroll = el("div", "route-scroll");
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "route-svg", role: "img",
      "aria-label": T("Маршрут развития: пройдено {done} этапов из {total}", { done: done.length, total: ms.length }) });
    var defs = svg("defs", {});
    var grad = svg("linearGradient", { id: "rg", x1: "0", x2: "1", y1: "0", y2: "0" });
    grad.appendChild(svg("stop", { offset: "0", "stop-color": "#FFCE64" }));
    grad.appendChild(svg("stop", { offset: ".55", "stop-color": "#FF7A2F" }));
    grad.appendChild(svg("stop", { offset: "1", "stop-color": "#FF4600" }));
    defs.appendChild(grad);
    var sh = svg("filter", { id: "rs", x: "-10%", y: "-30%", width: "120%", height: "160%" });
    sh.appendChild(svg("feDropShadow", { dx: "0", dy: "8", stdDeviation: "8", "flood-color": "#FF4600", "flood-opacity": ".28" }));
    defs.appendChild(sh);
    s.appendChild(defs);

    s.appendChild(svg("path", { d: d, class: "road-bed" }));
    s.appendChild(svg("path", { d: d, class: "road-future" }));
    var passed = svg("path", { d: d, class: "road-passed", stroke: "url(#rg)", filter: "url(#rs)" });
    s.appendChild(passed);

    var here = svg("g", { class: "here-marker" });
    here.appendChild(svg("circle", { r: "22", class: "pulse" }));
    here.appendChild(svg("circle", { r: "9", class: "core" }));
    // Плашка «Мы здесь» справа снизу: дорога в этом месте уходит вверх, подпись ее не перекрывает
    var tag = svg("g", { class: "here-tag", transform: "translate(18 22)" });
    here.tag = tag;
    tag.appendChild(svg("rect", { x: "0", y: "0", width: "92", height: "28", rx: "14" }));
    var hereLabel = svg("text", { x: "46", y: "19", class: "here-label", "text-anchor": "middle" });
    hereLabel.textContent = T("Мы здесь");
    tag.appendChild(hereLabel);
    here.appendChild(tag);

    var nodes = svg("g", {});
    ms.forEach(function (m, i) {
      var g = svg("g", { class: "node " + m.status, transform: "translate(" + pts[i].x + " " + pts[i].y + ")",
        tabindex: "0", role: "button", "aria-label": m.version + ", " + when(m) + ": " + m.title });
      var ahead = m.status !== "done";
      if (m.status === "next") g.appendChild(svg("circle", { r: "16", class: "halo" }));
      g.appendChild(svg("circle", { r: ahead ? "19" : "16", class: "ring" }));
      if (ahead) {
        // Впереди: в кружке - сколько возможностей войдет в релиз
        var num = svg("text", { y: "5", class: "node-count", "text-anchor": "middle" });
        num.textContent = m.items.length;
        g.appendChild(num);
      } else {
        g.appendChild(svg("circle", { r: "8", class: "dot" }));
      }
      var up = i % 2 === 0;
      var t1 = svg("text", { y: up ? -34 : 44, class: "node-ver", "text-anchor": "middle" });
      t1.textContent = m.version;
      var t2 = svg("text", { y: up ? -52 : 62, class: "node-date", "text-anchor": "middle" });
      t2.textContent = (m.approx ? "≈ " : "") + m.date;
      g.appendChild(t2); g.appendChild(t1);
      if (m.short) {
        var t3 = svg("text", { y: up ? -70 : 80, class: "node-short", "text-anchor": "middle" });
        if (up) { t3.setAttribute("y", -34); t1.setAttribute("y", -52); t2.setAttribute("y", -70); }
        t3.textContent = m.short;
        g.appendChild(t3);
      }
      g.addEventListener("click", function () { select(i, true); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); select(i, true); }
      });
      nodes.appendChild(g);
    });
    s.appendChild(nodes);
    s.appendChild(here);
    scroll.appendChild(s);

    // Карта и описание выбранной остановки - одна панель, уголок указывает на остановку
    var panel = el("div", "route-panel");
    var card = el("div", "route-card");
    panel.appendChild(scroll);
    panel.appendChild(card);
    host.appendChild(panel);

    var tools = el("div", "route-tools");
    var pdf = el("button", "tool", T("Скачать PDF"));
    pdf.type = "button";
    pdf.addEventListener("click", function () { window.print(); });
    var csv = el("button", "tool", T("Скачать для Excel"));
    csv.type = "button";
    csv.addEventListener("click", function () { downloadCsv(data); });
    tools.appendChild(pdf); tools.appendChild(csv);
    tools.appendChild(el("span", "updated", T("Обновлено {date}", { date: data.updated })));
    host.appendChild(tools);

    // Полный список - для печати и для отдельной страницы
    var all = el("div", "route-all");
    ms.forEach(function (m) {
      var sec = el("section", "ms " + m.status);
      var h = el("h3", null, m.version + " · " + m.title);
      sec.appendChild(h);
      sec.appendChild(el("p", "ms-meta", (m.date ? when(m) + " — " : "") + status(m.status)));
      var ul = el("ul", null);
      m.items.forEach(function (p) {
        var li = el("li", m.status !== "done" && p[2] === 1 ? "fin" : null);
        li.appendChild(el("b", null, p[0]));
        li.appendChild(el("span", null, p[1]));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      all.appendChild(sec);
    });
    host.appendChild(all);

    var nodeEls = nodes.children;
    function pointTo(i) {
      var r = nodeEls[i].querySelector(".ring").getBoundingClientRect(), pr = panel.getBoundingClientRect();
      panel.style.setProperty("--caret", Math.round(r.left + r.width / 2 - pr.left) + "px");
    }
    window.addEventListener("resize", function () { if (selected >= 0) pointTo(selected); });
    scroll.addEventListener("scroll", function () { if (selected >= 0) pointTo(selected); });
    var selected = -1;
    function select(i, user) {
      if (i === selected) return;
      selected = i;
      Array.prototype.forEach.call(nodeEls, function (g, k) { g.classList.toggle("sel", k === i); });
      var m = ms[i];
      var inner = el("div", "card-inner " + m.status);
      var head = el("div", "card-head");
      head.appendChild(el("span", "chip " + m.status, status(m.status)));
      head.appendChild(el("span", "card-date", when(m)));
      inner.appendChild(head);
      inner.appendChild(el("h3", null, m.version + " — " + m.title));
      var ul = el("ul", null);
      m.items.forEach(function (p, k) {
        var li = el("li", m.status !== "done" && p[2] === 1 ? "fin" : null);
        li.style.setProperty("--k", k);
        li.appendChild(el("i", "ico"));
        var t = el("p", null);
        t.appendChild(el("b", null, p[0]));
        t.appendChild(document.createTextNode(" — " + p[1]));
        li.appendChild(t);
        ul.appendChild(li);
      });
      inner.appendChild(ul);
      card.replaceChildren(inner);
      pointTo(i);
      if (user && scroll.scrollWidth > scroll.clientWidth) {
        var x = pts[i].x / W * scroll.scrollWidth - scroll.clientWidth / 2;
        scroll.scrollTo({ left: x, behavior: reduce ? "auto" : "smooth" });
      }
    }

    // Где на дороге «мы здесь»: между последней пройденной и следующей остановкой
    var lastDone = ms.map(function (m) { return m.status; }).lastIndexOf("done");
    var total, target;
    function lengthAt(pt) {
      var best = 0, bestD = 1e9;
      for (var L = 0; L <= total; L += 4) {
        var p = passed.getPointAtLength(L), dd = (p.x - pt.x) * (p.x - pt.x) + (p.y - pt.y) * (p.y - pt.y);
        if (dd < bestD) { bestD = dd; best = L; }
      }
      return best;
    }
    function measure() {
      total = passed.getTotalLength();
      var a = lengthAt(pts[lastDone]);
      var b = lastDone + 1 < n ? lengthAt(pts[lastDone + 1]) : a;
      target = a + (b - a) * 0.42;
      // Плашка - с той стороны, где дорога не проходит: на спуске сверху справа, на подъеме снизу справа
      var down = lastDone + 1 < n && pts[lastDone + 1].y > pts[lastDone].y;
      here.tag.setAttribute("transform", down ? "translate(16 -46)" : "translate(18 22)");
      passed.style.strokeDasharray = total;
      // ширина плашки «Мы здесь» - по длине подписи на текущем языке
      var tw = Math.ceil(hereLabel.getComputedTextLength ? hereLabel.getComputedTextLength() : 64) + 28;
      if (tw > 40) { tag.firstChild.setAttribute("width", tw); hereLabel.setAttribute("x", tw / 2); }
    }
    function place(L) {
      passed.style.strokeDashoffset = total - L;
      var p = passed.getPointAtLength(L);
      here.setAttribute("transform", "translate(" + p.x + " " + p.y + ")");
    }

    var played = false;
    function play() {
      if (played) return;
      played = true;
      measure();
      stats.querySelectorAll("b").forEach(function (b) { countUp(b, +b.dataset.to); });
      if (reduce) { place(target); return; }
      var t0 = null;
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / 2200);
        place(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    measure(); place(0);
    select(Math.min(lastDone + 1, n - 1), false);
    return { play: play, played: function () { return played; } };
  }

  function downloadCsv(data) {
    var rows = [[T("Этап"), T("Когда"), T("Статус"), T("Возможность"), T("Что это")]];
    data.milestones.map(L.loc).forEach(function (m) {
      m.items.forEach(function (p) { rows.push([m.version + " — " + m.title, when(m, true), status(m.status), p[0], p[1]]); });
    });
    var text = "﻿" + rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = T("Базовод - дорожная карта {date}", { date: data.updated }) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---------- Сборка ----------
  // Данные лежат рядом со скриптом: работает и с главной, и из папки презентации
  var base = (document.currentScript && document.currentScript.src) || location.href;
  var routeHost = document.getElementById("route");
  var route = null, routeData = null, changesData = null;
  var ready = routeHost ? fetch(new URL("roadmap.json", base), { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) { routeData = data; route = buildRoute(routeHost, data); })
    .catch(function () { routeHost.appendChild(el("p", "updated", T("Не удалось загрузить дорожную карту. Обновите страницу."))); })
    : Promise.resolve();

  // ---------- Страница «Изменения»: релизы из changes.json, новые сверху ----------
  var CH_ICON = {
    new: '<path d="M12 5v14M5 12h14"/>',
    better: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    fix: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'
  };
  function chType(k) { return T({ new: "Новое", better: "Улучшение", fix: "Исправление" }[k] || ""); }
  function buildChanges(host, data) {
    (data.releases || []).map(L.loc).forEach(function (r, i) {
      var sec = el("section", "rel" + (r.status === "soon" ? " soon" : ""));
      sec.style.setProperty("--i", i);
      var head = el("header", "rel-head");
      head.appendChild(el("span", "rel-ver", r.version));
      var meta = el("div", "rel-meta");
      meta.appendChild(el("h2", null, r.title));
      meta.appendChild(el("span", "rel-date", r.date));
      head.appendChild(meta);
      head.appendChild(el("span", "rel-status", T(r.status === "soon" ? "Готовится" : "Выпущен")));
      sec.appendChild(head);
      var list = el("ul", "rel-items");
      (r.items || []).forEach(function (it) {
        var li = el("li", "rel-item t-" + it[0]);
        var ic = el("span", "rel-ic");
        ic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (CH_ICON[it[0]] || CH_ICON.new) + "</g></svg>";
        ic.title = chType(it[0]);
        li.appendChild(ic);
        var tx = el("div");
        tx.appendChild(el("b", null, it[1]));
        if (it[2]) tx.appendChild(el("p", null, it[2]));
        li.appendChild(tx);
        list.appendChild(li);
      });
      sec.appendChild(list);
      host.appendChild(sec);
    });
    // релизы проявляются по мере прокрутки
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" }) : null;
    Array.prototype.forEach.call(host.querySelectorAll(".rel"), function (s) { if (io && !reduce) io.observe(s); else s.classList.add("in"); });
  }
  var changesHost = document.getElementById("changes");
  if (changesHost) fetch(new URL("changes.json", base), { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) { changesData = data; buildChanges(changesHost, data); })
    .catch(function () { changesHost.appendChild(el("p", "updated", T("Не удалось загрузить изменения. Обновите страницу."))); });

  // Тема: переключатель запоминает выбор; без выбора - как в системе
  // Новая тема расходится кругом от места нажатия (как в QazDesk); без поддержки браузера - сразу
  // Снимки экранов приложения - в теме сайта: assets/app/light/* или assets/app/dark/*
  var shotRe = /\/app\/(light|dark)\//;
  function siteTheme() {
    var t = document.documentElement.dataset.theme;
    return t || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function shots() {
    return Array.prototype.filter.call(document.querySelectorAll("img"), function (img) { return shotRe.test(img.getAttribute("src") || ""); });
  }
  function syncShots() {
    var want = "/app/" + siteTheme() + "/";
    shots().forEach(function (img) {
      var src = img.getAttribute("src");
      if (src.indexOf(want) < 0) img.setAttribute("src", src.replace(shotRe, want));
    });
  }
  // Снимки нужной темы загружаем и декодируем заранее: при смене темы телефон меняется вместе с фоном
  var decoded = {};
  function prepare(theme) {
    var want = "/app/" + theme + "/";
    return Promise.all(shots().map(function (img) {
      var url = img.src.replace(shotRe, want);
      if (!decoded[url]) {
        var im = new Image();
        im.src = url;
        decoded[url] = (im.decode ? im.decode() : new Promise(function (ok) { im.onload = ok; })).catch(function () {});
      }
      return decoded[url];
    }));
  }

  // Тема: переключатель запоминает выбор; без выбора - как в системе
  // Новая тема расходится кругом от места нажатия (как в QazDesk); без поддержки браузера - сразу
  function applyTheme() {
    var root = document.documentElement;
    root.dataset.theme = siteTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    syncShots();
  }
  function toggleTheme(e) {
    var btn = document.getElementById("theme");
    var next = siteTheme() === "dark" ? "light" : "dark";
    // не дольше 700 мс: при медленной сети тема меняется, а снимок догрузится следом
    var ready = Promise.race([prepare(next), new Promise(function (ok) { setTimeout(ok, 700); })]);
    if (!document.startViewTransition || reduce) { ready.then(applyTheme); return; }
    var r = btn ? btn.getBoundingClientRect() : { left: innerWidth / 2, top: 0, width: 0, height: 0 };
    var x = e && e.clientX ? e.clientX : r.left + r.width / 2, y = e && e.clientY ? e.clientY : r.top + r.height / 2;
    ready.then(function () {
      var st = document.documentElement.style;
      st.setProperty("--tx", x + "px"); st.setProperty("--ty", y + "px");
      st.setProperty("--tr", Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + "px");
      document.startViewTransition(applyTheme);
    });
  }
  var themeBtn = document.getElementById("theme");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
  syncShots();
  window.addEventListener("load", function () { prepare(siteTheme() === "dark" ? "light" : "dark"); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncShots);

  // Стеклянная подложка в меню: переезжает к пункту под курсором, затем возвращается к текущему разделу
  Array.prototype.forEach.call(document.querySelectorAll(".nav"), function (nav) {
    var items = Array.prototype.slice.call(nav.querySelectorAll("a, .theme-btn"));
    if (!items.length) return;
    var pill = el("span", "nav-glass");
    pill.setAttribute("aria-hidden", "true");
    nav.insertBefore(pill, nav.firstChild);
    var active = nav.querySelector('[aria-current="page"]'), cur = null;
    function moveTo(a) {
      cur = a;
      if (!a || a.offsetParent === null) { pill.classList.remove("on"); return; }
      pill.style.width = a.offsetWidth + "px";
      pill.style.height = a.offsetHeight + "px";
      pill.style.transform = "translate(" + a.offsetLeft + "px," + a.offsetTop + "px)";
      pill.classList.add("on");
    }
    items.forEach(function (a) {
      a.addEventListener("mouseenter", function () { moveTo(a); });
      a.addEventListener("focus", function () { moveTo(a); });
    });
    nav.addEventListener("mouseleave", function () { moveTo(active); });
    window.addEventListener("resize", function () { moveTo(active); });
    // после смены языка, темы или загрузки шрифта пункты меняют ширину и сдвигаются - подложку пересчитать
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { moveTo(nav.matches(":hover") ? cur : active); });
      ro.observe(nav);
      Array.prototype.forEach.call(nav.children, function (c) { if (c !== pill) ro.observe(c); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveTo(active); });
    // на главной текущий раздел - тот, что на экране
    var map = items.map(function (a) { var h = a.getAttribute("href") || ""; return h.charAt(0) === "#" ? document.querySelector(h) : null; });
    if (map.some(Boolean) && "IntersectionObserver" in window) {
      var so = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          var k = map.indexOf(en.target);
          if (en.isIntersecting && k >= 0) { active = items[k]; if (!nav.matches(":hover")) moveTo(active); }
          else if (!en.isIntersecting && active === items[k]) { active = null; if (!nav.matches(":hover")) moveTo(null); }
        });
      }, { rootMargin: "-40% 0px -50% 0px" });
      map.forEach(function (t) { if (t) so.observe(t); });
    }
    moveTo(active);
  });

  var fine = window.matchMedia("(pointer: fine)").matches;

  // Объем: телефон на главной и веер в презентации чуть доворачиваются за курсором
  var tilt = document.getElementById("phone3d") || document.querySelector(".fan");
  if (tilt && !reduce && fine) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    document.addEventListener("mousemove", function (e) {
      tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    function loop() {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08; // плавное догоняние, без рывков
      tilt.style.setProperty("--mx", (cx * 16).toFixed(2) + "deg");
      tilt.style.setProperty("--my", (-cy * 10).toFixed(2) + "deg");
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
    }
  }

  // Карусель экранов: кнопки, перетаскивание мышью, центральный экран крупнее и ярче
  Array.prototype.forEach.call(document.querySelectorAll(".strip"), function (strip) {
    var box = el("div", "carousel");
    strip.parentNode.insertBefore(box, strip);
    box.appendChild(strip);
    [["prev", "Предыдущий экран", "M15 5l-7 7 7 7", -1], ["next", "Следующий экран", "M9 5l7 7-7 7", 1]].forEach(function (b) {
      var btn = el("button", "car-btn car-" + b[0]);
      btn.type = "button";
      btn.setAttribute("aria-label", b[1]);
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + b[2] + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.addEventListener("click", function () { go(nearest() + b[3]); });
      box.appendChild(btn);
    });
    var figs = strip.querySelectorAll("figure"), queued = 0, settle = 0, down = false;
    // Телефон, ближайший к центру ленты, и плавная доводка к телефону по номеру
    function nearest() {
      var r = strip.getBoundingClientRect(), mid = r.left + r.width / 2, best = 0, bd = Infinity;
      Array.prototype.forEach.call(figs, function (f, i) {
        var fr = f.getBoundingClientRect(), d = Math.abs(fr.left + fr.width / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function go(i) {
      i = Math.max(0, Math.min(figs.length - 1, i));
      var f = figs[i], left = f.offsetLeft + f.offsetWidth / 2 - strip.clientWidth / 2;
      strip.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
    }
    function depth() {
      queued = 0;
      var r = strip.getBoundingClientRect(), mid = r.left + r.width / 2;
      Array.prototype.forEach.call(figs, function (f) {
        var fr = f.getBoundingClientRect(), d = Math.min(1, Math.abs(fr.left + fr.width / 2 - mid) / (r.width * 0.6));
        f.style.setProperty("--d", d.toFixed(3));
      });
      box.querySelector(".car-prev").disabled = strip.scrollLeft < 4;
      box.querySelector(".car-next").disabled = strip.scrollLeft + strip.clientWidth > strip.scrollWidth - 4;
    }
    strip.addEventListener("scroll", function () {
      if (!queued) queued = requestAnimationFrame(depth);
      // после остановки прокрутки колесом или тачпадом - мягко к ближайшему телефону
      clearTimeout(settle);
      if (!down) settle = setTimeout(function () { go(nearest()); }, 180);
    }, { passive: true });
    window.addEventListener("resize", depth);
    // ширина ленты известна, только когда картинки загрузились и слайд показан
    Array.prototype.forEach.call(strip.querySelectorAll("img"), function (im) { if (!im.complete) im.addEventListener("load", depth); });
    document.addEventListener("slidechange", depth);
    depth();
    // перетаскивание мышью
    var x0 = 0, s0 = 0, moved = false;
    strip.addEventListener("mousedown", function (e) { down = true; moved = false; x0 = e.clientX; s0 = strip.scrollLeft; strip.classList.add("drag"); e.preventDefault(); });
    window.addEventListener("mousemove", function (e) { if (!down) return; var dx = e.clientX - x0; if (Math.abs(dx) > 4) moved = true; strip.scrollLeft = s0 - dx; });
    window.addEventListener("mouseup", function () { if (!down) return; down = false; strip.classList.remove("drag"); go(nearest()); });
    strip.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  // Зажать телефон и покрутить: вращение за указателем, инерция, затем плавный возврат лицом к зрителю
  Array.prototype.forEach.call(document.querySelectorAll("[data-spin]"), function (box) {
    var body = box.querySelector(".spin-body");
    if (!body) return;
    // На телефоне телефон плоский: без вращения, иначе касание забирает прокрутку страницы
    if (window.matchMedia("(max-width: 720px)").matches) return;
    var ry = 0, rx = 0, vy = 0, drag = false, px = 0, py = 0, idleT = 0, raf = 0, lastT = 0;
    function apply() { body.style.setProperty("--ry", ry.toFixed(2) + "deg"); body.style.setProperty("--rx", rx.toFixed(2) + "deg"); }
    function tick(t) {
      raf = 0;
      if (drag) return;
      var dt = lastT ? Math.min(40, t - lastT) : 16; lastT = t;
      if (Math.abs(vy) > 0.02) { ry += vy * dt; vy *= Math.pow(0.94, dt / 16); }
      else if (t > idleT) {           // вернуться к ближайшему «лицом к зрителю»
        var target = Math.round(ry / 360) * 360;
        ry += (target - ry) * 0.08; rx += (0 - rx) * 0.08;
        if (Math.abs(target - ry) < 0.1 && Math.abs(rx) < 0.1) { ry = 0; rx = 0; apply(); lastT = 0; return; }
      }
      apply();
      raf = requestAnimationFrame(tick);
    }
    var sx0 = 0, sy0 = 0;
    box.addEventListener("dragstart", function (e) { e.preventDefault(); });
    Array.prototype.forEach.call(box.querySelectorAll("img"), function (im) { im.draggable = false; });
    box.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      drag = true; px = e.clientX; py = e.clientY; vy = 0; sx0 = e.clientX; sy0 = e.clientY;
      box.classList.add("spinning"); box.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    box.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
      ry += dx * 0.6; rx = Math.max(-25, Math.min(25, rx - dy * 0.3));
      vy = dx * 0.6 / 16;
      apply();
    });
    function end(e) {
      if (!drag) return;
      // короткое нажатие без поворота - это «тап» по экрану телефона
      if (e && e.type === "pointerup" && Math.abs(e.clientX - sx0) < 6 && Math.abs(e.clientY - sy0) < 6 && Math.abs(ry % 360) < 30) tap(e);
      drag = false; box.classList.remove("spinning");
      idleT = performance.now() + (reduce ? 0 : 1800); lastT = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    }
    // Экран телефона кликабелен: нижние вкладки и плитки главного экрана переключают экран
    var img = box.querySelector(".device img"), screens = ["home", "salary", "pass", "vacation", "profile"];
    var tiles = { "0,0": "salary", "1,0": "vacation", "0,1": "pass", "1,1": "news" };
    function show(name) {
      if (!img || img.src.indexOf("/" + name + ".webp") >= 0) return;
      var next = img.src.replace(/[^/]+\.webp/, name + ".webp");
      img.classList.add("swap");
      setTimeout(function () { img.src = next; img.onload = function () { img.classList.remove("swap"); }; }, 160);
    }
    function tap(e) {
      if (!img) return;
      var r = img.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      if (y > 0.9) { show(screens[Math.min(4, Math.floor(x * 5))]); return; }
      if (y < 0.1 && x < 0.2) { show("home"); return; }
      if (img.src.indexOf("/home.webp") >= 0 && y > 0.38 && y < 0.62) {
        var t = tiles[(x < 0.5 ? 0 : 1) + "," + (y < 0.5 ? 0 : 1)];
        if (t) show(t);
      }
    }
    box.addEventListener("pointerup", end);
    box.addEventListener("pointercancel", end);
  });

  // Кнопка «Наверх»: появляется после первого экрана
  var toTop = document.getElementById("toTop");
  if (toTop) {
    var onScroll = function () { toTop.classList.toggle("show", window.scrollY > window.innerHeight * 0.8); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
  }

  var isPresent = document.body.classList.contains("present-page");
  var watchRoute = null;
  // Смена языка (assets/i18n.js): маршрут и список изменений собираются заново из тех же данных
  document.addEventListener("langchange", function () {
    if (routeHost && routeData) {
      var was = route && route.played();
      routeHost.replaceChildren();
      route = buildRoute(routeHost, routeData);
      if (was) route.play(); else if (watchRoute) watchRoute();
    }
    if (changesHost && changesData) { changesHost.replaceChildren(); buildChanges(changesHost, changesData); }
  });

  // ---------- Главная: плавное появление разделов и запуск маршрута ----------
  if (!isPresent) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-active"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (s) { io.observe(s); });
    ready.then(function () {
      if (!route) return;
      watchRoute = function () {
        var obs = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { route.play(); obs.disconnect(); } }, { threshold: 0.3 });
        obs.observe(routeHost.querySelector(".route-svg") || routeHost);
      };
      watchRoute();
    });
    if (L.refresh) L.refresh();
    return;
  }

  // ---------- Презентация: холст 16:9, один слайд на экране ----------
  var stage = document.getElementById("stage");
  // Холст заполняет весь экран: по короткой стороне 1600x900, по длинной растягивается - без полос по краям
  function fit() {
    var W = window.innerWidth, H = window.innerHeight, s, w, h;
    // Телефон в вертикальном положении: холст уже, слайды перестраиваются в колонку (класс portrait)
    var portrait = W / H < 1;
    document.body.classList.toggle("portrait", portrait);
    if (portrait) { s = W / 860; w = 860; h = H / s; }
    else if (W / H > 16 / 9) { s = H / 900; w = W / s; h = 900; } else { s = W / 1600; w = 1600; h = H / s; }
    stage.style.width = w + "px";
    stage.style.height = h + "px";
    stage.style.setProperty("--s", s);
  }
  fit();
  window.addEventListener("resize", fit);

  ready.then(function () {
    var slides = Array.prototype.slice.call(stage.querySelectorAll(".pslide"));
    var count = document.getElementById("count");
    var bar = document.getElementById("progress");
    var current = -1;

    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      if (i === current) return;
      var dir = i > current ? 1 : -1;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-current", k === i);
        s.classList.toggle("is-before", k < i);
        s.classList.toggle("is-after", k > i);
        s.setAttribute("aria-hidden", k === i ? "false" : "true");
        if (k === i) s.removeAttribute("inert"); else s.setAttribute("inert", "");
      });
      document.body.dataset.dir = dir;
      current = i;
      count.textContent = (i + 1) + " / " + slides.length;
      document.getElementById("prev").disabled = i === 0;
      document.getElementById("next").disabled = i === slides.length - 1;
      document.body.classList.toggle("on-band", slides[i].classList.contains("band"));
      if (bar) bar.style.transform = "scaleX(" + ((i + 1) / slides.length) + ")";
      history.replaceState(null, "", "#" + slides[i].id);
      if (route && slides[i].contains(routeHost)) route.play();
      document.dispatchEvent(new Event("slidechange"));
    }

    var first = document.getElementById("first");
    if (first) first.addEventListener("click", function () { go(0); });
    document.getElementById("prev").addEventListener("click", function () { go(current - 1); });
    document.getElementById("next").addEventListener("click", function () { go(current + 1); });
    document.getElementById("full").addEventListener("click", toggleFull);
    function toggleFull() {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      var p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      if (p && p.catch) p.catch(function () {});
    }

    document.addEventListener("keydown", function (e) {
      var t = e.target, k = e.key;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName) && (k === " " || k === "Enter")) return;
      // Стрелки всегда листают слайды: раньше фокус, оставшийся на ленте экранов после щелчка, забирал их себе,
      // и презентация «зависала». Ленту листают ее кнопки, перетаскивание и колесо.
      if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) { e.preventDefault(); go(current + 1); }
      else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) { e.preventDefault(); go(current - 1); }
      else if (k === "Home") { e.preventDefault(); go(0); }
      else if (k === "End") { e.preventDefault(); go(slides.length - 1); }
      else if (k === "f" || k === "F" || k === "а" || k === "А") { toggleFull(); }
      else if (k === "t" || k === "T" || k === "е" || k === "Е") { toggleTheme(null); }
    });

    // Колесо и тачпад: один жест - один слайд (горизонтальную ленту экранов не трогаем)
    var lock = 0;
    window.addEventListener("wheel", function (e) {
      if (e.target.closest && e.target.closest(".strip, .route-scroll") && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      var now = Date.now();
      if (now < lock || Math.abs(e.deltaY) < 8) return;
      lock = now + 850;
      go(current + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });

    // Свайп на телефоне и планшете
    var sx = 0, sy = 0;
    var spinTouch = false;
    // Свайп по ленте экранов, дорожной карте или вращаемому телефону листает их, а не слайды
    window.addEventListener("touchstart", function (e) { spinTouch = !!(e.target.closest && e.target.closest("[data-spin], .strip, .route-scroll")); sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    window.addEventListener("touchend", function (e) {
      if (spinTouch) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;
      if (Math.abs(dx) > Math.abs(dy)) go(current + (dx < 0 ? 1 : -1)); else go(current + (dy < 0 ? 1 : -1));
    }, { passive: true });

    function fromHash() {
      var k = location.hash ? slides.findIndex(function (s) { return "#" + s.id === location.hash; }) : 0;
      go(Math.max(k, 0));
    }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  });
  if (L.refresh) L.refresh();
})();

// Ролик о приложении: вертикальная версия на телефоне, если задана data-src-v; главы перематывают ролик и показывают, где он сейчас
(function () {
  var box = document.getElementById("player");
  if (!box) return;
  var v = document.getElementById("promo"), start = box.querySelector(".player-start");
  var btns = [].slice.call(box.querySelectorAll(".chapters button"));
  var marks = btns.map(function (b) { return +b.dataset.t; });
  var mq = window.matchMedia("(max-width: 700px)");
  var started = false, raf = 0, cur = -1;

  function variant() { return mq.matches && v.hasAttribute("data-src-v") ? "v" : "h"; }
  function setSource(keepTime) {
    var k = variant(), src = v.dataset["src" + k.toUpperCase()] || v.getAttribute("data-src-" + k);
    var t = keepTime ? v.currentTime : 0, playing = !v.paused;
    v.poster = v.getAttribute("data-poster-" + k);
    if (v.currentSrc && v.currentSrc.indexOf(src) >= 0) return;
    v.src = src;
    if (keepTime && started) {
      v.addEventListener("loadedmetadata", function once() { v.removeEventListener("loadedmetadata", once); v.currentTime = t; if (playing) v.play(); });
    }
  }
  function begin(t) {
    if (!started) { started = true; box.classList.add("is-started"); v.controls = true; }
    if (typeof t === "number") {
      if (v.readyState >= 1) v.currentTime = t;
      else v.addEventListener("loadedmetadata", function once() { v.removeEventListener("loadedmetadata", once); v.currentTime = t; });
    }
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  function chapterAt(t) { var i = 0; for (var k = 0; k < marks.length; k++) if (t >= marks[k]) i = k; return i; }
  function paint() {
    var t = v.currentTime, i = started ? chapterAt(t) : -1, d = v.duration || 60;
    if (i !== cur) {
      btns.forEach(function (b, k) { b.classList.toggle("is-active", k === i); b.classList.toggle("is-done", k < i); b.setAttribute("aria-current", k === i ? "true" : "false"); });
      cur = i;
    }
    btns.forEach(function (b, k) {
      var bar = b.querySelector(".ch-bar");
      if (k !== i) { if (k > i) bar.style.transform = ""; return; }
      var end = k + 1 < marks.length ? marks[k + 1] : d;
      bar.style.transform = "scaleX(" + Math.max(0, Math.min(1, (t - marks[k]) / (end - marks[k]))) + ")";
    });
  }
  function loop() { paint(); raf = v.paused ? 0 : requestAnimationFrame(loop); }

  setSource(false);
  start.addEventListener("click", function () { begin(); });
  btns.forEach(function (b) { b.addEventListener("click", function () { begin(+b.dataset.t); }); });
  v.addEventListener("play", function () { if (!raf) raf = requestAnimationFrame(loop); });
  v.addEventListener("seeked", paint);
  v.addEventListener("pause", paint);
  v.addEventListener("ended", function () { btns.forEach(function (b) { b.classList.add("is-done"); }); });
  if (mq.addEventListener) mq.addEventListener("change", function () { setSource(true); });
})();
