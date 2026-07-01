/* HINDSIGHT — front-end. Talks to the local backend, draws the comic UI. */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmtMoney = n => (n == null ? '—' : (Math.abs(n) >= 1 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$' + n.toFixed(6)));
const fmtPct = n => (n == null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%');

const state = { symbol: 'BTC', assets: [], betDir: 'long' };

async function api(name, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/${name}?${qs}`);
  if (!res.ok) { let msg = 'Request failed'; try { msg = (await res.json()).error; } catch {} throw new Error(msg); }
  return res.json();
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3200);
}

/* -------------------------------------------------- assets + ticker */
async function loadAssets() {
  state.assets = await api('assets');
  const pick = $('#assetPicker'); pick.innerHTML = '';
  for (const a of state.assets) {
    const b = el('button', 'asset-btn' + (a.symbol === state.symbol ? ' active' : ''),
      `<span>${a.emoji || '📈'}</span><span>${a.name}</span><span class="tag">${a.symbol}</span>`);
    b.onclick = () => selectAsset(a.symbol);
    pick.appendChild(b);
  }
}

function currentAsset() { return state.assets.find(a => a.symbol === state.symbol) || { name: 'Bitcoin' }; }

function selectAsset(sym) {
  state.symbol = sym;
  document.querySelectorAll('.asset-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(sym)));
  $('#betAsset').textContent = currentAsset().name;
  refreshAll();
}

async function loadTicker() {
  const card = $('#tickerCard');
  try {
    const { asset, quote } = await api('quote', { symbol: state.symbol });
    const up = (quote.change24h ?? 0) >= 0;
    card.innerHTML = `
      <div class="ticker-emoji">${asset.emoji || '📈'}</div>
      <div class="ticker-main">
        <div class="ticker-name">${asset.name} · ${asset.symbol}</div>
        <div class="ticker-price">${fmtMoney(quote.price)}</div>
      </div>
      <div class="ticker-chg ${up ? 'up' : 'down'}">${fmtPct(quote.change24h)}</div>
      <div class="ticker-note">live · ${asset.type} · ${quote.currency}</div>`;
  } catch (e) { card.innerHTML = `<div class="ticker-loading">⚠ ${e.message}</div>`; }
}

/* -------------------------------------------------- SVG helpers */
function buildScales(allPts, W, H, pad) {
  const ts = allPts.map(p => p.t), ps = allPts.map(p => p.price);
  const tMin = Math.min(...ts), tMax = Math.max(...ts);
  const pMin = Math.min(...ps), pMax = Math.max(...ps);
  const pSpan = (pMax - pMin) || 1;
  const x = t => pad.l + ((t - tMin) / ((tMax - tMin) || 1)) * (W - pad.l - pad.r);
  const y = p => H - pad.b - ((p - pMin) / pSpan) * (H - pad.t - pad.b);
  return { x, y, tMin, tMax, pMin, pMax };
}
const linePath = (pts, sc) => pts.map((p, i) => (i ? 'L' : 'M') + sc.x(p.t).toFixed(1) + ' ' + sc.y(p.price).toFixed(1)).join(' ');
const areaPath = (top, bot, sc) =>
  'M' + top.map(p => sc.x(p.t).toFixed(1) + ' ' + sc.y(p.price).toFixed(1)).join(' L') +
  ' L' + [...bot].reverse().map(p => sc.x(p.t).toFixed(1) + ' ' + sc.y(p.price).toFixed(1)).join(' L') + ' Z';

/* -------------------------------------------------- forecast timeline */
async function loadForecast() {
  const box = $('#forecastChart'); const rail = $('#catalystRail');
  box.innerHTML = '<div class="loading">Building the timeline…</div>'; rail.innerHTML = '';
  try {
    const f = await api('forecast', { symbol: state.symbol, horizon: 60 });
    const past = f.past;
    const cone = f.cone;
    if (!past.length) { box.innerHTML = '<div class="loading">No data.</div>'; return; }

    const nowT = past[past.length - 1].t;
    const all = [...past];
    if (cone) all.push(...cone.paths.bull, ...cone.paths.bear, ...cone.paths.base);
    const W = Math.max(760, past.length * 4 + 300), H = 360, pad = { l: 62, r: 20, t: 22, b: 34 };
    const sc = buildScales(all, W, H, pad);

    const coneStartPt = { t: nowT, price: past[past.length - 1].price };
    const bull = cone ? [coneStartPt, ...cone.paths.bull] : [];
    const bear = cone ? [coneStartPt, ...cone.paths.bear] : [];
    const base = cone ? [coneStartPt, ...cone.paths.base] : [];

    const nowX = sc.x(nowT);
    const gridY = [0, .25, .5, .75, 1].map(f2 => {
      const price = sc.pMin + f2 * (sc.pMax - sc.pMin);
      return `<line x1="${pad.l}" x2="${W - pad.r}" y1="${sc.y(price)}" y2="${sc.y(price)}" stroke="#2a2a3a"/>
              <text class="axis-label" x="6" y="${sc.y(price) + 4}">${fmtMoney(price)}</text>`;
    }).join('');

    box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Possibility timeline">
      <defs>
        <linearGradient id="coneG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3ddc84" stop-opacity="0.55"/>
          <stop offset="1" stop-color="#ff5da2" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      ${gridY}
      ${cone ? `<path d="${areaPath(bull, bear, sc)}" fill="url(#coneG)" stroke="none"/>` : ''}
      <path d="${linePath(past, sc)}" fill="none" stroke="#ffe14d" stroke-width="3"/>
      ${cone ? `<path d="${linePath(bull, sc)}" fill="none" stroke="#3ddc84" stroke-width="2.5" stroke-dasharray="2 4"/>
                <path d="${linePath(base, sc)}" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 5"/>
                <path d="${linePath(bear, sc)}" fill="none" stroke="#ff4438" stroke-width="2.5" stroke-dasharray="2 4"/>` : ''}
      <line class="now-line" x1="${nowX}" x2="${nowX}" y1="${pad.t}" y2="${H - pad.b}"/>
      <text class="now-tag" x="${nowX + 6}" y="${pad.t + 12}">NOW</text>
      <text class="axis-label" x="${pad.l}" y="${H - 8}">◀ real past</text>
      <text class="axis-label" x="${W - 150}" y="${H - 8}">possible futures ▶</text>
      ${cone ? `
        <text class="axis-label" fill="#3ddc84" x="${sc.x(bull[bull.length-1].t) - 30}" y="${sc.y(bull[bull.length-1].price) - 4}">🐂 ${fmtMoney(cone.endpoints.bull)}</text>
        <text class="axis-label" fill="#fff" x="${sc.x(base[base.length-1].t) - 30}" y="${sc.y(base[base.length-1].price) + 4}">➖ ${fmtMoney(cone.endpoints.base)}</text>
        <text class="axis-label" fill="#ff4438" x="${sc.x(bear[bear.length-1].t) - 30}" y="${sc.y(bear[bear.length-1].price) + 14}">🐻 ${fmtMoney(cone.endpoints.bear)}</text>` : ''}
    </svg>`;

    // catalysts
    const pins = [];
    if (f.computedExpiries?.length) {
      pins.push(pin('Next monthly options expiry', 'DATE', `${f.computedExpiries[0]} · volatility often spikes`));
    }
    for (const c of f.catalysts) pins.push(pin(c.label, c.kind, c.note));
    rail.innerHTML = pins.join('');
    if (cone) toast(`Possibility cone built from ${cone.dailyVolPct}% daily volatility`);
  } catch (e) { box.innerHTML = `<div class="loading">⚠ ${e.message}</div>`; }
}
function pin(title, kind, note) {
  return `<div class="cat-pin"><span class="cat-kind">${kind}</span>
    <div class="ct">${title}</div><div class="cn">${note}</div></div>`;
}

/* -------------------------------------------------- backtest */
function setupBet() {
  const today = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  const def = new Date(today); def.setFullYear(def.getFullYear() - 1);
  $('#betDate').value = iso(def);
  $('#betDate').max = iso(today);

  // quick date chips
  const chips = [['1 yr ago', 365], ['2 yrs ago', 730], ['3 yrs ago', 1095], ['90 days ago', 90], ['30 days ago', 30]];
  const qd = $('#quickDates');
  for (const [label, days] of chips) {
    const b = el('button', 'qd', label); b.type = 'button';
    b.onclick = () => { const d = new Date(); d.setDate(d.getDate() - days); $('#betDate').value = iso(d); };
    qd.appendChild(b);
  }
  document.querySelectorAll('.dir').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.dir').forEach(x => x.classList.remove('active'));
    btn.classList.add('active'); state.betDir = btn.dataset.dir;
  });
  $('#betForm').addEventListener('submit', runBet);
}

