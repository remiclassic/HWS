// Catalog browser: search + filters over window.SPOTTER_CATALOG (catalog-data.js). Selection lives in the URL hash.
(function () {
  "use strict";
  var cars = window.SPOTTER_CATALOG || [];
  var state = { q: "", year: null, hunt: null, line: null, series: "", sort: "name" };
  var HUNT_LABEL = { TH: "Treasure Hunt", STH: "Super Treasure Hunt" };
  var HUNT_RANK = { STH: 0, TH: 1, None: 2 };

  var $ = function (id) { return document.getElementById(id); };
  var body = document.querySelector(".cat-body");
  var list = $("results");
  var detail = $("detail");
  var narrow = window.matchMedia("(max-width: 880px)");

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (kid) { if (kid) node.appendChild(kid); });
    return node;
  }

  function huntBadge(car) {
    return car.hunt === "None" ? null : el("span", { class: "badge " + car.hunt.toLowerCase(), title: HUNT_LABEL[car.hunt], text: car.hunt });
  }

  function slugFromHash() { return decodeURIComponent(location.hash.slice(1)); }
  function bySlug(slug) { return cars.filter(function (c) { return c.slug === slug; })[0]; }

  function matches(car) {
    if (state.year && car.year !== state.year) return false;
    if (state.hunt && car.hunt !== state.hunt) return false;
    if (state.line && car.line !== state.line) return false;
    if (state.series && car.series !== state.series) return false;
    if (!state.q) return true;
    var hay = [car.name, car.series, car.line, car.year, car.modelNumber, car.sku, car.caseCode].join(" ").toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every(function (word) { return hay.indexOf(word) !== -1; });
  }

  function sorted(rows) {
    var byName = function (a, b) { return a.name.replace(/^\W+/, "").localeCompare(b.name.replace(/^\W+/, "")); };
    return rows.slice().sort(function (a, b) {
      if (state.sort === "newest") return b.year - a.year || byName(a, b);
      if (state.sort === "hunt") return HUNT_RANK[a.hunt] - HUNT_RANK[b.hunt] || byName(a, b);
      return byName(a, b);
    });
  }

  function chip(label, pressed, onClick, cls) {
    var b = el("button", { type: "button", class: "chip" + (cls ? " " + cls : ""), "aria-pressed": String(pressed), text: label });
    b.addEventListener("click", onClick);
    return b;
  }

  function renderChips() {
    var years = cars.map(function (c) { return c.year; }).filter(function (y, i, a) { return a.indexOf(y) === i; }).sort().reverse();
    var yearRow = $("years");
    yearRow.textContent = "";
    yearRow.appendChild(chip("All", state.year === null, function () { set("year", null); }));
    years.forEach(function (y) { yearRow.appendChild(chip(String(y), state.year === y, function () { set("year", y); })); });

    var row = $("filters");
    row.textContent = "";
    ["TH", "STH"].forEach(function (h) {
      row.appendChild(chip(h, state.hunt === h, function () { set("hunt", state.hunt === h ? null : h); }, h.toLowerCase()));
    });
    ["Mainline", "Premium"].forEach(function (l) {
      row.appendChild(chip(l, state.line === l, function () { set("line", state.line === l ? null : l); }));
    });
  }

  function renderList() {
    var rows = sorted(cars.filter(matches));
    var current = slugFromHash();
    list.textContent = "";
    rows.forEach(function (car) {
      var thumb = el("span", { class: "cat-thumb" }, [car.image ? el("img", { src: car.image, alt: "", loading: "lazy", width: 760, height: 399 }) : null]);
      var text = el("span", {}, [el("strong", { text: car.name }), el("small", { text: car.year + " · " + (car.series || car.line) })]);
      var link = el("a", { class: "cat-row", href: "#" + car.slug, "aria-current": car.slug === current ? "true" : null }, [thumb, text, huntBadge(car)]);
      list.appendChild(el("li", {}, [link]));
    });
    if (!rows.length) list.appendChild(el("li", { class: "cat-empty", text: "No castings match. Try clearing a filter." }));
    $("count").textContent = rows.length + (rows.length === 1 ? " casting" : " castings");
    return rows;
  }

  function section(title, node) {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("h3", { text: title }));
    frag.appendChild(node);
    return frag;
  }

  function renderDetail(car) {
    detail.textContent = "";
    if (!car) return;

    var back = el("button", { type: "button", class: "cat-back", text: "← Back to catalog" });
    back.addEventListener("click", function () { history.pushState(null, "", location.pathname + location.search); route(); });
    detail.appendChild(back);

    detail.appendChild(el("div", { class: "stage" }, [car.image ? el("img", { src: car.image, alt: car.name + " studio cutout", width: 760, height: 399 }) : null]));
    detail.appendChild(el("h2", { text: car.name }));
    detail.appendChild(el("div", { class: "badges" }, [
      car.series ? el("span", { class: "badge series", text: car.series }) : null,
      el("span", { class: "badge year", text: String(car.year) }),
      el("span", { class: "badge line", text: car.line }),
      car.hunt === "None" ? null : el("span", { class: "badge " + car.hunt.toLowerCase(), text: HUNT_LABEL[car.hunt] }),
    ]));
    if (car.description) detail.appendChild(el("p", { class: "cat-desc", text: car.description }));

    var ids = [["Model", car.modelNumber], ["Case", car.caseCode], ["SKU", car.sku]].filter(function (p) { return p[1]; });
    if (ids.length) {
      detail.appendChild(el("dl", { class: "ids" }, ids.map(function (p) {
        return el("div", {}, [el("dt", { text: p[0] }), el("dd", { text: p[1] })]);
      })));
    }

    if (car.thSummary || car.thMarkers.length) {
      var guide = el("div", { class: "guide " + car.hunt.toLowerCase() }, [
        car.thSummary ? el("p", { text: car.thSummary }) : null,
        car.thMarkers.length ? el("ul", {}, car.thMarkers.map(function (m) { return el("li", { text: m }); })) : null,
      ]);
      detail.appendChild(section("Treasure Hunt field guide", guide));
    }

    if (car.variations.length) {
      var head = el("tr", {}, ["Deco", "Wheels", "Region", "Notes"].map(function (h) { return el("th", { scope: "col", text: h }); }));
      var rows = car.variations.map(function (v) {
        return el("tr", {}, [v.deco, v.wheels, v.region, v.notes].map(function (cell) { return el("td", { text: cell || "—" }); }));
      });
      var table = el("table", {}, [el("thead", {}, [head]), el("tbody", {}, rows)]);
      detail.appendChild(section("Variations", el("div", { class: "table-wrap" }, [table])));
    }

    if (car.specs.length) {
      detail.appendChild(section("Specs & sources", el("ul", { class: "specs" }, car.specs.map(function (s) {
        var pct = Math.round(s.confidence * 100);
        var kind = s.rumor ? "rumor" : s.type;
        var src = el("span", { class: "src", text: s.source }, []);
        src.appendChild(el("span", { class: "tag " + kind, text: kind }));
        var conf = el("span", { class: "conf", text: pct + "%" }, []);
        conf.appendChild(el("i", { style: "--pct:" + pct + "%", "aria-hidden": "true" }));
        return el("li", { class: s.rumor ? "rumor" : null }, [
          el("span", { class: "field", text: s.field }),
          el("span", { class: "value", text: s.value }),
          src,
          conf,
        ]);
      }))));
    }

    if (car.notes.length) {
      detail.appendChild(section("Collector notes", el("ul", { class: "notes" }, car.notes.map(function (n) {
        return el("li", {}, [document.createTextNode(n.body), el("cite", { text: n.source })]);
      }))));
    }

    var share = el("button", { type: "button", class: "btn btn-small btn-ghost", text: "Copy link" });
    share.addEventListener("click", function () {
      var done = function () { share.textContent = "Link copied"; setTimeout(function () { share.textContent = "Copy link"; }, 1800); };
      if (navigator.share && narrow.matches) navigator.share({ title: car.name + " — Spotter", url: location.href }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () {});
    });
    detail.appendChild(el("div", { class: "cat-actions" }, [
      el("a", { class: "btn btn-small", href: "./#join", text: "Join the waitlist to collect" }),
      share,
    ]));
    detail.scrollTop = 0;
  }

  // Wide screens always show a casting; narrow screens show the list until one is picked.
  function route() {
    var rows = renderList();
    var car = bySlug(slugFromHash());
    if (!car && !narrow.matches) car = rows[0];
    body.classList.toggle("open", !!bySlug(slugFromHash()));
    renderDetail(car);
    if (car && !slugFromHash()) {
      var first = list.querySelector('a[href="#' + car.slug + '"]');
      if (first) first.setAttribute("aria-current", "true");
    }
  }

  function set(key, value) {
    state[key] = value;
    renderChips();
    route();
  }

  var seriesSelect = $("series");
  cars.map(function (c) { return c.series; }).filter(function (s, i, a) { return s && a.indexOf(s) === i; }).sort().forEach(function (s) {
    seriesSelect.appendChild(el("option", { value: s, text: s }));
  });
  seriesSelect.addEventListener("change", function () { set("series", seriesSelect.value); });
  $("sort").addEventListener("change", function () { set("sort", $("sort").value); });
  $("q").addEventListener("input", function () { set("q", $("q").value.trim()); });
  window.addEventListener("hashchange", function () {
    route();
    if (narrow.matches && bySlug(slugFromHash())) $("catalog").scrollIntoView();
  });
  narrow.addEventListener("change", route);

  renderChips();
  route();
})();
