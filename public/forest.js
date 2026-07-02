/* THE FOREST — game view. Trees = assets, clouds = news, rain = impact. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const fmtMoney = n => (n == null ? '—' : (Math.abs(n) >= 1 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$' + n.toFixed(5)));
const pct = n => (n == null ? '' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%');

let DATA = null;               // forest payload
const treeEls = {};            // symbol -> tree DOM node

boot();
async function boot() {
  try {
    const res = await fetch('/api/forest');
    DATA = await res.json();
    if (DATA.error) throw new Error(DATA.error);
    renderForest();
    renderClouds();
    updateTime(100);
  } catch (e) {
    $('#ground').innerHTML = `<div class="loading" style="margin:40px auto">⚠ ${e.message || 'could not load the forest'} — try refresh.</div>`;
  }
}

/* ---------------- trees + families ---------------- */
function renderForest() {
  const ground = $('#ground');
  ground.innerHTML = '';
  // group trees by family, in a fixed order
  const order = ['crypto', 'tech', 'auto', 'commodities', 'bonds', 'fx', 'meme'];
  for (const fam of order) {
    const info = DATA.families[fam];
    const members = DATA.trees.filter(t => t.family === fam);
    if (!members.length) continue;
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
  const up = (t.change ?? 0) >= 0;
  const wx = t.forecast ? t.forecast.weather : '';
  wrap.innerHTML = `
    <div class="tree-fx"></div>
    <div class="tree-weather" title="news forecast">${wx}</div>
    <div class="tree-top">
      <span class="tree-badge ${up ? 'up' : 'down'}">${pct(t.change)}</span>
      <div class="canopy"><span class="canopy-face">${t.char || '🌳'}</span></div>
      <div class="trunk"></div>
    </div>
    <div class="tree-label">${t.symbol}<span class="tree-price">${fmtMoney(t.price)}</span></div>`;
  wrap.addEventListener('click', () => { highlightFamily(t.family, t.symbol); openTreePanel(t); sfx('pop'); });
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

/* ---------------- clouds ---------------- */
function renderClouds() {
  const sky = $('#sky');
  sky.innerHTML = '';
  // landmarks first (as fixed structures on the horizon)
  const lm = el('div', 'landmarks');
  for (const l of (DATA.landmarks || [])) {
    lm.appendChild(el('div', 'landmark', `<span class="lm-emoji">${l.emoji}</span><span class="lm-label">${l.label}<br><b>${l.count}</b> stories</span>`));
  }
  sky.appendChild(lm);

  const clouds = DATA.clouds || [];
  clouds.forEach((c, i) => {
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
    cloud.addEventListener('click', e => { e.stopPropagation(); sfx('rain'); openCloud(c, cloud); });
    sky.appendChild(cloud);
  });
}

/* ---------------- cloud click → rain + analysis ---------------- */
function openCloud(c, cloudEl) {
  // rain on affected trees
  document.querySelectorAll('.tree').forEach(tr => tr.classList.remove('watered', 'poisoned'));
  for (const im of c.impacts) {
    const tree = treeEls[im.symbol];
    if (!tree) continue;
    tree.classList.add(im.dir > 0 ? 'watered' : im.dir < 0 ? 'poisoned' : '');
    rainOnTree(tree, im.dir);
  }
  // broad / political: sprinkle the whole forest lightly
  if (!c.impacts.length && (c.broad || c.political)) {
    document.querySelectorAll('.tree').forEach(tr => {
      tr.classList.add(c.broad > 0 ? 'watered' : c.broad < 0 ? 'poisoned' : '');
      rainOnTree(tr, c.broad || 0);
    });
  }
  showPanel(c);
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

function showPanel(c) {
  const body = $('#cpBody');
  const rows = c.impacts.length
    ? c.impacts.map(im => {
        const t = DATA.trees.find(x => x.symbol === im.symbol);
        const good = im.dir > 0;
        return `<div class="imp-row ${good ? 'good' : 'bad'}">
          <span class="imp-ico">${good ? '💧' : '☠️'}</span>
          <div><b>${good ? 'waters' : 'poisons'} ${t ? t.name : im.symbol}</b> (${im.symbol})
          <div class="imp-why">${im.why || (good ? 'positive read-through' : 'negative read-through')}</div></div></div>`;
      }).join('')
    : `<div class="imp-row neutral"><span class="imp-ico">🌫️</span><div>${c.political ? 'A <b>political</b> story — cuts both ways. No single tree; it shifts the whole forest\'s mood.' : 'Broad market weather — no single tree targeted.'}</div></div>`;

  body.innerHTML = `
    <div class="cp-topics">${(c.topics.length ? c.topics : [c.political ? 'Politics 🏛️' : '📰']).map(t => `<span class="cp-topic">${t}</span>`).join('')}</div>
    <h3 class="cp-title">${escapeHtml(c.title)}</h3>
    <div class="cp-source">📰 ${escapeHtml(c.source || 'news')}</div>
    ${c.note ? `<div class="cp-note">💡 ${escapeHtml(c.note)}</div>` : ''}
    <div class="cp-impacts-h">Where the rain falls</div>
    ${rows}
    <div class="cp-actions">
      <button class="cp-btn" id="cpSpeak">🔊 Hear the analysis</button>
      <a class="cp-btn ghost" href="${c.link}" target="_blank" rel="noopener">Read the story ↗</a>
    </div>`;
  $('#cloudPanel').classList.add('open');
  $('#cloudScrim').classList.add('on');
  $('#cpSpeak').onclick = () => speak(c);
}

function speak(c) {
  if (!('speechSynthesis' in window)) return;
  const parts = [c.title + '.'];
  if (c.topics.length) parts.push('Topic: ' + c.topics.join(', ').replace(/[^\w\s,]/g, '') + '.');
  for (const im of c.impacts) parts.push(`This ${im.dir > 0 ? 'waters' : 'poisons'} ${(DATA.trees.find(x => x.symbol === im.symbol) || {}).name || im.symbol}, because ${im.why}.`);
  if (!c.impacts.length && c.political) parts.push('This is a political story that shifts the mood of the whole market.');
  const u = new SpeechSynthesisUtterance(parts.join(' '));
  u.rate = 1.02; u.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/* ---------------- tree click → forecast panel ---------------- */
function openTreePanel(t) {
  const f = t.forecast;
  const body = $('#cpBody');
  if (!f) { body.innerHTML = `<h3 class="cp-title">${t.char} ${t.name}</h3><div class="cp-source">No forecast data.</div>`; }
  else {
    const arrow = f.base > 0 ? '▲' : f.base < 0 ? '▼' : '▶';
    const sky = f.outlook > 0.15 ? 'good' : f.outlook < -0.15 ? 'bad' : 'neutral';
    const drivers = f.drivers.length
      ? f.drivers.map(d => `<div class="imp-row ${d.dir > 0 ? 'good' : 'bad'}"><span class="imp-ico">${d.dir > 0 ? '💧' : '☠️'}</span><div><b>${d.topic || 'news'}</b><div class="imp-why">${escapeHtml(d.why || '')}</div></div></div>`).join('')
      : `<div class="imp-row neutral"><span class="imp-ico">🌫️</span><div>No strong news pushing this tree right now — mostly drifting on its own momentum.</div></div>`;
    body.innerHTML = `
      <div class="cp-topics"><span class="cp-topic">🔮 ${f.horizonDays}-day forecast</span></div>
      <h3 class="cp-title">${t.char} ${escapeHtml(t.name)} <span class="fc-weather-big">${f.weather}</span></h3>
      <div class="cp-source">now ${fmtMoney(t.price)} · outlook ${f.outlook > 0 ? '+' : ''}${f.outlook}</div>
      <div class="fc-range fc-${sky}">
        <div class="fc-base">${arrow} base case <b>${f.base > 0 ? '+' : ''}${f.base}%</b></div>
        <div class="fc-band">range if the weather holds: <b>${f.low}%</b> … <b>+${f.high}%</b></div>
      </div>
      <div class="cp-impacts-h">What's bending its future</div>
      ${drivers}
      <div class="cp-note">💡 A <b>possibility</b>, not a prediction — today's news tilts the odds, but the future is unwritten.</div>
      <div class="cp-actions"><button class="cp-btn" id="cpSpeak">🔊 Hear the forecast</button></div>`;
    $('#cpSpeak').onclick = () => speakForecast(t);
  }
  $('#cloudPanel').classList.add('open');
  $('#cloudScrim').classList.add('on');
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

/* ---------------- tiny synth sound fx ---------------- */
let AC = null, soundOn = true;
function sfx(kind) {
  if (!soundOn) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (kind === 'rain') {
      // short filtered-noise burst
      const n = AC.sampleRate * 0.5, buf = AC.createBuffer(1, n, AC.sampleRate), dch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) dch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = AC.createBufferSource(); src.buffer = buf;
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const g = AC.createGain(); g.gain.value = 0.18;
      src.connect(lp).connect(g).connect(AC.destination); src.start();
    } else { // pop
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(320, AC.currentTime);
      o.frequency.exponentialRampToValueAtTime(680, AC.currentTime + 0.09);
      g.gain.setValueAtTime(0.2, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.18);
      o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.2);
    }
  } catch (e) { /* audio not available */ }
}
$('#soundToggle').onclick = e => { soundOn = !soundOn; e.target.textContent = soundOn ? '🔊' : '🔇'; };

function closePanel() {
  $('#cloudPanel').classList.remove('open');
  $('#cloudScrim').classList.remove('on');
  window.speechSynthesis && window.speechSynthesis.cancel();
}
$('#cpClose').onclick = closePanel;
$('#cloudScrim').onclick = closePanel;

/* ---------------- time machine (past 0..100 = NOW, 100..140 = forecast) ------ */
function updateTime(p) {
  const future = p > 100;
  const stage = $('#stage');
  stage.classList.toggle('forecast-mode', future);
  let labelDate = 'NOW';

  for (const t of DATA.trees) {
    const s = t.spark;
    const tree = treeEls[t.symbol];
    if (!tree || !s || !s.length) continue;
    const prices = s.map(x => x.price);
    const min = Math.min(...prices), max = Math.max(...prices);
    let shownPrice, norm, rising;

    if (!future) {
      const idx = Math.round((p / 100) * (s.length - 1));
      shownPrice = s[idx].price;
      norm = (shownPrice - min) / ((max - min) || 1);
      rising = shownPrice >= s[0].price;
      if (t.symbol === 'BTC') labelDate = new Date(s[idx].t).toISOString().slice(0, 10);
    } else {
      // project from NOW toward the forecast base over +30 days
      const fk = (p - 100) / 40;                 // 0..1 across the future zone
      const f = t.forecast;
      const now = s[s.length - 1].price;
      const target = f ? now * (1 + (f.base / 100)) : now;
      shownPrice = now + (target - now) * fk;
      const fullMin = Math.min(min, shownPrice), fullMax = Math.max(max, shownPrice);
      norm = (shownPrice - fullMin) / ((fullMax - fullMin) || 1);
      rising = f ? f.base >= 0 : true;
      labelDate = '+' + Math.round(fk * 30) + 'd 🔮';
    }

    const canopy = tree.querySelector('.canopy');
    canopy.style.transform = `translateY(${(1 - norm) * 46}px) scale(${0.7 + norm * 0.6})`;
    tree.querySelector('.trunk').style.height = (58 + norm * 150) * 0.5 + 'px';
    tree.classList.toggle('healthy', rising);
    tree.classList.toggle('wilting', !rising);
    tree.classList.toggle('ghost', future);
    tree.querySelector('.tree-price').textContent = fmtMoney(shownPrice);
  }
  $('#timeDate').textContent = p >= 100 && p <= 100 ? 'NOW' : (future ? labelDate : labelDate);
  if (p === 100) $('#timeDate').textContent = 'NOW';
}
$('#timeSlider').addEventListener('input', e => updateTime(+e.target.value));

function escapeHtml(s = '') { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
