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
  const links = PAGES.map(([id, title]) => '<a href="' + id + '.html"' +
    (id === page ? ' class="active" aria-current="page"' : '') + '>' + title +
    (id === "later" ? ' <span id="laterCount" class="count">0</span>' : '') + '</a>').join('');
  document.body.insertAdjacentHTML("afterbegin", '<a class="skip-link" href="#main-content">К содержимому</a>');
  $("site-header").innerHTML = '<header class="header"><div class="wrap header-in">' +
    '<a href="index.html" class="logo" aria-label="MovieMind, на главную"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="2" stroke="currentColor"/><path d="m13 10 10 6-10 6z" fill="currentColor"/><path d="M3 8h4M3 16h4M3 24h4M25 8h4M25 16h4M25 24h4" stroke="currentColor"/></svg>MovieMind</a>' +
    '<nav aria-label="Основное меню">' + links + '</nav>' +
    '<form class="quick" id="quickForm" role="search"><input id="quickSearch" class="input" type="search" placeholder="Найти историю ↗" aria-label="Поиск фильма по названию"></form></div></header>';
  $("site-footer").innerHTML = '<footer><div class="wrap f-cols"><div><b>MovieMind / Кино по настроению</b><p>Учебный проект ГУАП · группа 4615.<br>Небольшое место для больших историй.</p><p>В коллекции фильмы из списка «500 лучших фильмов» Кинопоиска: название, год, жанр, рейтинг и постеры — оттуда же. Настроение — наша оценка по жанру. Фото на главной: Unsplash / Pexels.</p></div><div><b>Открыть новое</b><a href="catalog.html">Каталог</a><a href="picker.html">Подбор фильма</a><a href="recommendations.html">Рекомендации</a></div><div><b>Ваш вечер</b><a href="later.html">Посмотреть позже</a><a href="index.html">На главную</a></div></div><div class="wrap footer-bottom"><span>MOVIEMIND · У КАЖДОГО ВЕЧЕРА СВОЯ ИСТОРИЯ</span><span>Топ-500 Кинопоиска / 2026</span></div></footer>';
  document.body.insertAdjacentHTML("beforeend", '<dialog id="whereDialog" aria-labelledby="whereTitle"><h3 id="whereTitle"></h3><div id="whereBody"></div><p class="note" id="whereNote"></p><button class="btn btn-main" id="whereClose" type="button">Закрыть</button></dialog><dialog id="movieDialog" aria-labelledby="movieTitle"><button class="dialog-close" id="movieClose" type="button" aria-label="Закрыть описание фильма">×</button><div id="movieBody"></div></dialog><div id="toast" role="status"></div>');
  $("whereClose").onclick = () => $("whereDialog").close();
  $("movieClose").onclick = () => $("movieDialog").close();
  [$("whereDialog"), $("movieDialog")].forEach(dialog => dialog.addEventListener("click", e => {
    const r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
  }));
  $("quickForm").onsubmit = e => { e.preventDefault(); location.href = "catalog.html?q=" + encodeURIComponent($("quickSearch").value.trim()); };
}

function showMovieDetails(id) {
  const movie = MOVIES.find(m => m.id === id);
  if (!movie) return;
  const body = $("movieBody"); body.replaceChildren();
  const detail = el("div", "movie-detail");
  const img = el("img", "detail-poster"); if (movie.posterUrl) img.src = movie.posterUrl; img.alt = "Постер фильма «" + movie.title + "»"; img.onerror = () => posterFallback(img, movie);
  const copy = el("div", "detail-copy");
  copy.appendChild(el("span", "tag demo-label", "Топ-500 Кинопоиска"));
  const title = el("h3", "", movie.title); title.id = "movieTitle"; copy.appendChild(title);
  copy.appendChild(el("p", "meta", [movie.year, splitGenres(movie).join(" / ")].filter(Boolean).join(" · ")));
  copy.appendChild(el("p", "meta", "Рейтинг Кинопоиска: " + (Number.isFinite(movie.rating) ? movie.rating.toFixed(1) + " / 10" : "нет данных")));
  copy.appendChild(el("p", "", movie.description || "Описание появится позже."));
  if (Number.isFinite(movie.mood)) copy.appendChild(el("p", "meta", "Настроение (оценка по жанру): " + moodText(movie.mood) + " · " + movie.mood + "/10"));
  const actions = el("div", "actions");
  const save = el("button", "btn btn-ghost later-btn"); save.type = "button"; save.dataset.id = id; updateLaterButton(save); save.onclick = () => toggleWatchLater(id);
  const where = el("button", "btn btn-ghost", "Где посмотреть"); where.type = "button";
  where.onclick = () => { $("movieDialog").close(); showWhereToWatch(id); };
  actions.append(save, where); copy.appendChild(actions); detail.append(img, copy); body.appendChild(detail);
  $("movieDialog").showModal();
}

