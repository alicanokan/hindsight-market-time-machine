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
  // Construction Yard
  CAT:  { name: 'Caterpillar', type: 'stock', id: 'CAT',    query: 'caterpillar construction stock', emoji: '🏗️', char: '🏗️', family: 'industry', color: '#ffcd11' },
  // Green Grove
  ICLN: { name: 'Clean Energy', type: 'stock', id: 'ICLN',  query: 'clean energy renewable stocks', emoji: '♻️', char: '♻️', family: 'green', color: '#2ecc71' },
  ENPH: { name: 'Enphase Solar', type: 'stock', id: 'ENPH', query: 'enphase solar stock', emoji: '🔆', char: '🔆', family: 'green', color: '#f39c12' },
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
  industry:    { label: 'Construction Yard', emoji: '🏗️', blurb: 'Builders & heavy machines' },
  green:       { label: 'Green Grove',      emoji: '♻️', blurb: 'Solar & clean energy' },
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
// For DEEP past (time-machine bets in 2012 etc.) we switch to Yahoo Finance,
// which carries BTC-USD back to Sep 2014 for free — and before that, a table
// of well-documented monthly BTC prices (log-interpolated to weekly points).
const CRYPTO_MAX_DAYS = 365;
const YAHOO_CRYPTO = { BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', DOGE: 'DOGE-USD' };

// Bitcoin's documented early history (month-start USD, 2010-07 → 2014-09,
// approximate — from public historical price records).
const BTC_EARLY_ANCHORS = [
  ['2010-07', 0.05], ['2010-08', 0.06], ['2010-09', 0.06], ['2010-10', 0.06], ['2010-11', 0.29], ['2010-12', 0.25],
  ['2011-01', 0.30], ['2011-02', 0.70], ['2011-03', 0.90], ['2011-04', 0.78], ['2011-05', 3.50], ['2011-06', 9.60],
  ['2011-07', 15.40], ['2011-08', 11.00], ['2011-09', 8.20], ['2011-10', 4.90], ['2011-11', 3.20], ['2011-12', 3.00],
  ['2012-01', 5.28], ['2012-02', 5.90], ['2012-03', 4.90], ['2012-04', 4.90], ['2012-05', 5.10], ['2012-06', 5.30],
  ['2012-07', 6.70], ['2012-08', 9.40], ['2012-09', 10.20], ['2012-10', 12.40], ['2012-11', 10.90], ['2012-12', 12.60],
  ['2013-01', 13.30], ['2013-02', 20.40], ['2013-03', 34.50], ['2013-04', 104], ['2013-05', 116], ['2013-06', 129],
  ['2013-07', 88], ['2013-08', 104], ['2013-09', 141], ['2013-10', 132], ['2013-11', 213], ['2013-12', 946],
  ['2014-01', 754], ['2014-02', 800], ['2014-03', 565], ['2014-04', 458], ['2014-05', 446], ['2014-06', 627],
  ['2014-07', 641], ['2014-08', 589], ['2014-09', 478],
];
// Expand the monthly anchors to weekly points (log-interpolated) once at boot.
const BTC_EARLY = (() => {
  const out = [];
  for (let i = 0; i < BTC_EARLY_ANCHORS.length - 1; i++) {
    const [m0, p0] = BTC_EARLY_ANCHORS[i], [m1, p1] = BTC_EARLY_ANCHORS[i + 1];
    const t0 = new Date(m0 + '-01T00:00:00Z').getTime(), t1 = new Date(m1 + '-01T00:00:00Z').getTime();
    for (let t = t0; t < t1; t += 7 * 86400000) {
      const k = (t - t0) / (t1 - t0);
      out.push({ t, price: +(Math.exp(Math.log(p0) + k * (Math.log(p1) - Math.log(p0)))).toFixed(4), approx: true });
    }
  }
  return out;
})();
const BTC_EARLY_END = BTC_EARLY[BTC_EARLY.length - 1].t;

// Deep-history fetch via Yahoo (crypto only). Falls back to null on failure.
async function getDeepCryptoHistory(asset, days) {
  const yid = YAHOO_CRYPTO[asset.symbol];
  if (!yid) return null;
  try {
    const range = days <= 730 ? '2y' : days <= 1825 ? '5y' : days <= 3650 ? '10y' : 'max';
    const interval = range === 'max' ? '1wk' : '1d'; // Yahoo degrades range=max silently — ask for weekly explicitly
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${yid}?range=${range}&interval=${interval}`;
    const j = await fetchJSON(u, 30 * 60000);
    const r = j.chart?.result?.[0];
    const ts = r?.timestamp || [];
    const closes = r?.indicators?.quote?.[0]?.close || [];
    const pts = [];
    for (let i = 0; i < ts.length; i++) if (closes[i] != null) pts.push({ t: ts[i] * 1000, price: closes[i] });
    if (!pts.length) return null;
    // Before Yahoo's coverage begins, splice in the documented early-BTC record.
    if (asset.symbol === 'BTC' && days * 86400000 > Date.now() - BTC_EARLY_END) {
      const yahooStart = pts[0].t;
      return [...BTC_EARLY.filter(p => p.t < yahooStart), ...pts];
    }
    return pts;
  } catch (e) { return null; }
}

async function getHistory(asset, days = 365) {
  if (asset.type === 'crypto') {
    // deep past requested? Yahoo reaches years further back than CoinGecko free
    if (days > CRYPTO_MAX_DAYS) {
      const deep = await getDeepCryptoHistory(asset, days);
      if (deep && deep.length) {
        const cutoff = Date.now() - days * 86400000;
        return maybeInvert(asset, deep.filter(p => p.t >= cutoff));
      }
    }
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
      : days <= 365 ? '1y' : days <= 730 ? '2y' : days <= 1825 ? '5y' : days <= 3650 ? '10y' : 'max';
    const interval = range === 'max' ? '1wk' : '1d';
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.id)}?range=${range}&interval=${interval}`;
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
  { re: /\binfrastructure (bill|spending|plan|package)|construction (boom|spending|surge)|housing starts\b/i, topic: 'Construction 🏗️', effects: [['CAT', 1, 'more building = more heavy machines sold']] },
  { re: /\bsolar|renewabl|clean energy|green energy|climate (bill|deal|policy|summit)\b/i, topic: 'Green energy ☀️', effects: [['ICLN', 1, 'policy & demand tailwind for clean energy'], ['ENPH', 1, 'solar demand rising']] },
  { re: /\brall(y|ies)|surge|soar|record high|all-time high|rockets?|rebound|recover|bounc/i, topic: 'Momentum 📈', mentioned: 1, mentionedWhy: 'strong upward momentum' },
  { re: /\bcrash|plunge|selloff|sell-off|tumble|collapse|bloodbath|slide[sd]?|slip(s|ped)?|sink(s|ing)?|slump|dive[sd]?\b/i, topic: 'Selloff 📉', mentioned: -1, mentionedWhy: 'sharp price drop / fear' },
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
  CAT: ['caterpillar'],
  ICLN: ['clean energy', 'renewable'],
  ENPH: ['enphase', 'solar'],
};

// Which of our named assets does a headline mention, and WHERE?
// Names/aliases match case-insensitively; ticker symbols match CASE-SENSITIVELY
// on the raw text, otherwise common words hijack tickers ("try" -> TRY lira,
// "rub" -> RUB ruble, "sol" -> SOL). Positions feed the attribution check.
function findMentions(text) {
  const raw = text || '';
  const t = raw.toLowerCase();
  const out = [];
  for (const [sym, a] of Object.entries(ASSETS)) {
    let idx = t.indexOf(a.name.toLowerCase());
    if (idx < 0) { const m = raw.match(new RegExp(`\\b${sym}\\b`)); if (m) idx = m.index; }
    if (idx < 0) for (const w of (ASSET_ALIASES[sym] || [])) { const i = t.indexOf(w); if (i >= 0) { idx = i; break; } }
    if (idx >= 0) out.push({ sym, idx });
  }
  return out;
}
function detectAssets(text) { return findMentions(text).map(m => m.sym); }

// "won't crash" / "denies fraud" should not read as crash/fraud.
function isNegated(text, idx) {
  return /\b(not|no|never|won'?t|isn'?t|doesn'?t|denies|deny|denied|unlikely|avoid\w*|without)\b[^.]{0,12}$/i
    .test(text.slice(Math.max(0, idx - 26), idx));
}

// Read one headline → { topics, impacts:[{symbol,dir,why}], broad, political }
function analyzeHeadline(title) {
  const mentionsPos = findMentions(title);
  const mentioned = mentionsPos.map(m => m.sym);
  const topics = [], raw = [], notes = [];
  let broad = 0, political = false;
  for (const rule of IMPACT_RULES) {
    const m = title.match(rule.re);
    if (!m) continue;
    topics.push(rule.topic);
    if (rule.broad) broad += rule.broad;
    if (rule.political) political = true;
    if (rule.note) notes.push(rule.note);
    if (rule.effects) for (const [symbol, dir, why] of rule.effects) raw.push({ symbol, dir, why });
    if (rule.mentioned && !isNegated(title, m.index)) {
      // Attribution: momentum/selloff verbs apply to the asset they follow
      // ("lira slides…") — a mention just before the keyword, not any mention
      // anywhere in the headline ("…as inflation surges" must not hit the lira).
      for (const mp of mentionsPos) {
        const gap = m.index - mp.idx;
        if (gap > 0 && gap <= 24) raw.push({ symbol: mp.sym, dir: rule.mentioned, why: rule.mentionedWhy });
      }
    }
  }
  // If nothing matched but an asset is named, fall back to headline tone —
  // unless the headline contains a negation ("won't crash"), which flips
  // meaning in ways a bag-of-words read can't see. Then better to stay quiet.
  const hasNegation = /(?:won'?t|\bnot\b|\bnever\b|\bno\b|denies|denied?|unlikely)/i.test(title);
  if (!raw.length && mentioned.length && !hasNegation) {
    const t = toneScore(title).net;
    if (t !== 0) for (const symbol of mentioned) raw.push({ symbol, dir: Math.sign(t), why: 'overall ' + (t > 0 ? 'positive' : 'negative') + ' coverage' });
  }
  // Merge by symbol.
  const map = new Map();
  for (const im of raw) {
    if (!map.has(im.symbol)) map.set(im.symbol, { symbol: im.symbol, score: 0, whys: [] });
    const e = map.get(im.symbol); e.score += im.dir; if (im.why) e.whys.push(im.why);
  }
  const impacts = [...map.values()]
    .map(e => ({ symbol: e.symbol, dir: Math.sign(e.score), why: [...new Set(e.whys)].join('; ') }))
    .filter(e => e.dir !== 0); // opposing rules cancel out -> no net effect, drop the noise
  return { mentioned, topics: [...new Set(topics)], impacts, broad: Math.sign(broad), political,
           note: notes.length ? [...new Set(notes)].join(' · ') : null };
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
/* Realism, in order of what usually goes wrong with naive cones:
   - step size read from timestamps (no "one point = one day" guess)
   - EWMA volatility (RiskMetrics λ=0.94/day) — recent storms weigh more
   - drift shrunk 75% toward zero — extrapolating 6 months of trend is
     how forecasts lie; the honest base case is "roughly sideways"
   - lognormal drift correction (−σ²/2) so the median is a real median
   - fat tails: outer band stretched by the sample's excess kurtosis
   - a quantile FAN (5/25/50/75/95%) instead of one ±1.28σ wedge
   - bootstrap sample futures: the asset's own past returns resampled,
     so the wiggles look like THIS asset — jumps and all               */
function projectCone(history, horizonDays = 60, steps = 24) {
  const pts = history.filter(p => p && p.price);
  if (pts.length < 10) return null;
  const dayMs = 86400000;
  const stepDays = Math.max(1 / 24, (pts[pts.length - 1].t - pts[0].t) / ((pts.length - 1) * dayMs));
  const rets = [];
  for (let i = 1; i < pts.length; i++) rets.push(Math.log(pts[i].price / pts[i - 1].price));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;

  const lambda = Math.pow(0.94, stepDays);
  let ewVar = rets[0] ** 2;
  for (let i = 1; i < rets.length; i++) ewVar = lambda * ewVar + (1 - lambda) * rets[i] ** 2;
  const dailyVol = Math.sqrt(ewVar / stepDays);

  const varSimple = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length || 1e-12;
  const kurt = rets.reduce((a, b) => a + (b - mean) ** 4, 0) / (rets.length * varSimple ** 2) - 3;
  const tailStretch = Math.min(1.35, Math.max(1, 1 + kurt / 24));

  const dailyDrift = (mean / stepDays) * 0.25;
  const last = pts[pts.length - 1].price;
  const lastT = pts[pts.length - 1].t;

  const zOuter = 1.645 * tailStretch, zInner = 0.674;
  const bands = { p95: [], p75: [], p50: [], p25: [], p05: [] };
  for (let s = 1; s <= steps; s++) {
    const h = (horizonDays / steps) * s;
    const drift = (dailyDrift - dailyVol ** 2 / 2) * h;
    const sd = dailyVol * Math.sqrt(h);
    const t = lastT + h * dayMs;
    bands.p95.push({ t, price: last * Math.exp(drift + zOuter * sd) });
    bands.p75.push({ t, price: last * Math.exp(drift + zInner * sd) });
    bands.p50.push({ t, price: last * Math.exp(drift) });
    bands.p25.push({ t, price: last * Math.exp(drift - zInner * sd) });
    bands.p05.push({ t, price: last * Math.exp(drift - zOuter * sd) });
  }

  const samples = [];
  const nSteps = 60, dt = horizonDays / nSteps, scale = Math.sqrt(dt / stepDays);
  for (let k = 0; k < 5; k++) {
    let p = last;
    const path = [];
    for (let s = 1; s <= nSteps; s++) {
      const r = rets[Math.floor(Math.random() * rets.length)];
      p *= Math.exp((r - mean) * scale + dailyDrift * dt);
      path.push({ t: lastT + s * dt * dayMs, price: p });
    }
    samples.push(path);
  }

  return {
    horizonDays,
    dailyVolPct: +(dailyVol * 100).toFixed(2),
    annualVolPct: +(dailyVol * Math.sqrt(365) * 100).toFixed(0),
    tailNote: kurt > 1 ? 'fat-tailed asset — outer band stretched to match its jump history' : null,
    endpoints: {
      bull: bands.p95[bands.p95.length - 1].price,
      base: bands.p50[bands.p50.length - 1].price,
      bear: bands.p05[bands.p05.length - 1].price,
    },
    // legacy triple kept so older clients keep working
    paths: { bull: bands.p95, base: bands.p50, bear: bands.p05 },
    bands,
    samples,
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
    const days = Math.max(2, Math.min(6500, parseInt(q.days || '365', 10)));
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

    // pull enough history to cover the chosen date (BTC reaches back to 2010)
    const days = Math.min(6500, Math.max(30, Math.ceil((Date.now() - targetMs) / 86400000) + 5));
    const history = await getHistory(asset, days);
    if (!history.length) throw httpErr(502, 'No history available');

    const entry = nearestPriceAt(history, targetMs);
    const exit = history[history.length - 1];
    if (!entry || !exit) throw httpErr(502, 'Could not price the bet');

    // Did the requested date fall before the data we can get for free?
    const clampedDays = Math.round((entry.t - targetMs) / 86400000);
    const clamped = clampedDays > 8; // more than ~a week off = we hit the data floor
    const approx = !!entry.approx; // pre-2014 BTC uses the documented monthly record

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
        ? `Free data for ${asset.name} only reaches back to ${new Date(history[0].t).toISOString().slice(0, 10)}, so we used the earliest day we had (${new Date(entry.t).toISOString().slice(0, 10)}).`
        : null,
      approx, approxNote: approx
        ? 'Entry price comes from Bitcoin\'s documented early history (pre-Sep-2014) — monthly records, so it\'s approximate within the month.'
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
      { code: 'TR', flag: '🇹🇷', gl: 'TR', hl: 'tr', ceid: 'TR:tr' },
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
      'clean energy OR solar stocks OR infrastructure construction spending',
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
        // learned weights: topics/assets the engine has verified get more say
        const w = topicW(c.topics[0] || '') * symbolW(im.symbol);
        climate[im.symbol] = (climate[im.symbol] || 0) + im.dir * w;
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
      const outlook = clamp(tanh(newsPressure * 1.0 + momentum * 2.0 * momentumW()), -1, 1);
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

    // Daily story recap + storm level (darkens the sky when geopolitics piles up).
    const ranked = trees.filter(t => t.forecast).sort((a, b) => b.forecast.outlook - a.forecast.outlook);
    const sunny = ranked[0], stormy = ranked[ranked.length - 1];
    const topTopics = Object.entries(topicCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const stormLevel = (broadMood < -0.15 ? 1 : 0) + ((topicCount['Geopolitics 💥'] || 0) >= 3 ? 1 : 0);
    const story = {
      headline: topTopics.length ? `Today's weather is made of: ${topTopics.map(([t, c]) => `${t} ×${c}`).join(' · ')}` : 'A quiet day in the forest.',
      lines: [
        sunny ? `${sunny.char} ${sunny.name} gets the best weather ${sunny.forecast.weather} (leaning ${sunny.forecast.base > 0 ? '+' : ''}${sunny.forecast.base}%)` : null,
        stormy && stormy !== sunny ? `${stormy.char} ${stormy.name} braces for the worst ${stormy.forecast.weather} (${stormy.forecast.base}%)` : null,
        `Forest mood: ${broadMood > 0.05 ? 'risk-on, sun breaking through 🌞' : broadMood < -0.05 ? 'risk-off, clouds gathering 🌧️' : 'mixed skies ⛅'}`,
      ].filter(Boolean),
      stormLevel,
    };

    const result = { families: FAMILIES, trees, clouds: clouds.slice(0, 44), landmarks, topicCount, story,
                     llm: !!process.env.ANTHROPIC_API_KEY };
    cacheSet('forest:v1', result, 120000);
    return result;
  },

  // "What happened after previous clouds like this?" — empirical topic
  // reactions used by the cloud panel as a history reality-check.
  async calibration() {
    return { windowDays: 60, calibration: await topicCalibration() };
  },

  // On-demand AI deep-read of one headline (only called when a cloud is
  // clicked, so cost stays tiny). Requires ANTHROPIC_API_KEY on the server.
  async insight(q) {
    const title = (q.title || '').slice(0, 300).trim();
    if (!title) throw httpErr(400, 'Missing title');
    if (!process.env.ANTHROPIC_API_KEY) {
      return { enabled: false, note: 'AI deep reads are off — set ANTHROPIC_API_KEY on the server to enable them.' };
    }
    try {
      const analysis = await llmInsight(title, q.source);
      if (!analysis) return { enabled: true, error: 'The AI declined this one — rule-based analysis still applies.' };
      return { enabled: true, analysis };
    } catch (e) {
      return { enabled: true, error: 'AI read unavailable right now — rule-based analysis still applies.' };
    }
  },
};

function httpErr(status, msg) { const e = new Error(msg); e.status = status; return e; }

/* -------------------------------------------------------------------------- */
/* Optional LLM deep-read of a headline (enabled by ANTHROPIC_API_KEY).        */
/* Raw HTTP on purpose: this project deploys with zero npm dependencies.      */
/* -------------------------------------------------------------------------- */
async function llmInsight(title, source) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const ck = 'insight:' + title.slice(0, 140).toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return hit;

  const symbols = Object.keys(ASSETS);
  const schema = {
    type: 'object', additionalProperties: false,
    required: ['summary', 'topics', 'impacts', 'watch'],
    properties: {
      summary: { type: 'string', description: 'Two plain-language sentences for a total beginner: what this news means and why it matters.' },
      topics: { type: 'array', items: { type: 'string' }, description: 'Short topic tags, max 3.' },
      impacts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['symbol', 'dir', 'why'], properties: {
        symbol: { type: 'string', enum: symbols },
        dir: { type: 'string', enum: ['up', 'down'] },
        why: { type: 'string', description: 'One beginner-friendly sentence explaining the mechanism.' },
      } } },
      watch: { type: 'string', description: 'One concrete thing a beginner should watch next.' },
    },
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 1200,
      system: 'You analyze one financial news headline for a playful "market forest" game where assets are trees that news clouds water (push up) or poison (push down). Audience: total beginners. Be honest and specific; never invent facts beyond the headline; if the headline plausibly moves none of the tracked assets, return an empty impacts array. This is entertainment/education, not financial advice.',
      messages: [{ role: 'user', content: `Headline: "${title}"${source ? ` (source: ${source})` : ''}.\nTracked assets: ${symbols.map(s => `${s}=${ASSETS[s].name}`).join(', ')}.\nWhich tracked assets does this plausibly push up or down, and why?` }],
      output_config: { format: { type: 'json_schema', schema } },
    }),
  });
  if (!res.ok) throw new Error(`llm upstream ${res.status}`);
  const msg = await res.json();
  if (msg.stop_reason === 'refusal') return null; // safety decline — fall back to rules
  const text = (msg.content || []).find(b => b.type === 'text')?.text || '';
  const out = JSON.parse(text);
  cacheSet(ck, out, 60 * 60000); // an hour — headlines don't change
  return out;
}