async function runBet(e) {
  e.preventDefault();
  const btn = $('#runBet'); btn.disabled = true; btn.textContent = '⏳ TRAVELLING…';
  const out = $('#betResult');
  out.innerHTML = '<div class="loading" style="margin:auto">Rewinding time & pulling real prices…</div>';
  try {
    const r = await api('backtest', {
      symbol: state.symbol, date: $('#betDate').value,
      amount: $('#betAmount').value, direction: state.betDir,
    });
    renderBet(r);
  } catch (err) { out.innerHTML = `<div class="bet-empty"><div class="bet-empty-emoji">😵</div><p>${err.message}</p></div>`; }
  finally { btn.disabled = false; btn.textContent = '⏳ RUN THE TIME MACHINE'; }
}

function renderBet(r) {
  const win = r.pnl > 0.005 * r.amount, loss = r.pnl < -0.005 * r.amount;
  const cls = win ? 'win' : loss ? 'loss' : 'flat';
  const verdict = win ? `YOU'D BE UP ${fmtMoney(r.pnl)} 🤑` : loss ? `YOU'D BE DOWN ${fmtMoney(Math.abs(r.pnl))} 😬` : `ROUGHLY BREAK-EVEN 😐`;
  const dirWord = r.direction === 'long' ? 'betting it would rise' : 'betting it would fall (short)';

  // mini chart of the actual journey
  const s = r.series.length ? r.series : [{ t: Date.now(), price: r.exit.price }];
  const W = 420, H = 120, pad = { l: 6, r: 6, t: 8, b: 8 };
  const sc = buildScales(s, W, H, pad);
  const chart = `<svg class="bet-chart" viewBox="0 0 ${W} ${H}" width="100%" height="120">
    <path d="${areaPath(s, s.map(p => ({ t: p.t, price: sc.pMin })), sc)}" fill="${loss ? '#ff443822' : '#3ddc8422'}"/>
    <path d="${linePath(s, sc)}" fill="none" stroke="${loss ? '#ff4438' : '#3ddc84'}" stroke-width="2.5"/>
  </svg>`;

  const clampNote = r.clamped
    ? `<div class="bet-story" style="background:var(--yellow)">⏳ Heads up: ${r.clampedNote}</div>` : '';
  out(`
    <div class="verdict ${cls}">${verdict}</div>
    ${clampNote}
    <div class="bet-story">
      If you'd put <b>${fmtMoney(r.amount)}</b> on <b>${r.asset.name}</b> ${dirWord} on <b>${r.entry.date}</b>
      (price ${fmtMoney(r.entry.price)}) and held until today (${fmtMoney(r.exit.price)}),
      your ${fmtMoney(r.amount)} would now be worth <b>${fmtMoney(r.finalValue)}</b> — a return of <b>${fmtPct(r.returnPct)}</b>.
    </div>
    <div class="bet-lines">
      <div class="bl"><div class="k">Entry (${r.entry.date})</div><div class="v">${fmtMoney(r.entry.price)}</div></div>
      <div class="bl"><div class="k">Today (${r.exit.date})</div><div class="v">${fmtMoney(r.exit.price)}</div></div>
      <div class="bl"><div class="k">Best day to exit (${r.bestExit.date})</div><div class="v">${fmtMoney(r.bestExit.value)}</div></div>
      <div class="bl"><div class="k">Worst moment (${r.worst.date})</div><div class="v">${fmtMoney(r.worst.value)}</div></div>
    </div>
    ${chart}
  `);
  function out(html) { $('#betResult').innerHTML = html; }
}