// Если постер нужного размера не загрузился — пробуем оригинал, потом убираем картинку.
function posterFallback(img, movie) {
  if (movie.poster && typeof POSTER_BASE !== "undefined" && !img.dataset.retry) {
    img.dataset.retry = "1";
    img.src = POSTER_BASE + movie.poster + "/orig";
  } else img.remove();
}

// ---------- Карточки ----------
function createCard(movie, matchPercent) {
  const card = el("article", "card");
  const poster = el("button", "poster poster-button");
  poster.type = "button";
  poster.setAttribute("aria-label", "Подробнее: " + movie.title);
  poster.onclick = () => showMovieDetails(movie.id);
  if (movie.posterUrl) {
    const img = el("img");
    img.src = movie.posterUrl; img.alt = ""; img.loading = "lazy";
    img.onerror = () => posterFallback(img, movie);
    poster.appendChild(img);
  }
  poster.appendChild(el("span", "poster-title", movie.title || "Без названия"));
  poster.appendChild(el("span", "badge", typeof movie.rating === "number" ? movie.rating.toFixed(1) : "—"));
  if (typeof movie.mood === "number") poster.appendChild(el("span", "mood", FACES[movie.mood - 1] + " " + movie.mood + "/10"));
  card.appendChild(poster);

  const body = el("div", "card-body");
  const heading = el("h3");
  const titleBtn = el("button", "detail-launch", movie.title || "Без названия");
  titleBtn.type = "button"; titleBtn.onclick = () => showMovieDetails(movie.id);
  heading.appendChild(titleBtn); body.appendChild(heading);
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
    watchLater = Array.isArray(saved) ? [...new Set(saved.filter(id => Number.isInteger(id) && MOVIES.some(m => m.id === id)))] : [];
  } catch (e) { watchLater = []; }
}
function saveWatchLater() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watchLater)); }
  catch (e) { if ($("storageWarn")) $("storageWarn").hidden = false; else showMessage("Список не сохранится: браузер запрещает хранение"); }
}
function updateLaterButton(btn) {
  const on = watchLater.includes(Number(btn.dataset.id));
  btn.classList.toggle("on", on);
  btn.textContent = on ? "✓ В списке" : "+ В список";
  btn.setAttribute("aria-label", (on ? "Убрать из списка: " : "Сохранить на потом: ") + (MOVIES.find(m => m.id === Number(btn.dataset.id))?.title || "фильм"));
  btn.setAttribute("aria-pressed", on);
}
function toggleWatchLater(id) {
  const i = watchLater.indexOf(id);
  if (i === -1) watchLater.push(id); else watchLater.splice(i, 1);
  saveWatchLater();
  refreshLater();
  showMessage(i === -1 ? "Фильм сохранён на вечер" : "Фильм удалён из списка");
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
  body.appendChild(el("p", "source-disclaimer", "Ссылки взяты со страницы списка «500 лучших фильмов» на Кинопоиске. Другие сервисы не проверялись."));
  if (russian.length) { body.appendChild(el("p", "", "Можно смотреть на платформе (по данным Кинопоиска):")); list = russian; }
  else if (other.length) { body.appendChild(el("p", "", "Страница фильма на Кинопоиске (там указано, где его можно посмотреть):")); list = other; }
  else body.appendChild(el("p", "", "Сведения о доступности не найдены."));
  list.forEach((r) => {
    const row = el("div", "src");
    row.appendChild(el("span", "tag", r.sourceName || "источник"));
    if (/^https?:\/\//i.test(String(r.url || ""))) {
      const a = el("a", "", "Перейти");
      a.href = r.url; a.target = "_blank"; a.rel = "noopener";
      row.appendChild(a);
    }
    body.appendChild(row);
  });
  const dates = records.map((r) => r.checkedDate).filter(Boolean).sort();
  $("whereNote").textContent = "Дата проверки: " + (dates.length ? dates[dates.length - 1] : "нет данных") + ". Доступность может измениться.";
  $("whereDialog").showModal();
}

