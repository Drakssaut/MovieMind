// func.js — логика MovieMind, общая для всех страниц.
// Данные берутся из глобальных массивов MOVIES и AVAILABILITY (папка data/).

const PAGE_SIZE = 24;
const STORAGE_KEY = "moviemind_watch_later";
const PAGES = [
  ["index", "Главная"], ["catalog", "Каталог"], ["picker", "Подбор"],
  ["recommendations", "Рекомендации"], ["later", "Посмотреть позже"]
];
// Поле mood у фильма: от 1 (очень грустно) до 10 (очень весело).
// У части фильмов поля mood может не быть.
const FACES = ["😢", "😢", "🙁", "🙁", "😐", "😐", "🙂", "🙂", "😄", "😄"];

let currentList = [];
let shownCount = 0;
let watchLater = [];

const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function showMessage(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}
function loadData() { return typeof MOVIES !== "undefined" && Array.isArray(MOVIES); }
function getAvailability() { return (typeof AVAILABILITY !== "undefined" && Array.isArray(AVAILABILITY)) ? AVAILABILITY : []; }
function splitGenres(m) { return m.genres ? String(m.genres).split(";").map((g) => g.trim()).filter(Boolean) : []; }
function getAllGenres() {
  const set = new Set();
  MOVIES.forEach((m) => splitGenres(m).forEach((g) => set.add(g)));
  return Array.from(set).sort();
}
function moodText(v) { return v <= 2 ? "Очень грустное" : v <= 4 ? "Грустное" : v <= 6 ? "Нейтральное" : v <= 8 ? "Весёлое" : "Очень весёлое"; }

// ---------- Общая шапка и подвал (одинаковые на всех страницах) ----------
function renderLayout() {
  const page = document.body.dataset.page;
  const links = PAGES.map((p) =>
    '<a href="' + p[0] + '.html"' + (p[0] === page ? ' class="active"' : "") + ">" + p[1] +
    (p[0] === "later" ? ' <span id="laterCount" class="count">0</span>' : "") + "</a>").join("");
  $("site-header").innerHTML =
    '<header class="header"><div class="wrap header-in">' +
    '<a href="index.html" class="logo" aria-label="MovieMind, на главную"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC72C"/><stop offset=".6" stop-color="#FF8C1A"/><stop offset="1" stop-color="#E63946"/></linearGradient></defs><circle cx="12" cy="12" r="11" fill="url(#lg)"/><path d="M10 7.5v9l7-4.5z" fill="#1a1205"/></svg>MovieMind</a>' +
    '<nav aria-label="Основное меню">' + links + "</nav>" +
    '<form class="quick" id="quickForm"><input id="quickSearch" class="input" type="search" placeholder="Поиск фильма…" aria-label="Быстрый поиск по названию"></form></div></header>';
  $("site-footer").innerHTML =
    '<footer><div class="wrap f-cols"><div><b>MovieMind</b><br>Учебный проект ГУАП · группа 4615.<br>Сведения о том, где можно посмотреть фильм, вносятся вручную и могут устаревать.</div>' +
    '<div><b>Страницы</b><a href="catalog.html">Каталог</a><a href="picker.html">Подбор</a><a href="recommendations.html">Рекомендации</a></div>' +
    '<div><b>Мои фильмы</b><a href="later.html">Посмотреть позже</a><a href="index.html">На главную</a></div></div></footer>';
  document.body.insertAdjacentHTML("beforeend",
    '<dialog id="whereDialog" aria-labelledby="whereTitle"><h3 id="whereTitle" style="margin-top:0"></h3><div id="whereBody"></div><p class="note" id="whereNote"></p>' +
    '<button class="btn btn-main" id="whereClose" type="button" style="margin-top:12px">Закрыть</button></dialog><div id="toast" role="status"></div>');
  $("whereClose").onclick = () => $("whereDialog").close();
  $("whereDialog").addEventListener("click", (e) => { if (e.target === $("whereDialog")) $("whereDialog").close(); });
  // быстрый поиск: переход в каталог
  $("quickForm").onsubmit = (e) => {
    e.preventDefault();
    location.href = "catalog.html?q=" + encodeURIComponent($("quickSearch").value.trim());
  };
}