/* -------------------------------------------------- forums + radar */
async function loadForums() {
  const cloud = $('#themeCloud'), list = $('#postList'), radar = $('#radarList');
  cloud.innerHTML = list.innerHTML = radar.innerHTML = '<div class="loading">Scanning forums…</div>';
  try {
    const f = await api('forums', { symbol: state.symbol });

    if (f.scanned === 0) {
      const note = `<div class="radar-clean">🐢 ${f.note || 'Nothing to show right now.'}</div>`;
      cloud.innerHTML = list.innerHTML = note;
      renderRadar([]);
      return;
    }

    // theme cloud
    const max = Math.max(...f.themes.map(t => t.count), 1);
    const palette = ['#0d0d12', '#4d6dff', '#ff5da2', '#e8820b', '#7a3ff2'];
    cloud.innerHTML = f.themes.length ? f.themes.map((t, i) => {
      const size = 13 + (t.count / max) * 26;
      const c = palette[i % palette.length];
      return `<span class="theme-chip" style="font-size:${size.toFixed(0)}px;color:${c};border-color:${c}"
        title="${t.count} mentions">${t.word}</span>`;
    }).join('') : '<p style="opacity:.6">No repeated themes right now.</p>';

    // posts
    list.innerHTML = f.posts.length ? f.posts.map(p => `
      <a class="post" href="${p.link}" target="_blank" rel="noopener">
        <div class="pt">${escapeHtml(p.title)}</div>
        <div class="pm"><span class="sub-tag">r/${p.sub}</span>${p.scam.score >= 22 ? '<span style="color:#c0392b">⚠ flagged</span>' : ''}</div>
      </a>`).join('') : '<p style="opacity:.6">No posts found.</p>';

    // scam radar
    renderRadar(f.flagged);
    toast(`Scanned ${f.scanned} posts across r/${f.subs.join(', r/')}`);
  } catch (e) {
    const msg = `<div class="loading">⚠ ${e.message}</div>`;
    cloud.innerHTML = list.innerHTML = radar.innerHTML = msg;
  }
}

