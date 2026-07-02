/* THE FOREST — game view. Trees = assets, clouds = news, rain = impact.
   Features: impact clouds, per-tree forecasts, time machine (past+future),
   seed-planting garden, news-list & garden sheets, onboarding tour,
   EN/TR UI toggle, AI deep reads (when server has a key), sounds. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const fmtMoney = n => (n == null ? '—' : (Math.abs(n) >= 1 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$' + n.toFixed(5)));
const pct = n => (n == null ? '' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%');
function escapeHtml(s = '') { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------------- i18n (UI chrome only — analysis text stays English) ------ */
const STR = {
  en: {
    back: '← BACK TO DASHBOARD', pill: 'FOR FUN · NOT ADVICE',
    intro: 'Every <b>tree is an asset</b>, grouped into <b>families</b>. <b>News clouds</b> drift overhead — <b>click a cloud</b> to see where its rain falls: 💧 <b>waters</b> or ☠️ <b>poisons</b> which trees, and why. <b>Click a tree</b> for its 🔮 forecast and to <b>plant a pretend seed</b>. Drag the <b>time machine</b> into the real past or the possible future.',
    stale: 'live feeds napping — showing last good data',
    lg1: '💧 waters', lg2: '☠️ poisons', newsList: 'news list', garden: 'my garden',
    past: '⏳ PAST', future: '🔮 FUTURE', now: 'NOW',
    allClouds: 'All clouds in the sky', gardenTitle: 'My garden — pretend seeds',
    rainFalls: 'Where the rain falls', bending: "What's bending its future",
    hear: '🔊 Hear it', read: 'Read the story ↗', forecastTag: '30-day forecast',
    baseCase: 'base case', range: 'range if the weather holds',
    possibility: '💡 A <b>possibility</b>, not a prediction — today\'s news tilts the odds, but the future is unwritten.',
    political: 'A <b>political</b> story — cuts both ways. No single tree; it shifts the whole forest\'s mood.',
    broadWeather: 'Broad market weather — no single tree targeted.',
    noDrivers: 'No strong news pushing this tree right now — mostly drifting on its own momentum.',
    plantGrow: '🌱 Bet it GROWS ($100)', plantWilt: '🥀 Bet it WILTS ($100)',
    planted: 'Seed planted on', harvest: 'Harvest', noSeeds: 'No seeds yet — click a tree and plant one! Each pretend seed is $100.',
    seedLong: 'grows', seedShort: 'wilts', score: 'Total harvested score',
    freshClouds: '☁️ Fresh clouds drifted in', wakeUp: 'Still growing… the free server may be waking up (~40 sec) 🌅',
    aiRead: '🤖 AI deep read', aiLoading: 'reading the story deeply…', watchNext: '👀 Watch next',
    histTitle: '🧪 History check', histSub: 'after the last {n} similar clouds — average real 3-day move',
    histNote: '⚠ = history moved opposite to the prediction. Clouds don\'t always rain where you expect!',
    playsTitle: '🎲 Suggested plays right now', dirGrow: 'GROWS 🌱', dirWilt: 'WILTS 🥀',
    playForecast: 'If you plant <b>$100</b> on {tree} betting it {dir} over the next ~<b>{days} days</b>, you might earn <b>~{est}</b> <i>(wild range {lo}%…+{hi}%)</i>',
    playHistory: '{topic} clouds are overhead — after the last <b>{n}</b> similar ones, {tree} averaged <b>{mv}%</b> in {days} days',
    oneClick: '🌱 1-click bet $100',
    playsNote: 'Pretend money · wild guesses, NOT advice · watch & harvest in 🌱 my garden',
    tour: [
      '☁️ <b>News clouds</b> float over the forest.<br>Click one (or use 📰 news list) to see <b>where its rain falls</b> — which assets it 💧 waters or ☠️ poisons, and why.',
      '🌳 Every <b>tree is an asset</b> — coins, stocks, gold, oil, even the lira. Click a tree for its 🔮 <b>news-driven forecast</b> and 🌱 <b>plant a pretend $100 seed</b> on it.',
      '⏳ Drag the <b>time machine</b>: left = the real past (90 days), right past NOW = 🔮 possible futures. Nothing here is financial advice — it\'s a game for learning!',
    ],
    tourNext: 'Next →', tourDone: 'Let\'s play! 🌱', tourSkip: 'Skip',
  },
  tr: {
    back: '← PANOYA DÖN', pill: 'EĞLENCE İÇİN · TAVSİYE DEĞİL',
    intro: 'Her <b>ağaç bir varlık</b>, <b>ailelere</b> ayrılır. Tepede <b>haber bulutları</b> süzülür — <b>bir buluta tıkla</b>, yağmurunun nereye düştüğünü gör: hangi ağaçları 💧 <b>sular</b> ya da ☠️ <b>zehirler</b>, ve neden. <b>Bir ağaca tıkla</b>: 🔮 tahminini gör ve <b>hayali tohum ek</b>. <b>Zaman makinesini</b> geçmişe ya da olası geleceğe sürükle.',
    stale: 'canlı veriler uyukluyor — son iyi veriler gösteriliyor',
    lg1: '💧 sular', lg2: '☠️ zehirler', newsList: 'haber listesi', garden: 'bahçem',
    past: '⏳ GEÇMİŞ', future: '🔮 GELECEK', now: 'ŞİMDİ',
    allClouds: 'Gökyüzündeki tüm bulutlar', gardenTitle: 'Bahçem — hayali tohumlar',
    rainFalls: 'Yağmur nereye düşüyor', bending: 'Geleceğini ne şekillendiriyor',
    hear: '🔊 Dinle', read: 'Haberi oku ↗', forecastTag: '30 günlük tahmin',
    baseCase: 'temel senaryo', range: 'hava böyle giderse aralık',
    possibility: '💡 Bu bir <b>olasılık</b>, kehanet değil — bugünün haberleri ihtimalleri eğer, ama gelecek yazılmadı.',
    political: '<b>Siyasi</b> bir haber — iki yöne de keser. Tek bir ağaç değil, tüm ormanın havasını değiştirir.',
    broadWeather: 'Genel piyasa havası — belirli bir ağaç hedef değil.',
    noDrivers: 'Şu an bu ağacı iten güçlü bir haber yok — çoğunlukla kendi momentumuyla ilerliyor.',
    plantGrow: '🌱 BÜYÜR diye oyna ($100)', plantWilt: '🥀 SOLAR diye oyna ($100)',
    planted: 'Tohum ekildi:', harvest: 'Hasat et', noSeeds: 'Henüz tohum yok — bir ağaca tıkla ve ek! Her hayali tohum 100$.',
    seedLong: 'büyür', seedShort: 'solar', score: 'Toplam hasat puanı',
    freshClouds: '☁️ Taze bulutlar geldi', wakeUp: 'Büyüyor… ücretsiz sunucu uyanıyor olabilir (~40 sn) 🌅',
    aiRead: '🤖 Yapay zekâ derin okuma', aiLoading: 'haber derinlemesine okunuyor…', watchNext: '👀 Sırada ne izlemeli',
    histTitle: '🧪 Tarih kontrolü', histSub: 'son {n} benzer buluttan sonra — ortalama gerçek 3 günlük hareket',
    histNote: '⚠ = tarih tahminin tersine hareket etti. Bulutlar her zaman beklediğin yere yağmaz!',
    playsTitle: '🎲 Şu an önerilen oyunlar', dirGrow: 'BÜYÜR 🌱', dirWilt: 'SOLAR 🥀',
    playForecast: '{tree} üzerine önümüzdeki ~<b>{days} gün</b> için {dir} diye <b>100$</b> ekersen, <b>~{est}</b> kazanabilirsin <i>(geniş aralık {lo}%…+{hi}%)</i>',
    playHistory: '{topic} bulutları tepede — son <b>{n}</b> benzerinden sonra {tree} {days} günde ortalama <b>{mv}%</b> yaptı',
    oneClick: '🌱 Tek tıkla 100$ oyna',
    playsNote: 'Hayali para · vahşi tahmin, tavsiye DEĞİL · takip ve hasat: 🌱 bahçem',
    tour: [
      '☁️ Ormanın üzerinde <b>haber bulutları</b> süzülür.<br>Birine tıkla (ya da 📰 haber listesini kullan): <b>yağmuru nereye düşüyor</b> — hangi varlıkları 💧 suluyor, hangilerini ☠️ zehirliyor?',
      '🌳 Her <b>ağaç bir varlık</b> — coinler, hisseler, altın, petrol, hatta lira. Ağaca tıkla: 🔮 <b>haber destekli tahminini</b> gör ve 🌱 <b>hayali 100$ tohum ek</b>.',
      '⏳ <b>Zaman makinesini</b> sürükle: sola = gerçek geçmiş (90 gün), ŞİMDİ\'nin sağı = 🔮 olası gelecekler. Hiçbiri yatırım tavsiyesi değil — öğrenmek için bir oyun!',
    ],
    tourNext: 'İleri →', tourDone: 'Hadi oynayalım! 🌱', tourSkip: 'Geç',
  },
};
let lang = localStorage.getItem('forestLang') || 'en';
const L = () => STR[lang];
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(n => { const k = n.dataset.i18n; if (L()[k]) n.innerHTML = L()[k]; });
  $('#intro').innerHTML = L().intro;
  $('#langToggle').textContent = lang === 'en' ? '🇹🇷 TR' : '🇬🇧 EN';
  if ($('#timeDate').textContent === 'NOW' || $('#timeDate').textContent === 'ŞİMDİ') $('#timeDate').textContent = L().now;
}
$('#langToggle').onclick = () => { lang = lang === 'en' ? 'tr' : 'en'; localStorage.setItem('forestLang', lang); applyLang(); renderGardenBtn(); if (DATA) renderSuggestions(); };