// ---------- Карточки ----------
function createCard(movie, matchPercent) {
  const card = el("article", "card");
  const poster = el("div", "poster p" + (movie.id % 4));
  if (movie.posterUrl) {
    const img = el("img");
    img.src = movie.posterUrl; img.alt = ""; img.loading = "lazy";
    img.onerror = () => img.remove();
    poster.appendChild(img);
  }
  poster.appendChild(el("span", "", movie.title ? movie.title.charAt(0).toUpperCase() : "?"));
  poster.appendChild(el("span", "badge", typeof movie.rating === "number" ? movie.rating.toFixed(1) : "—"));
  if (typeof movie.mood === "number") poster.appendChild(el("span", "mood", FACES[movie.mood - 1] + " " + movie.mood + "/10"));
  card.appendChild(poster);

  const body = el("div", "card-body");
  body.appendChild(el("h3", "", movie.title || "Без названия"));
  body.appendChild(el("p", "meta", (movie.year || "год: нет данных") + " · " + (splitGenres(movie).join(", ") || "жанр: нет данных")));
  body.appendChild(el("p", "desc", movie.description || "нет данных"));
  if (matchPercent !== undefined) {
    body.appendChild(el("p", "meta", "Совпадение " + matchPercent + " %"));
    const bar = el("div", "match"), fill = el("span");
    fill.style.width = matchPercent + "%";
    bar.appendChild(fill);
    body.appendChild(bar);
  }
  const actions = el("div", "actions");
  const laterBtn = el("button", "btn btn-ghost later-btn");
  laterBtn.type = "button";
  laterBtn.dataset.id = movie.id;
  updateLaterButton(laterBtn);
  laterBtn.onclick = () => toggleWatchLater(movie.id);
  const whereBtn = el("button", "btn btn-ghost", "Где посмотреть");
  whereBtn.type = "button";
  whereBtn.onclick = () => showWhereToWatch(movie.id);
  actions.append(laterBtn, whereBtn);
  body.appendChild(actions);
  card.appendChild(body);
  return card;
}

function renderCatalog(list) {
  currentList = list;
  shownCount = 0;
  $("grid").innerHTML = "";
  $("foundCount").textContent = list.length;
  $("emptyMsg").hidden = list.length > 0;
  showMore();
}
function showMore() {
  const part = currentList.slice(shownCount, shownCount + PAGE_SIZE);
  part.forEach((m) => $("grid").appendChild(createCard(m)));
  shownCount += part.length;
  $("moreBtn").hidden = shownCount >= currentList.length;
}

// ---------- Посмотреть позже ----------
function loadWatchLater() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    watchLater = Array.isArray(saved) ? saved : [];
  } catch (e) { watchLater = []; }
}
function saveWatchLater() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watchLater)); }
  catch (e) { if ($("storageWarn")) $("storageWarn").hidden = false; else showMessage("Список не сохранится: браузер запрещает хранение"); }
}
function updateLaterButton(btn) {
  const on = watchLater.includes(Number(btn.dataset.id));
  btn.classList.toggle("on", on);
  btn.textContent = on ? "♥ В списке" : "♡ Позже";
  btn.setAttribute("aria-pressed", on);
}
function toggleWatchLater(id) {
  const i = watchLater.indexOf(id);
  if (i === -1) watchLater.push(id); else watchLater.splice(i, 1);
  saveWatchLater();
  refreshLater();
}
function refreshLater() {
  document.querySelectorAll(".later-btn").forEach(updateLaterButton);
  if ($("laterCount")) $("laterCount").textContent = watchLater.length;
  if ($("laterGrid")) {
    $("laterGrid").innerHTML = "";
    MOVIES.filter((m) => watchLater.includes(m.id)).forEach((m) => $("laterGrid").appendChild(createCard(m)));
    $("laterEmpty").hidden = $("laterGrid").children.length > 0;
  }
}

// ---------- Где посмотреть ----------
function showWhereToWatch(id) {
  const movie = MOVIES.find((m) => m.id === id);
  const records = getAvailability().filter((r) => r.movieId === id && r.status === "available");
  const russian = records.filter((r) => r.sourceType === "platform");
  const other = records.filter((r) => r.sourceType === "other_site");
  const body = $("whereBody");
  body.innerHTML = "";
  $("whereTitle").textContent = movie && movie.title ? movie.title : "Где посмотреть";
  let list = [];
  if (russian.length) { body.appendChild(el("p", "", "Доступен на российских платформах:")); list = russian; }
  else if (other.length) { body.appendChild(el("p", "", "На российских платформах фильм не найден. Можно посмотреть на другом сайте:")); list = other; }
  else body.appendChild(el("p", "", "Сведения о доступности не найдены."));
  list.forEach((r) => {
    const row = el("div", "src");
    row.appendChild(el("span", "tag", r.sourceName || "источник"));
    if (r.url && String(r.url).startsWith("http")) {
      const a = el("a", "", "Перейти");
      a.href = r.url; a.target = "_blank"; a.rel = "noopener";
      row.appendChild(a);
    }
    body.appendChild(row);
  });
  const dates = records.map((r) => r.checkedDate).filter(Boolean).sort();
  $("whereNote").textContent = "Сведения проверены: " + (dates.length ? dates[dates.length - 1] : "нет данных") + ". Доступность может измениться.";
  $("whereDialog").showModal();
}

