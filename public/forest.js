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
    playForecast: 'If you plant <b>$100</b> on {tree} betting it {dir} within the next <b>{hz}</b>, you might earn <b>~{est}</b> <i>(wild range {lo}%…{hi}%)</i>',
    playHistory: '{topic} clouds are overhead — after the last <b>{n}</b> similar ones, {tree} averaged <b>{mv}%</b> in {days} days',
    oneClick: '🌱 1-click bet $100',
    playCombo: '⚡ combo: {topics} clouds are overhead at once — stacking their history, {tree} leaned <b>{mv}%</b> over {days} days',
    playsNote: 'Pretend money · auto-settles at the deadline · wild guesses, NOT advice',
    simBtn: 'cloud casino',
    simTitle: 'Cloud casino — bet the clouds, see it in seconds',
    simBank: 'Base money',
    simPick: 'Pick a cloud (or a combination) — the engine bets with the rain: long what it 💧 waters, short what it ☠️ poisons',
    simRun: '⚡ Run 8 lightning rounds',
    simRound: 'Round',
    simTotal: 'Total',
    simBankNow: 'Bank',
    simReset: 'reset to $1,000',
    simNote: 'Each ⚡ round replays the clouds\' historical rain with random weather luck — a possible 3 days squeezed into half a second. Pretend money, NOT advice.',
    simNoClouds: 'Pick at least one cloud ☁️',
    simFromCloud: '⚡ bet this cloud',
    guessTitle: '🎯 My first $10 — the guessing game',
    guessSub: 'You don\'t need to know anything about crypto. The engine reads the news weather and makes a guess — you just decide: <b>believe it or doubt it</b>. Right guesses grow your wallet, wrong ones shrink it.',
    wallet: 'Wallet', goal: 'goal: turn $10 into $100', activeGuesses: 'in live guesses',
    stakeLabel: 'Stake', believe: '✅ BELIEVE the engine', doubt: '❌ DOUBT it', nextCard: '↻ another guess',
    guessCard: 'The news weather over {tree} looks {weather}. The engine guesses it <b>{dir}</b> ~<b>{base}%</b> by tomorrow.',
    guessWhy: 'Why: {why}', guessNoNews: 'no strong news — pure momentum',
    mayHappen: 'if you click → most likely <b>${likely}</b>, wild range ${lo}…${hi}',
    peek: '🔮 peek at 3 possible tomorrows',
    peekLine: 'tomorrow #{n}: ${v}',
    placed: '🎯 Guess locked in! It settles tomorrow at the REAL market price.',
    broke: 'You\'re broke 😅 — the market ate your $10. That\'s the real lesson: guessing is hard. Try again?',
    resetWallet: '↺ start over with $10',
    walletWin: '🎉 guess won!', walletLoss: '💸 guess lost —',
    notEnough: '💸 not enough in the wallet — lower the stake',
    guessNote: 'Pretend dollars, REAL prices — every guess settles at tomorrow\'s actual market price. A game for learning, NOT financial advice and NOT real money.',
    arenaBtn: 'analyst arena',
    arenaTitle: 'Analyst Arena — 12 characters vs a year of real history',
    arenaPick: 'Twelve analyst characters replay the <b>last year of REAL daily prices</b> for a tree you pick. Every call is made using <b>only the data that existed before that day</b> — no peeking, no hindsight. Ten are fixed rules; 🎓 The Apprentice and 🦉 Professor Hedge <b>learn from everyone\'s hits and misses as the year unfolds</b> — and even they only ever see the past.',
    arenaRun: '🎬 Run 1-year replay',
    arenaLoading: 'fetching a year of real prices…',
    arenaBoard: '🏆 Leaderboard — {n} scored next-day calls each',
    arenaAcc: 'hit rate', arenaWorth: '$100 →',
    arenaHold: '🌳 reference: just buying & holding turned $100 into <b>{v}</b> over the same year.',
    arenaTomorrow: '🔮 Their calls for tomorrow',
    arenaMonkey: '🐒 <b>The Monkey beat {n} of the {total} "experts"</b> on this tree this year. Let that sink in before trusting any forecast — including this game\'s.',
    arenaMonkeyZero: '🐒 The Monkey lost to every expert this year — rare! Re-run on another tree before you start trusting experts.',
    arenaNote: 'Walk-forward test on real history: each character is a mechanical rule that sees only the past at every step. Whoever tops this board learned THIS year\'s weather on THIS tree — re-run on another tree and the podium reshuffles. That instability is the lesson. A game, NOT advice.',
    arenaErr: '⚠ could not fetch history — the free data source may be napping, try again in a minute',
    profBtn: 'profile',
    profTitle: 'Speculator profile — your live game dashboard',
    profCreateH: '👤 Create your speculator profile',
    profCreateSub: 'Pick a face, pick a name — then test your speculations like a game. Every call is tracked against <b>REAL live prices</b>, your record builds your rank, and nothing here is real money.',
    profNamePh: 'your speculator name…',
    profStart: '🚀 Start speculating',
    profRank: 'rank', profXpNote: 'XP: +10 per settled call, +25 per win, hot-streak bonus',
    profOpen: '📡 Live speculations — ticking against real prices',
    profNoOpen: 'No live speculations right now. Place one below — or plant seeds on any tree, bet clouds, take guesses: everything lands here.',
    profHistoryH: '📜 Settled record',
    profNoHistory: 'Nothing settled yet — your record starts when your first speculation expires.',
    profStatsH: '📊 Your numbers',
    profWins: 'wins', profLosses: 'losses', profHit: 'hit rate', profStreak: 'streak',
    profBest: 'best call', profWorst: 'worst call', profCalls: 'settled',
    profNewH: '🧪 Test a new speculation',
    profGrow: '🌱 GROWS', profWilt: '🥀 WILTS', profPlace: '🎯 Place it — watch it live',
    profPlaced: '🎯 Speculation placed — it\'s now ticking in your profile.',
    profLive: 'LIVE', profNow: 'now', profIn: 'in',
    profEdit: '✏️ edit', profSave: '💾 save',
    profOpenTotal: 'open P&L',
    profLevels: ['🌱 Seedling', '🌿 Sprout', '🌳 Gardener', '🧭 Forest Ranger', '🌦️ Weather Watcher', '🔮 Storm Prophet', '🐉 Market Dragon'],
    profNote: 'Pretend money, REAL prices, live every 30 seconds. A game for learning — NOT financial advice.',
    hz1h: '1 hour', hz1d: '1 day', hz1w: '1 week', hz30d: '1 month',
    hourNote: '🎲 at 1-hour scale, luck rules — basically a coin-flip with vibes',
    settled: '⏰ bet settled:', left: 'left', manual: '♾ manual',
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
    playForecast: '{tree} üzerine önümüzdeki <b>{hz}</b> içinde {dir} diye <b>100$</b> ekersen, <b>~{est}</b> kazanabilirsin <i>(geniş aralık {lo}%…{hi}%)</i>',
    playHistory: '{topic} bulutları tepede — son <b>{n}</b> benzerinden sonra {tree} {days} günde ortalama <b>{mv}%</b> yaptı',
    oneClick: '🌱 Tek tıkla 100$ oyna',
    playCombo: '⚡ kombo: {topics} bulutları aynı anda tepede — tarihlerini üst üste koyunca {tree} {days} günde <b>{mv}%</b> eğilim gösterdi',
    playsNote: 'Hayali para · vadesinde otomatik kapanır · vahşi tahmin, tavsiye DEĞİL',
    simBtn: 'bulut kumarhanesi',
    simTitle: 'Bulut kumarhanesi — buluta oyna, saniyeler içinde gör',
    simBank: 'Ana para',
    simPick: 'Bir bulut (ya da kombinasyon) seç — motor yağmurla birlikte oynar: 💧 suladığına uzun, ☠️ zehirlediğine kısa',
    simRun: '⚡ 8 şimşek turu oynat',
    simRound: 'Tur',
    simTotal: 'Toplam',
    simBankNow: 'Kasa',
    simReset: '1.000$\'a sıfırla',
    simNote: 'Her ⚡ tur, bulutların tarihsel yağmurunu rastgele hava şansıyla tekrar oynatır — yarım saniyeye sıkıştırılmış olası 3 gün. Hayali para, tavsiye DEĞİL.',
    simNoClouds: 'En az bir bulut seç ☁️',
    simFromCloud: '⚡ bu buluta oyna',
    guessTitle: '🎯 İlk 10 dolarım — tahmin oyunu',
    guessSub: 'Kripto bilmene hiç gerek yok. Motor haber havasını okur ve bir tahmin yapar — sen sadece karar ver: <b>inan ya da şüphelen</b>. Doğru tahminler cüzdanını büyütür, yanlışlar küçültür.',
    wallet: 'Cüzdan', goal: 'hedef: 10$\'ı 100$ yap', activeGuesses: 'canlı tahminde',
    stakeLabel: 'Bahis', believe: '✅ Motora İNAN', doubt: '❌ ŞÜPHELEN', nextCard: '↻ başka tahmin',
    guessCard: '{tree} üzerindeki haber havası {weather} görünüyor. Motor yarına kadar ~<b>{base}%</b> <b>{dir}</b> diye tahmin ediyor.',
    guessWhy: 'Neden: {why}', guessNoNews: 'güçlü haber yok — saf momentum',
    mayHappen: 'tıklarsan → büyük ihtimalle <b>${likely}</b>, geniş aralık ${lo}…${hi}',
    peek: '🔮 3 olası yarına göz at',
    peekLine: 'yarın #{n}: ${v}',
    placed: '🎯 Tahmin kilitlendi! Yarın GERÇEK piyasa fiyatıyla kapanır.',
    broke: 'Battın 😅 — piyasa 10 dolarını yedi. Gerçek ders bu: tahmin zordur. Tekrar dener misin?',
    resetWallet: '↺ 10$ ile baştan başla',
    walletWin: '🎉 tahmin tuttu!', walletLoss: '💸 tahmin tutmadı —',
    notEnough: '💸 cüzdanda yeterli para yok — bahsi düşür',
    guessNote: 'Hayali dolarlar, GERÇEK fiyatlar — her tahmin yarının gerçek piyasa fiyatıyla kapanır. Öğrenmek için bir oyun, yatırım tavsiyesi DEĞİL, gerçek para DEĞİL.',
    arenaBtn: 'analist arenası',
    arenaTitle: 'Analist Arenası — 12 karakter, 1 yıl gerçek tarih',
    arenaPick: 'On iki analist karakteri, seçtiğin ağacın <b>son bir yıllık GERÇEK günlük fiyatlarını</b> yeniden oynar. Her tahmin <b>yalnızca o günden önce var olan verilerle</b> yapılır — dikizlemek yok, sonradan akıl yok. Onu sabit kural; 🎓 Çırak ile 🦉 Profesör Hedge ise <b>yıl ilerledikçe herkesin isabet ve ıskalarından öğrenir</b> — ama onlar bile yalnızca geçmişi görür.',
    arenaRun: '🎬 1 yıllık tekrarı oynat',
    arenaLoading: 'bir yıllık gerçek fiyatlar getiriliyor…',
    arenaBoard: '🏆 Lider tablosu — her biri {n} puanlı ertesi-gün tahmini',
    arenaAcc: 'isabet', arenaWorth: '100$ →',
    arenaHold: '🌳 referans: sadece alıp tutmak aynı yılda 100$\'ı <b>{v}</b> yaptı.',
    arenaTomorrow: '🔮 Yarın için tahminleri',
    arenaMonkey: '🐒 <b>Maymun bu yıl bu ağaçta {total} "uzmanın" {n} tanesini yendi.</b> Herhangi bir tahmine güvenmeden önce bunu bir düşün — bu oyununki dahil.',
    arenaMonkeyZero: '🐒 Maymun bu yıl herkese yenildi — nadir bir yıl! Uzmanlara güvenmeye başlamadan önce başka bir ağaçta tekrar dene.',
    arenaNote: 'Gerçek tarih üzerinde ileriye-yürüyen test: her karakter, her adımda yalnızca geçmişi gören mekanik bir kural. Bu tabloyu kim kazandıysa BU ağaçta BU yılın havasını öğrendi — başka bir ağaçta tekrar oynat, podyum karışır. O istikrarsızlık dersin kendisi. Bir oyun, tavsiye DEĞİL.',
    arenaErr: '⚠ tarih verisi gelmedi — ücretsiz kaynak uyukluyor olabilir, bir dakika sonra tekrar dene',
    profBtn: 'profil',
    profTitle: 'Spekülatör profili — canlı oyun panon',
    profCreateH: '👤 Spekülatör profilini oluştur',
    profCreateSub: 'Bir yüz seç, bir isim koy — sonra spekülasyonlarını oyun gibi test et. Her çağrı <b>GERÇEK canlı fiyatlara</b> karşı izlenir, sicilin rütbeni yükseltir, buradaki hiçbir şey gerçek para değildir.',
    profNamePh: 'spekülatör adın…',
    profStart: '🚀 Spekülasyona başla',
    profRank: 'rütbe', profXpNote: 'XP: kapanan çağrı +10, kazanan +25, seri bonusu',
    profOpen: '📡 Canlı spekülasyonlar — gerçek fiyatlarla işliyor',
    profNoOpen: 'Şu an canlı spekülasyon yok. Aşağıdan bir tane aç — ya da ağaçlara tohum ek, bulutlara oyna, tahmin et: hepsi buraya düşer.',
    profHistoryH: '📜 Kapanan sicil',
    profNoHistory: 'Henüz kapanan yok — sicilin ilk spekülasyonun vadesi dolunca başlar.',
    profStatsH: '📊 Rakamların',
    profWins: 'kazanç', profLosses: 'kayıp', profHit: 'isabet', profStreak: 'seri',
    profBest: 'en iyi', profWorst: 'en kötü', profCalls: 'kapanan',
    profNewH: '🧪 Yeni bir spekülasyon dene',
    profGrow: '🌱 BÜYÜR', profWilt: '🥀 SOLAR', profPlace: '🎯 Aç — canlı izle',
    profPlaced: '🎯 Spekülasyon açıldı — artık profilinde canlı işliyor.',
    profLive: 'CANLI', profNow: 'şimdi', profIn: 'kaldı',
    profEdit: '✏️ düzenle', profSave: '💾 kaydet',
    profOpenTotal: 'açık K/Z',
    profLevels: ['🌱 Fide', '🌿 Filiz', '🌳 Bahçıvan', '🧭 Orman Korucusu', '🌦️ Hava Gözcüsü', '🔮 Fırtına Kâhini', '🐉 Piyasa Ejderi'],
    profNote: 'Hayali para, GERÇEK fiyatlar, 30 saniyede bir canlı. Öğrenmek için bir oyun — yatırım tavsiyesi DEĞİL.',
    hz1h: '1 saat', hz1d: '1 gün', hz1w: '1 hafta', hz30d: '1 ay',
    hourNote: '🎲 1 saatlik ölçekte şans konuşur — hisli bir yazı-tura',
    settled: '⏰ bahis kapandı:', left: 'kaldı', manual: '♾ elle',
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
$('#langToggle').onclick = () => { lang = lang === 'en' ? 'tr' : 'en'; localStorage.setItem('forestLang', lang); applyLang(); renderGardenBtn(); if (DATA) { renderSuggestions(); renderGuessGame(); renderProfStrip(); } };

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
    settleExpired();
    setInterval(settleExpired, 60000);     // the betting engine's clock
    setInterval(refreshClouds, 3 * 60000); // A4: quiet refresh
    setInterval(profLiveTick, 30000);      // profile: live re-pricing of open calls
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
  renderGuessGame();
  renderProfStrip();
  renderGardenBtn();
  renderSeedBadges();
  $('#staleBadge').hidden = !DATA._stale;
  updateTime(+$('#timeSlider').value);
}