/* -------------------------------------------------------------------------- */
/* Cloud calibration — "how did trees react when similar clouds passed?"      */
/* Event study: for each topic, pull dated headlines from the last 60 days,   */
/* find the asset's average move over the 3 days after each event, and use    */
/* that as an empirical reality-check on the rule engine's prediction.        */
/* -------------------------------------------------------------------------- */
const CAL_QUERIES = {
  'Tariffs 🏭': 'tariffs trade war',
  'Rate-cut hopes 🕊️': 'fed rate cut',
  'Rate hikes 🦅': 'fed rate hike hawkish',
  'Inflation 🔥': 'CPI inflation report',
  'Geopolitics 💥': 'war sanctions geopolitical markets',
  'AI boom 🤖': 'AI chips demand',
  'Oil supply ⛽': 'OPEC oil supply',
  'Crackdown 🚫': 'crypto crackdown ban',
  'ETF flows 💰': 'bitcoin etf inflows',
  'Strong dollar 💵': 'dollar strengthens DXY',
};

async function topicCalibration() {
  const cached = cacheGet('calib:v1');
  if (cached) return cached;
  const out = {};
  for (const [topic, q] of Object.entries(CAL_QUERIES)) {
    try {
      const rule = IMPACT_RULES.find(r => r.topic === topic);
      const syms = rule?.effects ? [...new Set(rule.effects.map(e => e[0]))].slice(0, 4) : [];
      if (!syms.length) continue;
      const xml = await fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:60d')}&hl=en-US&gl=US&ceid=US:en`, 30 * 60000);
      const items = parseFeed(xml);
      // distinct event DAYS, old enough to have a 3-day forward window
      const days = [...new Set(items.map(i => { const d = new Date(i.date); return isNaN(d) ? null : d.toISOString().slice(0, 10); }).filter(Boolean))]
        .filter(d => (Date.now() - new Date(d + 'T00:00:00Z').getTime()) > 4 * 86400000)
        .sort().slice(-10);
      if (days.length < 2) continue;
      const reactions = {};
      for (const sym of syms) {
        try {
          const h = await getHistory(resolveAsset(sym), 90);
          const moves = [];
          for (const d of days) {
            const target = new Date(d + 'T00:00:00Z').getTime() + 43200000;
            let idx = -1;
            for (let i = 0; i < h.length; i++) if (h[i].t <= target) idx = i;
            if (idx >= 0 && idx + 3 < h.length) moves.push(((h[idx + 3].price - h[idx].price) / h[idx].price) * 100);
          }
          if (moves.length >= 2) reactions[sym] = +(moves.reduce((a, b) => a + b, 0) / moves.length).toFixed(1);
        } catch (e) { /* one asset failing is fine */ }
      }
      if (Object.keys(reactions).length) out[topic] = { events: days.length, horizonDays: 3, reactions };
    } catch (e) { /* one topic failing is fine */ }
  }
  cacheSet('calib:v1', out, 30 * 60000);
  return out;
}