// ---------- Заготовки: логику допишем на следующем этапе ----------
function searchByTitle(text) { /* TODO: вернуть фильмы, в названии которых есть text (без учёта регистра) */ return MOVIES; }
function applyFilters(prefs) {
  // TODO: поиск (#searchInput), жанры, годы, рейтинг и настроение.
  // Обязательно учесть prefs.moodFrom и prefs.moodTo наравне с остальными фильтрами:
  // если диапазон настроения отличается от 1–10, фильмы без поля mood в выборку не попадают.
  return MOVIES.slice();
}
function sortMovies(list) { /* TODO: сортировка по #sortSelect (rating, year, title) */ return list; }
function calcMatch(movie, prefs) { /* TODO: S = 0,6·G + 0,3·R + 0,1·Y из ТЗ, в процентах; учесть prefs.moodFrom и prefs.moodTo */ return 0; }
function pickRandomMovie() { /* TODO: случайный фильм */ showMessage("Случайный фильм появится на следующем этапе"); }
function recommend(prefs) {
  // TODO: отобрать до 10 фильмов по calcMatch(movie, prefs). Пока демо-подборка.
  // В prefs уже есть поля moodFrom и moodTo — при отборе их тоже нужно учитывать.
  $("recGrid").innerHTML = "";
  MOVIES.slice(0, 10).forEach((m, i) => $("recGrid").appendChild(createCard(m, 95 - i * 6)));
}

// ---------- Единый набор фильтров ----------
// Читает число из поля; если поле пустое, возвращает значение по умолчанию.
function inputNumber(id, fallback) {
  const input = $(id);
  if (!input || input.value === "") return fallback;
  const value = Number(input.value);
  return isNaN(value) ? fallback : value;
}

// Показывает смайл и подпись для выбранного диапазона настроения.
function updateMoodPreview() {
  const face = $("moodFace");
  const text = $("moodText");
  if (!face || !text) return;
  const from = inputNumber("moodFrom", 1);
  const to = inputNumber("moodTo", 10);
  if (from <= 1 && to >= 10) {
    face.textContent = "😐";
    text.textContent = "Любое (1–10)";
    return;
  }
  // Для подписи берём середину диапазона.
  const mid = Math.min(10, Math.max(1, Math.round((from + to) / 2)));
  face.textContent = FACES[mid - 1];
  text.textContent = moodText(mid) + " · " + from + "–" + to;
}

// Строит одинаковый блок параметров на странице каталога и на шаге 2 подбора.
// containerId — куда вставить блок, onChange — что вызвать после изменения любого поля.
function renderFilters(containerId, onChange) {
  const box = $(containerId);
  if (!box) return;
  const notify = () => { if (onChange) onChange(); };
  box.innerHTML =
    '<div class="f-title">Год выпуска</div>' +
    '<div class="row2">' +
      '<input id="yearFrom" class="input" type="number" inputmode="numeric" placeholder="от" aria-label="Год от">' +
      '<input id="yearTo" class="input" type="number" inputmode="numeric" placeholder="до" aria-label="Год до">' +
    '</div>' +
    '<div class="f-title">Минимальный рейтинг: <span id="ratingVal">0</span></div>' +
    '<input id="ratingMin" type="range" min="0" max="10" step="0.5" value="0" aria-label="Минимальный рейтинг от 0 до 10">' +
    '<div class="f-title">Настроение</div>' +
    '<div class="mood-box">' +
      '<div class="mood-preview">' +
        '<span class="mood-face-sm" id="moodFace" aria-hidden="true">😐</span>' +
        '<span id="moodText" aria-live="polite">Любое (1–10)</span>' +
      '</div>' +
      '<div class="row2">' +
        '<label class="mood-field">от <input id="moodFrom" class="input" type="number" inputmode="numeric" min="1" max="10" step="1" value="1" aria-label="Настроение от 1 до 10"></label>' +
        '<label class="mood-field">до <input id="moodTo" class="input" type="number" inputmode="numeric" min="1" max="10" step="1" value="10" aria-label="Настроение до, от 1 до 10"></label>' +
      '</div>' +
    '</div>';
  $("ratingMin").oninput = () => {
    $("ratingVal").textContent = $("ratingMin").value;
    notify();
  };
  $("yearFrom").oninput = notify;
  $("yearTo").oninput = notify;
  $("moodFrom").oninput = () => { updateMoodPreview(); notify(); };
  $("moodTo").oninput = () => { updateMoodPreview(); notify(); };
  updateMoodPreview();
}