/* ---------------- 🎲 suggested one-click plays (multi-horizon) ------------- */
const HORIZONS = [
  { key: '1h', days: 1 / 24 },
  { key: '1d', days: 1 },
  { key: '1w', days: 7 },
  { key: '30d', days: 30 },
];
let horizonKey = localStorage.getItem('horizon') || '1w';
const hzLabel = k => L()['hz' + k];

// Scale the 30-day forecast band down to any horizon with √time.
// (Honest approximation: volatility clusters intraday, but for a game it's fair.)
function horizonPlay(t, days) {
  const f = t.forecast;
  if (!f) return null;
  const band30 = (f.high - f.low) / 2;
  const dailyBand = band30 / Math.sqrt(30);
  const band = dailyBand * Math.sqrt(days);
  const drift = f.outlook * band * 0.8;
  return { est: Math.abs(drift), lo: +(drift - band).toFixed(days < 1 ? 2 : 1), hi: +(drift + band).toFixed(days < 1 ? 2 : 1) };
}

function buildSuggestions() {
  const sugg = [];
  const hz = HORIZONS.find(h => h.key === horizonKey) || HORIZONS[2];
  // 1) strongest forecast leans, scaled to the chosen horizon
  const ranked = DATA.trees.filter(t => t.forecast && t.price != null)
    .sort((a, b) => Math.abs(b.forecast.outlook) - Math.abs(a.forecast.outlook));
  for (const t of ranked.slice(0, 6)) {
    const f = t.forecast;
    if (Math.abs(f.outlook) < 0.3) continue;
    const p = horizonPlay(t, hz.days);
    if (!p || p.est < 0.01) continue;
    sugg.push({ kind: 'forecast', t, dir: f.outlook > 0 ? 1 : -1, hz, ...p });
    if (sugg.length >= 3) break;
  }
  const seen = new Set(sugg.map(s => s.t.symbol + s.dir));
  // 2) combo plays — several cloud topics overhead at once hitting the SAME tree:
  //    stack their historical reactions and bet the combined lean
  if (CAL && DATA.topicCount && hz.days >= 1) {
    const overhead = Object.keys(CAL).filter(t => (DATA.topicCount[t] || 0) >= 1);
    const perTree = {};
    for (const topic of overhead) {
      for (const [sym, mv] of Object.entries(CAL[topic].reactions)) {
        (perTree[sym] = perTree[sym] || { sum: 0, topics: [] });
        perTree[sym].sum += mv;
        perTree[sym].topics.push(topic);
      }
    }
    const combos = Object.entries(perTree).filter(([, v]) => v.topics.length >= 2)
      .sort((a, b) => Math.abs(b[1].sum) - Math.abs(a[1].sum));
    for (const [sym, v] of combos) {
      if (Math.abs(v.sum) < 1) continue;
      const t = DATA.trees.find(x => x.symbol === sym);
      if (!t || t.price == null) continue;
      const dir = v.sum > 0 ? 1 : -1;
      if (seen.has(sym + dir)) continue;
      seen.add(sym + dir);
      sugg.push({ kind: 'combo', t, dir, hz: HORIZONS[2], days: 3, mv: +v.sum.toFixed(1), topics: v.topics });
      if (sugg.length >= 4) break;
    }
  }
  // 3) history plays (3-day event studies) — shown except on the 1h horizon
  if (CAL && DATA.topicCount && hz.days >= 1) {
    for (const [topic, cal] of Object.entries(CAL)) {
      if ((DATA.topicCount[topic] || 0) < 2) continue;
      const strongest = Object.entries(cal.reactions).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
      if (!strongest || Math.abs(strongest[1]) < 0.8) continue;
      const t = DATA.trees.find(x => x.symbol === strongest[0]);
      if (!t || t.price == null) continue;
      const dir = strongest[1] > 0 ? 1 : -1;
      if (seen.has(strongest[0] + dir)) continue;
      seen.add(strongest[0] + dir);
      sugg.push({ kind: 'history', t, dir, hz: HORIZONS[2], days: cal.horizonDays, est: Math.abs(strongest[1]), mv: strongest[1], topic, events: cal.events });
      if (sugg.length >= 6) break;
    }
  }
  return sugg.slice(0, 6);
}