/* ============================================================================ */
/* 🎓 SPECULATION ENGINE — a self-training prediction ledger                    */
/*                                                                              */
/* Loop: every ~6h the engine snapshots its news-driven forecast for EVERY      */
/* asset at 1/3/5/10-day horizons (a "guess"). When a guess comes due, it is    */
/* scored against the REAL price. Every hit/miss nudges the weights of the      */
/* news topics, assets and momentum signal that produced it — so tomorrow's     */
/* forecasts lean harder on what has actually worked. All of it is persisted    */
/* to disk and exposed at /api/training for the scoreboard.                     */
/*                                                                              */
/* Honesty contract: direction accuracy ~55-60% would already be exceptional;   */
/* the scoreboard always shows the coin-flip and always-up baselines so skill   */
/* can't be faked by a bull market.                                             */
/* ============================================================================ */
const ENGINE_DIR = path.join(__dirname, 'data');
const ENGINE_FILE = path.join(ENGINE_DIR, 'engine.json');
const ENGINE_HORIZONS = [1, 3, 5, 10];
const BATCH_EVERY = 6 * 3600000; // one guess batch per ~6h (4/day)

function engineDefaults() {
  return { startedAt: null, lastBatchTs: 0, preds: [], daily: {},
           weights: { topics: {}, symbols: {}, momentum: 1 } };
}
function loadEngine() {
  try {
    const j = JSON.parse(fs.readFileSync(ENGINE_FILE, 'utf8'));
    return Object.assign(engineDefaults(), j, { weights: Object.assign(engineDefaults().weights, j.weights) });
  } catch (e) { return engineDefaults(); }
}
const ENGINE = loadEngine();

