# ⏳ HINDSIGHT — the market time machine (for Dummies)

Pick a coin or a stock, travel back to any day, pretend you placed a bet, and watch
**real historical prices** reveal if you'd be rich, wrecked, or just fine. Then peek at a
comic "possibility timeline" for what could happen next, scan live forums, catch scams,
read news clouds from around the world, and **profile the outlets doing the talking**.

Bold, comic / neo-brutalist look. Built to be fun and easy — *not* to give financial advice.

> ⚠️ **For entertainment & learning only. This is NOT financial advice.**
> Don't bet money you can't afford to lose — ideally, don't bet at all.

---

## Run it locally

Needs **Node 18+** (uses the built-in `fetch`). No `npm install` — zero dependencies.

```bash
node server.js
# then open http://localhost:4321
```

Change the port with `PORT=8080 node server.js`.

## Deploy it online (pick one — all free tiers)

The app is a plain Node process that reads `PORT` and binds `0.0.0.0`, with a
`/healthz` check — so it runs on any host with **no build step**.

### Render (one click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/alicanokan/hindsight-market-time-machine)

Click → sign in to Render → it reads `render.yaml` and deploys. Free plan, gives a `*.onrender.com` URL.

### Railway

New Project → **Deploy from GitHub repo** → pick this repo. Railway auto-detects Node and runs `npm start` (`node server.js`). No config needed.

### Fly.io

```bash
fly launch --now       # uses the included Dockerfile; pick a name & region
```

### Any Docker host

```bash
docker build -t hindsight .
docker run -p 4321:4321 hindsight
```

> Note: **Vercel/Netlify** are serverless-first and don't run a long-lived `http.createServer`
> as-is. Prefer Render / Railway / Fly / Docker, which run the Node process directly.

---

## What's inside

| # | Section | What it does |
|---|---------|--------------|
| 01 | **The Time Machine** | Back-test a pretend bet (long *or* short) on a past date using **real** price history. Shows P/L, return %, best day to exit, worst moment, and a mini chart. |
| 02 | **Possibility Timeline** | Real past → NOW → a bull/base/bear "possibility cone" built from the asset's own recent volatility, plus catalyst pins (earnings, FOMC, options expiry, iPhone events…). |
| 03 | **Forum Scanner** | Live Reddit scan → "repeated cases" word cloud + hot posts. |
| 04 | **Scam Radar** | Flags posts matching classic scam phrases (giveaways, "double your", seed-phrase asks, urgency) with a score and the reasons. |
| 05 | **News Clouds** | Per-region (US/GB/IN/JP) headline word clouds + top stories. |
| 06 | **Who's Talking? — Source Profiler** | Profiles each **outlet**: recent bullish/bearish tone, a track-record proxy (did their tone match what price actually did?), and a curated political/stance lean tag. |

## Live data sources (all free, no API keys)

- **CoinGecko** — crypto price + history *(free tier caps history at ~365 days; the app clamps and tells you)*
- **Yahoo Finance chart API** — stock price + history (up to ~5y)
- **Reddit RSS** — forum posts *(Reddit rate-limits unauthenticated IPs; the app caches 10 min, staggers requests, and shows a friendly "try again" if throttled)*
- **Google News RSS** — regional headlines + source profiling

## Assets supported

Crypto: **BTC, ETH, SOL, DOGE** · Stocks: **AAPL, TSLA, NVDA, GME**
(Add more in the `ASSETS` map in `server.js`.)

---

## Honesty notes

- The **possibility cone** is a statistical illustration of how wide the future *could*
  spread given recent volatility. It is **not a prediction**. Nobody can predict prices.
- **Source lean/stance tags** are generalizations drawn from public media-bias/reliability
  aggregators, shown as *context* — not a verdict on any specific article.
- The **track-record proxy** compares an outlet's recent headline *tone* to the actual
  ~30-day price move. It's a lightweight sanity check, not a rigorous forecasting record.
- **Short** back-tests use a simple symmetric model (`value = amount × (2 − price/entry)`),
  ignoring leverage, funding, fees, and liquidation. Real shorting is far riskier.

## Project layout

```
server.js          zero-dep Node backend: static server + /api/* (data, back-test, analytics)
public/index.html  page structure + all sections
public/styles.css  comic / neo-brutalist styling
public/app.js      front-end logic, SVG charts, all fetches
```

## API quick reference

```
GET /api/assets                                  list of supported assets
GET /api/quote?symbol=BTC                         current price + 24h change
GET /api/history?symbol=BTC&days=180              normalized price series
GET /api/backtest?symbol=BTC&date=2025-01-01&amount=100&direction=long
GET /api/forecast?symbol=BTC&horizon=60           past series + possibility cone + catalysts
GET /api/forums?symbol=BTC                        repeated themes + posts + scam flags
GET /api/news?symbol=BTC                          per-region headline clouds
GET /api/pundits?symbol=BTC                        outlet tone + lean + track-record proxy
```