function renderSuggestions() {
  const strip = $('#betsStrip');
  const sugg = buildSuggestions();
  strip.hidden = false;
  const picker = HORIZONS.map(h =>
    `<button class="hz-btn ${h.key === horizonKey ? 'active' : ''}" data-hz="${h.key}">${hzLabel(h.key)}</button>`).join('');
  $('#betsHead').innerHTML = `<span>${L().playsTitle}</span><span class="hz-picker">${picker}</span>`;
  $('#betsHead').querySelectorAll('.hz-btn').forEach(b => b.onclick = () => {
    horizonKey = b.dataset.hz; localStorage.setItem('horizon', horizonKey); renderSuggestions();
  });
  $('#betsNote').textContent = L().playsNote;
  if (!sugg.length) { $('#betsCards').innerHTML = '<p style="opacity:.6;padding:8px">🌫️</p>'; return; }
  $('#betsCards').innerHTML = sugg.map((s, i) => {
    const treeLabel = `${s.t.char} <b>${escapeHtml(s.t.name)}</b>`;
    let text, kindTag;
    if (s.kind === 'forecast') {
      text = L().playForecast.replace('{tree}', treeLabel).replace('{dir}', s.dir > 0 ? L().dirGrow : L().dirWilt)
        .replace('{hz}', hzLabel(s.hz.key)).replace('{est}', '+$' + s.est.toFixed(s.hz.days < 1 ? 2 : 1))
        .replace('{lo}', s.lo).replace('{hi}', (s.hi >= 0 ? '+' : '') + s.hi);
      kindTag = (s.t.forecast ? s.t.forecast.weather : '🔮') + ' 🔮 ' + hzLabel(s.hz.key);
    } else if (s.kind === 'combo') {
      text = L().playCombo.replace('{topics}', s.topics.map(escapeHtml).join(' + '))
        .replace('{tree}', treeLabel).replace('{mv}', (s.mv > 0 ? '+' : '') + s.mv).replace('{days}', s.days);
      kindTag = '⚡ ' + s.topics.map(escapeHtml).join(' + ');
    } else {
      text = L().playHistory.replace('{topic}', escapeHtml(s.topic)).replace('{n}', s.events)
        .replace('{tree}', treeLabel).replace('{mv}', (s.mv > 0 ? '+' : '') + s.mv).replace('{days}', s.days);
      kindTag = '🧪 ' + (s.topic || '');
    }
    const luck = s.kind === 'forecast' && s.hz.days < 1 ? `<div class="play-luck">${L().hourNote}</div>` : '';
    const mood = s.dir > 0 ? 'play-up' : 'play-down';
    return `<div class="play-card ${mood}">
      <div class="play-kind">${kindTag}</div>
      <div class="play-text">${text}</div>
      ${luck}
      <button class="cp-btn play-btn" data-i="${i}">${L().oneClick} ${s.dir > 0 ? '🌱' : '🥀'}</button>
    </div>`;
  }).join('');
  $('#betsCards').querySelectorAll('.play-btn').forEach(btn => btn.onclick = () => {
    const s = sugg[+btn.dataset.i];
    plantSeed(s.t, s.dir, s.kind === 'forecast' ? s.hz : { key: '1w', days: s.days });
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
  const plots = [];
  for (const fam of order) {
    const info = DATA.families[fam];
    const members = DATA.trees.filter(t => t.family === fam);
    if (!members.length || !info) continue;
    plots.push({ fam, info, members });
  }
  // Two depth rows: the whole forest fits on screen (no panning) and the
  // scaled-down back row gives the scene its 3D horizon.
  const total = plots.reduce((a, p) => a + p.members.length, 0);
  const back = el('div', 'forest-row row-back');
  const front = el('div', 'forest-row row-front');
  let acc = 0;
  for (const p of plots) {
    const plot = el('div', 'family-plot');
    plot.dataset.family = p.fam;
    const sign = el('div', 'family-sign', `${p.info.emoji} ${p.info.label}`);
    sign.title = p.info.blurb;
    const row = el('div', 'tree-row');
    for (const t of p.members) row.appendChild(makeTree(t));
    plot.appendChild(sign);
    plot.appendChild(row);
    (acc < total / 2 ? back : front).appendChild(plot);
    acc += p.members.length;
  }
  ground.appendChild(back);
  ground.appendChild(front);
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
    cloud.style.animationDuration = (85 + (i % 7) * 15) + 's';
    cloud.style.animationDelay = (-(i * 11) % 85) + 's';
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
  // color tells the story at a glance: green shower = good rain, red = poison
  fx.className = 'tree-fx ' + (dir > 0 ? 'rain-good' : dir < 0 ? 'rain-bad' : '');
  const drop = dir > 0 ? '💧' : dir < 0 ? '☠️' : '·';
  for (let i = 0; i < 4; i++) {
    const d = el('span', 'drop', drop);
    d.style.left = (10 + Math.random() * 80) + '%';
    d.style.animationDelay = (Math.random() * 0.6) + 's';
    fx.appendChild(d);
  }
  for (let i = 0; i < 9; i++) {
    const s = el('span', 'drop-streak');
    s.style.left = (6 + Math.random() * 88) + '%';
    s.style.animationDelay = (Math.random() * 0.9) + 's';
    fx.appendChild(s);
  }
  setTimeout(() => { fx.innerHTML = ''; fx.className = 'tree-fx'; }, 2600);
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
      <button class="cp-btn" id="cpSim">${L().simFromCloud}</button>
      <button class="cp-btn ghost" id="cpSpeak">${L().hear}</button>
      <a class="cp-btn ghost" href="${c.link}" target="_blank" rel="noopener">${L().read}</a>
    </div>`;
  openPanel();
  $('#cpSpeak').onclick = () => speakCloud(c);
  $('#cpSim').onclick = () => {
    // one click: bet this cloud with the current bank and watch the rounds run
    simSel.clear();
    const idx = (DATA.clouds || []).indexOf(c);
    if (idx >= 0) simSel.add(idx);
    closePanel();
    renderSimSheet();
    openSheet('simSheet');
    runSim();
  };
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
function plantSeed(t, dir, hz) {
  if (t.price == null) { toast('⚠ no live price for this tree right now'); return; }
  const seed = { symbol: t.symbol, dir, amount: 100, entry: t.price, date: new Date().toISOString().slice(0, 10) };
  if (hz) { seed.hzKey = hz.key; seed.expiresAt = Date.now() + hz.days * 86400000; }
  garden.push(seed);
  saveGarden();
  sfx('pop');
  toast(`${L().planted} ${t.char} ${t.name} ${dir > 0 ? '🌱' : '🥀'}${hz ? ' · ' + hzLabel(hz.key) : ''}`);
  renderSeedBadges();
  renderGardenBtn();
  closePanel();
}

// The betting engine settles bets whose deadline has passed (at the current
// price — if you were away, it settles on your next visit).
function settleExpired() {
  if (!DATA) return;
  let changed = false;
  for (let i = garden.length - 1; i >= 0; i--) {
    const s = garden[i];
    if (!s.expiresAt || Date.now() < s.expiresAt) continue;
    const { value, pnl } = seedValue(s);
    const t = DATA.trees.find(x => x.symbol === s.symbol);
    if (s.game === 'guess') {
      // beginner game: the stake (plus or minus) flows back into the wallet
      wallet += value;
      saveWallet();
      toast(`${pnl >= 0 ? L().walletWin : L().walletLoss} ${t ? t.char + ' ' + t.name : s.symbol} ${pnl >= 0 ? '+' : '−'}$${Math.abs(pnl).toFixed(2)} · ${L().wallet}: $${wallet.toFixed(2)}`);
    } else {
      gardenScore += pnl;
      toast(`${L().settled} ${t ? t.char + ' ' + t.name : s.symbol} ${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}`);
    }
    recordSettle(s, pnl); // profile record + XP + rank
    garden.splice(i, 1);
    changed = true;
  }
  if (changed) { saveGarden(); renderSeedBadges(); renderGardenBtn(); renderGuessGame(); }
}

function countdown(s) {
  if (!s.expiresAt) return L().manual;
  const ms = s.expiresAt - Date.now();
  if (ms <= 0) return '⏰';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), d = Math.floor(h / 24);
  return '⏳ ' + (d >= 1 ? `${d}d ${h % 24}h` : h >= 1 ? `${h}h ${m}m` : `${m}m`) + ' ' + L().left;
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
      <span class="sr-ico">${s.game === 'guess' ? '🎯' : s.dir > 0 ? '🌱' : '🥀'}</span>
      <div class="sr-main"><b>${t ? t.char + ' ' + escapeHtml(t.name) : s.symbol}</b> ${s.dir > 0 ? L().seedLong : L().seedShort} · ${s.date} · <span class="sr-count">${countdown(s)}</span>
        <div class="imp-why">${fmtMoney(s.entry)} → ${t ? fmtMoney(t.price) : '—'}</div></div>
      <span class="sr-pnl ${good ? 'up' : 'down'}">${good ? '+' : ''}${pnl.toFixed(0)}</span>
      <button class="cp-btn sr-harvest" data-i="${i}">${L().harvest}</button>
    </div>`;
  }).join('') + `<p style="padding:10px 14px;font-family:'Space Mono',monospace;font-size:13px">${L().score}: <b>${gardenScore >= 0 ? '+' : ''}${gardenScore.toFixed(0)}</b></p>`;
  body.querySelectorAll('.sr-harvest').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    const s = garden[i];
    const { value, pnl } = seedValue(s);
    if (s.game === 'guess') { wallet += value; saveWallet(); }
    else gardenScore += pnl;
    recordSettle(s, pnl); // harvests count on the record too
    garden.splice(i, 1);
    saveGarden(); sfx('pop');
    toast(`🧺 ${pnl >= 0 ? '+' : ''}${pnl.toFixed(s.game === 'guess' ? 2 : 0)} harvested!`);
    renderGardenSheet(); renderSeedBadges(); renderGardenBtn(); renderGuessGame();
  });
}

