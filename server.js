/*
 * HINDSIGHT — the market time machine (for Dummies)
 * Zero-dependency Node backend. Run:  node server.js
 * Needs Node 18+ (uses global fetch). You have v22, so you're golden.
 *
 * Data sources (all free, no API keys):
 *   - CoinGecko            -> crypto price + history
 *   - Yahoo Finance chart  -> stock price + history
 *   - Reddit RSS           -> forum scanning
 *   - Google News RSS      -> news clouds (per region)
 *
 * Everything here is for entertainment / education. NOT financial advice.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 4321;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UA = 'Mozilla/5.0 (compatible; HindsightApp/1.0; +local)';

/* -------------------------------------------------------------------------- */
/* Asset catalog — the stuff a "for Dummies" user actually recognizes         */
/* -------------------------------------------------------------------------- */
const ASSETS = {
  // Crypto Grove
  BTC:  { name: 'Bitcoin',  type: 'crypto', id: 'bitcoin',  query: 'bitcoin',  emoji: '₿', char: '🟠', family: 'crypto', color: '#f7931a' },
  ETH:  { name: 'Ethereum', type: 'crypto', id: 'ethereum', query: 'ethereum', emoji: '◆', char: '🔷', family: 'crypto', color: '#627eea' },
  SOL:  { name: 'Solana',   type: 'crypto', id: 'solana',   query: 'solana crypto', emoji: '◎', char: '🟣', family: 'crypto', color: '#14f195' },
  DOGE: { name: 'Dogecoin', type: 'crypto', id: 'dogecoin', query: 'dogecoin', emoji: '🐕', char: '🐕', family: 'crypto', color: '#c2a633' },
  // Silicon Forest
  AAPL: { name: 'Apple',    type: 'stock',  id: 'AAPL',     query: 'apple stock', emoji: '🍎', char: '🍎', family: 'tech', color: '#a2aaad' },
  NVDA: { name: 'Nvidia',   type: 'stock',  id: 'NVDA',     query: 'nvidia stock', emoji: '🎮', char: '🎮', family: 'tech', color: '#76b900' },
  MSFT: { name: 'Microsoft',type: 'stock',  id: 'MSFT',     query: 'microsoft stock', emoji: '🪟', char: '🪟', family: 'tech', color: '#00a4ef' },
  GOOGL:{ name: 'Google',   type: 'stock',  id: 'GOOGL',    query: 'google alphabet stock', emoji: '🔍', char: '🔍', family: 'tech', color: '#4285f4' },
  // EV Meadow
  TSLA: { name: 'Tesla',    type: 'stock',  id: 'TSLA',     query: 'tesla stock', emoji: '⚡', char: '🚗', family: 'auto', color: '#e82127' },
  // Commodity Quarry
  GOLD: { name: 'Gold',     type: 'commodity', id: 'GC=F',  query: 'gold price', emoji: '🥇', char: '🥇', family: 'commodities', color: '#d4af37' },
  OIL:  { name: 'Crude Oil',type: 'commodity', id: 'CL=F',  query: 'oil price OPEC crude', emoji: '🛢️', char: '🛢️', family: 'commodities', color: '#3d3d3d' },
  // Bond Bedrock
  TLT:  { name: 'US Treasuries', type: 'bond', id: 'TLT',   query: 'treasury bonds yields', emoji: '🏦', char: '🏦', family: 'bonds', color: '#5c7cfa' },
  // Currency River (FX quoted USD/local -> inverted so the tree = the currency's strength)
  TRY:  { name: 'Turkish Lira',  type: 'fx', id: 'TRY=X',   query: 'turkish lira turkey economy', emoji: '🇹🇷', char: '🇹🇷', family: 'fx', invert: true, color: '#e30a17' },
  EUR:  { name: 'Euro',          type: 'fx', id: 'EURUSD=X',query: 'euro dollar ECB', emoji: '🇪🇺', char: '🇪🇺', family: 'fx', color: '#0052b4' },
  RUB:  { name: 'Russian Ruble', type: 'fx', id: 'RUB=X',   query: 'russian ruble sanctions', emoji: '🇷🇺', char: '🇷🇺', family: 'fx', invert: true, color: '#0033a0' },
  // Meme Thicket
  GME:  { name: 'GameStop', type: 'stock',  id: 'GME',      query: 'gamestop stock', emoji: '🎯', char: '🎯', family: 'meme', color: '#e31837' },
};

/* Tree families (the "forest" game view groups assets into these).            */
const FAMILIES = {
  crypto:      { label: 'Crypto Grove',     emoji: '🌴', blurb: 'Coins & tokens — wildest weather in the forest' },
  tech:        { label: 'Silicon Forest',   emoji: '🌲', blurb: 'Big Tech — the tall old trees' },
  auto:        { label: 'EV Meadow',        emoji: '🌱', blurb: 'Cars, batteries & energy' },
  commodities: { label: 'Commodity Quarry', emoji: '⛏️', blurb: 'Gold & oil — dug from the ground' },
  bonds:       { label: 'Bond Bedrock',     emoji: '🪨', blurb: 'Government bonds — the slow bedrock' },
  fx:          { label: 'Currency River',   emoji: '💱', blurb: 'Currencies flowing against the dollar' },
  meme:        { label: 'Meme Thicket',     emoji: '🍄', blurb: 'Retail-driven wild plants' },
};

/* Curated / typical catalysts. Honest: these are *typical* recurring events,   */
/* clearly labeled, not fabricated precise calendar entries.                    */
const CATALYSTS = {
  crypto: [
    { label: 'Monthly options expiry', kind: 'recurring', note: 'Last Friday each month — volatility tends to spike' },
    { label: 'US Fed rate decision (FOMC)', kind: 'macro', note: 'Roughly every 6 weeks — moves all risk assets' },
    { label: 'US CPI inflation print', kind: 'macro', note: 'Monthly — hot number often = red candles' },
    { label: 'Next Bitcoin halving', kind: 'structural', note: 'Approx 2028 — supply issuance cut in half' },
  ],
  stock: [
    { label: 'Quarterly earnings call', kind: 'earnings', note: 'Every ~3 months — the big binary event' },
    { label: 'US Fed rate decision (FOMC)', kind: 'macro', note: 'Roughly every 6 weeks — moves the whole market' },
    { label: 'Ex-dividend / product events', kind: 'company', note: 'Company-specific launches & payouts' },
  ],
};
const CATALYSTS_EXTRA = {
  AAPL: [{ label: 'iPhone launch event', kind: 'company', note: 'Typically September — the yearly hype cycle' },
         { label: 'WWDC keynote', kind: 'company', note: 'Typically June — software + AI reveals' }],
  TSLA: [{ label: 'Deliveries report', kind: 'company', note: 'Start of each quarter — beats/misses swing the stock' }],
  NVDA: [{ label: 'GTC conference', kind: 'company', note: 'Typically spring — AI chip roadmap' }],
};