// ---------- Поиск, фильтры и прозрачная оценка совпадения ----------
function searchByTitle(text) {
  const query = String(text || "").trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
  return MOVIES.filter(m => String(m.title || "").toLocaleLowerCase("ru").replaceAll("ё", "е").includes(query));
}
function filterMovies(list, prefs) {
  const moodActive = prefs.moodFrom > 1 || prefs.moodTo < 10;
  return list.filter(m => (!prefs.genres?.length || prefs.genres.some(g => splitGenres(m).includes(g))) &&
    (!prefs.yearFrom || m.year >= prefs.yearFrom) && (!prefs.yearTo || m.year <= prefs.yearTo) &&
    (!prefs.ratingMin || (Number.isFinite(m.rating) && m.rating >= prefs.ratingMin)) &&
    (!moodActive || (Number.isFinite(m.mood) && m.mood >= prefs.moodFrom && m.mood <= prefs.moodTo)));
}
function applyFilters(prefs) { return filterMovies(searchByTitle($("searchInput")?.value || ""), prefs); }
function sortMovies(list, mode = $("sortSelect")?.value || "rating") {
  return list.slice().sort((a, b) => mode === "title" ? String(a.title).localeCompare(String(b.title), "ru") :
    mode === "year" ? (b.year || 0) - (a.year || 0) : (b.rating ?? -1) - (a.rating ?? -1));
}
function calcMatch(movie, prefs) {
  const genre = prefs.genres?.length ? prefs.genres.filter(g => splitGenres(movie).includes(g)).length / prefs.genres.length : 1;
  const rating = Number.isFinite(movie.rating) ? Math.min(10, Math.max(0, movie.rating)) / 10 : 0;
  const year = (!prefs.yearFrom || movie.year >= prefs.yearFrom) && (!prefs.yearTo || movie.year <= prefs.yearTo) ? 1 : 0;
  return Math.round(100 * (.6 * genre + .3 * rating + .1 * year));
}
function pickRandomMovie() {
  if (!MOVIES.length) { showMessage("Коллекция пока пуста"); return; }
  showMovieDetails(MOVIES[Math.floor(Math.random() * MOVIES.length)].id);
}
function recommend(prefs) {
  $("recGrid").replaceChildren();
  const list = filterMovies(MOVIES, prefs).map(movie => ({movie, score: calcMatch(movie, prefs)}))
    .sort((a, b) => b.score - a.score || (b.movie.rating || 0) - (a.movie.rating || 0)).slice(0, 10);
  $("recEmpty").hidden = list.length > 0;
  list.forEach(({movie, score}) => $("recGrid").appendChild(createCard(movie, score)));
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
  sortMovies(MOVIES).slice(0, 4).forEach(m => $("topRow").appendChild(createCard(m)));
  $("randomBtn").onclick = pickRandomMovie;
  $("featureBtn").onclick = () => { location.href = "picker.html"; };
}

function initCatalog() {
  // Любое изменение фильтра (включая настроение) обновляет список.
  const refresh = () => {
    const prefs = readFilters();
    renderCatalog(sortMovies(applyFilters(prefs)));
  };
  $("filtersBtn").onclick = () => { const open = $("filters").classList.toggle("open"); $("filtersBtn").setAttribute("aria-expanded", String(open)); };
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
  const params = new URLSearchParams(location.search);
  $("searchInput").value = params.get("q") || "";
  document.querySelectorAll("#genreChips .chip").forEach(chip => {
    if (chip.textContent === params.get("genre")) { chip.classList.add("active"); chip.setAttribute("aria-pressed", "true"); }
  });
  ["moodFrom", "moodTo"].forEach(id => {
    const value = Number(params.get(id));
    if (Number.isInteger(value) && value >= 1 && value <= 10) $(id).value = value;
  });
  updateMoodPreview();
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
    if (![f.moodFrom, f.moodTo].every(v => Number.isInteger(v) && v >= 1 && v <= 10)) { showMessage("Настроение — целое число от 1 до 10"); return; }
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
  const validMood = [prefs.moodFrom, prefs.moodTo].every(v => Number.isInteger(v) && v >= 1 && v <= 10) && prefs.moodFrom <= prefs.moodTo;
  if (!validMood || (prefs.yearFrom && prefs.yearTo && prefs.yearFrom > prefs.yearTo)) {
    $("recEmpty").textContent = "Некорректные параметры. Измените подбор."; $("recEmpty").hidden = false; return;
  }
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