function renderRadar(flagged) {
  const radar = $('#radarList');
  if (!flagged.length) {
    radar.innerHTML = `<div class="radar-clean">🛡️ No obvious scam-pattern posts in this batch. Stay sharp anyway — scammers evolve.</div>`;
    return;
  }
  radar.innerHTML = flagged.map(p => {
    const col = p.scam.score >= 66 ? '#ff4438' : p.scam.score >= 40 ? '#e8820b' : '#f5c400';
    return `<div class="scam-card">
      <div class="scam-top">
        <div class="scam-gauge" style="background:${col};color:#fff">${p.scam.score}</div>
        <div class="scam-title">${escapeHtml(p.title)}</div>
      </div>
      <div class="scam-why">${p.scam.hits.map(h => `<span class="why-chip">${escapeHtml(h)}</span>`).join('') || '<span class="why-chip">urgency/hype</span>'}</div>
      <a class="scam-link" href="${p.link}" target="_blank" rel="noopener">open post ↗ · r/${p.sub}</a>
    </div>`;
  }).join('');
}

/* -------------------------------------------------- news clouds */
async function loadNews() {
  const grid = $('#cloudsGrid');
  grid.innerHTML = '<div class="loading">Gathering headlines worldwide…</div>';
  try {
    const n = await api('news', { symbol: state.symbol });
    if (!n.clouds.length) { grid.innerHTML = '<div class="loading">No headlines found.</div>'; return; }
    const palette = ['#0d0d12', '#4d6dff', '#ff5da2', '#3ddc84', '#e8820b'];
    grid.innerHTML = n.clouds.map(c => {
      const max = Math.max(...c.cloud.map(w => w.count), 1);
      const words = c.cloud.map((w, i) =>
        `<span class="cloud-word" style="font-size:${(13 + (w.count / max) * 22).toFixed(0)}px;color:${palette[i % palette.length]}">${w.word}</span>`
      ).join('');
      const heads = c.headlines.map(h => `<a href="${h.link}" target="_blank" rel="noopener">${escapeHtml(h.title)}</a>`).join('');
      return `<div class="cloud-card">
        <div class="cloud-head"><span class="cloud-flag">${c.flag}</span> ${c.region}</div>
        <div class="cloud-words">${words || '<span style="opacity:.5">quiet here</span>'}</div>
        <div class="cloud-heads">${heads}</div>
      </div>`;
    }).join('');
  } catch (e) { grid.innerHTML = `<div class="loading">⚠ ${e.message}</div>`; }
}