// Читает все фильтры одной функцией: жанры, годы, рейтинг и диапазон настроения.
function readFilters() {
  // Жанры лежат либо в каталоге (#genreChips), либо на шаге 1 подбора (#pickGenres).
  const genreBox = $("genreChips") || $("pickGenres");
  const genres = genreBox
    ? Array.from(genreBox.querySelectorAll(".chip.active")).map((chip) => chip.textContent)
    : [];
  return {
    genres: genres,
    yearFrom: inputNumber("yearFrom", 0),
    yearTo: inputNumber("yearTo", 0),
    ratingMin: inputNumber("ratingMin", 0),
    moodFrom: inputNumber("moodFrom", 1),
    moodTo: inputNumber("moodTo", 10)
  };
}

// ---------- Общие элементы страниц ----------
function fillChips(containerId, items, onChange) {
  items.forEach((text) => {
    const chip = el("button", "chip", text);
    chip.type = "button";
    chip.setAttribute("aria-pressed", "false");
    chip.onclick = () => {
      chip.classList.toggle("active");
      chip.setAttribute("aria-pressed", chip.classList.contains("active"));
      if (onChange) onChange();
    };
    $(containerId).appendChild(chip);
  });
}
function activeChips(containerId) {
  return Array.from(document.querySelectorAll("#" + containerId + " .chip.active")).map((c) => c.textContent);
}

// ---------- Страницы ----------
function initIndex() {
  if (!loadData()) return;
  $("statMovies").textContent = MOVIES.length;
  $("statGenres").textContent = getAllGenres().length;
  $("statSources").textContent = new Set(getAvailability().map((r) => r.sourceName)).size;
  const top = MOVIES.filter((m) => typeof m.rating === "number").sort((a, b) => b.rating - a.rating);
  top.slice(0, 3).forEach((m, i) => {
    const mini = el("div", "mini m" + i + " p" + (m.id % 4));
    mini.appendChild(el("span", "", m.title));
    mini.appendChild(el("small", "", m.year + " · ★ " + m.rating.toFixed(1)));
    $("heroStack").appendChild(mini);
  });
  top.slice(0, 8).forEach((m) => $("topRow").appendChild(createCard(m)));
  $("randomBtn").onclick = pickRandomMovie;
}

function initCatalog() {
  // Любое изменение фильтра (включая настроение) обновляет список.
  const refresh = () => {
    const prefs = readFilters();
    renderCatalog(sortMovies(applyFilters(prefs)));
  };
  $("filtersBtn").onclick = () => $("filters").classList.toggle("open");
  $("moreBtn").onclick = showMore;
  $("sortSelect").onchange = refresh;
  $("searchInput").oninput = refresh;
  $("resetBtn").onclick = () => {
    // Снимаем выбор со всех жанровых чипов.
    document.querySelectorAll("#filters .chip.active").forEach((chip) => {
      chip.classList.remove("active");
      chip.setAttribute("aria-pressed", "false");
    });
    $("searchInput").value = "";
    // Перерисовываем блок параметров — годы, рейтинг и настроение вернутся к значениям по умолчанию.
    renderFilters("paramsBox", refresh);
    refresh();
  };
  if (!loadData()) { $("dataError").hidden = false; return; }
  fillChips("genreChips", getAllGenres(), refresh);
  renderFilters("paramsBox", refresh);
  $("searchInput").value = new URLSearchParams(location.search).get("q") || "";
  refresh();
}