/* Scam / hype signal lexicon for the Scam Radar.                              */
const SCAM_SIGNALS = [
  'giveaway', 'double your', '2x your', 'guaranteed', 'guaranteed profit', '100x', '1000x',
  'free crypto', 'free bitcoin', 'airdrop claim', 'claim now', 'connect wallet', 'seed phrase',
  'dm me', 'pm me', 'send me', 'presale', 'pre-sale', 'elon', 'musk giving', 'to the moon guaranteed',
  'risk free', 'risk-free', 'insider', 'pump', 'signal group', 'telegram group', 'whatsapp group',
  'get rich', 'passive income guaranteed', 'limited spots', 'act now', 'once in a lifetime',
  'mint now', 'x100', 'guaranteed returns', 'daily profit', 'roi guaranteed',
];

/* Sentiment lexicon for reading a headline's tone (bullish vs bearish). */
const BULL_WORDS = ('surge soar soars rally rallies jump jumps gain gains gaining high highs boom breakout ' +
  'adopt adoption bullish moon rocket record upgrade buy optimistic win wins beat beats growth rise rises ' +
  'rising up climb climbs top tops strong soaring skyrocket pump green profit profits outperform approve etf ' +
  'inflow inflows accumulate hodl support recover rebound').split(' ');
const BEAR_WORDS = ('crash crashes plunge plunges drop drops fall falls selloff sell-off bearish warning warn ' +
  'risk risky fraud scam ban banned lawsuit sue dump dumps collapse fear fears tumble slump slumps down ' +
  'loss losses miss misses cut cuts layoff layoffs weak plummet sink sinks red bleed liquidation crackdown ' +
  'probe investigation delay recall bubble overvalued short-seller').split(' ');

/* Curated, third-party-style lean/stance ratings for well-known outlets.
 * These are GENERALIZATIONS drawn from public media-bias/reliability aggregators
 * (e.g. AllSides / Ad Fontes style) — shown as context, not our own verdict.
 * Keys are lowercased substrings matched against the outlet name.            */
const OUTLET_BIAS = {
  'reuters':      { lean: 'Center', stance: 'Wire / factual', note: 'Newswire, low editorial slant' },
  'associated press': { lean: 'Center', stance: 'Wire / factual', note: 'Newswire, low editorial slant' },
  ' ap':          { lean: 'Center', stance: 'Wire / factual', note: 'Newswire' },
  'bloomberg':    { lean: 'Center', stance: 'Pro-markets', note: 'Finance-first, institutional lens' },
  'wall street journal': { lean: 'Center-right (opinion: Right)', stance: 'Pro-business', note: 'News desk center, editorial page conservative' },
  'wsj':          { lean: 'Center-right (opinion: Right)', stance: 'Pro-business', note: 'News center, opinion conservative' },
  'financial times': { lean: 'Center', stance: 'Pro-markets', note: 'Global finance establishment' },
  'cnbc':         { lean: 'Center', stance: 'Trader-focused', note: 'Fast, market-reactive coverage' },
  'fox business': { lean: 'Right', stance: 'Pro-business', note: 'Conservative-leaning framing' },
  'fox news':     { lean: 'Right', stance: 'Conservative', note: 'Conservative editorial line' },
  'the guardian': { lean: 'Center-left', stance: 'Skeptical of finance', note: 'Progressive framing' },
  'new york times': { lean: 'Center-left', stance: 'Institutional', note: 'Liberal-leaning editorial' },
  'msnbc':        { lean: 'Left', stance: 'Progressive', note: 'Liberal editorial line' },
  'marketwatch':  { lean: 'Center', stance: 'Retail-investor', note: 'Dow Jones, market news' },
  'yahoo':        { lean: 'Center', stance: 'Aggregator', note: 'Mixed syndicated sources' },
  'forbes':       { lean: 'Center', stance: 'Business / contributor', note: 'Contributor network — quality varies' },
  'coindesk':     { lean: 'Crypto-native', stance: 'Pro-crypto', note: 'Crypto industry outlet' },
  'cointelegraph':{ lean: 'Crypto-native', stance: 'Pro-crypto (promotional)', note: 'Often bullish, watch for hype' },
  'decrypt':      { lean: 'Crypto-native', stance: 'Pro-crypto', note: 'Crypto industry outlet' },
  'the block':    { lean: 'Crypto-native', stance: 'Crypto markets', note: 'Crypto industry outlet' },
  'motley fool':  { lean: 'Center', stance: 'Promotional / retail', note: 'Sells subscriptions — upbeat by design' },
  'seeking alpha':{ lean: 'Mixed', stance: 'Retail / opinion', note: 'Crowd-sourced authors, uneven' },
  'benzinga':     { lean: 'Center', stance: 'Promotional / retail', note: 'Fast retail-trader content' },
  'zerohedge':    { lean: 'Right', stance: 'Perma-bear', note: 'Chronically bearish, contrarian' },
  'business insider': { lean: 'Center-left', stance: 'Markets / culture', note: 'Mixed markets coverage' },
  'barron':       { lean: 'Center-right', stance: 'Pro-business', note: 'Dow Jones investing weekly' },
};

const STOPWORDS = new Set(('a an the and or but of to in on for with at by from up about into over after ' +
  'is are was were be been being have has had do does did will would could should may might must can ' +
  'this that these those it its it\'s as if then than so no not you your my our their his her they them ' +
  'we us he she i me just now new get got via amp what how why who when where which will one two get why ' +
  'bitcoin crypto btc price today market news').split(' '));