/* ---------------- state ---------------- */
let DATA = null;
let CAL = null; // topic calibration: how trees reacted to past similar clouds
const treeEls = {};
let garden = JSON.parse(localStorage.getItem('garden') || '[]');
let gardenScore = parseFloat(localStorage.getItem('gardenScore') || '0');

/* ---------------- boot + wake-up splash + auto-refresh ---------------- */
async function loadForest() {
  const res = await fetch('/api/forest');
  const j = await res.json();
  if (j.error) throw new Error(j.error);
  return j;
}

async function boot() {
  applyLang();
  // wake-up splash: after 4s of waiting, explain the free-server cold start
  const splashTimer = setTimeout(() => { const b = $('#bootLoading'); if (b) b.textContent = L().wakeUp; }, 4000);
  try {
    DATA = await loadForest();
    clearTimeout(splashTimer);
    renderAll();
    maybeStartTour();
    setInterval(refreshClouds, 3 * 60000); // A4: quiet refresh
    // history calibration loads in the background (first compute can be slow)
    fetch('/api/calibration').then(r => r.json()).then(j => { CAL = j.calibration || null; renderSuggestions(); }).catch(() => {});
  } catch (e) {
    clearTimeout(splashTimer);
    $('#ground').innerHTML = `<div class="loading" style="margin:40px auto">⚠ ${escapeHtml(e.message || 'could not load the forest')} — refresh to retry.</div>`;
  }
}