/* ---------------- 🎯 my first $10 — beginner guessing game ------------------ */
/* The engine makes a plain-language guess from the news weather; the player
   only chooses BELIEVE or DOUBT. Before the click, the card says what may
   happen to the stake. Guesses settle at tomorrow's REAL price via the same
   engine that settles garden seeds. Pretend dollars — the wallet can and
   should be able to go broke; that's the lesson. */
let wallet = parseFloat(localStorage.getItem('guessWallet') ?? '10');
let guessIdx = 0;
let guessStake = 1;
const saveWallet = () => localStorage.setItem('guessWallet', String(wallet));

function buildGuessCards() {
  return DATA.trees.filter(t => t.forecast && t.price != null)
    .sort((a, b) => Math.abs(b.forecast.outlook) - Math.abs(a.forecast.outlook))
    .slice(0, 10);
}

function renderGuessGame() {
  if (!DATA) return;
  const strip = $('#guessStrip');
  if (!strip) return;
  strip.hidden = false;
  const live = garden.filter(s => s.game === 'guess');
  const lockedIn = live.reduce((a, s) => a + seedValue(s).value, 0);
  $('#guessWallet').innerHTML =
    `💰 ${L().wallet}: <b>$${wallet.toFixed(2)}</b>` +
    (live.length ? ` <span class="gw-live">+ $${lockedIn.toFixed(2)} ${L().activeGuesses} (${live.length})</span>` : '') +
    ` <span class="gw-goal">· ${L().goal}</span>`;
  const body = $('#guessBody');

  if (wallet < 1 && !live.length) {
    body.innerHTML = `<div class="guess-broke">${L().broke}<br>
      <button class="cp-btn" id="guessReset">${L().resetWallet}</button></div>`;
    $('#guessReset').onclick = () => { wallet = 10; saveWallet(); sfx('pop'); renderGuessGame(); };
    return;
  }

  const cards = buildGuessCards();
  if (!cards.length) { body.innerHTML = '<p style="opacity:.6;padding:8px">🌫️</p>'; return; }
  const t = cards[guessIdx % cards.length];
  const f = t.forecast;
  const p = horizonPlay(t, 1);                      // tomorrow's band, √time-scaled
  const drift = (p.lo + p.hi) / 2, band = (p.hi - p.lo) / 2;
  const sgn = f.outlook >= 0 ? 1 : -1;
  guessStake = Math.min(guessStake, Math.max(1, Math.floor(wallet)));
  const stake = guessStake;

  // what may happen to the stake, per button (long/short of the price move)
  const outcome = betSgn => {
    const at = m => Math.max(0, stake * (1 + betSgn * m / 100));
    const ends = [at(drift - band), at(drift + band)];
    return { likely: at(drift), lo: Math.min(...ends), hi: Math.max(...ends) };
  };
  const bel = outcome(sgn), dbt = outcome(-sgn);
  const mayLine = o => L().mayHappen.replace('{likely}', o.likely.toFixed(2))
    .replace('{lo}', o.lo.toFixed(2)).replace('{hi}', o.hi.toFixed(2));

  const why = f.drivers && f.drivers.length ? f.drivers[0].why : L().guessNoNews;
  const cardText = L().guessCard
    .replace('{tree}', `${t.char} <b>${escapeHtml(t.name)}</b>`)
    .replace('{weather}', f.weather)
    .replace('{dir}', sgn > 0 ? L().dirGrow : L().dirWilt)
    .replace('{base}', (drift >= 0 ? '+' : '') + drift.toFixed(2));

  body.innerHTML = `
    <div class="guess-card">
      <div class="guess-text">${cardText}</div>
      <div class="guess-why">💡 ${L().guessWhy.replace('{why}', escapeHtml(why))}</div>
      <div class="guess-stakes">${L().stakeLabel}:
        ${[1, 2, 5].map(v => `<button class="hz-btn gs-btn ${v === stake ? 'active' : ''}" data-v="${v}" ${v > wallet ? 'disabled' : ''}>$${v}</button>`).join('')}
      </div>
      <div class="guess-actions">
        <div class="guess-choice">
          <button class="cp-btn guess-btn" id="guessBelieve">${L().believe}</button>
          <div class="guess-may">${mayLine(bel)}</div>
        </div>
        <div class="guess-choice">
          <button class="cp-btn ghost guess-btn" id="guessDoubt">${L().doubt}</button>
          <div class="guess-may">${mayLine(dbt)}</div>
        </div>
      </div>
      <div class="guess-tools">
        <button class="hz-btn" id="guessPeek">${L().peek}</button>
        <button class="hz-btn" id="guessNext">${L().nextCard}</button>
        <button class="hz-btn" id="guessResetSmall" title="${L().resetWallet}">↺ $10</button>
      </div>
      <div class="guess-peek-out" id="guessPeekOut"></div>
    </div>`;

  body.querySelectorAll('.gs-btn').forEach(b => b.onclick = () => { guessStake = +b.dataset.v; renderGuessGame(); });
  $('#guessBelieve').onclick = () => placeGuess(t, sgn, stake);
  $('#guessDoubt').onclick = () => placeGuess(t, -sgn, stake);
  $('#guessNext').onclick = () => { guessIdx++; sfx('pop'); renderGuessGame(); };
  $('#guessResetSmall').onclick = () => { wallet = 10; saveWallet(); sfx('pop'); renderGuessGame(); };
  $('#guessPeek').onclick = () => {
    const lines = [];
    for (let i = 1; i <= 3; i++) {
      const m = drift + (Math.random() * 2 - 1) * band;
      const v = Math.max(0, stake * (1 + sgn * m / 100));
      lines.push(`⚡ ${L().peekLine.replace('{n}', i).replace('{v}', v.toFixed(2))}`);
    }
    $('#guessPeekOut').innerHTML = lines.map(l => `<span class="peek-line">${l}</span>`).join('');
    sfx('rain');
  };
}