let engineSaveTimer = null;
function saveEngine() {
  if (engineSaveTimer) return;
  engineSaveTimer = setTimeout(() => {
    engineSaveTimer = null;
    try {
      fs.mkdirSync(ENGINE_DIR, { recursive: true });
      fs.writeFileSync(ENGINE_FILE, JSON.stringify(ENGINE));
    } catch (e) { console.error('engine save failed:', e.message); }
  }, 800);
}

const clampW = w => Math.max(0.3, Math.min(2.5, w));
function topicW(topic) { return topic ? (ENGINE.weights.topics[topic] ?? 1) : 1; }
function symbolW(sym) { return ENGINE.weights.symbols[sym] ?? 1; }
function momentumW() { return ENGINE.weights.momentum; }

/* Record a fresh batch of guesses from the live forest forecast. */
let engineBatching = false;
async function ensurePredictionBatch() {
  if (engineBatching || Date.now() - ENGINE.lastBatchTs < BATCH_EVERY) return;
  engineBatching = true;
  try {
    const f = await api.forest();
    const ts = Date.now();
    let made = 0;
    for (const t of f.trees) {
      const fc = t.forecast;
      if (!fc || t.price == null) continue;
      if (Math.abs(fc.outlook) < 0.08) continue; // no conviction → no guess to grade
      const dir = fc.outlook > 0 ? 1 : -1;
      const topics = [...new Set((fc.drivers || []).map(d => d.topic).filter(Boolean))];
      const sp = (t.spark || []).map(p => p.price).filter(Boolean);
      const momo = sp.length >= 6 ? Math.sign(sp[sp.length - 1] - sp[sp.length - 6]) : 0;
      for (const hz of ENGINE_HORIZONS) {
        ENGINE.preds.push({
          id: `${ts}:${t.symbol}:${hz}`,
          ts, symbol: t.symbol, entry: t.price, hz, due: ts + hz * 86400000,
          dir, move: +(fc.base * Math.sqrt(hz / fc.horizonDays)).toFixed(2),
          conf: +Math.abs(fc.outlook).toFixed(2), topics, momo,
          status: 'pending',
        });
        made++;
      }
    }
    if (made) {
      ENGINE.lastBatchTs = ts;
      if (!ENGINE.startedAt) ENGINE.startedAt = ts;
      // ledger cap: keep all pending + the freshest 4000 graded ones
      if (ENGINE.preds.length > 6000) {
        const pending = ENGINE.preds.filter(p => p.status === 'pending');
        const doneOnes = ENGINE.preds.filter(p => p.status !== 'pending').slice(-4000);
        ENGINE.preds = [...doneOnes, ...pending];
      }
      saveEngine();
      console.log(`🎓 engine: recorded ${made} guesses (${new Date(ts).toISOString()})`);
    }
  } catch (e) { /* upstream nap — next nudge retries */ }
  finally { engineBatching = false; }
}