function renderAll() {
  renderForest();
  renderClouds();
  renderStory();
  renderSuggestions();
  renderGardenBtn();
  renderSeedBadges();
  $('#staleBadge').hidden = !DATA._stale;
  updateTime(+$('#timeSlider').value);
}

/* ---------------- 🎲 suggested one-click plays ---------------- */
function buildSuggestions() {
  const sugg = [];
  // 1) strongest forecast leans (30-day plays)
  const ranked = DATA.trees.filter(t => t.forecast && t.price != null)
    .sort((a, b) => Math.abs(b.forecast.outlook) - Math.abs(a.forecast.outlook));
  for (const t of ranked.slice(0, 5)) {
    const f = t.forecast;
    if (Math.abs(f.outlook) < 0.3 || Math.abs(f.base) < 0.5) continue;
    sugg.push({ kind: 'forecast', t, dir: f.outlook > 0 ? 1 : -1, days: f.horizonDays, est: Math.abs(f.base), lo: f.low, hi: f.hi ?? f.high });
    if (sugg.length >= 3) break;
  }
  // 2) history plays: topics currently in the sky whose past clouds moved a tree
  if (CAL && DATA.topicCount) {
    for (const [topic, cal] of Object.entries(CAL)) {
      if ((DATA.topicCount[topic] || 0) < 2) continue;
      const strongest = Object.entries(cal.reactions).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
      if (!strongest || Math.abs(strongest[1]) < 0.8) continue;
      const t = DATA.trees.find(x => x.symbol === strongest[0]);
      if (!t || t.price == null) continue;
      sugg.push({ kind: 'history', t, dir: strongest[1] > 0 ? 1 : -1, days: cal.horizonDays, est: Math.abs(strongest[1]), mv: strongest[1], topic, events: cal.events });
      if (sugg.length >= 6) break;
    }
  }
  return sugg.slice(0, 6);
}

function renderSuggestions() {
  const strip = $('#betsStrip');
  const sugg = buildSuggestions();
  if (!sugg.length) { strip.hidden = true; return; }
  strip.hidden = false;
  $('#betsHead').textContent = L().playsTitle;
  $('#betsNote').textContent = L().playsNote;
  $('#betsCards').innerHTML = sugg.map((s, i) => {
    const treeLabel = `${s.t.char} <b>${escapeHtml(s.t.name)}</b>`;
    const text = s.kind === 'forecast'
      ? L().playForecast.replace('{tree}', treeLabel).replace('{dir}', s.dir > 0 ? L().dirGrow : L().dirWilt)
          .replace('{days}', s.days).replace('{est}', '+$' + s.est.toFixed(1)).replace('{lo}', s.lo).replace('{hi}', s.hi)
      : L().playHistory.replace('{topic}', escapeHtml(s.topic)).replace('{n}', s.events)
          .replace('{tree}', treeLabel).replace('{mv}', (s.mv > 0 ? '+' : '') + s.mv).replace('{days}', s.days);
    const mood = s.dir > 0 ? 'play-up' : 'play-down';
    return `<div class="play-card ${mood}">
      <div class="play-kind">${s.kind === 'forecast' ? (s.t.forecast ? s.t.forecast.weather : '🔮') + ' 🔮' : '🧪 ' + (s.topic || '')}</div>
      <div class="play-text">${text}</div>
      <button class="cp-btn play-btn" data-i="${i}">${L().oneClick} ${s.dir > 0 ? '🌱' : '🥀'}</button>
    </div>`;
  }).join('');
  $('#betsCards').querySelectorAll('.play-btn').forEach(btn => btn.onclick = () => {
    const s = sugg[+btn.dataset.i];
    plantSeed(s.t, s.dir);
    btn.textContent = '✅ ' + (lang === 'tr' ? 'ekildi!' : 'planted!');
    btn.disabled = true;
  });
}

async function refreshClouds() {
  if ($('#cloudPanel').classList.contains('open')) return; // don't yank the rug
  try {
    const fresh = await loadForest();
    const oldKey = (DATA.clouds || []).map(c => c.title).join('|');
    const newKey = (fresh.clouds || []).map(c => c.title).join('|');
    DATA = fresh;
    renderStory();
    $('#staleBadge').hidden = !DATA._stale;
    if (oldKey !== newKey) { renderClouds(); toast(L().freshClouds); }
    // refresh tree prices quietly
    for (const t of DATA.trees) {
      const tree = treeEls[t.symbol];
      if (tree && t.price != null) tree.querySelector('.tree-price').textContent = fmtMoney(t.price);
    }
  } catch (e) { /* next tick */ }
}