// Подбор: два шага, результат передаётся в адресе страницы рекомендаций.
function initPicker() {
  if (!loadData()) { $("dataError").hidden = false; return; }
  let step = 1;
  fillChips("pickGenres", getAllGenres());
  renderFilters("pickParams", null);

  // Если пришли по кнопке «Изменить подбор», подставляем значения из адреса.
  const params = new URLSearchParams(location.search);
  const genresParam = params.get("genres");
  if (genresParam) {
    const wanted = genresParam.split(",").map((g) => g.trim());
    document.querySelectorAll("#pickGenres .chip").forEach((chip) => {
      if (wanted.includes(chip.textContent)) {
        chip.classList.add("active");
        chip.setAttribute("aria-pressed", "true");
      }
    });
  }
  if (params.get("from")) $("yearFrom").value = params.get("from");
  if (params.get("to")) $("yearTo").value = params.get("to");
  if (params.get("rating")) {
    $("ratingMin").value = params.get("rating");
    $("ratingVal").textContent = $("ratingMin").value;
  }
  if (params.get("moodFrom")) $("moodFrom").value = params.get("moodFrom");
  if (params.get("moodTo")) $("moodTo").value = params.get("moodTo");
  updateMoodPreview();

  function show() {
    document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("active", Number(p.dataset.step) === step));
    $("progBar").style.width = (step / 2 * 100) + "%";
    $("stepLabel").textContent = "Шаг " + step + " из 2";
    if ($("progWrap")) $("progWrap").setAttribute("aria-valuenow", step);
    $("backBtn").style.visibility = step === 1 ? "hidden" : "visible";
    $("nextBtn").textContent = step === 2 ? "Показать подборку" : "Далее";
  }

  $("backBtn").onclick = () => { if (step > 1) { step--; show(); } };
  $("nextBtn").onclick = () => {
    // Шаг 1: проверяем, что выбран хотя бы один жанр.
    if (step === 1) {
      if (activeChips("pickGenres").length === 0) { showMessage("Выберите хотя бы один жанр"); return; }
      step = 2;
      show();
      return;
    }
    // Шаг 2: проверяем годы и диапазон настроения.
    const f = readFilters();
    if (f.yearFrom && f.yearTo && f.yearFrom > f.yearTo) { showMessage("Год «от» не может быть больше года «до»"); return; }
    if (f.moodFrom > f.moodTo) { showMessage("Настроение «от» не может быть больше «до»"); return; }
    // Передаём все параметры через адрес страницы рекомендаций.
    const p = new URLSearchParams({
      genres: f.genres.join(","),
      rating: f.ratingMin,
      moodFrom: f.moodFrom,
      moodTo: f.moodTo
    });
    if (f.yearFrom) p.set("from", f.yearFrom);
    if (f.yearTo) p.set("to", f.yearTo);
    location.href = "recommendations.html?" + p.toString();
  };
  show();
}

// Текст тега с диапазоном настроения для страницы рекомендаций.
function moodRangeText(from, to) {
  const mid = Math.min(10, Math.max(1, Math.round((from + to) / 2)));
  const face = FACES[mid - 1];
  if (from <= 1 && to >= 10) return face + " любое (1–10)";
  return face + " " + moodText(mid) + " · " + from + "–" + to;
}

function initRecommendations() {
  if (!loadData()) { $("dataError").hidden = false; return; }
  const p = new URLSearchParams(location.search);
  if (!p.get("genres")) { $("noParams").hidden = false; return; }
  const prefs = {
    genres: p.get("genres").split(",").filter(Boolean),
    yearFrom: Number(p.get("from")) || 0,
    yearTo: Number(p.get("to")) || 0,
    ratingMin: Number(p.get("rating")) || 0,
    moodFrom: Number(p.get("moodFrom")) || 1,
    moodTo: Number(p.get("moodTo")) || 10
  };
  // «Изменить подбор» возвращает на picker.html с теми же параметрами.
  $("changeLink").href = "picker.html?" + p.toString();

  $("summary").appendChild(el("span", "tag", "Жанры: " + prefs.genres.join(", ")));
  $("summary").appendChild(el("span", "tag", "Настроение: " + moodRangeText(prefs.moodFrom, prefs.moodTo)));
  if (prefs.ratingMin) $("summary").appendChild(el("span", "tag", "Рейтинг от " + prefs.ratingMin));
  if (prefs.yearFrom || prefs.yearTo) $("summary").appendChild(el("span", "tag", "Годы: " + (prefs.yearFrom || "…") + "–" + (prefs.yearTo || "…")));
  recommend(prefs);
}

function init() {
  renderLayout();
  if (loadData()) loadWatchLater();
  const page = document.body.dataset.page;
  if (page === "index") initIndex();
  if (page === "catalog") initCatalog();
  if (page === "picker") initPicker();
  if (page === "recommendations") initRecommendations();
  if (page === "later" && !loadData()) $("dataError").hidden = false;
  if (loadData()) refreshLater();
}

init();