/* Grade every due guess against the real price, then LEARN from it. */
let engineEvaluating = false;
async function evaluateDue() {
  if (engineEvaluating) return;
  engineEvaluating = true;
  try {
    const due = ENGINE.preds.filter(p => p.status === 'pending' && Date.now() >= p.due).slice(0, 60);
    if (!due.length) return;
    const bySym = {};
    for (const p of due) (bySym[p.symbol] = bySym[p.symbol] || []).push(p);
    let graded = 0;
    for (const [sym, preds] of Object.entries(bySym)) {
      let h;
      try { h = await getHistory(resolveAsset(sym), 14); } catch (e) { continue; }
      if (!h || !h.length) continue;
      for (const p of preds) {
        // price closest to the due moment — honest even if the server slept past it
        let best = h[h.length - 1];
        for (const pt of h) if (Math.abs(pt.t - p.due) < Math.abs(best.t - p.due)) best = pt;
        if (Math.abs(best.t - p.due) > 3 * 86400000) { p.status = 'void'; continue; }
        const actual = ((best.price - p.entry) / p.entry) * 100;
        p.actual = +actual.toFixed(2);
        p.hit = actual * p.dir > 0;
        p.err = +Math.abs(actual - p.move).toFixed(2);
        p.status = 'done';
        graded++;
        // ---- the learning step: reward what worked, demote what didn't ----
        const step = p.hit ? 1.05 : 0.95;
        for (const topic of p.topics) ENGINE.weights.topics[topic] = clampW(topicW(topic) * step);
        ENGINE.weights.symbols[p.symbol] = clampW(symbolW(p.symbol) * step);
        if (p.momo && (p.momo > 0) === (p.dir > 0)) {
          ENGINE.weights.momentum = clampW(ENGINE.weights.momentum * (p.hit ? 1.03 : 0.97));
        }
        const day = new Date(p.due).toISOString().slice(0, 10);
        const d = ENGINE.daily[day] = ENGINE.daily[day] || { n: 0, hits: 0 };
        d.n++; if (p.hit) d.hits++;
      }
    }
    if (graded) { saveEngine(); console.log(`🎓 engine: graded ${graded} guesses`); }
  } finally { engineEvaluating = false; }
}