/* ---------------- toast ---------------- */
let toastEl = null;
function toast(msg) {
  if (!toastEl) { toastEl = el('div', 'toast'); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

/* ---------------- story banner + storm sky ---------------- */
function renderStory() {
  const s = DATA.story;
  if (!s) return;
  $('#storyBanner').hidden = false;
  $('#storyHead').textContent = '📜 ' + s.headline;
  $('#storyLines').innerHTML = s.lines.map(l => `<span class="story-line">${escapeHtml(l)}</span>`).join('');
  $('#stage').classList.toggle('storm-1', s.stormLevel === 1);
  $('#stage').classList.toggle('storm-2', s.stormLevel >= 2);
}

/* ---------------- trees + families ---------------- */
function renderForest() {
  const ground = $('#ground');
  ground.innerHTML = '';
  const order = ['crypto', 'tech', 'auto', 'commodities', 'bonds', 'fx', 'industry', 'green', 'meme'];
  for (const fam of order) {
    const info = DATA.families[fam];
    const members = DATA.trees.filter(t => t.family === fam);
    if (!members.length || !info) continue;
    const plot = el('div', 'family-plot');
    plot.dataset.family = fam;
    const sign = el('div', 'family-sign', `${info.emoji} ${info.label}`);
    sign.title = info.blurb;
    const row = el('div', 'tree-row');
    for (const t of members) row.appendChild(makeTree(t));
    plot.appendChild(sign);
    plot.appendChild(row);
    ground.appendChild(plot);
  }
}

function makeTree(t) {
  const wrap = el('div', 'tree');
  wrap.dataset.symbol = t.symbol;
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('tabindex', '0');
  wrap.setAttribute('aria-label', `${t.name}, ${fmtMoney(t.price)}${t.forecast ? ', forecast ' + t.forecast.weather : ''}`);
  const up = (t.change ?? 0) >= 0;
  const wx = t.forecast ? t.forecast.weather : '';
  wrap.innerHTML = `
    <div class="tree-fx"></div>
    <div class="tree-weather" title="news forecast">${wx}</div>
    <div class="tree-top">
      <div class="cone-bar"></div>
      <span class="tree-badge ${up ? 'up' : 'down'}">${pct(t.change)}</span>
      <div class="canopy"><span class="canopy-face">${t.char || '🌳'}</span></div>
      <div class="trunk"></div>
    </div>
    <div class="tree-label">${t.symbol}<span class="tree-price">${fmtMoney(t.price)}</span><span class="tree-seeds"></span></div>`;
  const open = () => { highlightFamily(t.family, t.symbol); openTreePanel(t); sfx('pop'); };
  wrap.addEventListener('click', open);
  wrap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  treeEls[t.symbol] = wrap;
  return wrap;
}

function highlightFamily(fam, sym) {
  document.querySelectorAll('.family-plot').forEach(p => p.classList.toggle('dim', p.dataset.family !== fam));
  document.querySelectorAll('.tree').forEach(tr => tr.classList.remove('picked'));
  treeEls[sym]?.classList.add('picked');
  clearTimeout(highlightFamily._t);
  highlightFamily._t = setTimeout(() => document.querySelectorAll('.family-plot').forEach(p => p.classList.remove('dim')), 2600);
}

/* ---------------- clouds + landmarks ---------------- */
function renderClouds() {
  const sky = $('#sky');
  sky.innerHTML = '';
  const lm = el('div', 'landmarks');
  for (const l of (DATA.landmarks || [])) {
    lm.appendChild(el('div', 'landmark', `<span class="lm-emoji">${l.emoji}</span><span class="lm-label">${l.label}<br><b>${l.count}</b> stories</span>`));
  }
  sky.appendChild(lm);

  (DATA.clouds || []).forEach((c, i) => {
    const net = c.impacts.reduce((a, b) => a + b.dir, 0) + (c.broad || 0);
    const mood = c.political ? 'political' : net > 0 ? 'good' : net < 0 ? 'bad' : 'neutral';
    const cloud = el('button', `cloud cloud-${mood}`);
    const lane = i % 4;
    cloud.style.top = (8 + lane * 21 + (i % 2 ? 4 : 0)) + '%';
    cloud.style.left = ((i * 37) % 90) + '%';
    cloud.style.animationDuration = (26 + (i % 7) * 4) + 's';
    cloud.style.animationDelay = (-(i * 3) % 30) + 's';
    const tag = c.topics[0] || (c.political ? 'Politics 🏛️' : '📰');
    cloud.innerHTML = `<span class="cloud-emoji">☁️</span><span class="cloud-tag">${tag}</span>`;
    cloud.title = c.title;
    cloud.setAttribute('aria-label', c.title);
    cloud.addEventListener('click', e => { e.stopPropagation(); sfx('rain'); openCloud(c); });
    sky.appendChild(cloud);
  });
  renderNewsSheet();
}

/* ---------------- news-list sheet (touch-friendly cloud access) ------------ */
function renderNewsSheet() {
  const body = $('#newsSheetBody');
  body.innerHTML = (DATA.clouds || []).map((c, i) => {
    const net = c.impacts.reduce((a, b) => a + b.dir, 0) + (c.broad || 0);
    const dot = c.political ? '🟣' : net > 0 ? '🟢' : net < 0 ? '🔴' : '⚪';
    return `<button class="news-row" data-idx="${i}">
      <span class="nr-dot">${dot}</span>
      <span class="nr-main"><b>${(c.topics[0] || '📰')}</b> ${escapeHtml(c.title)}</span>
      <span class="nr-hits">${c.impacts.map(im => im.symbol + (im.dir > 0 ? '↑' : '↓')).join(' ') || '—'}</span>
    </button>`;
  }).join('') || '<p style="opacity:.6;padding:12px">—</p>';
  body.querySelectorAll('.news-row').forEach(btn => btn.onclick = () => {
    closeSheet('newsSheet');
    sfx('rain');
    openCloud(DATA.clouds[+btn.dataset.idx]);
  });
}

function openSheet(id) { $('#' + id).classList.add('open'); $('#cloudScrim').classList.add('on'); }
function closeSheet(id) { $('#' + id).classList.remove('open'); if (!$('#cloudPanel').classList.contains('open')) $('#cloudScrim').classList.remove('on'); }
$('#newsListBtn').onclick = () => { renderNewsSheet(); openSheet('newsSheet'); };
$('#gardenBtn').onclick = () => { renderGardenSheet(); openSheet('gardenSheet'); };
document.querySelectorAll('.sheet-close').forEach(b => b.onclick = () => closeSheet(b.dataset.close));

/* ---------------- cloud click → rain + analysis panel ---------------- */
function openCloud(c) {
  document.querySelectorAll('.tree').forEach(tr => tr.classList.remove('watered', 'poisoned'));
  for (const im of c.impacts) {
    const tree = treeEls[im.symbol];
    if (!tree || !im.dir) continue;
    tree.classList.add(im.dir > 0 ? 'watered' : 'poisoned');
    rainOnTree(tree, im.dir);
  }
  if (!c.impacts.length && (c.broad || c.political)) {
    document.querySelectorAll('.tree').forEach(tr => {
      if (c.broad) tr.classList.add(c.broad > 0 ? 'watered' : 'poisoned');
      rainOnTree(tr, c.broad || 0);
    });
  }
  showCloudPanel(c);
}

function rainOnTree(tree, dir) {
  const fx = tree.querySelector('.tree-fx');
  if (!fx) return;
  fx.innerHTML = '';
  const drop = dir > 0 ? '💧' : dir < 0 ? '☠️' : '·';
  for (let i = 0; i < 6; i++) {
    const d = el('span', 'drop', drop);
    d.style.left = (10 + Math.random() * 80) + '%';
    d.style.animationDelay = (Math.random() * 0.6) + 's';
    fx.appendChild(d);
  }
  setTimeout(() => { fx.innerHTML = ''; }, 2200);
}

function showCloudPanel(c) {
  const body = $('#cpBody');
  const rows = c.impacts.length
    ? c.impacts.map(im => {
        const t = DATA.trees.find(x => x.symbol === im.symbol);
        const good = im.dir > 0;
        return `<div class="imp-row ${good ? 'good' : 'bad'}">
          <span class="imp-ico">${good ? '💧' : '☠️'}</span>
          <div><b>${good ? 'waters' : 'poisons'} ${t ? escapeHtml(t.name) : im.symbol}</b> (${im.symbol})
          <div class="imp-why">${escapeHtml(im.why || '')}</div></div></div>`;
      }).join('')
    : `<div class="imp-row neutral"><span class="imp-ico">🌫️</span><div>${c.political ? L().political : L().broadWeather}</div></div>`;

  body.innerHTML = `
    <div class="cp-topics">${(c.topics.length ? c.topics : [c.political ? 'Politics 🏛️' : '📰']).map(t => `<span class="cp-topic">${t}</span>`).join('')}</div>
    <h3 class="cp-title">${escapeHtml(c.title)}</h3>
    <div class="cp-source">📰 ${escapeHtml(c.source || 'news')}</div>
    ${c.note ? `<div class="cp-note">💡 ${escapeHtml(c.note)}</div>` : ''}
    <div class="cp-impacts-h">${L().rainFalls}</div>
    ${rows}
    ${histCheckHtml(c)}
    <div id="aiRead"></div>
    <div class="cp-actions">
      <button class="cp-btn" id="cpSpeak">${L().hear}</button>
      <a class="cp-btn ghost" href="${c.link}" target="_blank" rel="noopener">${L().read}</a>
    </div>`;
  openPanel();
  $('#cpSpeak').onclick = () => speakCloud(c);
  if (DATA.llm) loadAiRead(c);
}

/* 🧪 History check — how trees ACTUALLY moved after past clouds of this
   topic (server event-study). ✓ = history agrees with the rule's prediction
   for that tree, ⚠ = history went the other way. */
function histCheckHtml(c) {
  if (!CAL) return '';
  const topic = (c.topics || []).find(t => CAL[t]);
  if (!topic) return '';
  const cal = CAL[topic];
  const chips = Object.entries(cal.reactions).map(([sym, mv]) => {
    const t = DATA.trees.find(x => x.symbol === sym);
    const predicted = c.impacts.find(i => i.symbol === sym);
    let mark = '·';
    if (predicted) mark = (Math.sign(mv) === Math.sign(predicted.dir)) ? '✓' : '⚠';
    const up = mv >= 0;
    return `<span class="hist-chip ${up ? 'up' : 'down'}">${t ? t.char : ''}${sym} ${up ? '+' : ''}${mv}% <b class="hist-mark">${mark}</b></span>`;
  }).join('');
  const hasWarn = /⚠/.test(chips);
  return `<div class="hist-box">
    <b>${L().histTitle}</b>
    <div class="hist-sub">${L().histSub.replace('{n}', cal.events)}</div>
    <div class="hist-chips">${chips}</div>
    ${hasWarn ? `<div class="hist-note">${L().histNote}</div>` : ''}
  </div>`;
}

/* AI deep read — only fetched when a cloud is opened, so cost stays tiny. */
async function loadAiRead(c) {
  const box = $('#aiRead');
  box.innerHTML = `<div class="ai-box"><b>${L().aiRead}</b><div class="ai-loading">${L().aiLoading}</div></div>`;
  try {
    const r = await fetch(`/api/insight?title=${encodeURIComponent(c.title)}&source=${encodeURIComponent(c.source || '')}`);
    const j = await r.json();
    if (!j.enabled || j.error || !j.analysis) { box.innerHTML = j.error ? `<div class="ai-box"><b>${L().aiRead}</b><div class="ai-loading">${escapeHtml(j.error)}</div></div>` : ''; return; }
    const a = j.analysis;
    const imps = (a.impacts || []).map(im => {
      const t = DATA.trees.find(x => x.symbol === im.symbol);
      return `<div class="imp-row ${im.dir === 'up' ? 'good' : 'bad'}"><span class="imp-ico">${im.dir === 'up' ? '💧' : '☠️'}</span>
        <div><b>${t ? escapeHtml(t.name) : im.symbol}</b> (${im.symbol})<div class="imp-why">${escapeHtml(im.why)}</div></div></div>`;
    }).join('');
    box.innerHTML = `<div class="ai-box"><b>${L().aiRead}</b>
      <p class="ai-summary">${escapeHtml(a.summary || '')}</p>
      ${imps}
      ${a.watch ? `<div class="cp-note">${L().watchNext}: ${escapeHtml(a.watch)}</div>` : ''}
    </div>`;
  } catch (e) { box.innerHTML = ''; }
}

function speakCloud(c) {
  if (!('speechSynthesis' in window)) return;
  const parts = [c.title + '.'];
  if (c.topics.length) parts.push('Topic: ' + c.topics.join(', ').replace(/[^\w\s,]/g, '') + '.');
  for (const im of c.impacts) parts.push(`This ${im.dir > 0 ? 'waters' : 'poisons'} ${(DATA.trees.find(x => x.symbol === im.symbol) || {}).name || im.symbol}, because ${im.why}.`);
  if (!c.impacts.length && c.political) parts.push('This is a political story that shifts the mood of the whole market.');
  const aiSummary = $('#aiRead .ai-summary');
  if (aiSummary) parts.push('Deeper read: ' + aiSummary.textContent);
  const u = new SpeechSynthesisUtterance(parts.join(' '));
  u.rate = 1.02;
  window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
}

/* ---------------- tree click → forecast + seed planting ---------------- */
function openTreePanel(t) {
  const f = t.forecast;
  const body = $('#cpBody');
  let inner = `<div class="cp-topics"><span class="cp-topic">🔮 ${L().forecastTag}</span></div>
    <h3 class="cp-title">${t.char} ${escapeHtml(t.name)} ${f ? `<span class="fc-weather-big">${f.weather}</span>` : ''}</h3>
    <div class="cp-source">${fmtMoney(t.price)} · ${t.symbol}</div>`;
  if (f) {
    const arrow = f.base > 0 ? '▲' : f.base < 0 ? '▼' : '▶';
    const sky = f.outlook > 0.15 ? 'good' : f.outlook < -0.15 ? 'bad' : 'neutral';
    const drivers = f.drivers.length
      ? f.drivers.map(d => `<div class="imp-row ${d.dir > 0 ? 'good' : 'bad'}"><span class="imp-ico">${d.dir > 0 ? '💧' : '☠️'}</span><div><b>${escapeHtml(d.topic || 'news')}</b><div class="imp-why">${escapeHtml(d.why || '')}</div></div></div>`).join('')
      : `<div class="imp-row neutral"><span class="imp-ico">🌫️</span><div>${L().noDrivers}</div></div>`;
    inner += `
      <div class="fc-range fc-${sky}">
        <div class="fc-base">${arrow} ${L().baseCase} <b>${f.base > 0 ? '+' : ''}${f.base}%</b></div>
        <div class="fc-band">${L().range}: <b>${f.low}%</b> … <b>+${f.high}%</b></div>
      </div>
      <div class="cp-impacts-h">${L().bending}</div>
      ${drivers}
      <div class="cp-note">${L().possibility}</div>`;
  }
  inner += `
    <div class="cp-actions seed-actions">
      <button class="cp-btn seed-btn" id="seedGrow">${L().plantGrow}</button>
      <button class="cp-btn ghost seed-btn" id="seedWilt">${L().plantWilt}</button>
    </div>
    ${f ? `<div class="cp-actions"><button class="cp-btn ghost" id="cpSpeakF">${L().hear}</button></div>` : ''}`;
  body.innerHTML = inner;
  openPanel();
  $('#seedGrow').onclick = () => plantSeed(t, 1);
  $('#seedWilt').onclick = () => plantSeed(t, -1);
  const sp = $('#cpSpeakF');
  if (sp) sp.onclick = () => speakForecast(t);
}

function speakForecast(t) {
  if (!('speechSynthesis' in window)) return;
  const f = t.forecast; if (!f) return;
  const dir = f.base > 0 ? 'lean up' : f.base < 0 ? 'lean down' : 'stay flat';
  const parts = [`${t.name} forecast. The news weather looks ${f.weather === '☀️' ? 'sunny' : f.weather === '⛈️' ? 'stormy' : 'mixed'}.`,
    `Over the next ${f.horizonDays} days it could ${dir}, around ${f.base} percent, somewhere between ${f.low} and plus ${f.high} percent.`];
  for (const d of f.drivers) parts.push(`${d.dir > 0 ? 'Helped' : 'Hurt'} by ${d.why}.`);
  parts.push('This is a possibility, not a prediction.');
  const u = new SpeechSynthesisUtterance(parts.join(' ')); u.rate = 1.02;
  window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
}

/* ---------------- the garden (pretend seeds, localStorage) ---------------- */
function plantSeed(t, dir) {
  if (t.price == null) { toast('⚠ no live price for this tree right now'); return; }
  garden.push({ symbol: t.symbol, dir, amount: 100, entry: t.price, date: new Date().toISOString().slice(0, 10) });
  saveGarden();
  sfx('pop');
  toast(`${L().planted} ${t.char} ${t.name} ${dir > 0 ? '🌱' : '🥀'}`);
  renderSeedBadges();
  renderGardenBtn();
  closePanel();
}

function seedValue(s) {
  const t = DATA.trees.find(x => x.symbol === s.symbol);
  const p = t ? t.price : null;
  if (p == null || !s.entry) return { value: s.amount, pnl: 0 };
  const value = s.dir > 0 ? s.amount * (p / s.entry) : Math.max(0, s.amount * (2 - p / s.entry));
  return { value, pnl: value - s.amount };
}

function saveGarden() {
  localStorage.setItem('garden', JSON.stringify(garden));
  localStorage.setItem('gardenScore', String(gardenScore));
}

function renderSeedBadges() {
  document.querySelectorAll('.tree-seeds').forEach(n => { n.textContent = ''; });
  const counts = {};
  for (const s of garden) counts[s.symbol] = (counts[s.symbol] || 0) + 1;
  for (const [sym, n] of Object.entries(counts)) {
    const slot = treeEls[sym]?.querySelector('.tree-seeds');
    if (slot) slot.textContent = '🌱'.repeat(Math.min(n, 3)) + (n > 3 ? '×' + n : '');
  }
}

function renderGardenBtn() {
  const live = garden.reduce((a, s) => a + seedValue(s).pnl, 0);
  $('#gardenScore').textContent = (gardenScore + live >= 0 ? '+' : '') + Math.round(gardenScore + live);
}

function renderGardenSheet() {
  const body = $('#gardenSheetBody');
  if (!garden.length) {
    body.innerHTML = `<p style="padding:14px;font-weight:500">${L().noSeeds}</p>
      <p style="padding:0 14px 14px;font-family:'Space Mono',monospace;font-size:13px">${L().score}: <b>${gardenScore >= 0 ? '+' : ''}${gardenScore.toFixed(0)}</b></p>`;
    return;
  }
  body.innerHTML = garden.map((s, i) => {
    const t = DATA.trees.find(x => x.symbol === s.symbol);
    const { value, pnl } = seedValue(s);
    const good = pnl >= 0;
    return `<div class="seed-row">
      <span class="sr-ico">${s.dir > 0 ? '🌱' : '🥀'}</span>
      <div class="sr-main"><b>${t ? t.char + ' ' + escapeHtml(t.name) : s.symbol}</b> ${s.dir > 0 ? L().seedLong : L().seedShort} · ${s.date}
        <div class="imp-why">${fmtMoney(s.entry)} → ${t ? fmtMoney(t.price) : '—'}</div></div>
      <span class="sr-pnl ${good ? 'up' : 'down'}">${good ? '+' : ''}${pnl.toFixed(0)}</span>
      <button class="cp-btn sr-harvest" data-i="${i}">${L().harvest}</button>
    </div>`;
  }).join('') + `<p style="padding:10px 14px;font-family:'Space Mono',monospace;font-size:13px">${L().score}: <b>${gardenScore >= 0 ? '+' : ''}${gardenScore.toFixed(0)}</b></p>`;
  body.querySelectorAll('.sr-harvest').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    const { pnl } = seedValue(garden[i]);
    gardenScore += pnl;
    garden.splice(i, 1);
    saveGarden(); sfx('pop');
    toast(`🧺 ${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)} harvested!`);
    renderGardenSheet(); renderSeedBadges(); renderGardenBtn();
  });
}