function placeGuess(t, betDir, stake) {
  if (stake > wallet) { toast(L().notEnough); return; }
  if (t.price == null) { toast('⚠ no live price for this tree right now'); return; }
  wallet -= stake;
  saveWallet();
  garden.push({
    symbol: t.symbol, dir: betDir, amount: stake, entry: t.price,
    date: new Date().toISOString().slice(0, 10),
    game: 'guess', hzKey: '1d', expiresAt: Date.now() + 86400000,
  });
  saveGarden();
  sfx('pop');
  toast(L().placed);
  guessIdx++;
  renderSeedBadges();
  renderGardenBtn();
  renderGuessGame();
}

/* ---------------- ⚡ cloud casino — bet the clouds, watch it in seconds ----- */
let simBank = parseFloat(localStorage.getItem('simBank') || '1000');
const simSel = new Set();

// The betting legs a cloud creates: history-calibrated move per affected tree,
// rule direction (±1.2%) as fallback while calibration is still loading.
function cloudMoves(c) {
  const out = [];
  const topic = (c.topics || []).find(t => CAL && CAL[t]);
  const cal = topic ? CAL[topic] : null;
  for (const im of c.impacts) {
    if (!im.dir) continue;
    const mean = cal && cal.reactions[im.symbol] != null ? cal.reactions[im.symbol] : im.dir * 1.2;
    out.push({ symbol: im.symbol, dir: im.dir, mean });
  }
  if (!out.length && (c.broad || c.political)) {
    const broadDir = c.broad || 1;
    for (const t of DATA.trees.slice(0, 6)) out.push({ symbol: t.symbol, dir: broadDir, mean: broadDir * 0.8 });
  }
  return out;
}

function renderSimSheet() {
  const body = $('#simSheetBody');
  const clouds = DATA ? (DATA.clouds || []) : [];
  body.innerHTML = `
    <div class="sim-bank">
      <label for="simBankInput">💰 ${L().simBank}</label>
      <input id="simBankInput" type="number" min="10" step="10" value="${Math.round(simBank)}" />
      <button class="cp-btn ghost sim-reset" id="simResetBank">${L().simReset}</button>
    </div>
    <div class="sim-pick-h">${L().simPick}</div>
    <div class="sim-clouds">${clouds.map((c, i) => {
      const net = c.impacts.reduce((a, b) => a + b.dir, 0) + (c.broad || 0);
      const dot = c.political ? '🟣' : net > 0 ? '🟢' : net < 0 ? '🔴' : '⚪';
      return `<button class="sim-cloud ${simSel.has(i) ? 'on' : ''}" data-i="${i}">
        <span>${dot} <b>${escapeHtml(c.topics[0] || '📰')}</b></span>
        <span class="sim-cloud-t">${escapeHtml(c.title.slice(0, 52))}${c.title.length > 52 ? '…' : ''}</span>
      </button>`;
    }).join('')}</div>
    <button class="cp-btn sim-run" id="simRunBtn">${L().simRun}</button>
    <div class="sim-out" id="simOut"></div>
    <p class="bets-note">${L().simNote}</p>`;
  body.querySelectorAll('.sim-cloud').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    simSel.has(i) ? simSel.delete(i) : simSel.add(i);
    b.classList.toggle('on');
  });
  $('#simResetBank').onclick = () => {
    simBank = 1000; localStorage.setItem('simBank', '1000');
    $('#simBankInput').value = 1000; sfx('pop');
  };
  $('#simRunBtn').onclick = runSim;
}

async function runSim() {
  const out = $('#simOut');
  const picks = [...simSel].map(i => DATA.clouds[i]).filter(Boolean);
  if (!picks.length) { out.innerHTML = `<p class="sim-warn">${L().simNoClouds}</p>`; return; }
  simBank = Math.max(10, +$('#simBankInput').value || 1000);
  const legs = picks.flatMap(cloudMoves);
  if (!legs.length) { out.innerHTML = '<p class="sim-warn">🌫️</p>'; return; }
  const btn = $('#simRunBtn');
  btn.disabled = true;
  out.innerHTML = `<div class="sim-rounds"></div><div class="sim-total"></div>`;
  const roundsEl = out.querySelector('.sim-rounds'), totalEl = out.querySelector('.sim-total');
  const stake = simBank;
  let total = 0;
  const N = 8;
  const money = v => (v < 0 ? '−$' : '+$') + Math.abs(v).toFixed(1);
  for (let r = 1; r <= N; r++) {
    // one lightning round = one possible 3 days: historical mean rain + luck
    const per = legs.map(l => l.dir * (l.mean + (Math.random() * 2 - 1) * Math.max(1.2, Math.abs(l.mean) * 1.5)));
    const movePct = per.reduce((a, b) => a + b, 0) / per.length;
    const pnl = stake * movePct / 100;
    total += pnl;
    roundsEl.insertAdjacentHTML('beforeend',
      `<div class="sim-round ${pnl >= 0 ? 'up' : 'down'}">⚡ ${L().simRound} ${r}: <b>${money(pnl)}</b> <span>(${movePct >= 0 ? '+' : ''}${movePct.toFixed(2)}%)</span></div>`);
    totalEl.innerHTML = `${L().simTotal}: <b class="${total >= 0 ? 'up' : 'down'}">${money(total)}</b>`;
    sfx('pop');
    await new Promise(res => setTimeout(res, 420));
  }
  simBank = Math.max(10, simBank + total / N); // bank moves by the AVERAGE round, not 8 stacked futures
  localStorage.setItem('simBank', String(simBank));
  totalEl.innerHTML = `${L().simTotal}: <b class="${total >= 0 ? 'up' : 'down'}">${money(total)}</b>
    · ${L().simBankNow}: <b>$${simBank.toFixed(0)}</b>`;
  $('#simBankInput').value = Math.round(simBank);
  btn.disabled = false;
}

$('#simBtn').onclick = () => { renderSimSheet(); openSheet('simSheet'); };

/* ---------------- 🎭 analyst arena — walk-forward history replay ----------- */
/* Ten characters, each a MECHANICAL rule. They replay ~1 year of real daily
   prices; at every day they see only prices[0..i] and call the NEXT day's
   direction, then get scored against what really happened. No peeking — no
   look-ahead, no hindsight-flavored "wisdom". The Monkey guesses randomly:
   any "expert" who can't beat the monkey is the lesson, pre-installed. */

// tiny stats helpers — all windows end at index i (today), never beyond
const aSMA = (p, i, n) => { let s = 0; for (let k = i - n + 1; k <= i; k++) s += p[k]; return s / n; };
const aRet = (p, i, n) => p[i] / p[i - n] - 1;
const aVol = (p, i, n) => { // stdev of daily returns over the last n days
  const rs = []; for (let k = i - n + 1; k <= i; k++) rs.push(p[k] / p[k - 1] - 1);
  const m = rs.reduce((a, b) => a + b, 0) / rs.length;
  return Math.sqrt(rs.reduce((a, r) => a + (r - m) ** 2, 0) / rs.length);
};
const aHi = (p, i, n) => { let h = -Infinity; for (let k = i - n; k < i; k++) h = Math.max(h, p[k]); return h; };
const aLo = (p, i, n) => { let l = Infinity; for (let k = i - n; k < i; k++) l = Math.min(l, p[k]); return l; };

// Two LEARNING characters sit on top of the eight rules. This is the honest
// kind of "getting smarter": they adapt using only the scorecard SO FAR —
// at day i they know outcomes through day i, never the future. No tuning
// against the answer key.
const ARENA_BASE = ['marge', 'viktor', 'momo', 'grandma', 'bill', 'volatilius', 'sunny', 'boris'];
function makeArenaBrain() {
  return {
    window: Object.fromEntries(ARENA_BASE.map(k => [k, []])), // trailing 60d hit record
    trust: Object.fromEntries(ARENA_BASE.map(k => [k, 1])),   // hedge weights, mean 1
    copying: null, switches: 0,
  };
}
function arenaBrainLearn(brain, calls, ret) {
  const win = ret > 0;
  for (const k of ARENA_BASE) {
    const hit = (calls[k] > 0) === win;
    const w = brain.window[k]; w.push(hit ? 1 : 0); if (w.length > 60) w.shift();
    brain.trust[k] *= Math.exp(hit ? 0.15 : -0.15); // multiplicative weights (Hedge)
  }
  const tot = ARENA_BASE.reduce((a, k) => a + brain.trust[k], 0);
  for (const k of ARENA_BASE) brain.trust[k] /= (tot / ARENA_BASE.length);
}
const arenaHitRate = w => w.reduce((a, b) => a + b, 0) / w.length;
function apprenticePick(brain) {
  let best = null, bestR = -1;
  for (const k of ARENA_BASE) {
    const w = brain.window[k];
    if (w.length < 20) continue; // won't trust anyone on a thin record
    const r = arenaHitRate(w);
    if (r > bestR) { bestR = r; best = k; }
  }
  return best;
}