/* -------------------------------------------------- pundit / source profiler */
async function loadPundits() {
  const grid = $('#punditGrid'), reality = $('#punditReality');
  grid.innerHTML = '<div class="loading">Profiling the voices…</div>';
  reality.classList.remove('show');
  try {
    const p = await api('pundits', { symbol: state.symbol });
    if (p.realChangePct != null) {
      const up = p.realChangePct >= 0;
      reality.innerHTML = `📊 Reality check: over the last ~${p.windowDays} days, ${p.asset.name} actually went
        <span style="color:${up ? '#3ddc84' : '#ff6b5e'}">${up ? '▲ up' : '▼ down'} ${Math.abs(p.realChangePct).toFixed(1)}%</span>.
        Now see whose tone matched — and who's talking their own book.`;
      reality.classList.add('show');
    }
    if (!p.pundits.length) { grid.innerHTML = '<div class="radar-clean">No named outlets found in this batch — try again shortly.</div>'; return; }

    grid.innerHTML = p.pundits.map(pd => {
      const leanClass = pd.bias ? leanToClass(pd.bias.lean) : 'lean-unknown';
      const lean = pd.bias
        ? `<span class="lean-tag ${leanClass}">🏛️ ${escapeHtml(pd.bias.lean)}</span><span class="stance-tag">${escapeHtml(pd.bias.stance)}</span>`
        : `<span class="lean-tag lean-unknown">lean: unrated</span>`;
      const realityFlag = pd.reality
        ? `<div class="reality-flag reality-${pd.reality.verdict}">${pd.reality.verdict === 'in-tune' ? '🎯' : '🙃'} ${escapeHtml(pd.reality.text)}</div>`
        : '';
      const heads = pd.headlines.map(h => {
        const dot = h.tone > 0 ? '🟢' : h.tone < 0 ? '🔴' : '⚪';
        return `<a href="${h.link}" target="_blank" rel="noopener">${dot} ${escapeHtml(h.title)}</a>`;
      }).join('');
      return `<div class="pundit-card">
        <div class="pundit-top">
          <div class="pundit-name">${escapeHtml(pd.source)}</div>
          <span class="tone-badge tone-${pd.tone}">${pd.tone.toUpperCase()}</span>
        </div>
        <div class="pundit-meta">${pd.count} headline${pd.count > 1 ? 's' : ''} · ${pd.bull} bullish / ${pd.bear} bearish words</div>
        <div class="lean-row">${lean}</div>
        ${realityFlag}
        <div class="pundit-heads">${heads}</div>
        ${pd.bias ? `<div class="bias-note">${escapeHtml(pd.bias.note)}</div>` : ''}
      </div>`;
    }).join('');
  } catch (e) { grid.innerHTML = `<div class="loading">⚠ ${e.message}</div>`; }
}
function leanToClass(lean = '') {
  const l = lean.toLowerCase();
  if (l.includes('crypto')) return 'lean-crypto';
  if (l.includes('left')) return 'lean-left';
  if (l.includes('right')) return 'lean-right';
  if (l.includes('center')) return 'lean-center';
  return 'lean-unknown';
}

/* -------------------------------------------------- utils + boot */
function escapeHtml(s = '') { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function refreshAll() {
  loadTicker();
  loadForecast();
  loadForums();
  loadNews();
  loadPundits();
}

(async function boot() {
  setupBet();
  await loadAssets();
  $('#betAsset').textContent = currentAsset().name;
  refreshAll();
})();