/* Any API traffic nudges the engine — so it keeps training on free hosting
   that sleeps between visits (an external uptime ping makes it fully 24/7). */
function engineNudge() { ensurePredictionBatch(); evaluateDue(); }

function engineStats() {
  const done = ENGINE.preds.filter(p => p.status === 'done');
  const pending = ENGINE.preds.filter(p => p.status === 'pending');
  const byHorizon = {};
  for (const hz of ENGINE_HORIZONS) {
    const set = done.filter(p => p.hz === hz);
    const hits = set.filter(p => p.hit).length;
    const recent = set.filter(p => p.due > Date.now() - 3 * 86400000);
    byHorizon[hz] = {
      n: set.length,
      hitRate: set.length ? +(hits / set.length * 100).toFixed(1) : null,
      recentRate: recent.length ? +(recent.filter(p => p.hit).length / recent.length * 100).toFixed(1) : null,
      avgErr: set.length ? +(set.reduce((a, p) => a + p.err, 0) / set.length).toFixed(2) : null,
      alwaysUpRate: set.length ? +(set.filter(p => p.actual > 0).length / set.length * 100).toFixed(1) : null,
      nextDue: (() => { const q = pending.filter(p => p.hz === hz).sort((a, b) => a.due - b.due)[0]; return q ? q.due : null; })(),
    };
  }
  const topics = Object.entries(ENGINE.weights.topics).sort((a, b) => b[1] - a[1]);
  const day = ENGINE.startedAt ? Math.floor((Date.now() - ENGINE.startedAt) / 86400000) + 1 : 0;
  return {
    startedAt: ENGINE.startedAt, day, targetDays: 10,
    assets: Object.keys(ASSETS).length,
    total: ENGINE.preds.length, pending: pending.length, evaluated: done.length,
    nextBatchInMin: Math.max(0, Math.round((ENGINE.lastBatchTs + BATCH_EVERY - Date.now()) / 60000)),
    byHorizon,
    daily: Object.entries(ENGINE.daily).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-14)
      .map(([date, d]) => ({ date, n: d.n, hits: d.hits, rate: +(d.hits / d.n * 100).toFixed(0) })),
    weights: {
      momentum: +ENGINE.weights.momentum.toFixed(2),
      trusted: topics.filter(([, w]) => w > 1.04).slice(0, 6).map(([t, w]) => ({ topic: t, w: +w.toFixed(2) })),
      doubted: topics.filter(([, w]) => w < 0.96).slice(-6).reverse().map(([t, w]) => ({ topic: t, w: +w.toFixed(2) })),
    },
  };
}