// Each: call(p, i) → +1 (grows) / −1 (wilts), using only p[0..i].
// why(d, p, i, brain) → one line of reasoning in their own voice (English, like all analysis text).
const ARENA_CAST = [
  { key: 'marge', face: '🤠', name: 'Marge the Trend Rider',
    call: (p, i) => aSMA(p, i, 10) >= aSMA(p, i, 30) ? 1 : -1,
    why: d => d > 0 ? 'the 10-day trail is riding above the 30-day trail — I follow the herd uphill.'
                    : 'the 10-day trail dipped under the 30-day trail — the herd is heading downhill and so am I.' },
  { key: 'viktor', face: '🧛', name: 'Viktor the Contrarian',
    call: (p, i) => aRet(p, i, 5) > 0 ? -1 : 1,
    why: d => d > 0 ? 'everyone sold for five days… vhich means everyone who wanted to sell already has. I buy their fear.'
                    : 'five green days — the crowd is euphoric, and euphoria is alvays for sale.' },
  { key: 'momo', face: '🐆', name: 'Momo the Momentum Chaser',
    call: (p, i) => aRet(p, i, 3) >= 0 ? 1 : -1,
    why: d => d > 0 ? 'it moved up the last 3 days — whatever is moving, KEEPS moving. Catch it!'
                    : 'it slid the last 3 days — falling things fall faster. Chase the slide!' },
  { key: 'grandma', face: '👵', name: 'Grandma Reversion',
    call: (p, i) => p[i] <= aSMA(p, i, 20) ? 1 : -1,
    why: d => d > 0 ? 'the price wandered below its 20-day home, dear. Everything comes back home eventually.'
                    : 'it\'s stretched above its 20-day home — too far from home, time to come back, sweetie.' },
  { key: 'bill', face: '🧗', name: 'Breakout Bill',
    call: (p, i) => p[i] >= aHi(p, i, 20) ? 1 : p[i] <= aLo(p, i, 20) ? -1 : (p[i] >= p[i - 1] ? 1 : -1),
    why: (d, p, i) => p[i] >= aHi(p, i, 20) ? 'BOOM — a fresh 20-day high! Walls that break stay broken. Straight up.'
      : p[i] <= aLo(p, i, 20) ? 'it smashed through the 20-day floor — when the floor gives way, you fall.'
      : 'no breakout yet — I drift with yesterday and wait for the wall to crack.' },
  { key: 'volatilius', face: '🧪', name: 'Dr. Volatilius',
    call: (p, i) => aVol(p, i, 5) <= aVol(p, i, 20) ? (aRet(p, i, 5) >= 0 ? 1 : -1) : (aRet(p, i, 5) >= 0 ? -1 : 1),
    why: (d, p, i) => aVol(p, i, 5) <= aVol(p, i, 20)
      ? 'volatility is compressing — calm markets keep their direction. I extrapolate the drift.'
      : 'volatility is spiking — turbulence snaps trends back. I bet against the recent move.' },
  { key: 'sunny', face: '☀️', name: 'Sunny the Permabull',
    call: () => 1,
    why: () => 'up! It always goes up eventually, and I refuse to miss the day it does.' },
  { key: 'boris', face: '🐻', name: 'Boris the Permabear',
    call: () => -1,
    why: () => 'down. It is all a bubble. It was a bubble yesterday and it is a bigger bubble today.' },
  // The Committee votes on the eight rules above (never the learners or the monkey).
  { key: 'committee', face: '🏛️', name: 'The Committee', vote: true,
    why: d => d > 0 ? 'after careful deliberation, the majority of our members lean constructive on the near term.'
                    : 'after careful deliberation, the majority of our members advise near-term caution.' },
  // The learners — they change their minds as results come in
  { key: 'apprentice', face: '🎓', name: 'The Apprentice', learner: true,
    why: (d, p, i, brain) => {
      if (!brain || !brain.copying) return 'still watching everyone\'s scorecard — I follow the majority until someone proves themselves.';
      const m = ARENA_CAST.find(c => c.key === brain.copying);
      const r = (100 * arenaHitRate(brain.window[brain.copying])).toFixed(0);
      return `I copy whoever\'s been hottest — right now that\'s ${m.face} ${m.name} (${r}% over the last 60 days). I switched mentors ${brain.switches} time${brain.switches === 1 ? '' : 's'} this year.`;
    } },
  { key: 'hedge', face: '🦉', name: 'Professor Hedge', learner: true,
    why: (d, p, i, brain) => {
      if (!brain) return 'I trust everyone a little, and adjust my trust after every miss.';
      const tot = ARENA_BASE.reduce((a, k) => a + brain.trust[k], 0);
      const top = [...ARENA_BASE].sort((a, b) => brain.trust[b] - brain.trust[a]).slice(0, 3)
        .map(k => { const c = ARENA_CAST.find(x => x.key === k); return `${c.face} ${(100 * brain.trust[k] / tot).toFixed(0)}%`; });
      return `every hit raised my trust, every miss cut it — after a full year I lean most on ${top.join(', ')}.`;
    } },
  { key: 'monkey', face: '🐒', name: 'The Monkey', monkey: true,
    call: () => Math.random() < 0.5 ? -1 : 1,
    why: () => '🎯 *throws dart* …that one! The banana told me.' },
];
const ARENA_WARM = 31; // longest lookback (30d SMA/vol) + 1 so every rule has data

function arenaCallAt(prices, i, brain) {
  // one day's calls; committee = majority of the 8 rules, learners read the brain
  const calls = {};
  let sum = 0;
  for (const c of ARENA_CAST) {
    if (c.vote) calls[c.key] = sum >= 0 ? 1 : -1;
    else if (c.key === 'apprentice') {
      const pick = apprenticePick(brain);
      if (pick !== brain.copying) { if (brain.copying) brain.switches++; brain.copying = pick; }
      calls[c.key] = pick ? calls[pick] : (sum >= 0 ? 1 : -1);
    } else if (c.key === 'hedge') {
      let v = 0;
      for (const k of ARENA_BASE) v += brain.trust[k] * calls[k];
      calls[c.key] = v >= 0 ? 1 : -1;
    } else calls[c.key] = c.call(prices, i);
    if (ARENA_BASE.includes(c.key)) sum += calls[c.key];
  }
  return calls;
}

function runArenaReplay(prices) {
  const brain = makeArenaBrain();
  const rows = ARENA_CAST.map(c => ({ c, hits: 0, n: 0, equity: 100 }));
  for (let i = ARENA_WARM; i < prices.length - 1; i++) {
    const ret = prices[i + 1] / prices[i] - 1;
    if (ret === 0) continue; // flat day — nobody scores, nobody learns
    const calls = arenaCallAt(prices, i, brain);
    for (const r of rows) {
      const d = calls[r.c.key];
      r.n++;
      if ((d > 0) === (ret > 0)) r.hits++;
      r.equity *= 1 + d * ret; // long the call up, short it down
    }
    arenaBrainLearn(brain, calls, ret); // learners update AFTER the day settles
  }
  return {
    rows: rows.sort((a, b) => b.hits / b.n - a.hits / a.n),
    holdEquity: 100 * (prices[prices.length - 1] / prices[ARENA_WARM]),
    tomorrow: arenaCallAt(prices, prices.length - 1, brain),
    brain,
  };
}

let arenaSym = localStorage.getItem('arenaSym') || 'BTC';
const ARENA_CACHE = {}; // symbol → closes[]; one fetch per tree per visit

function renderArenaSheet() {
  const body = $('#arenaSheetBody');
  const trees = DATA ? DATA.trees : [];
  if (!trees.find(t => t.symbol === arenaSym)) arenaSym = trees[0] ? trees[0].symbol : 'BTC';
  body.innerHTML = `
    <p class="arena-pitch">${L().arenaPick}</p>
    <div class="arena-pick">${trees.map(t =>
      `<button class="hz-btn arena-coin ${t.symbol === arenaSym ? 'active' : ''}" data-s="${t.symbol}">${t.char} ${t.symbol}</button>`).join('')}</div>
    <button class="cp-btn sim-run" id="arenaRunBtn">${L().arenaRun}</button>
    <div class="arena-out" id="arenaOut"></div>
    <p class="bets-note arena-note">${L().arenaNote}</p>`;
  body.querySelectorAll('.arena-coin').forEach(b => b.onclick = () => {
    arenaSym = b.dataset.s;
    localStorage.setItem('arenaSym', arenaSym);
    body.querySelectorAll('.arena-coin').forEach(x => x.classList.toggle('active', x.dataset.s === arenaSym));
  });
  $('#arenaRunBtn').onclick = runArena;
}