/* ---------------- panel plumbing + Escape ---------------- */
function openPanel() { $('#cloudPanel').classList.add('open'); $('#cloudScrim').classList.add('on'); }
function closePanel() {
  $('#cloudPanel').classList.remove('open');
  $('#cloudScrim').classList.remove('on');
  window.speechSynthesis && window.speechSynthesis.cancel();
}
$('#cpClose').onclick = closePanel;
$('#cloudScrim').onclick = () => { closePanel(); closeSheet('newsSheet'); closeSheet('gardenSheet'); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanel(); closeSheet('newsSheet'); closeSheet('gardenSheet'); } });

/* ---------------- tiny synth sound fx ---------------- */
let AC = null, soundOn = true;
function sfx(kind) {
  if (!soundOn) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (kind === 'rain') {
      const n = AC.sampleRate * 0.5, buf = AC.createBuffer(1, n, AC.sampleRate), dch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) dch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = AC.createBufferSource(); src.buffer = buf;
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const g = AC.createGain(); g.gain.value = 0.18;
      src.connect(lp).connect(g).connect(AC.destination); src.start();
    } else {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(320, AC.currentTime);
      o.frequency.exponentialRampToValueAtTime(680, AC.currentTime + 0.09);
      g.gain.setValueAtTime(0.2, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.18);
      o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.2);
    }
  } catch (e) { /* audio not available */ }
}
$('#soundToggle').onclick = e => { soundOn = !soundOn; e.target.textContent = soundOn ? '🔊' : '🔇'; };

