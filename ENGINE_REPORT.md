# 🎓 Engine Report — the 10-day self-training run

**Principle:** we check the past history to give correct foresight about the future.
The engine makes real dated guesses (1/3/5/10-day horizons, every asset), waits,
grades itself against what the market actually did, and re-weights what it trusts.
This file is the human-readable ledger of that run — updated and pushed each session
so progress is visible remotely. Live numbers: `/api/training` on the running site,
or section 07 "ENGINE TRAINING" on the homepage.

**Honesty rules (unchanged from the code):** every score is shown next to the
coin-flip (50%) and "always guess up" baselines. Direction accuracy of 55–60% is
already exceptional; below 50% means worse than a coin and the board will say so.
Calibrated, not psychic. Not financial advice.

---

## Day 1 — 2026-07-03/04 (night 1)

| | |
|---|---|
| Training day | **1 of 10** |
| Assets covered | 19 |
| Guesses on record | **76** (all pending — nothing gradeable yet) |
| Graded so far | 0 |
| First 1-day grades due | 2026-07-04 |
| 10-day grades due | ~2026-07-12 (day 10 — the finish line) |
| Momentum weight | 1.0 (default — no re-weighting until grades exist) |
| Trusted / doubted signals | none yet |

**What happened today**
- The engine went live: self-training ledger, prediction batches, self-grading,
  and the public scoreboard shipped in commit `9ff3fc5`.
- Deep past unlocked: BTC history now reaches back to 2010 (Yahoo Finance +
  documented early-price anchors), so the time machine can test "what if" bets
  against 15 years of real history — the hindsight that feeds the foresight.
- The possibility cone got honest: EWMA volatility, drift shrunk 75% toward zero,
  fat-tail stretch, and a 5–95% quantile fan instead of a single wedge.
- Engine is running locally through the night (nudged every loop iteration) and
  deploys to Render on push.

**Next milestone:** first real grades tomorrow (day 2) when the 1-day guesses mature.
That's when hitRate stops being `null` and the scoreboard starts meaning something.