api.training = async () => { engineNudge(); return engineStats(); };

/* Per-IP rate limit for /api/*: protects upstream quotas + the LLM budget.   */
const rateBuckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  if (rateBuckets.size > 5000) rateBuckets.clear(); // memory guard
  let b = rateBuckets.get(ip);
  if (!b || now > b.reset) { b = { n: 0, reset: now + 60000 }; rateBuckets.set(ip, b); }
  b.n++;
  return b.n > 120; // 120 req/min/ip is far above normal page usage
}

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
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
      if (rateLimited(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '30' });
        return res.end(JSON.stringify({ error: 'Easy there — too many requests. Try again in a moment.' }));
      }
      const name = url.pathname.slice(5);
      const q = Object.fromEntries(url.searchParams);
      engineNudge(); // any visit keeps the speculation engine guessing & grading
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

// Only start listening when run directly — lets the test suite require() this
// file and exercise the pure functions without opening a port.
if (require.main === module) {
  const HOST = process.env.HOST || '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log(`\n  ⏳  HINDSIGHT — the market time machine`);
    console.log(`  ▶  listening on http://${HOST}:${PORT}  (open http://localhost:${PORT})\n`);
    console.log(`  Live data: CoinGecko · Yahoo Finance · Reddit · Google News`);
    console.log(`  AI deep reads: ${process.env.ANTHROPIC_API_KEY ? 'ON' : 'off (set ANTHROPIC_API_KEY)'}`);
    console.log(`  For fun & learning only. Not financial advice.\n`);
    console.log(`  🎓 speculation engine: ${ENGINE.preds.length} guesses on record, training day ${ENGINE.startedAt ? Math.floor((Date.now() - ENGINE.startedAt) / 86400000) + 1 : 0}`);
  });

  // The engine's own clock: first batch shortly after boot, then keep
  // guessing & grading every 15 min while the process is awake.
  setTimeout(engineNudge, 15000);
  setInterval(engineNudge, 15 * 60000);

  // Keep the server alive through transient errors; shut down cleanly on host signals.
  process.on('unhandledRejection', err => console.error('unhandledRejection:', err?.message || err));
  process.on('uncaughtException', err => console.error('uncaughtException:', err?.message || err));
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => { console.log(`\n${sig} received — shutting down.`); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000); });
  }
}

module.exports = {
  server,
  __test: { analyzeHeadline, detectAssets, findMentions, isNegated, toneScore, scamScore, projectCone, ASSETS, FAMILIES },
};