/* ---------------- time machine (0..100 past, 100..140 = forecast) ---------- */
function updateTime(p) {
  if (!DATA) return;
  const future = p > 100;
  $('#stage').classList.toggle('forecast-mode', future);
  let labelDate = L().now;

  for (const t of DATA.trees) {
    const s = t.spark;
    const tree = treeEls[t.symbol];
    if (!tree || !s || !s.length) continue;
    const prices = s.map(x => x.price);
    const min = Math.min(...prices), max = Math.max(...prices);
    let shownPrice, norm, rising;
    const coneBar = tree.querySelector('.cone-bar');

    if (!future) {
      const idx = Math.round((p / 100) * (s.length - 1));
      shownPrice = s[idx].price;
      norm = (shownPrice - min) / ((max - min) || 1);
      rising = shownPrice >= s[0].price;
      if (t.symbol === 'BTC') labelDate = new Date(s[idx].t).toISOString().slice(0, 10);
      if (coneBar) coneBar.style.opacity = '0';
    } else {
      const fk = (p - 100) / 40; // 0..1 across the future zone
      const f = t.forecast;
      const now = s[s.length - 1].price;
      const target = f ? now * (1 + (f.base / 100)) : now;
      shownPrice = now + (target - now) * fk;
      const loP = f ? now * (1 + (f.low / 100) * fk) : shownPrice;
      const hiP = f ? now * (1 + (f.high / 100) * fk) : shownPrice;
      const fullMin = Math.min(min, loP), fullMax = Math.max(max, hiP);
      const span = (fullMax - fullMin) || 1;
      norm = (shownPrice - fullMin) / span;
      rising = f ? f.base >= 0 : true;
      labelDate = '+' + Math.round(fk * 30) + 'd 🔮';
      // B3: possibility cone — a translucent bar spanning the low..high range
      if (coneBar && f) {
        const loN = (loP - fullMin) / span, hiN = (hiP - fullMin) / span;
        const travel = 120; // px of vertical canopy travel
        coneBar.style.opacity = '1';
        coneBar.style.top = ((1 - hiN) * travel) + 'px';
        coneBar.style.height = Math.max(6, (hiN - loN) * travel) + 'px';
      }
    }

    const canopy = tree.querySelector('.canopy');
    canopy.style.transform = `translateY(${(1 - norm) * 46}px) scale(${0.7 + norm * 0.6})`;
    tree.querySelector('.trunk').style.height = (58 + norm * 150) * 0.5 + 'px';
    tree.classList.toggle('healthy', rising);
    tree.classList.toggle('wilting', !rising);
    tree.classList.toggle('ghost', future);
    tree.querySelector('.tree-price').textContent = fmtMoney(shownPrice);
  }
  $('#timeDate').textContent = p === 100 ? L().now : labelDate;
}
$('#timeSlider').addEventListener('input', e => updateTime(+e.target.value));

/* ---------------- onboarding tour (first visit) ---------------- */
function maybeStartTour() {
  if (localStorage.getItem('forestTour1')) return;
  let step = 0;
  const tour = $('#tour');
  const render = () => {
    $('#tourStep').innerHTML = `<div class="tour-count">${step + 1}/3</div>` + L().tour[step];
    $('#tourNext').textContent = step === 2 ? L().tourDone : L().tourNext;
    $('#tourSkip').textContent = L().tourSkip;
  };
  const done = () => { tour.hidden = true; localStorage.setItem('forestTour1', '1'); };
  $('#tourNext').onclick = () => { step++; if (step > 2) done(); else render(); };
  $('#tourSkip').onclick = done;
  tour.hidden = false;
  render();
}

boot();
