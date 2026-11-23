// Plant list: filters the data in plants-data.js in the browser (no server needed).
(function () {
  var PAGE = 48;
  var all = window.PLANTS || [];
  var $ = function (id) { return document.getElementById(id); };
  var q = $("q"), category = $("category"), subtype = $("subtype"), sun = $("sun"), trait = $("trait"), instock = $("instock");
  var results = $("results"), count = $("count"), more = $("more");
  var matches = [], shown = 0, allstars = $("allstars"), view = "grid";
  try { if (localStorage.getItem("lemuria-view") === "list") view = "list"; } catch(e) {}
  function normalize(s) { return String(s || "").toLowerCase().trim().replace(/\s+/g, " "); }
  function boosted(p) { var query = normalize(q.value); return !!query && (p.kw || []).some(function(k) { return normalize(k).indexOf(query) >= 0; }); }
  function listRow(p) {
    return '<a class="plant-row" href="plant/' + esc(p.s) + '.html"><span><strong>' + esc(p.b) + '</strong><small>' + esc(p.n) + '</small></span><span>' + (p.p ? 'From ' + esc(p.p) : '') + (p.d ? '<small>Updated ' + esc(p.d) + '</small>' : '') + '</span><span class="badge ' + esc(p.k) + '">' + esc(p.st) + '</span></a>';
  }
  function renderer(p) { return view === "list" ? listRow(p) : card(p); }
  function setView(next) {
    view = next;
    results.className = view === "list" ? "plant-list" : "grid";
    $("grid-view").setAttribute("aria-pressed", String(view === "grid"));
    $("list-view").setAttribute("aria-pressed", String(view === "list"));
    results.innerHTML = matches.slice(0, shown).map(renderer).join("");
    try { localStorage.setItem("lemuria-view", view); } catch(e) {}
  }

  // Default order: alphabetical by botanical name (case, quote marks and extra spaces ignored).
  function sortKey(p) {
    return String(p.b || "").replace(/[\u2018\u2019\u201c\u201d'\"]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  }
  all = all.slice().sort(function (a, b) {
    var x = sortKey(a), y = sortKey(b);
    if (x !== y) return x < y ? -1 : 1;
    x = String(a.n || "").toLowerCase(); y = String(b.n || "").toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function card(p) {
    var img = p.i || "static/placeholder.svg";
    return '<a class="card" href="plant/' + esc(p.s) + '.html">' +
      '<img src="' + esc(img) + '" alt="" loading="lazy">' +
      '<div class="card-body"><h3>' + esc(p.n) + '</h3><p class="botanical"><i>' + esc(p.b) + '</i></p>' +
      '<p class="card-meta"><span>' + (p.p ? "From " + esc(p.p) : "") + (p.d ? '<small class="updated">Updated ' + esc(p.d) + '</small>' : '') + '</span>' +
      '<span class="badge ' + esc(p.k) + '">' + esc(p.st) + '</span></p></div></a>';
  }

  function showMore() {
    var next = matches.slice(shown, shown + PAGE);
    results.insertAdjacentHTML("beforeend", next.map(renderer).join(""));
    shown += next.length;
    more.hidden = shown >= matches.length;
    count.textContent = matches.length
      ? "Showing " + shown + " of " + matches.length + " plants"
      : "No plants match. Try fewer filters or a different word.";
  }

  function apply() {
    var words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    matches = all.filter(function (p) {
      if (category.value && p.c !== category.value) return false;
      if (subtype.value && p.sub !== subtype.value) return false;
      if (sun.value && p.u.indexOf(sun.value) < 0) return false;
      if (trait.value && p.t.indexOf(trait.value) < 0) return false;
      if (instock.checked && p.k !== "ok") return false;
      if (allstars.checked && !p.a) return false;
      var haystack = p.h + " " + (p.kw || []).join(" ");
      return words.every(function (w) { return haystack.indexOf(w) >= 0; });
    });
    matches.sort(function(a,b) { return Number(boosted(b)) - Number(boosted(a)); });
    results.innerHTML = "";
    shown = 0;
    showMore();
    var params = new URLSearchParams();
    if (q.value) params.set("q", q.value);
    if (category.value) params.set("category", category.value);
    if (subtype.value) params.set("subtype", subtype.value);
    if (sun.value) params.set("sun", sun.value);
    if (trait.value) params.set("trait", trait.value);
    if (instock.checked) params.set("instock", "1");
    if (allstars.checked) params.set("allstars", "1");
    var qs = params.toString();
    try { history.replaceState(null, "", qs ? "?" + qs : location.pathname); } catch(e) {}
  }

  var p = new URLSearchParams(location.search);
  q.value = p.get("q") || "";
  category.value = p.get("category") || "";
  var requestedSubtype = p.get("subtype") || "";
  sun.value = p.get("sun") || "";
  trait.value = p.get("trait") || "";
  instock.checked = p.get("instock") === "1";
  allstars.checked = p.get("allstars") === "1";

  function refreshSubtypes() {
    var vals = Array.from(new Set(all.filter(function (plant) { return !category.value || plant.c === category.value; }).map(function (plant) { return plant.sub; }).filter(Boolean))).sort(function(a,b){return a.localeCompare(b);});
    var current = subtype.value;
    subtype.innerHTML = '<option value="">All plant types</option>' + vals.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join("");
    if (vals.indexOf(current) >= 0) subtype.value = current; else subtype.value = "";
  }
  category.addEventListener("change", function(){ refreshSubtypes(); apply(); });
  refreshSubtypes();
  if (Array.from(subtype.options).some(function(o){return o.value === requestedSubtype;})) subtype.value = requestedSubtype;
  [q, subtype, sun, trait, instock, allstars].forEach(function (el) {
    el.addEventListener(el === q ? "input" : "change", apply);
  });
  $("header-search").addEventListener("submit", function(e){ e.preventDefault(); apply(); });
  $("grid-view").addEventListener("click", function(){setView("grid");});
  $("list-view").addEventListener("click", function(){setView("list");});
  setView(view);
  more.addEventListener("click", showMore);
  apply();
})();