/* -------------------------------------------------------------------------- */
/* Tiny TTL cache — be polite to the free APIs                                 */
/* -------------------------------------------------------------------------- */
const cache = new Map();
function cacheGet(key) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  cache.delete(key);
  return null;
}
function cacheSet(key, data, ttlMs) {
  // Cap cache size so a long-lived server can't grow memory without bound.
  if (cache.size > 500) {
    for (const k of cache.keys()) { cache.delete(k); if (cache.size <= 400) break; }
  }
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchText(url, ttlMs = 60000) {
  const ck = 'txt:' + url;
  const cached = cacheGet(ck);
  if (cached !== null) return cached;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': '*/*' },
        signal: AbortSignal.timeout(12000), // don't let a hung upstream hang the request
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`Upstream ${res.status}`);
      if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
      const text = await res.text();
      cacheSet(ck, text, ttlMs);
      return text;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await sleep(800 * (attempt + 1));
    }
  }
  throw lastErr;
}
async function fetchJSON(url, ttlMs = 60000) {
  return JSON.parse(await fetchText(url, ttlMs));
}

/* -------------------------------------------------------------------------- */
/* Price + history providers                                                   */
/* -------------------------------------------------------------------------- */
async function getQuote(asset) {
  if (asset.type === 'crypto') {
    // 1) CoinGecko (primary)
    try {
      const u = `https://api.coingecko.com/api/v3/simple/price?ids=${asset.id}&vs_currencies=usd&include_24hr_change=true`;
      const j = await fetchJSON(u, 30000);
      const row = j[asset.id] || {};
      if (row.usd != null) return { price: row.usd, change24h: row.usd_24h_change ?? null, currency: 'USD' };
    } catch (e) { /* fall through */ }

    // 2) Coinbase (independent source; one call gives price + 24h change)
    try {
      const s = await fetchJSON(`https://api.exchange.coinbase.com/products/${asset.symbol}-USD/stats`, 30000);
      if (s && s.last != null) {
        const last = parseFloat(s.last), open = parseFloat(s.open);
        const change = open ? ((last - open) / open) * 100 : null;
        return { price: last, change24h: change, currency: 'USD', source: 'coinbase' };
      }
    } catch (e) { /* fall through */ }

    // 3) Derive from the (usually cached) daily history as a last resort
    const h = await getHistory(asset, 3);
    const last = h[h.length - 1], prev = h[h.length - 2];
    if (!last) throw httpErr(502, 'price temporarily unavailable');
    const change = prev ? ((last.price - prev.price) / prev.price) * 100 : null;
    return { price: last.price, change24h: change, currency: 'USD', derived: true };
  } else {
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.id)}?range=5d&interval=1d`;
    const j = await fetchJSON(u, 30000);
    const m = j.chart?.result?.[0]?.meta || {};
    let price = m.regularMarketPrice ?? null;
    let prev = m.chartPreviousClose ?? m.previousClose ?? null;
    if (asset.invert) { if (price) price = 1 / price; if (prev) prev = 1 / prev; }
    const change = (price != null && prev) ? ((price - prev) / prev) * 100 : null;
    return { price, change24h: change, currency: asset.invert ? 'USD' : (m.currency || 'USD') };
  }
}

// Returns normalized array [{ t: ms, price }] oldest -> newest.
// CoinGecko's free tier caps history at 365 days, so we always pull the full
// 365-day series (one stable cache key -> avoids rate limits) and slice locally.
const CRYPTO_MAX_DAYS = 365;
async function getHistory(asset, days = 365) {
  if (asset.type === 'crypto') {
    let pts = [];
    // Primary: CoinGecko daily series (up to 365 days on the free tier).
    try {
      const u = `https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart?vs_currency=usd&days=${CRYPTO_MAX_DAYS}&interval=daily`;
      const j = await fetchJSON(u, 5 * 60000);
      pts = (j.prices || []).map(([t, price]) => ({ t, price }));
    } catch (e) {
      // Fallback: Coinbase daily candles (~300 days) when CoinGecko throttles.
      try {
        const c = await fetchJSON(`https://api.exchange.coinbase.com/products/${asset.symbol}-USD/candles?granularity=86400`, 5 * 60000);
        pts = (Array.isArray(c) ? c : []).map(r => ({ t: r[0] * 1000, price: r[4] })).sort((a, b) => a.t - b.t);
      } catch (e2) { /* both failed */ }
    }
    if (!pts.length) throw httpErr(502, 'price history temporarily unavailable');
    const want = Math.min(days, CRYPTO_MAX_DAYS);
    if (want < CRYPTO_MAX_DAYS) {
      const cutoff = Date.now() - want * 86400000;
      pts = pts.filter(p => p.t >= cutoff);
    }
    return maybeInvert(asset, pts);
  } else {
    const range = days <= 5 ? '5d' : days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo'
      : days <= 365 ? '1y' : days <= 730 ? '2y' : '5y';
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.id)}?range=${range}&interval=1d`;
    const j = await fetchJSON(u, 5 * 60000);
    const r = j.chart?.result?.[0];
    const ts = r?.timestamp || [];
    const closes = r?.indicators?.quote?.[0]?.close || [];
    const out = [];
    for (let i = 0; i < ts.length; i++) {
      if (closes[i] != null) out.push({ t: ts[i] * 1000, price: closes[i] });
    }
    return maybeInvert(asset, out);
  }
}

// FX pairs quoted USD/local (invert:true) become "value of 1 unit in USD" so the
// tree grows when the currency STRENGTHENS.
function maybeInvert(asset, pts) {
  if (!asset.invert) return pts;
  return pts.map(p => ({ t: p.t, price: p.price ? 1 / p.price : p.price }));
}

/* -------------------------------------------------------------------------- */
/* RSS / Atom parsing (regex, no deps)                                         */
/* -------------------------------------------------------------------------- */
function decodeEntities(s = '') {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}
function parseFeed(xml) {
  const items = [];
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    let link = '';
    if (isAtom) {
      const lm = b.match(/<link[^>]*href="([^"]+)"/i);
      link = lm ? lm[1] : '';
    } else {
      link = pick(b, 'link');
    }
    items.push({
      title: pick(b, 'title'),
      link,
      date: pick(b, isAtom ? 'updated' : 'pubDate'),
      source: pick(b, 'source') || pick(b, 'author') || pick(b, 'name'),
      summary: pick(b, isAtom ? 'content' : 'description'),
    });
  }
  return items;
}

/* -------------------------------------------------------------------------- */
/* Text analytics — repeated themes + scam scoring                             */
/* -------------------------------------------------------------------------- */
function wordFreq(texts, max = 40) {
  const counts = new Map();
  for (const t of texts) {
    const words = (t || '').toLowerCase().match(/[a-z][a-z'\-]{2,}/g) || [];
    for (const w of words) {
      if (STOPWORDS.has(w) || w.length < 3) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word, count]) => ({ word, count }));
}

// Tone of a single headline: +bullish / -bearish score.
function toneScore(text) {
  const words = (text || '').toLowerCase().match(/[a-z][a-z'\-]{2,}/g) || [];
  let bull = 0, bear = 0;
  for (const w of words) {
    if (BULL_WORDS.includes(w)) bull++;
    if (BEAR_WORDS.includes(w)) bear++;
  }
  return { bull, bear, net: bull - bear };
}
function labelTone(net, n) {
  const ratio = n ? net / n : 0;
  if (ratio > 0.12) return 'bullish';
  if (ratio < -0.12) return 'bearish';
  return 'mixed';
}
// Match an outlet name to a curated bias entry (substring match).
function biasFor(source) {
  const s = (source || '').toLowerCase();
  for (const key of Object.keys(OUTLET_BIAS)) if (s.includes(key.trim())) return OUTLET_BIAS[key];
  return null;
}
// Google News often appends " - Outlet" to the title; use as source fallback.
function sourceFromTitle(title) {
  const m = (title || '').match(/\s-\s([^-]+)$/);
  return m ? m[1].trim() : '';
}

/* -------------------------------------------------------------------------- */
/* Impact engine — "if you click this news cloud, where does the rain fall?"   */
/* Heuristic keyword rules mapping a headline's topic to affected assets,      */
/* a direction (+1 waters/grows, -1 poisons), and a plain-language reason.     */
/* -------------------------------------------------------------------------- */
const IMPACT_RULES = [
  { re: /\btariff|trade war|import tax|customs duty|levy on\b/i, topic: 'Tariffs 🏭', broad: -1,
    effects: [['AAPL', -1, 'huge China supply chain — tariffs raise its costs'], ['NVDA', -1, 'China export exposure'], ['TSLA', -1, 'global supply chain & China sales hit']] },
  { re: /\brate cut|dovish|cut rates|lower rates|easing cycle|pivot\b/i, topic: 'Rate-cut hopes 🕊️', broad: 1,
    effects: [['BTC', 1, 'cheaper money floods into risk assets'], ['ETH', 1, 'risk-on liquidity'], ['SOL', 1, 'risk-on liquidity'], ['NVDA', 1, 'growth stocks love low rates'], ['TSLA', 1, 'growth stocks love low rates'], ['TLT', 1, 'bond prices rise as yields fall'], ['GOLD', 1, 'lower real yields lift gold']] },
  { re: /\brate hike|hawkish|raise rates|higher for longer|tighten/i, topic: 'Rate hikes 🦅', broad: -1,
    effects: [['BTC', -1, 'pricier money pulls cash out of risk'], ['ETH', -1, 'risk-off drain'], ['NVDA', -1, 'high rates squeeze growth valuations'], ['TSLA', -1, 'high rates squeeze growth valuations'], ['TLT', -1, 'bond prices fall as yields rise'], ['GOLD', -1, 'higher yields hurt gold'], ['TRY', -1, 'strong dollar pressures the lira'], ['RUB', -1, 'strong dollar pressures EM currencies']] },
  { re: /\b(hot |rising )?inflation|cpi|pce|prices? (rose|jump|surge)/i, topic: 'Inflation 🔥', broad: -1,
    effects: [['BTC', -1, 'hot inflation delays rate cuts'], ['NVDA', -1, 'pressures growth multiples'], ['TSLA', -1, 'pressures growth multiples'], ['GOLD', 1, 'classic inflation hedge'], ['TLT', -1, 'inflation erodes fixed coupons']] },
  { re: /\bspot etf|etf (approv|inflow|launch)|etf flows\b/i, topic: 'ETF flows 💰',
    effects: [['BTC', 1, 'ETF buying = fresh demand'], ['ETH', 1, 'ETF buying = fresh demand']] },
  { re: /\bhalving\b/i, topic: 'Halving ⛏️', effects: [['BTC', 1, 'new supply issuance cut in half']] },
  { re: /\bhack|exploit|stolen|breach|drained|rug ?pull\b/i, topic: 'Hack 🚨', mentioned: -1, mentionedWhy: 'a security breach spooks holders' },
  { re: /\bsec |lawsuit|sues|charged|fraud|probe|investigat|subpoena\b/i, topic: 'Legal trouble ⚖️', mentioned: -1, mentionedWhy: 'regulatory / legal overhang' },
  { re: /\bbans?\b|\bbanned\b|crackdown|\billegal\b|outlaw/i, topic: 'Crackdown 🚫', broad: -1,
    effects: [['BTC', -1, 'regulatory clampdown'], ['ETH', -1, 'regulatory clampdown'], ['SOL', -1, 'regulatory clampdown'], ['DOGE', -1, 'regulatory clampdown']] },
  { re: /\biphone|apple event|wwdc|app store|vision pro|macbook\b/i, topic: 'Apple hype 🍎', effects: [['AAPL', 1, 'product-cycle excitement']] },
  { re: /\bai |artificial intelligence|data ?cent|gpu|chip|blackwell|h100|inference\b/i, topic: 'AI boom 🤖', effects: [['NVDA', 1, 'more AI = more chips sold']] },
  { re: /\brecall|delivery miss|autopilot crash|robotaxi delay|tesla strike|demand slump\b/i, topic: 'Tesla trouble 🚗', effects: [['TSLA', -1, 'operational / demand worries']] },
  { re: /\brobotaxi launch|record deliver|gigafactory|fsd\b/i, topic: 'Tesla momentum ⚡', effects: [['TSLA', 1, 'growth catalyst']] },
  { re: /\bshort squeeze|meme stock|roaring kitty|keith gill|to the moon\b/i, topic: 'Meme squeeze 🚀', effects: [['GME', 1, 'retail piling in']] },
  { re: /\btrump|maga|white house|president|congress|senate|biden\b/i, topic: 'Politics 🏛️', political: true,
    note: 'political headlines cut both ways — a supporter saying "avoid US markets" is a conflicting signal worth watching' },
  { re: /\bwar|conflict|invasion|missile|geopolit|military strike\b/i, topic: 'Geopolitics 💥', broad: -1,
    effects: [['BTC', -1, 'risk-off, investors flee'], ['NVDA', -1, 'risk-off'], ['TSLA', -1, 'risk-off'], ['AAPL', -1, 'risk-off'], ['GOLD', 1, 'safe-haven demand'], ['OIL', 1, 'supply-shock fears push oil up']] },
  { re: /\bsanction/i, topic: 'Sanctions 🚫', broad: -1,
    effects: [['RUB', -1, 'sanctions choke the ruble'], ['OIL', 1, 'supply worries lift oil'], ['GOLD', 1, 'safe-haven bid']] },
  { re: /\bopec|oil (supply|output|cut|glut)|crude (surge|jump)|barrel\b/i, topic: 'Oil supply ⛽', effects: [['OIL', 1, 'supply/OPEC dynamics move crude']] },
  { re: /\bsafe[- ]haven|flight to safety|gold (rally|record|surge|hits)/i, topic: 'Safe haven 🥇', effects: [['GOLD', 1, 'fear drives money into gold']] },
  { re: /\bstrong dollar|dollar (surge|soar|strengthen|rally)|dxy (rise|surge)|greenback\b/i, topic: 'Strong dollar 💵', broad: -1,
    effects: [['TRY', -1, 'a strong dollar weakens the lira'], ['RUB', -1, 'a strong dollar weakens the ruble'], ['EUR', -1, 'euro slips vs the dollar'], ['GOLD', -1, 'gold priced in dollars gets pricier abroad']] },
  { re: /\bturkey|turkish|lira|erdogan\b/i, topic: 'Turkey 🇹🇷', mentioned: 0, note: 'Turkey-specific: watch the central bank & inflation — foreign inflows can prop the lira, capital flight sinks it' },
  { re: /\brally|surge|soar|record high|all-time high|rockets?\b/i, topic: 'Momentum 📈', mentioned: 1, mentionedWhy: 'strong upward momentum' },
  { re: /\bcrash|plunge|selloff|sell-off|tumble|collapse|bloodbath\b/i, topic: 'Selloff 📉', mentioned: -1, mentionedWhy: 'sharp price drop / fear' },
];

// Extra words that should map a headline to an asset (beyond its name/symbol).
const ASSET_ALIASES = {
  GOLD: ['gold', 'bullion', 'xau'],
  OIL: ['oil', 'crude', 'opec', 'brent', 'wti', 'barrel'],
  TLT: ['treasur', 'bond', 'yields', '10-year', '10 year', 'fixed income'],
  TRY: ['lira', 'turkey', 'turkish', 'erdogan'],
  EUR: ['euro', 'eurozone', 'ecb'],
  RUB: ['ruble', 'rouble', 'russia', 'kremlin', 'moscow'],
  GOOGL: ['google', 'alphabet'],
  MSFT: ['microsoft'],
};

// Which of our named assets does a headline explicitly mention?
function detectAssets(text) {
  const t = (text || '').toLowerCase();
  const found = [];
  for (const [sym, a] of Object.entries(ASSETS)) {
    const nm = a.name.toLowerCase();
    const aliases = ASSET_ALIASES[sym] || [];
    if (t.includes(nm) || new RegExp(`\\b${sym.toLowerCase()}\\b`).test(t) || aliases.some(w => t.includes(w))) found.push(sym);
  }
  return found;
}

// Read one headline → { topics, impacts:[{symbol,dir,why}], broad, political }
function analyzeHeadline(title) {
  const mentioned = detectAssets(title);
  const topics = [], raw = [];
  let broad = 0, political = false, note = null;
  for (const rule of IMPACT_RULES) {
    if (!rule.re.test(title)) continue;
    topics.push(rule.topic);
    if (rule.broad) broad += rule.broad;
    if (rule.political) political = true;
    if (rule.note) note = rule.note;
    if (rule.effects) for (const [symbol, dir, why] of rule.effects) raw.push({ symbol, dir, why });
    if (rule.mentioned) for (const symbol of mentioned) raw.push({ symbol, dir: rule.mentioned, why: rule.mentionedWhy });
  }
  // If nothing matched but an asset is named, fall back to headline tone.
  if (!raw.length && mentioned.length) {
    const t = toneScore(title).net;
    if (t !== 0) for (const symbol of mentioned) raw.push({ symbol, dir: Math.sign(t), why: 'overall ' + (t > 0 ? 'positive' : 'negative') + ' coverage' });
  }
  // Merge by symbol.
  const map = new Map();
  for (const im of raw) {
    if (!map.has(im.symbol)) map.set(im.symbol, { symbol: im.symbol, score: 0, whys: [] });
    const e = map.get(im.symbol); e.score += im.dir; if (im.why) e.whys.push(im.why);
  }
  const impacts = [...map.values()].map(e => ({ symbol: e.symbol, dir: Math.sign(e.score), why: [...new Set(e.whys)].join('; ') }));
  return { mentioned, topics: [...new Set(topics)], impacts, broad: Math.sign(broad), political, note };
}

function scamScore(text) {
  const t = (text || '').toLowerCase();
  const hits = [];
  for (const sig of SCAM_SIGNALS) {
    if (t.includes(sig)) hits.push(sig);
  }
  // crude "urgency + free money" combo boosts the score
  let score = hits.length * 22;
  if (/\b(free|double|guaranteed|100x|1000x)\b/.test(t) && /\b(now|today|claim|dm|pm|send)\b/.test(t)) score += 25;
  if (/https?:\/\/(bit\.ly|tinyurl|t\.me)/.test(t)) score += 20;
  return { score: Math.min(100, score), hits: [...new Set(hits)] };
}

/* -------------------------------------------------------------------------- */
/* Back-test the bet — using REAL history                                      */
/* -------------------------------------------------------------------------- */
function nearestPriceAt(history, targetMs) {
  let best = null, bestDiff = Infinity;
  for (const p of history) {
    const d = Math.abs(p.t - targetMs);
    if (d < bestDiff) { bestDiff = d; best = p; }
  }
  return best;
}

/* -------------------------------------------------------------------------- */
/* Possibility cone — statistical projection from real volatility             */
/* Clearly an illustration of *possibilities*, not a prediction.              */
/* -------------------------------------------------------------------------- */
function projectCone(history, horizonDays = 60, steps = 12) {
  const prices = history.map(p => p.price).filter(Boolean);
  if (prices.length < 5) return null;
  const rets = [];
  for (let i = 1; i < prices.length; i++) rets.push(Math.log(prices[i] / prices[i - 1]));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  const std = Math.sqrt(variance);
  const last = prices[prices.length - 1];
  const lastT = history[history.length - 1].t;
  const dayMs = 86400000;
  const paths = { bull: [], base: [], bear: [] };
  for (let s = 1; s <= steps; s++) {
    const h = (horizonDays / steps) * s;
    const drift = mean * h;
    const band = std * Math.sqrt(h);
    const t = lastT + h * dayMs;
    paths.bull.push({ t, price: last * Math.exp(drift + 1.28 * band) });
    paths.base.push({ t, price: last * Math.exp(drift) });
    paths.bear.push({ t, price: last * Math.exp(drift - 1.28 * band) });
  }
  return {
    horizonDays,
    dailyVolPct: +(std * 100).toFixed(2),
    endpoints: {
      bull: paths.bull[paths.bull.length - 1].price,
      base: paths.base[paths.base.length - 1].price,
      bear: paths.bear[paths.bear.length - 1].price,
    },
    paths,
  };
}

/* -------------------------------------------------------------------------- */
/* Upcoming catalyst dates we CAN compute honestly                             */
/* -------------------------------------------------------------------------- */
function lastFridayOfMonth(year, month) { // month 0-11
  const d = new Date(Date.UTC(year, month + 1, 0)); // last day
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
function nextMonthlyExpiries(n = 3) {
  const out = [];
  const now = new Date();
  let y = now.getUTCFullYear(), m = now.getUTCMonth();
  while (out.length < n) {
    const d = lastFridayOfMonth(y, m);
    if (d.getTime() > now.getTime()) out.push(d.toISOString().slice(0, 10));
    m++; if (m > 11) { m = 0; y++; }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* API handlers                                                                */
/* -------------------------------------------------------------------------- */
function resolveAsset(symbol) {
  const a = ASSETS[(symbol || 'BTC').toUpperCase()];
  return a ? { symbol: (symbol || 'BTC').toUpperCase(), ...a } : null;
}

const api = {
  async assets() {
    return Object.entries(ASSETS).map(([symbol, a]) => ({ symbol, ...a }));
  },

  async quote(q) {
    const asset = resolveAsset(q.symbol);
    if (!asset) throw httpErr(400, 'Unknown symbol');
    const quote = await getQuote(asset);
    return { asset, quote };
  },

  async history(q) {
    const asset = resolveAsset(q.symbol);
    if (!asset) throw httpErr(400, 'Unknown symbol');
    const days = Math.max(2, Math.min(1825, parseInt(q.days || '365', 10)));
    const history = await getHistory(asset, days);
    return { asset, days, points: history };
  },

  async backtest(q) {
    const asset = resolveAsset(q.symbol);
    if (!asset) throw httpErr(400, 'Unknown symbol');
    const amount = Math.max(0, parseFloat(q.amount || '100'));
    const direction = q.direction === 'short' ? 'short' : 'long';
    const dateStr = q.date;
    if (!dateStr) throw httpErr(400, 'Missing date');
    const targetMs = new Date(dateStr + 'T00:00:00Z').getTime();
    if (isNaN(targetMs)) throw httpErr(400, 'Bad date');

    // pull enough history to cover the chosen date
    const days = Math.min(1825, Math.max(30, Math.ceil((Date.now() - targetMs) / 86400000) + 5));
    const history = await getHistory(asset, days);
    if (!history.length) throw httpErr(502, 'No history available');

    const entry = nearestPriceAt(history, targetMs);
    const exit = history[history.length - 1];
    if (!entry || !exit) throw httpErr(502, 'Could not price the bet');

    // Did the requested date fall before the data we can get for free?
    const clampedDays = Math.round((entry.t - targetMs) / 86400000);
    const clamped = clampedDays > 8; // more than ~a week off = we hit the data floor

    const grossMult = exit.price / entry.price;
    let pnl, finalValue, returnPct;
    if (direction === 'long') {
      finalValue = amount * grossMult;
      pnl = finalValue - amount;
      returnPct = (grossMult - 1) * 100;
    } else {
      // simple short: you profit when price falls, symmetric to entry
      returnPct = (1 - grossMult) * 100;
      pnl = amount * (returnPct / 100);
      finalValue = amount + pnl;
    }
    // A short can lose more than the stake (unlimited risk). For a "for Dummies"
    // tool, flag that so the UI can explain a real wipeout instead of showing
    // a nonsensical negative balance.
    const liquidated = direction === 'short' && returnPct <= -100;

    // Best & worst moment to have exited, direction-aware.
    // Value of the position at any price p:
    //   long  -> amount * (p / entry)   (higher price = better)
    //   short -> amount * (2 - p/entry) (lower price = better)
    const window = history.filter(p => p.t >= entry.t);
    const valAt = p => direction === 'long' ? amount * (p / entry.price) : amount * (2 - p / entry.price);
    let best = window[0], worst = window[0];
    for (const pt of window) {
      if (valAt(pt.price) > valAt(best.price)) best = pt;
      if (valAt(pt.price) < valAt(worst.price)) worst = pt;
    }

    return {
      asset, direction, amount, liquidated,
      requestedDate: dateStr,
      clamped, clampedNote: clamped
        ? `Free ${asset.type} data only reaches back ~${asset.type === 'crypto' ? '1 year' : '5 years'}, so we used the earliest day we had (${new Date(entry.t).toISOString().slice(0, 10)}).`
        : null,
      entry: { date: new Date(entry.t).toISOString().slice(0, 10), price: entry.price },
      exit: { date: new Date(exit.t).toISOString().slice(0, 10), price: exit.price },
      bestExit: { date: new Date(best.t).toISOString().slice(0, 10), price: best.price, value: valAt(best.price) },
      worst: { date: new Date(worst.t).toISOString().slice(0, 10), price: worst.price, value: valAt(worst.price) },
      pnl, finalValue, returnPct,
      series: window.filter((_, i) => i % Math.max(1, Math.floor(window.length / 120)) === 0),
    };
  },

  async forecast(q) {
    const asset = resolveAsset(q.symbol);
    if (!asset) throw httpErr(400, 'Unknown symbol');
    const history = await getHistory(asset, 180);
    const cone = projectCone(history, parseInt(q.horizon || '60', 10));
    const catalysts = [
      ...(CATALYSTS[asset.type] || []),
      ...((CATALYSTS_EXTRA[asset.symbol]) || []),
    ];
    return {
      asset,
      past: history.filter((_, i) => i % 3 === 0),
      cone,
      catalysts,
      computedExpiries: nextMonthlyExpiries(3),
    };
  },

  async forums(q) {
    const asset = resolveAsset(q.symbol);
    if (!asset) throw httpErr(400, 'Unknown symbol');
    // Reddit rate-limits unauthenticated IPs hard, so keep it to 2 subs,
    // cache each feed for 10 min, and stagger requests a little.
    const subs = [...new Set(asset.type === 'crypto'
      ? ['CryptoCurrency', asset.name.replace(/\s/g, '')]
      : ['stocks', 'wallstreetbets'])];
    let posts = [];
    let rateLimited = false;
    for (const sub of subs) {
      try {
        const xml = await fetchText(`https://www.reddit.com/r/${sub}/hot.rss?limit=25`, 10 * 60000);
        const items = parseFeed(xml).map(it => ({ ...it, sub }));
        posts.push(...items);
      } catch (e) {
        if (/429/.test(e.message)) rateLimited = true;
      }
      await sleep(350);
    }
    // keyword filter so results relate to the asset
    const key = asset.name.toLowerCase().split(' ')[0];
    const alt = asset.symbol.toLowerCase();
    const relevant = posts.filter(p => {
      const t = (p.title + ' ' + p.summary).toLowerCase();
      return t.includes(key) || t.includes(alt) || asset.type === 'crypto';
    });
    const use = (relevant.length ? relevant : posts).slice(0, 60);

    const themes = wordFreq(use.map(p => p.title), 30);
    const scored = use.map(p => {
      const s = scamScore(p.title + ' ' + p.summary);
      return { title: p.title, link: p.link, sub: p.sub, date: p.date, scam: s };
    });
    const flagged = scored.filter(p => p.scam.score >= 22).sort((a, b) => b.scam.score - a.scam.score);
    return {
      asset,
      scanned: use.length,
      subs,
      rateLimited: use.length === 0 && rateLimited,
      note: use.length === 0
        ? (rateLimited ? 'Reddit is rate-limiting us right now — give it a minute and refresh.' : 'No matching forum posts found right now.')
        : null,
      themes,
      posts: scored.slice(0, 30),
      flagged: flagged.slice(0, 15),
    };
  },

  async news(q) {
    const asset = resolveAsset(q.symbol);
    if (!asset) throw httpErr(400, 'Unknown symbol');
    const regions = [
      { code: 'US', flag: '🇺🇸', gl: 'US', hl: 'en-US', ceid: 'US:en' },
      { code: 'GB', flag: '🇬🇧', gl: 'GB', hl: 'en-GB', ceid: 'GB:en' },
      { code: 'IN', flag: '🇮🇳', gl: 'IN', hl: 'en-IN', ceid: 'IN:en' },
      { code: 'JP', flag: '🇯🇵', gl: 'JP', hl: 'en-JP', ceid: 'JP:en' },
    ];
    const clouds = [];
    for (const r of regions) {
      try {
        const u = `https://news.google.com/rss/search?q=${encodeURIComponent(asset.query)}&hl=${r.hl}&gl=${r.gl}&ceid=${r.ceid}`;
        const xml = await fetchText(u, 5 * 60000);
        const items = parseFeed(xml).slice(0, 25);
        clouds.push({
          region: r.code, flag: r.flag,
          cloud: wordFreq(items.map(i => i.title), 24),
          headlines: items.slice(0, 8).map(i => ({ title: i.title, link: i.link, date: i.date, source: i.source })),
        });
      } catch (e) { /* region can fail */ }
    }
    return { asset, clouds };
  },

  // Profile the OUTLETS behind the coverage: their recent tone, a track-record
  // proxy (did their tone match what price actually did?), and any known lean.
  async pundits(q) {
    const asset = resolveAsset(q.symbol);
    if (!asset) throw httpErr(400, 'Unknown symbol');

    // recent real price move, to sanity-check each outlet's tone against reality
    let realChangePct = null, windowDays = 30;
    try {
      const hist = await getHistory(asset, 35);
      if (hist.length > 2) {
        const last = hist[hist.length - 1].price;
        const past = hist[Math.max(0, hist.length - windowDays)].price;
        realChangePct = ((last - past) / past) * 100;
      }
    } catch (e) { /* fine, we just won't show the reality check */ }

    // gather headlines from a couple of regions
    const feeds = [
      `https://news.google.com/rss/search?q=${encodeURIComponent(asset.query)}&hl=en-US&gl=US&ceid=US:en`,
      `https://news.google.com/rss/search?q=${encodeURIComponent(asset.query)}&hl=en-GB&gl=GB&ceid=GB:en`,
    ];
    const items = [];
    for (const u of feeds) {
      try { items.push(...parseFeed(await fetchText(u, 5 * 60000)).slice(0, 30)); }
      catch (e) { /* one feed failing is fine */ }
    }

    // aggregate by outlet
    const bySource = new Map();
    for (const it of items) {
      const src = (it.source || sourceFromTitle(it.title) || 'Unknown').trim();
      if (!src || src.toLowerCase() === 'unknown') continue;
      if (!bySource.has(src)) bySource.set(src, { source: src, count: 0, bull: 0, bear: 0, headlines: [] });
      const rec = bySource.get(src);
      const t = toneScore(it.title);
      rec.count++; rec.bull += t.bull; rec.bear += t.bear;
      if (rec.headlines.length < 3) rec.headlines.push({ title: it.title, link: it.link, tone: t.net });
    }

    const realUp = realChangePct != null ? realChangePct >= 0 : null;
    const pundits = [...bySource.values()]
      .filter(r => r.count >= 1)
      .map(r => {
        const tone = labelTone(r.bull - r.bear, r.count);
        const bias = biasFor(r.source);
        // track-record proxy: did their leaning match reality this window?
        let reality = null;
        if (realUp != null && tone !== 'mixed') {
          const bullish = tone === 'bullish';
          reality = (bullish === realUp)
            ? { verdict: 'in-tune', text: `Leaned ${tone} and price went ${realUp ? 'up' : 'down'} ~${Math.abs(realChangePct).toFixed(0)}% — in tune with the tape (last ${windowDays}d).` }
            : { verdict: 'off', text: `Leaned ${tone} but price went ${realUp ? 'up' : 'down'} ~${Math.abs(realChangePct).toFixed(0)}% — against the tape (last ${windowDays}d).` };
        }
        return { source: r.source, count: r.count, tone, bull: r.bull, bear: r.bear, bias, reality, headlines: r.headlines };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return { asset, windowDays, realChangePct, pundits };
  },

  // The game-view data: trees (assets, growth sparkline + a news-driven future
  // forecast) + families + news clouds annotated with impact analysis.
  async forest() {
    const cached = cacheGet('forest:v1');
    if (cached) return cached;

    // Trees: one history call each; derive current price + daily change + spark.
    const syms = Object.keys(ASSETS);
    const trees = await Promise.all(syms.map(async sym => {
      const asset = resolveAsset(sym);
      let price = null, change = null, spark = [];
      try {
        const h = await getHistory(asset, 90);
        if (h.length) {
          price = h[h.length - 1].price;
          const prev = h[h.length - 2]?.price;
          change = prev ? ((price - prev) / prev) * 100 : null;
          const step = Math.max(1, Math.floor(h.length / 40));
          spark = h.filter((_, i) => i % step === 0).map(p => ({ t: p.t, price: p.price }));
          const lastH = h[h.length - 1];
          if (spark[spark.length - 1]?.t !== lastH.t) spark.push({ t: lastH.t, price: lastH.price });
        }
      } catch (e) { /* tree still shows, just no growth/forecast */ }
      return { symbol: sym, name: asset.name, emoji: asset.emoji, char: asset.char, type: asset.type, family: asset.family, price, change, spark };
    }));

    // Broad, multi-angle news to fill the sky with clouds (covers all families).
    const queries = [
      'stock market OR nasdaq OR dow jones OR federal reserve',
      'bitcoin OR crypto OR ethereum',
      'trump economy OR tariffs OR election markets',
      'gold price OR oil price OR OPEC OR commodities',
      'turkish lira OR euro dollar OR ruble OR emerging markets OR treasury yields',
    ];
    const items = [];
    for (const q of queries) {
      try {
        const u = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
        items.push(...parseFeed(await fetchText(u, 5 * 60000)).slice(0, 15));
      } catch (e) { /* one query failing is fine */ }
    }

    const seen = new Set();
    const clouds = [];
    for (const it of items) {
      const key = (it.title || '').slice(0, 60).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const a = analyzeHeadline(it.title);
      if (!a.impacts.length && !a.political && !a.topics.length) continue;
      clouds.push({
        title: it.title, link: it.link, source: it.source || sourceFromTitle(it.title) || 'news',
        topics: a.topics, impacts: a.impacts, broad: a.broad, political: a.political, note: a.note, tone: a.tone,
      });
    }

    // --- News "climate" per tree: net *specific* pressure from clouds, plus a
    // single market-wide "broad mood" applied once (so one risk-off day doesn't
    // flatten every tree to the same storm). --------------------------------
    const climate = {};   // specific impacts only
    const drivers = {};
    for (const c of clouds) {
      for (const im of c.impacts) {
        climate[im.symbol] = (climate[im.symbol] || 0) + im.dir;
        (drivers[im.symbol] = drivers[im.symbol] || []).push({ dir: im.dir, why: im.why, topic: c.topics[0] || '', title: c.title });
      }
    }
    const broadMood = clouds.length ? clouds.reduce((a, c) => a + (c.broad || 0), 0) / clouds.length : 0;

    // --- Forecast per tree: momentum + news climate + volatility cone. --------
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const tanh = x => Math.tanh(x);
    for (const t of trees) {
      const prices = (t.spark || []).map(p => p.price).filter(Boolean);
      if (prices.length < 4) { t.forecast = null; continue; }
      const rets = [];
      for (let i = 1; i < prices.length; i++) rets.push(Math.log(prices[i] / prices[i - 1]));
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const varr = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
      const sigmaStep = Math.sqrt(varr);
      const stepDays = 90 / Math.max(1, prices.length - 1);
      const dailyVol = sigmaStep / Math.sqrt(Math.max(1, stepDays));
      const H = 30;
      const band = dailyVol * Math.sqrt(H);                        // 1σ over 30d (log)
      const last = prices[prices.length - 1];
      const wk = prices[Math.max(0, prices.length - 5)];
      const momentum = wk ? (last / wk - 1) : 0;                   // recent trend
      const specific = climate[t.symbol] || 0;
      const newsPressure = clamp(specific / 4 + broadMood * 0.6, -1.2, 1.2);
      const outlook = clamp(tanh(newsPressure * 1.0 + momentum * 2.0), -1, 1);
      const drift = outlook * band * 0.8;
      const pctOf = x => +((Math.exp(x) - 1) * 100).toFixed(1);
      const weather = outlook > 0.45 ? '☀️' : outlook > 0.15 ? '🌤️' : outlook > -0.15 ? '⛅' : outlook > -0.45 ? '🌧️' : '⛈️';
      const ds = (drivers[t.symbol] || []);
      const topDrivers = [...new Map(ds.map(d => [d.why, d])).values()]
        .sort((a, b) => Math.abs(b.dir) - Math.abs(a.dir)).slice(0, 3)
        .map(d => ({ dir: d.dir, why: d.why, topic: d.topic }));
      t.forecast = {
        outlook: +outlook.toFixed(2), weather, horizonDays: H,
        base: pctOf(drift), low: pctOf(drift - band), high: pctOf(drift + band),
        newsScore: +(climate[t.symbol] || 0).toFixed(1),
        drivers: topDrivers,
      };
    }

    // Landmarks: topics that dominate the sky become forest landmarks.
    const topicCount = {};
    for (const c of clouds) for (const t of c.topics) topicCount[t] = (topicCount[t] || 0) + 1;
    const landmarks = [];
    if ((topicCount['Politics 🏛️'] || 0) >= 2) landmarks.push({ id: 'trump-tower', emoji: '🏛️', label: 'Politics Tower', count: topicCount['Politics 🏛️'] });
    if ((topicCount['AI boom 🤖'] || 0) >= 2) landmarks.push({ id: 'ai-lab', emoji: '🤖', label: 'AI Lab', count: topicCount['AI boom 🤖'] });
    if ((topicCount['Geopolitics 💥'] || 0) >= 2) landmarks.push({ id: 'storm', emoji: '⛈️', label: 'Geopolitics Storm', count: topicCount['Geopolitics 💥'] });
    if ((topicCount['Oil supply ⛽'] || 0) >= 2) landmarks.push({ id: 'rig', emoji: '🛢️', label: 'Oil Derrick', count: topicCount['Oil supply ⛽'] });

    const result = { families: FAMILIES, trees, clouds: clouds.slice(0, 44), landmarks, topicCount };
    cacheSet('forest:v1', result, 120000);
    return result;
  },
};

function httpErr(status, msg) { const e = new Error(msg); e.status = status; return e; }

/* -------------------------------------------------------------------------- */
/* HTTP server: static files + /api/*                                          */
/* -------------------------------------------------------------------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.png': 'image/png' };

function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  // basic hardening headers for every response
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const url = new URL(req.url, 'http://x');

    // health check for hosting platforms
    if (url.pathname === '/healthz' || url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    }

    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5);
      const q = Object.fromEntries(url.searchParams);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=30');
      if (!api[name]) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'no such endpoint' })); }
      const lgKey = 'lastgood:' + url.pathname + '?' + url.searchParams.toString();
      try {
        const data = await api[name](q);
        cacheSet(lgKey, data, 60 * 60000); // remember the last good answer for 1h
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e) {
        // If an upstream throttled/failed but we served this successfully before,
        // return the last-known-good data instead of an error — keeps the UI alive.
        const lastGood = cacheGet(lgKey);
        if (lastGood) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ...lastGood, _stale: true }));
        }
        const status = e.status || 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || 'upstream error' }));
      }
      return;
    }
    serveStatic(req, res);
  } catch (e) {
    // never let a single bad request take down the process
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'server error' }));
  }
});

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`\n  ⏳  HINDSIGHT — the market time machine`);
  console.log(`  ▶  listening on http://${HOST}:${PORT}  (open http://localhost:${PORT})\n`);
  console.log(`  Live data: CoinGecko · Yahoo Finance · Reddit · Google News`);
  console.log(`  For fun & learning only. Not financial advice.\n`);
});

// Keep the server alive through transient errors; shut down cleanly on host signals.
process.on('unhandledRejection', err => console.error('unhandledRejection:', err?.message || err));
process.on('uncaughtException', err => console.error('uncaughtException:', err?.message || err));
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => { console.log(`\n${sig} received — shutting down.`); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000); });
}