async function runArena() {
  const out = $('#arenaOut');
  const btn = $('#arenaRunBtn');
  btn.disabled = true;
  out.innerHTML = `<div class="ai-loading arena-loading">${L().arenaLoading}</div>`;
  try {
    if (!ARENA_CACHE[arenaSym]) {
      const r = await fetch(`/api/history?symbol=${encodeURIComponent(arenaSym)}&days=430`);
      const j = await r.json();
      if (j.error || !j.points || j.points.length < ARENA_WARM + 30) throw new Error(j.error || 'not enough history');
      // some providers return more than asked — trim to 1 year + warmup so
      // "1-year replay" stays honest for every tree
      const cutoff = j.points[j.points.length - 1].t - (365 + 45) * 86400000;
      ARENA_CACHE[arenaSym] = j.points.filter(p => p.t >= cutoff).map(p => p.price);
    }
    const prices = ARENA_CACHE[arenaSym];
    const { rows, holdEquity, tomorrow, brain } = runArenaReplay(prices);
    const tree = DATA.trees.find(t => t.symbol === arenaSym);
    sfx('rain');

    const monkey = rows.find(r => r.c.monkey);
    const monkeyAcc = monkey.hits / monkey.n;
    const beaten = rows.filter(r => !r.c.monkey && r.hits / r.n < monkeyAcc).length;
    const fmt$ = v => (v >= 100 ? '💰 ' : '💸 ') + '$' + v.toFixed(0);

    const board = rows.map((r, rank) => {
      const acc = 100 * r.hits / r.n;
      const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`;
      return `<div class="arena-row ${r.c.monkey ? 'arena-monkey' : ''} ${r.c.learner ? 'arena-learner' : ''}">
        <span class="ar-rank">${medal}</span>
        <span class="ar-face">${r.c.face}</span>
        <span class="ar-name">${r.c.name}${r.c.learner ? ' <span class="ar-tag">learns</span>' : ''}</span>
        <span class="ar-bar"><i style="width:${acc.toFixed(1)}%"></i></span>
        <span class="ar-acc">${acc.toFixed(1)}%</span>
        <span class="ar-worth">${L().arenaWorth} ${fmt$(r.equity)}</span>
      </div>`;
    }).join('');

    const calls = ARENA_CAST.map(c => {
      const d = tomorrow[c.key];
      return `<div class="arena-call ${d > 0 ? 'up' : 'down'}">
        <span class="ar-face">${c.face}</span>
        <div class="ac-main"><b>${c.name}</b> · ${d > 0 ? L().dirGrow : L().dirWilt}
          <div class="imp-why">“${escapeHtml(c.why(d, prices, prices.length - 1, brain))}”</div></div>
      </div>`;
    }).join('');

    out.innerHTML = `
      <div class="arena-board-h">${L().arenaBoard.replace('{n}', rows[0].n)} · ${tree ? tree.char + ' ' + escapeHtml(tree.name) : arenaSym}</div>
      <div class="arena-board">${board}</div>
      <div class="arena-lesson">${beaten > 0 ? L().arenaMonkey.replace('{n}', beaten).replace('{total}', rows.length - 1) : L().arenaMonkeyZero}</div>
      <div class="arena-hold">${L().arenaHold.replace('{v}', fmt$(holdEquity))}</div>
      <div class="arena-board-h">${L().arenaTomorrow}</div>
      <div class="arena-calls">${calls}</div>`;
  } catch (e) {
    out.innerHTML = `<p class="sim-warn">${L().arenaErr}</p>`;
  }
  btn.disabled = false;
}

$('#arenaBtn').onclick = () => { renderArenaSheet(); openSheet('arenaSheet'); };

/* ---------------- 👤 speculator profile — live game dashboard --------------- */
/* Create a profile, then every speculation you place anywhere in the forest
   (seeds, guesses, the form below) is tracked here LIVE: open positions
   re-price against real quotes every 30s, settled ones build your record,
   record builds XP, XP builds your rank. All localStorage, all pretend money. */
const PROF_FACES = ['🦊', '🦉', '🐺', '🐢', '🦁', '🐸', '🐙', '🦄', '🐝', '🦈', '🐿️', '🐉'];
let PROF = JSON.parse(localStorage.getItem('profile') || 'null');
let profHistory = JSON.parse(localStorage.getItem('profHistory') || '[]');
let profPickFace = PROF ? PROF.avatar : PROF_FACES[0];
let profEditing = false;
function saveProf() {
  localStorage.setItem('profile', JSON.stringify(PROF));
  localStorage.setItem('profHistory', JSON.stringify(profHistory));
}
const profLevel = xp => Math.min(6, Math.floor(Math.sqrt((xp || 0) / 60)));
const profLevelFloor = lv => 60 * lv * lv;

/* every settle (auto or harvest) flows through here → history + XP + rank */
function recordSettle(s, pnl) {
  profHistory.unshift({
    t: Date.now(), symbol: s.symbol, dir: s.dir, amount: s.amount,
    entry: s.entry, pnl: +pnl.toFixed(2), game: s.game || 'seed',
  });
  if (profHistory.length > 80) profHistory.pop();
  if (PROF) {
    const win = pnl >= 0;
    PROF.streak = win ? Math.max(1, PROF.streak + 1) : Math.min(-1, PROF.streak - 1);
    if (win) { PROF.wins++; PROF.xp += 25 + Math.max(0, PROF.streak - 1) * 5; }
    else { PROF.losses++; PROF.xp += 10; }
    if (PROF.bestPnl == null || pnl > PROF.bestPnl) PROF.bestPnl = +pnl.toFixed(2);
    if (PROF.worstPnl == null || pnl < PROF.worstPnl) PROF.worstPnl = +pnl.toFixed(2);
  }
  saveProf();
  renderProfStrip();
}

function profOpenPnl() {
  return garden.reduce((a, s) => a + seedValue(s).pnl, 0);
}

function renderProfStrip() {
  const strip = $('#profStrip');
  if (!strip) return;
  strip.hidden = false;
  const body = $('#profBody');

  if (!PROF || profEditing) {
    const faces = PROF_FACES.map(f =>
      `<button class="prof-face ${f === profPickFace ? 'on' : ''}" data-f="${f}">${f}</button>`).join('');
    body.innerHTML = `
      <div class="prof-create">
        <div class="prof-create-h">${profEditing ? L().profEdit : L().profCreateH}</div>
        <p class="prof-create-sub">${L().profCreateSub}</p>
        <div class="prof-faces">${faces}</div>
        <div class="prof-create-row">
          <input id="profName" class="prof-name-in" maxlength="24" placeholder="${L().profNamePh}"
            value="${PROF ? escapeHtml(PROF.name) : ''}" />
          <button class="cp-btn" id="profCreateBtn">${profEditing ? L().profSave : L().profStart}</button>
        </div>
      </div>`;
    body.querySelectorAll('.prof-face').forEach(b => b.onclick = () => {
      profPickFace = b.dataset.f;
      body.querySelectorAll('.prof-face').forEach(x => x.classList.toggle('on', x.dataset.f === profPickFace));
      sfx('pop');
    });
    $('#profCreateBtn').onclick = () => {
      const name = ($('#profName').value || '').trim() || 'Speculator';
      if (!PROF) PROF = { name, avatar: profPickFace, created: Date.now(), xp: 0, wins: 0, losses: 0, streak: 0, bestPnl: null, worstPnl: null };
      else { PROF.name = name; PROF.avatar = profPickFace; }
      profEditing = false;
      saveProf(); sfx('pop');
      renderProfStrip();
    };
    $('#profBtnLabel').textContent = L().profBtn;
    return;
  }

  const lv = profLevel(PROF.xp);
  const nextFloor = profLevelFloor(lv + 1), floor = profLevelFloor(lv);
  const prog = lv >= 6 ? 100 : Math.round(100 * (PROF.xp - floor) / (nextFloor - floor));
  const open = garden.length;
  const openPnl = profOpenPnl();
  const settled = PROF.wins + PROF.losses;
  const hitRate = settled ? Math.round(100 * PROF.wins / settled) : null;
  body.innerHTML = `
    <div class="prof-bar">
      <span class="prof-avatar">${PROF.avatar}</span>
      <div class="prof-id">
        <b>${escapeHtml(PROF.name)}</b>
        <div class="prof-rank">${L().profLevels[lv]} · <span class="prof-xp">${PROF.xp} xp</span></div>
        <div class="prof-xpbar"><i style="width:${prog}%"></i></div>
      </div>
      <div class="prof-quick">
        <span class="prof-chip">💰 $${wallet.toFixed(2)}</span>
        <span class="prof-chip">🌱 ${gardenScore >= 0 ? '+' : ''}${Math.round(gardenScore)}</span>
        ${hitRate != null ? `<span class="prof-chip">🎯 ${hitRate}%</span>` : ''}
        <span class="prof-chip prof-live-chip ${open ? (openPnl >= 0 ? 'up' : 'down') : ''}" id="profLivePnl">
          📡 ${open} ${L().profLive} ${open ? `· ${openPnl >= 0 ? '+' : '−'}$${Math.abs(openPnl).toFixed(2)}` : ''}</span>
      </div>
      <button class="cp-btn prof-open-btn" id="profOpenBtn">👤 ${L().profBtn}</button>
    </div>`;
  $('#profOpenBtn').onclick = () => { renderProfSheet(); openSheet('profileSheet'); };
  $('#profBtnLabel').textContent = PROF.avatar + ' ' + PROF.name.split(' ')[0];
}

function renderProfSheet() {
  const body = $('#profSheetBody');
  if (!PROF) { body.innerHTML = ''; renderProfStrip(); return; }
  const settled = PROF.wins + PROF.losses;
  const hitRate = settled ? Math.round(100 * PROF.wins / settled) : 0;
  const lv = profLevel(PROF.xp);

  const openRows = garden.map((s, i) => {
    const t = DATA.trees.find(x => x.symbol === s.symbol);
    const { pnl } = seedValue(s);
    const good = pnl >= 0;
    return `<div class="prof-pos ${good ? 'up' : 'down'}">
      <span class="pp-ico">${s.game === 'guess' ? '🎯' : s.dir > 0 ? '🌱' : '🥀'}</span>
      <div class="pp-main"><b>${t ? t.char + ' ' + escapeHtml(t.name) : s.symbol}</b>
        · ${s.dir > 0 ? L().seedLong : L().seedShort} · $${s.amount}
        <div class="imp-why">${fmtMoney(s.entry)} → <span class="pp-now">${t ? fmtMoney(t.price) : '—'}</span> · ${countdown(s)}</div></div>
      <span class="pp-pnl">${good ? '+' : '−'}$${Math.abs(pnl).toFixed(2)}</span>
    </div>`;
  }).join('');

  const histRows = profHistory.slice(0, 20).map(h => {
    const t = DATA.trees.find(x => x.symbol === h.symbol);
    const good = h.pnl >= 0;
    return `<div class="prof-hist ${good ? 'up' : 'down'}">
      <span>${good ? '🎉' : '💸'}</span>
      <span class="ph-main">${t ? t.char : ''} ${h.symbol} ${h.dir > 0 ? '🌱' : '🥀'} $${h.amount} · ${new Date(h.t).toISOString().slice(5, 10)}</span>
      <b>${good ? '+' : '−'}$${Math.abs(h.pnl).toFixed(2)}</b>
    </div>`;
  }).join('');

  const treeOpts = DATA.trees.filter(t => t.price != null)
    .map(t => `<option value="${t.symbol}">${t.char} ${t.symbol} — ${escapeHtml(t.name)}</option>`).join('');

  body.innerHTML = `
    <div class="prof-sheet-head">
      <span class="prof-avatar big">${PROF.avatar}</span>
      <div><b class="prof-sheet-name">${escapeHtml(PROF.name)}</b>
        <div class="prof-rank">${L().profLevels[lv]} · ${PROF.xp} xp</div>
        <div class="imp-why">${L().profXpNote}</div></div>
      <button class="hz-btn" id="profEditBtn">${L().profEdit}</button>
    </div>
    <div class="prof-stats">
      <div class="ps-cell"><b>${PROF.wins}</b>${L().profWins}</div>
      <div class="ps-cell"><b>${PROF.losses}</b>${L().profLosses}</div>
      <div class="ps-cell"><b>${hitRate}%</b>${L().profHit}</div>
      <div class="ps-cell"><b>${PROF.streak > 0 ? '🔥' + PROF.streak : PROF.streak < 0 ? '🥶' + Math.abs(PROF.streak) : '—'}</b>${L().profStreak}</div>
      <div class="ps-cell"><b>${PROF.bestPnl != null ? '+$' + Math.abs(PROF.bestPnl).toFixed(2) : '—'}</b>${L().profBest}</div>
      <div class="ps-cell"><b>${PROF.worstPnl != null ? '−$' + Math.abs(PROF.worstPnl).toFixed(2) : '—'}</b>${L().profWorst}</div>
    </div>
    <div class="prof-sec-h">${L().profOpen}</div>
    ${openRows || `<p class="prof-empty">${L().profNoOpen}</p>`}
    <div class="prof-sec-h">${L().profNewH}</div>
    <div class="prof-new">
      <select id="specTree" class="prof-select">${treeOpts}</select>
      <div class="prof-new-row">
        <button class="hz-btn spec-dir on" data-d="1">${L().profGrow}</button>
        <button class="hz-btn spec-dir" data-d="-1">${L().profWilt}</button>
        <span class="prof-new-gap"></span>
        ${[25, 50, 100, 250].map((v, i) => `<button class="hz-btn spec-stake ${i === 2 ? 'on' : ''}" data-v="${v}">$${v}</button>`).join('')}
        <span class="prof-new-gap"></span>
        ${HORIZONS.map((h, i) => `<button class="hz-btn spec-hz ${i === 2 ? 'on' : ''}" data-h="${h.key}">${hzLabel(h.key)}</button>`).join('')}
      </div>
      <button class="cp-btn" id="specPlace">${L().profPlace}</button>
    </div>
    <div class="prof-sec-h">${L().profHistoryH}</div>
    ${histRows || `<p class="prof-empty">${L().profNoHistory}</p>`}
    <p class="bets-note">${L().profNote}</p>`;

  $('#profEditBtn').onclick = () => { profEditing = true; profPickFace = PROF.avatar; closeSheet('profileSheet'); renderProfStrip(); $('#profStrip').scrollIntoView({ behavior: 'smooth' }); };
  const pick = (sel, attr) => body.querySelectorAll(sel).forEach(b => b.onclick = () => {
    body.querySelectorAll(sel).forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  });
  pick('.spec-dir'); pick('.spec-stake'); pick('.spec-hz');
  $('#specPlace').onclick = () => {
    const sym = $('#specTree').value;
    const t = DATA.trees.find(x => x.symbol === sym);
    if (!t || t.price == null) { toast('⚠ no live price for this tree right now'); return; }
    const dir = +body.querySelector('.spec-dir.on').dataset.d;
    const amount = +body.querySelector('.spec-stake.on').dataset.v;
    const hz = HORIZONS.find(h => h.key === body.querySelector('.spec-hz.on').dataset.h);
    garden.push({
      symbol: sym, dir, amount, entry: t.price,
      date: new Date().toISOString().slice(0, 10),
      hzKey: hz.key, expiresAt: Date.now() + hz.days * 86400000,
    });
    saveGarden(); sfx('pop');
    toast(L().profPlaced);
    renderSeedBadges(); renderGardenBtn(); renderProfSheet(); renderProfStrip();
  };
}

/* the realtime pulse: re-quote open symbols every 30s so P&L ticks live */
async function profLiveTick() {
  if (!DATA || !garden.length) { renderProfStrip(); return; }
  const syms = [...new Set(garden.map(s => s.symbol))].slice(0, 6);
  let changed = false;
  for (const sym of syms) {
    try {
      const j = await (await fetch(`/api/quote?symbol=${sym}`)).json();
      const t = DATA.trees.find(x => x.symbol === sym);
      if (t && j.quote && j.quote.price != null && j.quote.price !== t.price) {
        t.price = j.quote.price;
        changed = true;
        const tree = treeEls[sym];
        if (tree) tree.querySelector('.tree-price').textContent = fmtMoney(t.price);
      }
    } catch (e) { /* next tick */ }
  }
  renderProfStrip();
  renderGardenBtn();
  if (changed && $('#profileSheet').classList.contains('open')) renderProfSheet();
  const chip = $('#profLivePnl');
  if (chip && changed) { chip.classList.remove('tick'); void chip.offsetWidth; chip.classList.add('tick'); }
}

$('#profBtn').onclick = () => {
  if (!PROF) { $('#profStrip').scrollIntoView({ behavior: 'smooth' }); renderProfStrip(); return; }
  renderProfSheet(); openSheet('profileSheet');
};

/* ---------------- panel plumbing + Escape ---------------- */
function openPanel() { $('#cloudPanel').classList.add('open'); $('#cloudScrim').classList.add('on'); }
function closePanel() {
  $('#cloudPanel').classList.remove('open');
  $('#cloudScrim').classList.remove('on');
  window.speechSynthesis && window.speechSynthesis.cancel();
}
$('#cpClose').onclick = closePanel;
$('#cloudScrim').onclick = () => { closePanel(); closeSheet('newsSheet'); closeSheet('gardenSheet'); closeSheet('simSheet'); closeSheet('arenaSheet'); closeSheet('profileSheet'); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanel(); closeSheet('newsSheet'); closeSheet('gardenSheet'); closeSheet('simSheet'); closeSheet('arenaSheet'); closeSheet('profileSheet'); } });

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
