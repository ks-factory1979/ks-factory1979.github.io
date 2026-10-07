// =========================================================
// 10の塔 GAS版 v2.0.14
// ヒント調整・段階加速・基本／おちてくるチュートリアル
// =========================================================

// ========= 定数と素材 =========
const ASSETS = {
  towers: [
    APP_ASSETS['assets/towers/tower_0.png'],
    APP_ASSETS['assets/towers/tower_1.png'],
    APP_ASSETS['assets/towers/tower_2.png'],
    APP_ASSETS['assets/towers/tower_3.png'],
    APP_ASSETS['assets/towers/tower_4.png'],
    APP_ASSETS['assets/towers/tower_5.png']
  ],
  blocks: [
    APP_ASSETS['assets/ui/blocks/block_1.png'],
    APP_ASSETS['assets/ui/blocks/block_2.png'],
    APP_ASSETS['assets/ui/blocks/block_3.png'],
    APP_ASSETS['assets/ui/blocks/block_4.png'],
    APP_ASSETS['assets/ui/blocks/block_5.png'],
    APP_ASSETS['assets/ui/blocks/block_6.png']
  ]
};
const TOWER_IMAGES = ASSETS.towers;
const BLOCK_IMAGES = ASSETS.blocks;
const COLOR_PALETTE = ['#f4a261','#e76f51','#2a9d8f','#e9c46a','#457b9d','#a3c4f3','#ffafcc','#90be6d'];
const DROP_ANIMATION_MS = 360;
const TOWER_THRESHOLDS = [3, 7, 12, 18, 25];
const TOWER_BRICKS = TOWER_THRESHOLDS[TOWER_THRESHOLDS.length - 1];
const FALLING_CONFIG = Object.freeze({
  durationSec: 180,
  bricksPerTower: TOWER_BRICKS,
  minCommunityRecords: 50,
  chainBonus: Object.freeze({1:0,2:1,3:3,4:6,5:10}),
  chainBonusCap: 10,
  goalNearBrickThreshold: 8,
  resultSubmitRetryMax: 2
});
const PAIR_FALLING_CONFIG = Object.freeze({
  durationSec: 180,
  modeId: 'pairFalling',
  modeName: 'ペアおち3分',
  subtitle: '2こをまわして れんさをねらえ！',
  chainBonus: Object.freeze({1:0,2:1,3:3,4:6,5:10}),
  chainBonusCap: 10,
  settleAnimationMs: 230
});
// 結果保存のみの設定。落下・連鎖のルールは変更しない。
const PAIR_RESULT_CONFIG = Object.freeze({
  modeId: 'pairFalling', storageKey: 'pairFalling3minRecordV1',
  minCommunityRecords: 50, submitRetryMax: 2, submitTimeoutMs: 10000
});

// おちてくるモード固定値
const FALLING_COLS = 7;
const FALLING_ROWS = 8;
const FALL_INTERVAL_MS = 1200;
const FALL_TUTORIAL_INTERVAL_MS = 2000;
const FALL_SPEED_INTERVALS = [1200, 1050, 900, 750, 650];
const FALL_SPEED_THRESHOLDS_MS = [0, 60000, 120000, 180000, 240000];
const LOCK_DELAY_MS = 400;
const MAX_LOCK_DELAY_MS = 1200;
const HARD_DROP_MS = 150;

const SPECIAL_FEATURE_CONFIG = Object.freeze({
  holdEnabled: true,
  holdOncePerTurn: true,
  chainPowerMax: 10,
  chainPowerGain: [1,2,3,4],
  starBlockEnabled: true,
  starBlockMaxOwned: 1,
  starEffectDurationMs: 1200,
  starParticleCount: 20,
  starScreenShakeEnabled: true
});
const STAR_BLOCK_IMAGE = APP_ASSETS['assets/ui/blocks/star_block.png'];
const BLOCK_KIND_NUMBER = 'number';
const BLOCK_KIND_STAR = 'star';
const BLOCK_KIND_PAIR = 'pair';

const DEFAULT_SETTINGS = Object.freeze({
  soundOn: true,
  hintOn: true,
  timeLimitMinutes: 3,
  boardCols: 5,
  boardRows: 6,
  numberRangeType: 'all',
  customNumbers: [1,2,3,4,5,6,7,8,9]
});

// ========= 状態管理 =========
let configuredCols = DEFAULT_SETTINGS.boardCols;
let configuredRows = DEFAULT_SETTINGS.boardRows;
let BOARD_COLS = configuredCols;
let BOARD_ROWS = configuredRows;
let TIME_LIMIT_MINUTES = DEFAULT_SETTINGS.timeLimitMinutes;
let numberRangeType = DEFAULT_SETTINGS.numberRangeType;
let customNumbers = [...DEFAULT_SETTINGS.customNumbers];

let board = [];
let numbersQueue = [];
let bricks = 0;
let tenCount = 0;
let bestChain = 0;
let noTenCounter = 0;
let currentMode = 'free';
let soundOn = true;
let hintOn = true;
let paused = false;
let animating = false;
let gameRunning = false;
let endingGame = false;
let towerStage = 0;
let completedTowers = 0;
let towerVisualToken = 0;
let gameSessionToken = 0;
let timerInterval = null;
let timeLeft = 0;

// おちてくるモード専用
let fallingPiece = null;
let fallingTimer = null;
let lockTimer = null;
let spawnTimer = null;
let countdownTimer = null;
let resumeCountdownActive = false;

// v1.1 チュートリアル・段階加速
let tutorialKind = null; // basic / falling / null
let tutorialStep = 0;
let tutorialTargetCol = null;
let tutorialExpectedControl = null;
let tutorialTransitionTimer = null;
let speedClockTimer = null;
let speedToastTimer = null;
let activeFallingTimeMs = 0;
let activeClockLastAt = 0;
let fallingSpeedLevel = 0;
let fallingChainBonusTotal = 0;
let fallingChallengeElapsedMs = 0;
let fallingChallengeClockLastAt = 0;
let fallingChallengeClockTimer = null;
let fallingTimeExpired = false;
let fallingTimeEnding = false;
let fallingLastTenShown = false;
let fallingVisibilityPaused = false;
let fallingResultViewToken = 0;
let pairResultRequest = null;

// v2.0.14 ペアおち3分 試作版
let pairPlacements = 0;
let pairSettling = false;
let pairIdCounter = 0;

// v2.0.11 特別ブロック・ホールド
let heldBlock = null;
let holdUsedThisTurn = false;
let chainPower = 0;
let pendingStarAward = false;
let starEffectActive = false;
let starEffectCleanupTimer = null;
let starAwardTimer = null;

// ========= 小物関数 =========
function getRandomColor() {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}
function getRandomTexture() {
  return BLOCK_IMAGES[Math.floor(Math.random() * BLOCK_IMAGES.length)];
}
function makeNumberObject(value = randomNumber()) {
  return { kind: BLOCK_KIND_NUMBER, val: Number(value), color: getRandomColor(), texture: getRandomTexture() };
}
function makeStarBlock() {
  return { kind: BLOCK_KIND_STAR, val: null, color: '#ffd83d', texture: STAR_BLOCK_IMAGE, bonus: true };
}
function isStarBlock(obj) { return !!(obj && obj.kind === BLOCK_KIND_STAR); }
function isPairBlock(obj) { return !!(obj && obj.kind === BLOCK_KIND_PAIR && obj.first && obj.second); }
function makePairNumberValue() {
  const allowed = [1,2,3,4,5,6,7,8,9];
  return allowed[Math.floor(Math.random() * allowed.length)];
}
function makePairObject(firstValue = null, secondValue = null, orientation = 0) {
  let first = Number(firstValue);
  if (!Number.isFinite(first) || first < 1 || first > 9) first = makePairNumberValue();
  let second = Number(secondValue);
  if (!Number.isFinite(second) || second < 1 || second > 9 || first + second === 10) {
    const candidates = [1,2,3,4,5,6,7,8,9].filter(n => first + n !== 10);
    second = candidates[Math.floor(Math.random() * candidates.length)];
  }
  return {
    kind: BLOCK_KIND_PAIR,
    pairId: `PAIR-${Date.now().toString(36)}-${(++pairIdCounter).toString(36)}`,
    first: makeNumberObject(first),
    second: makeNumberObject(second),
    orientation: ((Number(orientation) || 0) % 4 + 4) % 4
  };
}
function clonePairObject(obj) {
  if (!isPairBlock(obj)) return makePairObject();
  return {
    kind: BLOCK_KIND_PAIR,
    pairId: obj.pairId || `PAIR-${Date.now().toString(36)}-${(++pairIdCounter).toString(36)}`,
    first: cloneBlockObject(obj.first),
    second: cloneBlockObject(obj.second),
    orientation: ((Number(obj.orientation) || 0) % 4 + 4) % 4
  };
}
function cloneQueueObject(obj) {
  if (isPairBlock(obj)) return clonePairObject(obj);
  return cloneBlockObject(obj);
}
function normalizeBlockObject(obj) {
  if (!obj || typeof obj !== 'object') return makeNumberObject();
  if (obj.kind === BLOCK_KIND_STAR || obj.val === 'STAR') return makeStarBlock();
  return { kind: BLOCK_KIND_NUMBER, val: Math.max(1, Math.min(9, Number(obj.val) || 1)), color: obj.color || getRandomColor(), texture: obj.texture || getRandomTexture(), recentGarbage: !!obj.recentGarbage, garbageBatchId: obj.garbageBatchId || '' };
}
function cloneBlockObject(obj) {
  const normalized = normalizeBlockObject(obj);
  return { ...normalized };
}
function makeQueueObject() { return isPairFallingMode() ? makePairObject() : makeNumberObject(); }
function ensureNumberQueue() { while (numbersQueue.length < 3) numbersQueue.push(makeQueueObject()); }
function advanceCurrentQueue() { numbersQueue.shift(); ensureNumberQueue(); }
function hasStarBlockOwned() { return !!(heldBlock && isStarBlock(heldBlock)) || numbersQueue.some(isStarBlock); }
function resetSpecialGameplayState() {
  heldBlock = null; holdUsedThisTurn = false; chainPower = 0; pendingStarAward = false; starEffectActive = false;
  if (starEffectCleanupTimer) clearTimeout(starEffectCleanupTimer);
  if (starAwardTimer) clearTimeout(starAwardTimer);
  starEffectCleanupTimer = starAwardTimer = null;
  cleanupStarEffectDom();
  const award = document.getElementById('star-award-toast'); if (award) { award.hidden = true; award.classList.remove('show'); }
}
function toFullWidthDigits(value) {
  return String(value).replace(/[0-9]/g, d => String.fromCharCode(d.charCodeAt(0) + 0xFEE0));
}

function renderBlockTile(el, obj, fallbackTexture) {
  if (!el) return;
  el.classList.toggle('star-tile', isStarBlock(obj));
  el.classList.toggle('pair-tile', isPairBlock(obj));
  el.innerHTML = '';
  el.style.backgroundImage = '';
  if (!obj) {
    el.textContent = '－';
    return;
  }
  if (isPairBlock(obj)) {
    const wrap = document.createElement('span');
    wrap.className = `pair-mini-wrap o${((Number(obj.orientation)||0)%4+4)%4}`;
    const link = document.createElement('i'); link.className = 'pair-mini-link'; link.setAttribute('aria-hidden','true');
    const a = document.createElement('span'); a.className = 'pair-mini-block pair-mini-a'; a.textContent = String(obj.first.val); a.style.backgroundImage = `url('${obj.first.texture || BLOCK_IMAGES[0]}')`;
    const b = document.createElement('span'); b.className = 'pair-mini-block pair-mini-b'; b.textContent = String(obj.second.val); b.style.backgroundImage = `url('${obj.second.texture || BLOCK_IMAGES[1]}')`;
    wrap.append(link,a,b); el.appendChild(wrap);
    return;
  }
  el.textContent = isStarBlock(obj) ? '' : String(obj.val);
  el.style.backgroundImage = `url('${obj.texture || fallbackTexture || BLOCK_IMAGES[0]}')`;
}
function updateActionControlVisibility() {
  const controls = document.getElementById('falling-controls');
  if (!controls) return;
  const tutorial = isTutorialMode();
  const showMovement = isFallingMode();
  const showHold = !!(SPECIAL_FEATURE_CONFIG.holdEnabled && !tutorial);
  controls.hidden = !(showMovement || showHold);
  controls.classList.toggle('hold-only', showHold && !showMovement);
  ['move-left-btn','hard-drop-btn','move-right-btn'].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.hidden = !showMovement;
  });
  ['rotate-left-btn','rotate-right-btn'].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.hidden = !isPairFallingMode();
  });
  const holdButton = document.getElementById('hold-swap-btn');
  if (holdButton) holdButton.hidden = !showHold;
}
function canUseHold() {
  if (!SPECIAL_FEATURE_CONFIG.holdEnabled || isTutorialMode()) return false;
  return !!(gameRunning && isGameScreenActive() && !paused && !animating && !endingGame && !resumeCountdownActive && !starEffectActive && numbersQueue[0] && !holdUsedThisTurn && (!isFallingMode() || fallingPiece));
}
function updateHoldAvailability() {
  const display = document.getElementById('hold-card');
  const button = document.getElementById('hold-swap-btn');
  const lock = document.getElementById('hold-button-lock');
  const indicator = document.getElementById('hold-exchange-indicator');
  const available = canUseHold();
  const hasStar = !!heldBlock && isStarBlock(heldBlock);
  if (display) {
    display.classList.toggle('star-held', hasStar);
    display.classList.toggle('hold-used', !!holdUsedThisTurn);
    const value = !heldBlock ? 'なし' : (hasStar ? '星ブロック' : (isPairBlock(heldBlock) ? `${heldBlock.first.val}と${heldBlock.second.val}のペア` : String(heldBlock.val)));
    display.setAttribute('aria-label', `あとで使うブロック：${value}`);
  }
  if (button) {
    button.disabled = !available;
    button.setAttribute('aria-disabled', String(!available));
    button.classList.toggle('hold-used', !!holdUsedThisTurn);
    button.setAttribute('aria-label', heldBlock ? 'あとで使うブロックと今のブロックを入れ替える' : '今のブロックをあとで使う');
  }
  if (lock) lock.hidden = !holdUsedThisTurn;
  if (indicator) {
    indicator.classList.toggle('available', available);
    indicator.classList.toggle('locked', !!holdUsedThisTurn);
  }
}
function makeQueueObjectFromFalling(piece) {
  if (isPairBlock(piece)) {
    const pair = clonePairObject(piece);
    pair.orientation = ((Number(piece.orientation)||0)%4+4)%4;
    return pair;
  }
  return cloneBlockObject(piece);
}
function respawnCurrentPairQueuePiece(delay = 100) {
  clearNamedTimer('falling'); clearNamedTimer('lock'); clearNamedTimer('spawn');
  fallingPiece = null; removeFallingVisuals();
  animating = false;
  scheduleSpawn(delay);
}
function holdCurrentPairBlock() {
  if (!canUseHold() || !fallingPiece) return false;
  const incoming = makeQueueObjectFromFalling(fallingPiece);
  if (!heldBlock) {
    heldBlock = incoming;
    advanceCurrentQueue();
  } else {
    const swap = cloneQueueObject(heldBlock);
    heldBlock = incoming;
    numbersQueue[0] = swap;
  }
  holdUsedThisTurn = true;
  playHoldSound();
  respawnCurrentPairQueuePiece(90);
  updateInfoPanels(); updateBoardUI(); updateHints(); updateFallingControls();
  return true;
}
function holdCurrentBlock() {
  if (!canUseHold()) {
    if (gameRunning && holdUsedThisTurn && !animating && !paused) showToast('このブロックを おいてから つかえるよ');
    return;
  }
  if (isPairFallingMode()) {
    holdCurrentPairBlock();
    return;
  }
  const incoming = cloneBlockObject(numbersQueue[0]);
  if (!heldBlock) {
    heldBlock = incoming;
    advanceCurrentQueue();
  } else {
    const swap = cloneBlockObject(heldBlock);
    heldBlock = incoming;
    numbersQueue[0] = swap;
  }
  holdUsedThisTurn = true;
  if (isFallingMode() && fallingPiece) {
    const wasLocking = fallingPiece.phase === 'locking';
    if (wasLocking) accrueLockTime();
    clearNamedTimer('falling'); clearNamedTimer('lock');
    const next = normalizeBlockObject(numbersQueue[0]);
    fallingPiece.kind = next.kind;
    fallingPiece.val = next.val;
    fallingPiece.color = next.color;
    fallingPiece.texture = next.texture;
    renderFallingVisual();
    if (canFall()) { fallingPiece.phase = 'falling'; scheduleFallingStep(180); }
    else beginLockDelay();
  }
  playHoldSound();
  updateInfoPanels(); updateBoardUI(); updateHints(); updateFallingControls();
  if (isBattleMode() && typeof battlePersistLocalSnapshot === 'function') battlePersistLocalSnapshot();
}
function playHoldSound() {
  if (!soundOn) return;
  try {
    const ctx = getAudioContext(); if (!ctx) return;
    const now = ctx.currentTime;
    [520,690].forEach((freq,i)=>{ const osc=ctx.createOscillator(), gain=ctx.createGain(); osc.type='sine'; osc.frequency.setValueAtTime(freq,now+i*.045); gain.gain.setValueAtTime(.0001,now+i*.045); gain.gain.exponentialRampToValueAtTime(.07,now+i*.045+.012); gain.gain.exponentialRampToValueAtTime(.0001,now+i*.045+.11); osc.connect(gain).connect(ctx.destination); osc.start(now+i*.045); osc.stop(now+i*.045+.12); });
  } catch(e) {}
}
function updateChainPowerUI() {
  const panel = document.getElementById('chain-power-panel');
  const value = document.getElementById('chain-power-value');
  const segments = document.getElementById('chain-power-segments');
  if (!panel || !segments) return;
  if (!segments.children.length) for (let i=0;i<SPECIAL_FEATURE_CONFIG.chainPowerMax;i++){ const seg=document.createElement('span'); seg.className='chain-power-segment'; segments.appendChild(seg); }
  Array.from(segments.children).forEach((seg,i)=>seg.classList.toggle('filled',i<chainPower));
  if (value) value.textContent = `${chainPower} / ${SPECIAL_FEATURE_CONFIG.chainPowerMax}`;
  panel.setAttribute('aria-label',`れんさパワー ${chainPower} / ${SPECIAL_FEATURE_CONFIG.chainPowerMax}`);
  panel.classList.toggle('full',chainPower>=SPECIAL_FEATURE_CONFIG.chainPowerMax);
}
function addChainPower(chainStages) {
  if (!SPECIAL_FEATURE_CONFIG.starBlockEnabled || chainStages <= 0) return;
  const gains = SPECIAL_FEATURE_CONFIG.chainPowerGain;
  let gain = 0;
  for (let stage=1;stage<=chainStages;stage++) gain += gains[Math.min(stage,gains.length)-1] || gains[gains.length-1] || 1;
  const owned = hasStarBlockOwned();
  const cap = owned ? SPECIAL_FEATURE_CONFIG.chainPowerMax - 1 : SPECIAL_FEATURE_CONFIG.chainPowerMax;
  chainPower = Math.min(cap, chainPower + gain);
  if (!owned && chainPower >= SPECIAL_FEATURE_CONFIG.chainPowerMax) pendingStarAward = true;
  updateChainPowerUI();
}
function awardPendingStarBlock() {
  if (!pendingStarAward) return false;
  if (hasStarBlockOwned()) { pendingStarAward=false; chainPower=Math.min(chainPower,SPECIAL_FEATURE_CONFIG.chainPowerMax-1); updateChainPowerUI(); return false; }
  numbersQueue.unshift(makeStarBlock());
  pendingStarAward = false;
  chainPower = 0;
  updateInfoPanels();
  showStarAwardToast();
  playStarAwardSound();
  if (isBattleMode() && typeof battlePersistLocalSnapshot === 'function') battlePersistLocalSnapshot();
  return true;
}
function showStarAwardToast() {
  const toast=document.getElementById('star-award-toast'); if(!toast)return;
  if(starAwardTimer)clearTimeout(starAwardTimer);
  toast.hidden=false; toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
  starAwardTimer=setTimeout(()=>{toast.hidden=true;toast.classList.remove('show');starAwardTimer=null;},1080);
}
function getAudioContext() {
  if (!soundOn) return null;
  if (!window.__tenTowerAudioContext) window.__tenTowerAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  const ctx=window.__tenTowerAudioContext; if(ctx.state==='suspended')ctx.resume().catch(()=>{}); return ctx;
}


// ========= おちてくる3分：連鎖上昇SE（v2.0.14） =========
// 1〜8連鎖を「ド・レ・ミ・ファ・ソ・ラ・シ・高いド」で表現する。
// 8連鎖以上は高いドに短い「キラッ」を重ねる。将来のペア落下モードでも再利用できる共通関数。
const CHAIN_RISE_SE_CONFIG = Object.freeze({
  frequencies: Object.freeze([
    261.625565, // C4 ド
    293.664768, // D4 レ
    329.627557, // E4 ミ
    349.228231, // F4 ファ
    391.995436, // G4 ソ
    440.000000, // A4 ラ
    493.883301, // B4 シ
    523.251131  // C5 高いド
  ]),
  harmonicGains: Object.freeze([1.00, 0.30, 0.10]),
  mainGain: 0.082,
  attackSec: 0.008,
  decaySec: 0.34,
  sparkle: Object.freeze([
    Object.freeze({ delaySec: 0.050, frequency: 1046.502261, gain: 0.044 }), // C6
    Object.freeze({ delaySec: 0.100, frequency: 1318.510228, gain: 0.039 }), // E6
    Object.freeze({ delaySec: 0.150, frequency: 1567.981744, gain: 0.034 })  // G6
  ])
});
function playChainRiseSE(chainCount) {
  // 正式対象は「おちてくる3分」と「ペアおち3分」。チュートリアル・じゆう・3分チャレンジ・対戦では鳴らさない。
  if (!soundOn || !(isRealFallingMode() || isPairFallingMode())) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const rawStage = Math.floor(Number(chainCount) || 1);
    const stage = Math.max(1, rawStage);
    const frequency = CHAIN_RISE_SE_CONFIG.frequencies[Math.min(8, stage) - 1];
    const now = ctx.currentTime;
    const stopAt = now + CHAIN_RISE_SE_CONFIG.decaySec + 0.05;

    // 木琴・マリンバらしい短い減衰音。共通AudioContextを再利用し、ゲーム進行は一切待たせない。
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(CHAIN_RISE_SE_CONFIG.mainGain, now + CHAIN_RISE_SE_CONFIG.attackSec);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + CHAIN_RISE_SE_CONFIG.decaySec);
    bus.connect(ctx.destination);

    CHAIN_RISE_SE_CONFIG.harmonicGains.forEach((weight, index) => {
      const osc = ctx.createOscillator();
      const harmonicGain = ctx.createGain();
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(frequency * (index + 1), now);
      harmonicGain.gain.setValueAtTime(weight, now);
      osc.connect(harmonicGain).connect(bus);
      osc.start(now);
      osc.stop(stopAt);
    });

    // 8連鎖以上は、試聴で確認した「キラッ強化版」に近い3段の高音を重ねる。
    if (stage >= 8) {
      CHAIN_RISE_SE_CONFIG.sparkle.forEach(spec => {
        const start = now + spec.delaySec;
        const end = start + 0.22;
        const sparkleBus = ctx.createGain();
        sparkleBus.gain.setValueAtTime(0.0001, start);
        sparkleBus.gain.exponentialRampToValueAtTime(spec.gain, start + 0.007);
        sparkleBus.gain.exponentialRampToValueAtTime(0.0001, end);
        sparkleBus.connect(ctx.destination);

        const primary = ctx.createOscillator();
        primary.type = 'sine';
        primary.frequency.setValueAtTime(spec.frequency, start);
        primary.connect(sparkleBus);
        primary.start(start);
        primary.stop(end + 0.02);

        // ごく薄い倍音でガラス・ベル感を足す。
        const overtone = ctx.createOscillator();
        const overtoneGain = ctx.createGain();
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(spec.frequency * 2.01, start);
        overtoneGain.gain.setValueAtTime(0.22, start);
        overtone.connect(overtoneGain).connect(sparkleBus);
        overtone.start(start);
        overtone.stop(end + 0.02);
      });
    }
  } catch (e) {}
}


// ========= 正式BGM管理（v2.0.14） =========
const AUDIO_CONFIG = Object.freeze({
  bgmMasterGain: 0.70,
  normalFadeMs: 250,
  battleLast30CrossfadeMs: 500,
  battleEndFadeMs: 200,
  hiddenFadeMs: 90,
  battleDriftResyncSec: 0.80,
  battleDriftCheckIntervalMs: 900,
  resultMinimumDelayAfterBattleEndMs: 205
});
const BGM_TRACKS = Object.freeze({
  titleIntro:{asset:'titleIntro',loop:false}, titleLoop:{asset:'titleLoop',loop:true},
  menuLoop:{asset:'menuLoop',loop:true}, freeLoop:{asset:'freeLoop',loop:true},
  fallingLoop:{asset:'fallingLoop',loop:true}, challengeLoop:{asset:'challengeLoop',loop:true},
  battleLoop:{asset:'battleLoop',loop:true}, battleLast30:{asset:'battleLast30',loop:false},
  resultLoop:{asset:'resultLoop',loop:true}
});
const BGMController = (()=>{
  const buffers=new Map();
  const loading=new Map();
  let masterGain=null, active=null, generation=0, desiredKey=null, initialized=false, unlocked=false;
  let currentScreenName='title', pausedInfo=null, visibilityPaused=false, battleMatchId=null;
  let lastBattleDriftCheck=0, battleEndUntil=0, resultStartTimer=null, deferredSyncTimer=null;
  const coreKeys=['titleIntro','titleLoop','menuLoop'];
  const backgroundKeys=['freeLoop','fallingLoop','challengeLoop','battleLoop','battleLast30','resultLoop'];

  function ctx(){ return getAudioContext(); }
  function debug(...args){ if(new URLSearchParams(location.search).get('test')==='1') console.debug('[BGM]',...args); }
  function ensureMaster(c){
    if(!c) return null;
    if(!masterGain){ masterGain=c.createGain(); masterGain.gain.setValueAtTime(AUDIO_CONFIG.bgmMasterGain,c.currentTime); masterGain.connect(c.destination); }
    return masterGain;
  }
  function decodeDataUri(uri){
    const comma=String(uri||'').indexOf(','); if(comma<0) throw new Error('BGM_ASSET_INVALID');
    const raw=atob(uri.slice(comma+1)); const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
    return bytes.buffer;
  }
  async function loadBuffer(key){
    if(buffers.has(key)) return buffers.get(key);
    if(loading.has(key)) return loading.get(key);
    const track=BGM_TRACKS[key], uri=window.APP_AUDIO_ASSETS&&track&&APP_AUDIO_ASSETS[track.asset];
    if(!track||!uri) throw new Error('BGM_ASSET_NOT_FOUND:'+key);
    const c=ctx(); if(!c) throw new Error('BGM_AUDIO_DISABLED'); ensureMaster(c);
    const promise=(async()=>{
      const arr=String(uri).startsWith('data:') ? decodeDataUri(uri) : await fetch(uri).then(response=>{
        if(!response.ok) throw new Error('BGM_ASSET_HTTP_ERROR:'+key+':'+response.status);
        return response.arrayBuffer();
      });
      const buffer=await new Promise((resolve,reject)=>{
        const p=c.decodeAudioData(arr.slice(0),resolve,reject);
        if(p&&typeof p.then==='function') p.then(resolve).catch(reject);
      });
      buffers.set(key,buffer); loading.delete(key); debug('decoded',key,buffer.duration.toFixed(3)); return buffer;
    })().catch(err=>{loading.delete(key); throw err;});
    loading.set(key,promise); return promise;
  }
  async function preload(keys){
    if(!soundOn) return;
    for(const key of keys){ try{ await loadBuffer(key); }catch(e){ debug('preload failed',key,e&&e.message); } }
  }
  function scheduleBackgroundPreload(){
    const run=()=>preload(backgroundKeys);
    if('requestIdleCallback' in window) requestIdleCallback(run,{timeout:1800}); else setTimeout(run,650);
  }
  function sourcePosition(group){
    if(!group||!group.primary||!group.primary.buffer) return 0;
    const c=ctx(); if(!c) return group.offset||0;
    const elapsed=Math.max(0,c.currentTime-group.startedAt);
    const raw=(group.offset||0)+elapsed;
    return group.loop ? raw%group.primary.buffer.duration : Math.min(raw,group.primary.buffer.duration);
  }
  function quietStopGroup(group, fadeMs=0){
    if(!group) return;
    const c=ctx(); if(!c){ group.sources.forEach(x=>{try{x.source.stop();}catch(e){}}); return; }
    const now=c.currentTime, sec=Math.max(0,fadeMs)/1000;
    group.sources.forEach(item=>{
      try{
        item.gain.gain.cancelScheduledValues(now);
        const current=Math.max(0.0001,item.gain.gain.value||0.0001);
        item.gain.gain.setValueAtTime(current,now);
        if(sec>0) item.gain.gain.linearRampToValueAtTime(0.0001,now+sec);
        else item.gain.gain.setValueAtTime(0.0001,now);
        item.source.stop(now+sec+0.035);
      }catch(e){}
    });
  }
  function setActive(group, oldGroup, fadeMs){
    active=group;
    if(oldGroup&&oldGroup!==group) quietStopGroup(oldGroup,fadeMs);
  }
  function createSource(buffer,{loop=false,offset=0,startAt=null,startGain=1,endGain=1,fadeInMs=0}={}){
    const c=ctx(), bus=ensureMaster(c), source=c.createBufferSource(), gain=c.createGain();
    source.buffer=buffer; source.loop=!!loop; source.connect(gain).connect(bus);
    const when=startAt===null?c.currentTime:startAt, safeOffset=loop&&buffer.duration?((offset%buffer.duration)+buffer.duration)%buffer.duration:Math.max(0,Math.min(offset,Math.max(0,buffer.duration-.005)));
    const fi=Math.max(0,fadeInMs)/1000;
    gain.gain.setValueAtTime(Math.max(0.0001,startGain),when);
    if(fi>0) gain.gain.linearRampToValueAtTime(Math.max(0.0001,endGain),when+fi); else gain.gain.setValueAtTime(Math.max(0.0001,endGain),when);
    source.start(when,safeOffset);
    return {source,gain,buffer,when,offset:safeOffset};
  }
  async function playLoop(key,{fadeMs=AUDIO_CONFIG.normalFadeMs,offset=0,force=false,startGain=0.0001}={}){
    if(!soundOn||document.visibilityState==='hidden') return;
    desiredKey=key; const request=++generation;
    if(!force&&active&&active.key===key&&!pausedInfo) return;
    let buffer; try{buffer=await loadBuffer(key);}catch(e){debug('play failed',key,e&&e.message);return;}
    if(request!==generation||desiredKey!==key||!soundOn||document.visibilityState==='hidden') return;
    const c=ctx(); if(!c||c.state!=='running'){ debug('context not running',key); return; }
    const old=active, fade=Math.max(0,fadeMs), item=createSource(buffer,{loop:true,offset,startGain,fadeInMs:fade,endGain:1});
    const group={key,sources:[item],primary:item,loop:true,offset:item.offset,startedAt:c.currentTime,createdAt:performance.now()};
    pausedInfo=null; setActive(group,old,fade); debug('loop',key,'offset',item.offset.toFixed(2));
  }
  async function playOneShot(key,{fadeMs=0,offset=0,force=false,startGain=1}={}){
    if(!soundOn||document.visibilityState==='hidden') return;
    desiredKey=key; const request=++generation;
    if(!force&&active&&active.key===key&&!pausedInfo) return;
    let buffer; try{buffer=await loadBuffer(key);}catch(e){debug('play failed',key,e&&e.message);return;}
    if(request!==generation||desiredKey!==key||!soundOn||document.visibilityState==='hidden') return;
    const c=ctx(); if(!c||c.state!=='running') return;
    const old=active, fade=Math.max(0,fadeMs), item=createSource(buffer,{loop:false,offset,startGain,fadeInMs:fade,endGain:1});
    const group={key,sources:[item],primary:item,loop:false,offset:item.offset,startedAt:c.currentTime,createdAt:performance.now()};
    pausedInfo=null; setActive(group,old,fade); debug('oneshot',key,'offset',item.offset.toFixed(2));
  }
  async function playTitle({force=false}={}){
    if(!soundOn||document.visibilityState==='hidden') return;
    desiredKey='title'; const request=++generation;
    if(!force&&active&&active.key==='title'&&!pausedInfo) return;
    let intro,loop; try{[intro,loop]=await Promise.all([loadBuffer('titleIntro'),loadBuffer('titleLoop')]);}catch(e){debug('title failed',e&&e.message);return;}
    if(request!==generation||desiredKey!=='title'||!soundOn||document.visibilityState==='hidden') return;
    const c=ctx(); if(!c||c.state!=='running') return;
    const old=active, now=c.currentTime, fade=AUDIO_CONFIG.normalFadeMs;
    const a=createSource(intro,{loop:false,startAt:now,startGain:0.0001,fadeInMs:Math.min(120,fade),endGain:1});
    const b=createSource(loop,{loop:true,startAt:now+intro.duration,startGain:1,endGain:1});
    const group={key:'title',sources:[a,b],primary:b,loop:true,offset:0,startedAt:now+intro.duration,createdAt:performance.now(),introDuration:intro.duration};
    pausedInfo=null; setActive(group,old,fade); debug('title intro->loop',intro.duration.toFixed(3),loop.duration.toFixed(3));
  }
  function fadeOutBgm(ms=AUDIO_CONFIG.normalFadeMs,{clearDesired=true}={}){
    generation++; if(clearDesired) desiredKey=null;
    if(resultStartTimer){clearTimeout(resultStartTimer);resultStartTimer=null;}
    const old=active; active=null; quietStopGroup(old,ms); debug('fadeout',ms);
  }
  function capturePauseInfo(reason){
    if(!active) return null;
    const info={key:active.key,offset:sourcePosition(active),loop:active.loop,reason,screen:currentScreenName};
    return info;
  }
  function pauseForGame(reason='pause'){
    if(!soundOn) return;
    if(active) pausedInfo=capturePauseInfo(reason);
    generation++; desiredKey=null; const old=active; active=null; quietStopGroup(old,80); debug('pause',reason,pausedInfo&&pausedInfo.key,pausedInfo&&pausedInfo.offset);
  }
  async function resumeForGame(){
    if(!soundOn||document.visibilityState==='hidden') return;
    if(typeof isBattleMode==='function'&&isBattleMode()){
      if(typeof battleCurrentRemaining==='function') syncBattle(battleCurrentRemaining(),{reason:'resume'}); return;
    }
    const info=pausedInfo; pausedInfo=null;
    if(info&&info.key&&BGM_TRACKS[info.key]&&BGM_TRACKS[info.key].loop){ await playLoop(info.key,{offset:info.offset,fadeMs:120,force:true,startGain:0.15}); }
    else syncCurrentScreen({force:true});
  }
  function prepareBattleMatch(id){
    battleMatchId=id||null; pausedInfo=null; battleEndUntil=0; lastBattleDriftCheck=0;
    fadeOutBgm(180); debug('prepare battle',battleMatchId);
  }
  function syncBattle(remainingMs,{reason='timer',spectator=false,force=false}={}){
    if(!soundOn||document.visibilityState==='hidden') return;
    const rem=Math.max(0,Number(remainingMs)||0);
    if(rem<=0){ finishBattleAtZero(); return; }
    const last30=rem<=30000;
    if(last30){
      const expected=Math.max(0,Math.min(30,30-rem/1000));
      if(active&&active.key==='battleLast30'&&!force){
        const now=performance.now();
        if(now-lastBattleDriftCheck>AUDIO_CONFIG.battleDriftCheckIntervalMs){
          lastBattleDriftCheck=now; const actual=sourcePosition(active); const drift=Math.abs(actual-expected);
          if(drift>AUDIO_CONFIG.battleDriftResyncSec){ debug('battle last30 drift',drift.toFixed(2)); playOneShot('battleLast30',{offset:expected,fadeMs:90,force:true,startGain:.35}); }
        }
        return;
      }
      pausedInfo=null;
      playOneShot('battleLast30',{offset:expected,fadeMs:AUDIO_CONFIG.battleLast30CrossfadeMs,force:true,startGain:.52});
      return;
    }
    if(active&&active.key==='battleLoop'&&!force) return;
    const resumeOffset=pausedInfo&&pausedInfo.key==='battleLoop'?pausedInfo.offset:0;
    pausedInfo=null; playLoop('battleLoop',{offset:resumeOffset,fadeMs:force?120:AUDIO_CONFIG.normalFadeMs,force:true,startGain:force?.22:.0001});
  }
  function finishBattleAtZero(){
    if(battleEndUntil>performance.now()) return;
    battleEndUntil=performance.now()+AUDIO_CONFIG.battleEndFadeMs;
    generation++; desiredKey=null; pausedInfo=null;
    if(active&&active.key==='battleLast30'){
      // battle_last30_app は30.000〜30.200秒に正式なアプリ用フェードを焼き込んである。
      const old=active; active=null;
      setTimeout(()=>quietStopGroup(old,20),AUDIO_CONFIG.battleEndFadeMs+35);
    }else{
      const old=active; active=null; quietStopGroup(old,AUDIO_CONFIG.battleEndFadeMs);
    }
    debug('battle zero fade');
  }
  function playResultBgm({fromBattle=false}={}){
    if(!soundOn) return;
    if(resultStartTimer){clearTimeout(resultStartTimer);resultStartTimer=null;}
    const wait=fromBattle?Math.max(0,battleEndUntil-performance.now()+5):0;
    if(wait>2){ resultStartTimer=setTimeout(()=>{resultStartTimer=null;playLoop('resultLoop',{fadeMs:180,force:true,startGain:.18});},wait); }
    else playLoop('resultLoop',{fadeMs:180,force:true,startGain:.18});
  }
  function trackForGame(){
    if(typeof isBattleMode==='function'&&isBattleMode()) return null;
    if(currentMode==='timed') return 'challengeLoop';
    if(currentMode==='falling'||currentMode==='fallingTutorial'||currentMode==='pairFalling') return 'fallingLoop';
    if(currentMode==='free'||currentMode==='tutorial') return 'freeLoop';
    return 'freeLoop';
  }
  function handleScreen(name){
    currentScreenName=name||currentScreenName; window.__tenTowerCurrentScreenName=currentScreenName;
    if(!initialized||!soundOn||document.visibilityState==='hidden') return;
    if(name==='title'){playTitle();return;}
    if(['howto','mode','settings','fallingIntro','tutorialComplete','fallingTutorialComplete','battleMenu','battlePin','battleRoom'].includes(name)){playLoop('menuLoop');return;}
    if(name==='result'){playResultBgm({fromBattle:false});return;}
    if(name==='battleResult'){playResultBgm({fromBattle:true});return;}
    if(name==='battleSpectator'){
      if(typeof battleCurrentRemaining==='function') syncBattle(battleCurrentRemaining(),{reason:'spectator',spectator:true}); return;
    }
    if(name==='game'){
      if(typeof isBattleMode==='function'&&isBattleMode()){
        // 開始カウントダウン中は無音。battleBeginPlay が正式残り時間で開始する。
        if(typeof battleState!=='undefined'&&!battleState.countdownActive&&!battleState.networkPaused&&!paused&&battleState.remainingRunning) syncBattle(battleCurrentRemaining(),{reason:'screen'});
        else fadeOutBgm(160);
        return;
      }
      const key=trackForGame(); if(!paused&&key) playLoop(key); else fadeOutBgm(120); return;
    }
  }
  function syncCurrentScreen({force=false}={}){
    const activeScreen=document.querySelector('.screen.active');
    const id=activeScreen&&activeScreen.id;
    const reverse={
      'title-screen':'title','howto-screen':'howto','mode-screen':'mode','game-screen':'game','result-screen':'result','settings-screen':'settings',
      'falling-intro-screen':'fallingIntro','tutorial-complete-screen':'tutorialComplete','falling-tutorial-complete-screen':'fallingTutorialComplete',
      'battle-menu-screen':'battleMenu','battle-pin-screen':'battlePin','battle-room-screen':'battleRoom','battle-spectator-screen':'battleSpectator','battle-result-screen':'battleResult'
    };
    const name=reverse[id]||currentScreenName||'title'; currentScreenName=name;
    if(force&&active) fadeOutBgm(60);
    handleScreen(name);
  }
  async function unlockAudio(){
    if(!soundOn) return false;
    const c=ctx(); if(!c) return false; ensureMaster(c);
    try{ if(c.state==='suspended') await c.resume(); }catch(e){}
    unlocked=c.state==='running';
    if(unlocked){ preload(coreKeys); scheduleBackgroundPreload(); if(deferredSyncTimer)clearTimeout(deferredSyncTimer); deferredSyncTimer=setTimeout(()=>{deferredSyncTimer=null;syncCurrentScreen();},120); }
    return unlocked;
  }
  function setSoundEnabled(enabled){
    if(!enabled){ fadeOutBgm(90); pausedInfo=null; return; }
    unlockAudio().then(ok=>{if(ok) syncCurrentScreen({force:true});});
  }
  function setBgmVolume(value){
    const c=ctx(); if(!c) return; const g=ensureMaster(c); const v=Math.max(0,Math.min(1,Number(value)||0));
    g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(v,c.currentTime,.04);
  }
  function handleVisibility(hidden){
    if(hidden){ visibilityPaused=true; pauseForGame('visibility'); return; }
    if(!visibilityPaused) return; visibilityPaused=false;
    if(typeof isBattleMode==='function'&&isBattleMode()) return; // 対戦はサーバー同期後に再開。
    unlockAudio().then(ok=>{if(ok) resumeForGame();});
  }
  function init(){
    if(initialized) return; initialized=true;
    ['pointerdown','touchend','keydown'].forEach(type=>document.addEventListener(type,()=>{if(!unlocked) unlockAudio();},{capture:true,passive:true}));
    if(soundOn){
      const c=ctx(); if(c){ensureMaster(c);preload(coreKeys).then(()=>{if(c.state==='running')syncCurrentScreen();});scheduleBackgroundPreload();}
    }
  }
  function state(){ return {initialized,unlocked,soundOn,screen:currentScreenName,desiredKey,activeKey:active&&active.key,position:active?sourcePosition(active):null,pausedInfo,battleEndUntil,loaded:[...buffers.keys()],activeSourceCount:active?active.sources.length:0}; }
  return {init,unlockAudio,handleScreen,syncCurrentScreen,playResultBgm,playLoop,playTitle,fadeOutBgm,pauseForGame,resumeForGame,
          prepareBattleMatch,syncBattle,finishBattleAtZero,setSoundEnabled,setBgmVolume,handleVisibility,getState:state,preload};
})();
window.BGMController=BGMController;
function playStarAwardSound() {
  if(!soundOn)return; try{const ctx=getAudioContext(),now=ctx.currentTime;[523,659,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(f,now+i*.07);g.gain.setValueAtTime(.0001,now+i*.07);g.gain.exponentialRampToValueAtTime(.09,now+i*.07+.015);g.gain.exponentialRampToValueAtTime(.0001,now+i*.07+.24);o.connect(g).connect(ctx.destination);o.start(now+i*.07);o.stop(now+i*.07+.26);});}catch(e){}
}
function playStarCrashSound(hasGarbage=false) {
  if(!soundOn)return; try{const ctx=getAudioContext(),now=ctx.currentTime; const low=ctx.createOscillator(),lg=ctx.createGain();low.type='sine';low.frequency.setValueAtTime(130,now);low.frequency.exponentialRampToValueAtTime(70,now+.28);lg.gain.setValueAtTime(.14,now);lg.gain.exponentialRampToValueAtTime(.0001,now+.32);low.connect(lg).connect(ctx.destination);low.start(now);low.stop(now+.34);[680,880,1180].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(f,now+.12+i*.035);o.frequency.exponentialRampToValueAtTime(f*1.45,now+.34+i*.035);g.gain.setValueAtTime(.0001,now+.1);g.gain.exponentialRampToValueAtTime(.08,now+.14+i*.035);g.gain.exponentialRampToValueAtTime(.0001,now+.48);o.connect(g).connect(ctx.destination);o.start(now+.1);o.stop(now+.5);}); if(hasGarbage){const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.setValueAtTime(360,now+.28);o.frequency.exponentialRampToValueAtTime(110,now+.48);g.gain.setValueAtTime(.05,now+.28);g.gain.exponentialRampToValueAtTime(.0001,now+.5);o.connect(g).connect(ctx.destination);o.start(now+.28);o.stop(now+.52);}}catch(e){}
}
function cleanupStarEffectDom() {
  document.querySelectorAll('.star-effect-layer,.star-block-direct-label').forEach(el=>el.remove());
  document.querySelectorAll('.star-charging,.star-target,.star-garbage-crack').forEach(el=>el.classList.remove('star-charging','star-target','star-garbage-crack'));
  const game=document.getElementById('game-screen'); if(game)game.classList.remove('star-screen-shake');
}
function createStarEffect(col,row,targetSet) {
  cleanupStarEffectDom();
  const boardEl=document.getElementById('board'); if(!boardEl)return;
  const colEl=boardEl.querySelector(`.column[data-col="${col}"]`); const cell=colEl&&colEl.children[BOARD_ROWS-1-row];
  if(!cell)return;
  const boardRect=boardEl.getBoundingClientRect(),cellRect=cell.getBoundingClientRect();
  const x=cellRect.left-boardRect.left+cellRect.width/2, y=cellRect.top-boardRect.top+cellRect.height/2;
  const layer=document.createElement('div');layer.className='star-effect-layer';
  const core=document.createElement('div');core.className='star-effect-core';core.style.left=x+'px';core.style.top=y+'px';layer.appendChild(core);
  const horizontal=document.createElement('div');horizontal.className='star-beam horizontal';horizontal.style.top=y+'px';horizontal.style.setProperty('--beam-transform','translateY(-50%) scaleX(1)');layer.appendChild(horizontal);
  const vertical=document.createElement('div');vertical.className='star-beam vertical';vertical.style.left=x+'px';vertical.style.setProperty('--beam-transform','translateX(-50%) scaleY(1)');layer.appendChild(vertical);
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; const count=reduced?6:SPECIAL_FEATURE_CONFIG.starParticleCount;
  for(let i=0;i<count;i++){const p=document.createElement('i');p.className='star-particle';p.style.left=x+'px';p.style.top=y+'px';const angle=Math.PI*2*i/count+Math.random()*.25;const dist=45+Math.random()*115;p.style.setProperty('--dx',Math.cos(angle)*dist+'px');p.style.setProperty('--dy',Math.sin(angle)*dist+'px');p.style.setProperty('--rot',(180+Math.random()*360)+'deg');layer.appendChild(p);}
  boardEl.appendChild(layer);
  if(SPECIAL_FEATURE_CONFIG.starScreenShakeEnabled&&!reduced){const game=document.getElementById('game-screen');game.classList.add('star-screen-shake');setTimeout(()=>game.classList.remove('star-screen-shake'),380);}
  targetSet.forEach(key=>{const [c,r]=key.split(',').map(Number);const ce=document.querySelector(`#board .column[data-col="${c}"]`)?.children[BOARD_ROWS-1-r];const block=ce&&ce.querySelector('.block');if(block){block.classList.add('star-target');if(board[c]&&board[c][r]&&board[c][r].recentGarbage)block.classList.add('star-garbage-crack');}});
  const label=document.createElement('div');label.className='star-block-direct-label';label.textContent='⭐ じゅうじに けした！';document.getElementById('game-screen').appendChild(label);
  starEffectCleanupTimer=setTimeout(()=>{cleanupStarEffectDom();starEffectCleanupTimer=null;},SPECIAL_FEATURE_CONFIG.starEffectDurationMs+350);
}
function processStarCross(col,row) {
  if(!gameRunning||starEffectActive)return;
  const session=gameSessionToken; starEffectActive=true; animating=true; updateFallingControls(); updateHoldAvailability();
  const set=new Set();
  for(let r=0;r<board[col].length;r++)set.add(`${col},${r}`);
  for(let c=0;c<BOARD_COLS;c++)if(board[c].length>row)set.add(`${c},${row}`);
  const hasGarbage=Array.from(set).some(key=>{const [c,r]=key.split(',').map(Number);return !!(board[c]&&board[c][r]&&board[c][r].recentGarbage);});
  const starCell=document.querySelector(`#board .column[data-col="${col}"]`)?.children[BOARD_ROWS-1-row]?.querySelector('.block'); if(starCell)starCell.classList.add('star-charging');
  playStarCrashSound(hasGarbage);
  setTimeout(()=>{if(!gameRunning||session!==gameSessionToken)return;createStarEffect(col,row,set);},150);
  setTimeout(()=>{
    if(!gameRunning||session!==gameSessionToken)return;
    removeAndDrop(set); updateBoardUI();
    setTimeout(()=>{
      if(!gameRunning||session!==gameSessionToken)return;
      cleanupStarEffectDom(); starEffectActive=false; animating=false;
      const found=findAllPairs();
      if(found.count>0){noTenCounter=0;processRemovals(found.set,found.count);return;}
      updateBoardUI();updateInfoPanels();updateHints();updateFallingControls();
      if(isBattleMode()&&typeof battleAfterMove==='function'){battleAfterMove({pairs:0,chainStages:0,completedNow:0,starUsed:true});return;}
      if(isThreeMinuteFallingMode()&&fallingTimeExpired){maybeFinalizeExpiredFalling();return;}
      if(isFallingMode())scheduleSpawn(150);else if(isBoardFull())endGame('full');
    },260);
  },760);
}
function exportSpecialBattleState() {
  const pack=obj=>obj?{kind:isStarBlock(obj)?BLOCK_KIND_STAR:BLOCK_KIND_NUMBER,val:isStarBlock(obj)?null:Number(obj.val),recentGarbage:!!obj.recentGarbage,garbageBatchId:obj.garbageBatchId||''}:null;
  return {version:1,savedAt:Date.now(),board:board.map(col=>col.map(pack)),queue:numbersQueue.map(pack),held:pack(heldBlock),holdUsed:!!holdUsedThisTurn,chainPower:Number(chainPower)||0,pendingStarAward:!!pendingStarAward,falling:fallingPiece?{...pack(fallingPiece),col:fallingPiece.col,row:fallingPiece.row,phase:fallingPiece.phase,lockElapsed:fallingPiece.lockElapsed||0,intervalMs:fallingPiece.intervalMs||0}:null};
}
function importSpecialBattleState(state) {
  if(!state||typeof state!=='object'||!Array.isArray(state.board)||!Array.isArray(state.queue))return false;
  try{
    board=Array.from({length:BOARD_COLS},(_,c)=>(state.board[c]||[]).slice(0,BOARD_ROWS).map(normalizeBlockObject));
    numbersQueue=state.queue.slice(0,5).map(normalizeBlockObject);ensureNumberQueue();
    heldBlock=state.held?normalizeBlockObject(state.held):null;holdUsedThisTurn=!!state.holdUsed;chainPower=Math.max(0,Math.min(SPECIAL_FEATURE_CONFIG.chainPowerMax,Number(state.chainPower)||0));pendingStarAward=!!state.pendingStarAward;
    fallingPiece=state.falling?{...normalizeBlockObject(state.falling),col:Math.max(0,Math.min(BOARD_COLS-1,Number(state.falling.col)||0)),row:Math.max(0,Math.min(BOARD_ROWS,Number.isFinite(Number(state.falling.row))?Number(state.falling.row):BOARD_ROWS)),phase:state.falling.phase==='locking'?'locking':'falling',lockElapsed:Math.max(0,Number(state.falling.lockElapsed)||0),lockStartedAt:0,intervalMs:Number(state.falling.intervalMs)||getFallingIntervalForLevel()}:null;
    updateBoardUI();updateInfoPanels();updateHints();updateFallingControls();return true;
  }catch(e){return false;}
}

function requestGameFullscreen() {
  if (new URLSearchParams(location.search).get('layout') === 'edit') return;
  const root = document.documentElement;
  if (document.fullscreenElement || !root.requestFullscreen) return;
  try {
    const promise = root.requestFullscreen({ navigationUI: 'hide' });
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  } catch (e) {}
}
function exitGameFullscreen() {
  if (!document.fullscreenElement || !document.exitFullscreen) return;
  try {
    const promise = document.exitFullscreen();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  } catch (e) {}
}
function isGameScreenActive() {
  const game = document.getElementById('game-screen');
  return !!(game && game.classList.contains('active'));
}
function isBattleMode() { return currentMode === 'battle'; }
function isPairFallingMode() { return currentMode === 'pairFalling'; }
function isThreeMinuteFallingMode() { return currentMode === 'falling' || currentMode === 'pairFalling'; }
function isFallingMode() {
  return currentMode === 'falling' || currentMode === 'fallingTutorial' || isPairFallingMode() || isBattleMode();
}
function isRealFallingMode() { return currentMode === 'falling'; }
function getCurrentFallingConfig() { return isPairFallingMode() ? PAIR_FALLING_CONFIG : FALLING_CONFIG; }
function isBasicTutorial() { return currentMode === 'tutorial'; }
function isFallingTutorial() { return currentMode === 'fallingTutorial'; }
function isTutorialMode() { return isBasicTutorial() || isFallingTutorial(); }
function getFallingIntervalForLevel(level = fallingSpeedLevel) {
  if (isFallingTutorial()) return FALL_TUTORIAL_INTERVAL_MS;
  if (isBattleMode() && typeof battleGetFallInterval === 'function') return battleGetFallInterval();
  return FALL_SPEED_INTERVALS[Math.max(0, Math.min(FALL_SPEED_INTERVALS.length - 1, level))];
}
function getPieceFallInterval() {
  return fallingPiece && fallingPiece.intervalMs ? fallingPiece.intervalMs : getFallingIntervalForLevel();
}

function clearNamedTimer(name) {
  if (name === 'falling' && fallingTimer) {
    clearTimeout(fallingTimer);
    fallingTimer = null;
  }
  if (name === 'lock' && lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
  if (name === 'spawn' && spawnTimer) {
    clearTimeout(spawnTimer);
    spawnTimer = null;
  }
  if (name === 'countdown' && countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
  }
}
function clearFallingTimers() {
  clearNamedTimer('falling');
  clearNamedTimer('lock');
  clearNamedTimer('spawn');
  clearNamedTimer('countdown');
}
function clearGameTimers() {
  if (starEffectCleanupTimer) clearTimeout(starEffectCleanupTimer);
  if (starAwardTimer) clearTimeout(starAwardTimer);
  starEffectCleanupTimer = starAwardTimer = null;
  cleanupStarEffectDom();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (speedClockTimer) clearInterval(speedClockTimer);
  speedClockTimer = null;
  if (fallingChallengeClockTimer) clearInterval(fallingChallengeClockTimer);
  fallingChallengeClockTimer = null;
  if (tutorialTransitionTimer) clearTimeout(tutorialTransitionTimer);
  tutorialTransitionTimer = null;
  if (speedToastTimer) clearTimeout(speedToastTimer);
  speedToastTimer = null;
  clearFallingTimers();
}
function setPauseButton(isPaused) {
  const btn = document.getElementById('pause-btn');
  if (!btn) return;
  btn.innerHTML = `<img src="${APP_ASSETS['assets/ui/icons/pause.png']}" alt="">${isPaused ? 'つづける' : 'いちじていし'}`;
}
function syncControls() {
  const titleSound = document.getElementById('title-sound');
  const titleHint = document.getElementById('title-hint');
  const settingSound = document.getElementById('setting-sound');
  const settingHint = document.getElementById('setting-hint');
  if (titleSound) titleSound.checked = soundOn;
  if (titleHint) titleHint.checked = hintOn;
  if (settingSound) settingSound.checked = soundOn;
  if (settingHint) settingHint.checked = hintOn;
  const soundIcon = document.getElementById('title-sound-icon');
  if (soundIcon) soundIcon.src = soundOn ? APP_ASSETS['assets/ui/icons/speaker_on.png'] : APP_ASSETS['assets/ui/icons/speaker_off.png'];
  const modeTime = document.getElementById('mode-time-label');
  if (modeTime) modeTime.textContent = toFullWidthDigits(TIME_LIMIT_MINUTES);
}
function showToast(text) {
  const toast = document.getElementById('chain-toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
}
function playSound(multiple) {
  if (!soundOn) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const duration = 0.15;
    const now = ctx.currentTime;
    for (let i = 0; i < multiple; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 500 + i * 80;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + duration);
    }
  } catch (e) {}
}

// ========= 保存設定 =========
function loadStoredSettings() {
  try {
    const s = localStorage.getItem('soundOn');
    const h = localStorage.getItem('hintOn');
    if (s !== null) soundOn = s === '1';
    if (h !== null) hintOn = h === '1';
    const t = localStorage.getItem('timeLimit');
    if (t !== null && !Number.isNaN(parseInt(t, 10))) TIME_LIMIT_MINUTES = parseInt(t, 10);
    const c = localStorage.getItem('boardCols');
    const r = localStorage.getItem('boardRows');
    if (c !== null && !Number.isNaN(parseInt(c, 10))) configuredCols = Math.min(7, Math.max(3, parseInt(c, 10)));
    if (r !== null && !Number.isNaN(parseInt(r, 10))) configuredRows = Math.min(8, Math.max(4, parseInt(r, 10)));
    const nr = localStorage.getItem('numRange');
    if (nr !== null) numberRangeType = nr;
    const cn = localStorage.getItem('customNumbers');
    if (cn !== null) {
      customNumbers = cn.split(',').map(x => parseInt(x, 10)).filter(x => !Number.isNaN(x) && x >= 1 && x <= 9);
    }
  } catch (e) {}
}
function saveSettings() {
  try {
    localStorage.setItem('soundOn', soundOn ? '1' : '0');
    localStorage.setItem('hintOn', hintOn ? '1' : '0');
    localStorage.setItem('timeLimit', TIME_LIMIT_MINUTES.toString());
    localStorage.setItem('boardCols', configuredCols.toString());
    localStorage.setItem('boardRows', configuredRows.toString());
    localStorage.setItem('numRange', numberRangeType);
    localStorage.setItem('customNumbers', customNumbers.join(','));
  } catch (e) {}
}
function toggleSound(val) {
  soundOn = val;
  saveSettings();
  syncControls();
  if (window.BGMController) BGMController.setSoundEnabled(soundOn);
}
function toggleHint(val) {
  hintOn = val;
  saveSettings();
  syncControls();
  updateHints();
}
function updateRangeVisibility() {
  const select = document.getElementById('setting-range');
  const container = document.getElementById('custom-range-container');
  if (!select || !container) return;
  container.style.display = select.value === 'custom' ? 'block' : 'none';
}
function applySettings() {
  const previousSoundOn = soundOn;
  soundOn = document.getElementById('setting-sound').checked;
  hintOn = document.getElementById('setting-hint').checked;
  TIME_LIMIT_MINUTES = parseInt(document.getElementById('setting-time').value, 10);
  configuredCols = Math.min(7, Math.max(3, parseInt(document.getElementById('setting-cols').value, 10) || 5));
  configuredRows = Math.min(8, Math.max(4, parseInt(document.getElementById('setting-rows').value, 10) || 6));
  numberRangeType = document.getElementById('setting-range').value;
  const customStr = document.getElementById('setting-custom').value.trim();
  customNumbers = customStr
    ? customStr.split(',').map(x => parseInt(x, 10)).filter(x => !Number.isNaN(x) && x >= 1 && x <= 9)
    : [];
  saveSettings();
  syncControls();
  if (window.BGMController && previousSoundOn !== soundOn) BGMController.setSoundEnabled(soundOn);
  alert('せっていを ほぞんしました');
}
function restoreDefaultSettings() {
  const previousSoundOn = soundOn;
  soundOn = DEFAULT_SETTINGS.soundOn;
  hintOn = DEFAULT_SETTINGS.hintOn;
  TIME_LIMIT_MINUTES = DEFAULT_SETTINGS.timeLimitMinutes;
  configuredCols = DEFAULT_SETTINGS.boardCols;
  configuredRows = DEFAULT_SETTINGS.boardRows;
  numberRangeType = DEFAULT_SETTINGS.numberRangeType;
  customNumbers = [...DEFAULT_SETTINGS.customNumbers];

  document.getElementById('setting-sound').checked = soundOn;
  document.getElementById('setting-hint').checked = hintOn;
  document.getElementById('setting-time').value = TIME_LIMIT_MINUTES;
  document.getElementById('setting-cols').value = configuredCols;
  document.getElementById('setting-rows').value = configuredRows;
  document.getElementById('setting-range').value = numberRangeType;
  document.getElementById('setting-custom').value = customNumbers.join(',');
  updateRangeVisibility();
  saveSettings();
  syncControls();
  if (window.BGMController && previousSoundOn !== soundOn) BGMController.setSoundEnabled(soundOn);
  alert('標準の設定にもどしました');
}
function resetData() {
  if (confirm('ハイスコアなどのデータを初期化しますか？')) {
    try { clearTowerOfTenStoredData(); } catch (e) {}
    alert('データを初期化しました');
  }
}

// ========= 画面遷移 =========
function showScreen(name) {
  if (name !== 'result') cancelPairResultRequest();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const map = {
    title: 'title-screen', howto: 'howto-screen', mode: 'mode-screen', game: 'game-screen',
    result: 'result-screen', settings: 'settings-screen', fallingIntro: 'falling-intro-screen',
    tutorialComplete: 'tutorial-complete-screen', fallingTutorialComplete: 'falling-tutorial-complete-screen',
    battleMenu: 'battle-menu-screen', battlePin: 'battle-pin-screen', battleRoom: 'battle-room-screen',
    battleSpectator: 'battle-spectator-screen', battleResult: 'battle-result-screen'
  };
  if (name === 'title') {
    if (gameRunning || isGameScreenActive()) stopCurrentGame();
    exitGameFullscreen();
  }
  if (name === 'mode' && (gameRunning || isGameScreenActive())) stopCurrentGame();
  if (name === 'settings') {
    document.getElementById('setting-sound').checked = soundOn;
    document.getElementById('setting-hint').checked = hintOn;
    document.getElementById('setting-time').value = TIME_LIMIT_MINUTES;
    document.getElementById('setting-cols').value = configuredCols;
    document.getElementById('setting-rows').value = configuredRows;
    document.getElementById('setting-range').value = numberRangeType;
    document.getElementById('setting-custom').value = customNumbers.join(',');
    updateRangeVisibility(); syncControls();
  }
  const target = document.getElementById(map[name]);
  if (target) target.classList.add('active');
  if (window.BGMController) BGMController.handleScreen(name);
  window.dispatchEvent(new CustomEvent('tower-screen-change', { detail: { name } }));
}
function openFallingIntro() {
  requestGameFullscreen();
  stopCurrentGame();
  showScreen('fallingIntro');
}
function returnToTitle() {
  if (isBattleMode() && typeof battleLeaveToModes === 'function') { battleLeaveToModes(); return; }
  stopCurrentGame();
  showScreen('title');
}
function returnToModes() {
  if (isBattleMode() && typeof battleLeaveToModes === 'function') { battleLeaveToModes(); return; }
  stopCurrentGame();
  showScreen('mode');
}
function stopCurrentGame() {
  cancelPairResultRequest();
  gameRunning = false; endingGame = false; paused = true; animating = false;
  fallingPiece = null; resumeCountdownActive = false;
  tutorialKind = null; tutorialStep = 0; tutorialTargetCol = null; tutorialExpectedControl = null;
  activeFallingTimeMs = 0; activeClockLastAt = 0; fallingSpeedLevel = 0;
  fallingChainBonusTotal = 0; fallingChallengeElapsedMs = 0; fallingChallengeClockLastAt = 0;
  fallingTimeExpired = false; fallingTimeEnding = false; fallingLastTenShown = false; fallingVisibilityPaused = false; fallingResultViewToken++;
  pairPlacements = 0; pairSettling = false;
  resetSpecialGameplayState();
  gameSessionToken++;
  clearGameTimers(); hidePauseLayers(); removeFallingVisuals(); clearTutorialHighlights();
  const game = document.getElementById('game-screen');
  if (game) game.classList.remove('tutorial-mode','falling-mode','pair-falling-mode','battle-mode');
  const battleHud = document.getElementById('battle-hud'); if (battleHud) battleHud.hidden = true;
  const battleOpponents = document.getElementById('battle-opponents'); if (battleOpponents) battleOpponents.hidden = true;
  const battleToast = document.getElementById('battle-attack-toast'); if (battleToast) battleToast.hidden = true;
  const battleConnection = document.getElementById('battle-connection-overlay'); if (battleConnection) battleConnection.hidden = true;
  const pauseBtn = document.getElementById('pause-btn'); if (pauseBtn) pauseBtn.style.removeProperty('display');
}
function hidePauseLayers() {
  const pauseOverlay = document.getElementById('pause-overlay');
  const countdownOverlay = document.getElementById('countdown-overlay');
  if (pauseOverlay) pauseOverlay.hidden = true;
  if (countdownOverlay) countdownOverlay.hidden = true;
}

// ========= ゲーム開始 =========
function startGame(mode) {
  requestGameFullscreen(); stopCurrentGame(); resetTransientUI(); loadStoredSettings();
  currentMode = mode; tutorialKind = null; tutorialStep = 0;
  BOARD_COLS = isFallingMode() ? FALLING_COLS : configuredCols;
  BOARD_ROWS = isFallingMode() ? FALLING_ROWS : configuredRows;
  paused = false; animating = false; gameRunning = true; endingGame = false; resumeCountdownActive = false;
  const session = ++gameSessionToken;
  board = Array.from({ length: BOARD_COLS }, () => []);
  bricks = 0; tenCount = 0; bestChain = 0; noTenCounter = 0; towerStage = 0; completedTowers = 0;
  towerVisualToken++; resetSpecialGameplayState(); numbersQueue = isPairFallingMode() ? [makePairObject(), makePairObject(), makePairObject()] : [makeNumberObject(), makeNumberObject(), makeNumberObject()]; fallingPiece = null;
  activeFallingTimeMs = 0; activeClockLastAt = Date.now(); fallingSpeedLevel = 0;
  fallingChainBonusTotal = 0; fallingChallengeElapsedMs = 0; fallingChallengeClockLastAt = performance.now();
  fallingTimeExpired = false; fallingTimeEnding = false; fallingLastTenShown = false; fallingVisibilityPaused = false; fallingResultViewToken++;
  pairPlacements = 0; pairSettling = false;

  const gameScreen = document.getElementById('game-screen');
  gameScreen.classList.toggle('falling-mode', isFallingMode());
  gameScreen.classList.toggle('pair-falling-mode', isPairFallingMode());
  gameScreen.classList.remove('tutorial-mode');
  updateActionControlVisibility();
  const caption = document.getElementById('board-caption');
  caption.textContent = isPairFallingMode() ? '2こを まわして れんさをねらえ！' : (isFallingMode() ? '◀ ▶で うごかそう！' : 'おきたい れつを タップ！');
  setTutorialChrome(false);

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (mode === 'timed') {
    timeLeft = TIME_LIMIT_MINUTES * 60;
    document.getElementById('timer-item').style.display = 'flex'; updateTimeDisplay();
    timerInterval = setInterval(() => {
      if (!gameRunning || session !== gameSessionToken) return;
      if (!paused) { timeLeft--; updateTimeDisplay(); if (timeLeft <= 0) endGame('time'); }
    }, 1000);
  } else if (mode === 'falling' || mode === 'pairFalling') {
    timeLeft = getCurrentFallingConfig().durationSec;
    document.getElementById('timer-item').style.display = 'flex'; updateTimeDisplay();
  } else document.getElementById('timer-item').style.display = 'none';

  showScreen('game'); renderBoard(); updateInfoPanels(); updateTower(); updateHints();
  setPauseButton(false); hidePauseLayers(); updateFallingControls(); resetFallingResultPresentation();
  if (isThreeMinuteFallingMode()) { startSpeedClock(); startFallingChallengeClock(); }
  if (isFallingMode()) scheduleSpawn(250);
}


function startFallingChallengeClock() {
  if (!isThreeMinuteFallingMode() || !gameRunning) return;
  if (fallingChallengeClockTimer) clearInterval(fallingChallengeClockTimer);
  fallingChallengeClockLastAt = performance.now();
  timeLeft = getCurrentFallingConfig().durationSec;
  updateTimeDisplay();
  fallingChallengeClockTimer = setInterval(tickFallingChallengeClock, 100);
}
function tickFallingChallengeClock() {
  if (!isThreeMinuteFallingMode() || !gameRunning || fallingTimeExpired) return;
  const now = performance.now();
  let delta = Math.max(0, now - fallingChallengeClockLastAt);
  fallingChallengeClockLastAt = now;
  const active = isGameScreenActive() && !paused && !endingGame && !resumeCountdownActive && document.visibilityState !== 'hidden';
  if (!active) return;
  if (delta > 2500) delta = 0; // スリープ等の大きな飛びを制限時間へ加算しない
  fallingChallengeElapsedMs = Math.min(getCurrentFallingConfig().durationSec * 1000, fallingChallengeElapsedMs + delta);
  const remainingMs = Math.max(0, getCurrentFallingConfig().durationSec * 1000 - fallingChallengeElapsedMs);
  const nextSeconds = Math.ceil(remainingMs / 1000);
  if (timeLeft !== nextSeconds) { timeLeft = nextSeconds; updateTimeDisplay(); }
  if (!fallingLastTenShown && remainingMs > 0 && remainingMs <= 10000) {
    fallingLastTenShown = true;
    showFallingLastTenSeconds();
  }
  if (remainingMs <= 0) expireFallingChallenge();
}
function showFallingLastTenSeconds() {
  const item = document.getElementById('timer-item'); if (item) item.classList.add('falling-last10');
  const toast = document.getElementById('falling-time-toast');
  if (!toast) return;
  toast.hidden = false; toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); toast.hidden = true; }, 900);
}
function expireFallingChallenge() {
  if (!isThreeMinuteFallingMode() || !gameRunning || fallingTimeExpired) return;
  fallingTimeExpired = true; timeLeft = 0; updateTimeDisplay();
  if (fallingChallengeClockTimer) clearInterval(fallingChallengeClockTimer); fallingChallengeClockTimer = null;
  clearNamedTimer('falling'); clearNamedTimer('lock'); clearNamedTimer('spawn');
  const timerItem = document.getElementById('timer-item'); if (timerItem) timerItem.classList.remove('falling-last10');
  if (window.BGMController) BGMController.fadeOutBgm(200);
  updateFallingControls();
  // 0秒直前に始まったハードドロップ・10消去・星処理・連鎖は最後まで解決する。
  if (!animating && !starEffectActive) {
    fallingPiece = null; removeFallingVisuals();
    maybeFinalizeExpiredFalling();
  }
}
function maybeFinalizeExpiredFalling() {
  if (!isThreeMinuteFallingMode() || !fallingTimeExpired || !gameRunning || fallingTimeEnding) return false;
  if (animating || starEffectActive) return false;
  fallingPiece = null; removeFallingVisuals();
  fallingTimeEnding = true;
  setTimeout(() => { if (gameRunning && isThreeMinuteFallingMode()) endGame('time'); }, 80);
  return true;
}
function getFallingChainBonus(chainStages) {
  if (!isThreeMinuteFallingMode() || chainStages < 2) return 0;
  const config = getCurrentFallingConfig();
  const key = Math.min(5, Math.max(1, Number(chainStages) || 1));
  return Math.min(config.chainBonusCap, config.chainBonus[key] || 0);
}
function showFallingChainBonus(chainStages, bonus) {
  if (!isThreeMinuteFallingMode() || bonus <= 0) return;
  const el = document.getElementById('falling-chain-bonus-toast'); if (!el) return;
  el.textContent = `${chainStages}れんさ！　れんさボーナス ＋${bonus}`;
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); el.hidden = true; }, 720);
}

function randomNumber() {
  if (isBattleMode() && typeof battleNextNumber === 'function') return battleNextNumber();
  let allowed;
  if (isFallingMode() || numberRangeType === 'all') {
    allowed = [1,2,3,4,5,6,7,8,9];
  } else if (numberRangeType === 'low') {
    allowed = [1,2,3,4,5];
  } else if (numberRangeType === 'high') {
    allowed = [6,7,8,9];
  } else if (numberRangeType === 'custom') {
    allowed = customNumbers.length > 0 ? customNumbers : [1,2,3,4,5,6,7,8,9];
  } else {
    allowed = [1,2,3,4,5,6,7,8,9];
  }

  if (noTenCounter >= 4) {
    const candidatesSet = new Set();
    for (let c = 0; c < BOARD_COLS; c++) {
      for (let r = 0; r < board[c].length; r++) {
        const complement = 10 - board[c][r].val;
        if (complement >= 1 && complement <= 9) candidatesSet.add(complement);
      }
    }
    const candidates = allowed.filter(n => candidatesSet.has(n));
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
  }
  return allowed[Math.floor(Math.random() * allowed.length)];
}

// ========= 盤面描画 =========
function renderBoard() {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';
  const compactHeight = window.innerHeight <= 720;
  const headerBudget = compactHeight ? (isFallingMode() ? 72 : 82) : 108;
  const footerBudget = compactHeight ? (isFallingMode() ? 62 : 70) : 94;
  const verticalChrome = compactHeight ? 58 : 72;
  const fallingExtra = isFallingMode() ? (compactHeight ? 84 : 102) : 0;
  const availableHeight = Math.max(260, window.innerHeight - headerBudget - footerBudget - verticalChrome - fallingExtra);
  const availableWidth = Math.max(320, Math.min(window.innerWidth * 0.62, 700));
  const cellByHeight = Math.floor(availableHeight / BOARD_ROWS) - 4;
  const cellByWidth = Math.floor((availableWidth - 54) / BOARD_COLS) - 4;
  const minCell = isFallingMode() ? 34 : 38;
  const maxCell = isFallingMode() ? 54 : 72;
  let cellSize = Math.max(minCell, Math.min(maxCell, cellByHeight, cellByWidth));
  if (window.TowerMobileLayout && TowerMobileLayout.isCompact()) {
    cellSize = TowerMobileLayout.cellSize(BOARD_COLS, BOARD_ROWS, isPairFallingMode() ? 2 : (isFallingMode() ? 1 : 0));
  }
  document.documentElement.style.setProperty('--cell-size', cellSize + 'px');

  for (let col = 0; col < BOARD_COLS; col++) {
    const colDiv = document.createElement('div');
    colDiv.className = 'column';
    colDiv.dataset.col = col;
    colDiv.addEventListener('click', () => {
      if (isFallingMode() || paused || animating || !gameRunning) return;
      placeNumber(col);
    });
    for (let row = 0; row < BOARD_ROWS; row++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.col = col;
      cell.dataset.row = row;
      colDiv.appendChild(cell);
    }
    boardDiv.appendChild(colDiv);
  }
  updateBoardUI();
  adjustTowerHeight();
  updateTutorialGuide();
}

function updateBoardUI(options = null) {
  const boardDiv = document.getElementById('board');
  if (!boardDiv) return;
  boardDiv.querySelectorAll('.falling-piece,.ghost-piece').forEach(el => el.remove());
  const cells = boardDiv.querySelectorAll('.cell');
  cells.forEach(cell => { cell.innerHTML = ''; });

  const dropTarget = options && options.dropTarget ? options.dropTarget : null;
  const landedTarget = options && options.landedTarget ? options.landedTarget : null;

  for (let c = 0; c < BOARD_COLS; c++) {
    const colData = board[c];
    const colDiv = boardDiv.querySelector(`.column[data-col="${c}"]`);
    if (!colDiv) continue;
    for (let r = 0; r < colData.length; r++) {
      const obj = colData[r];
      const cellIndex = BOARD_ROWS - 1 - r;
      const cell = colDiv.children[cellIndex];
      if (!cell) continue;
      const block = document.createElement('div');
      block.className = 'block' + (isStarBlock(obj) ? ' star-block' : '');
      block.style.backgroundImage = `url('${obj.texture || getRandomTexture()}')`;
      block.textContent = isStarBlock(obj) ? '' : obj.val;
      if (isBattleMode() && obj.recentGarbage) {
        block.classList.add('recent-garbage');
        block.dataset.garbageBatch = obj.garbageBatchId || '';
      }
      if (dropTarget && dropTarget.col === c && dropTarget.row === r) {
        const cellSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 60;
        const dropDistance = Math.round((cellIndex + 1) * (cellSize + 4) + 34);
        block.style.setProperty('--drop-distance', `-${dropDistance}px`);
        block.classList.add('dropping');
      }
      if (landedTarget && landedTarget.col === c && landedTarget.row === r) block.classList.add('just-landed');
      cell.appendChild(block);
    }
    colDiv.classList.toggle('full', colData.length >= BOARD_ROWS);
  }
  renderFallingVisual();
}

function getVisualPosition(col, row) {
  const boardDiv = document.getElementById('board');
  const colDiv = boardDiv && boardDiv.querySelector(`.column[data-col="${col}"]`);
  if (!boardDiv || !colDiv || !colDiv.children.length) return null;
  const topCell = colDiv.children[0];
  let cell;
  let top;
  if (row >= BOARD_ROWS) {
    const pitch = topCell.offsetHeight + 4;
    cell = topCell;
    top = colDiv.offsetTop + topCell.offsetTop - pitch * (row - BOARD_ROWS + 1);
  } else if (row >= 0) {
    const cellIndex = BOARD_ROWS - 1 - row;
    cell = colDiv.children[cellIndex];
    if (!cell) return null;
    top = colDiv.offsetTop + cell.offsetTop;
  } else {
    return null;
  }
  return {
    left: colDiv.offsetLeft + cell.offsetLeft,
    top,
    width: cell.offsetWidth,
    height: cell.offsetHeight
  };
}

function getPairOffset(orientation) {
  const o = ((Number(orientation) || 0) % 4 + 4) % 4;
  if (o === 0) return { dc: 0, dr: 1 };
  if (o === 1) return { dc: 1, dr: 0 };
  if (o === 2) return { dc: 0, dr: -1 };
  return { dc: -1, dr: 0 };
}
function getPairCells(piece, col = piece.col, row = piece.row, orientation = piece.orientation) {
  const off = getPairOffset(orientation);
  return [
    { key: 'first', col, row, block: piece.first },
    { key: 'second', col: col + off.dc, row: row + off.dr, block: piece.second }
  ];
}
function canPairCellOccupy(col, row) {
  if (col < 0 || col >= BOARD_COLS || row < 0) return false;
  if (row >= BOARD_ROWS) return true; // スポーン直後の盤面上部
  return board[col].length <= row;
}
function canPairOccupyAt(piece, col, row, orientation = piece.orientation) {
  if (!isPairBlock(piece)) return false;
  return getPairCells(piece, col, row, orientation).every(cell => canPairCellOccupy(cell.col, cell.row));
}
function getPairLandingPivotRow(piece) {
  if (!isPairBlock(piece)) return piece ? piece.row : BOARD_ROWS;
  let row = piece.row;
  let guard = BOARD_ROWS + 4;
  while (guard-- > 0 && canPairOccupyAt(piece, piece.col, row - 1, piece.orientation)) row--;
  return row;
}
function computePairSettlement(piece, pivotRow = piece.row) {
  const rigid = getPairCells(piece, piece.col, pivotRow, piece.orientation);
  const result = [];
  if (rigid[0].col === rigid[1].col) {
    const ordered = [...rigid].sort((a,b) => a.row - b.row);
    const baseRow = board[ordered[0].col].length;
    ordered.forEach((cell, index) => result.push({
      ...cell, startRow: cell.row, finalRow: baseRow + index
    }));
  } else {
    rigid.forEach(cell => result.push({
      ...cell, startRow: cell.row, finalRow: board[cell.col].length
    }));
  }
  return result;
}
function pairSettlementFits(settlement) {
  return Array.isArray(settlement) && settlement.length === 2 &&
    settlement.every(item => item.col >= 0 && item.col < BOARD_COLS && item.finalRow >= 0 && item.finalRow < BOARD_ROWS);
}
function removePairLinkVisuals(boardDiv = document.getElementById('board')) {
  if (!boardDiv) return;
  boardDiv.querySelectorAll('.pair-falling-link,.pair-break-link').forEach(el => el.remove());
}
function removeFallingVisuals() {
  const boardDiv = document.getElementById('board');
  if (!boardDiv) return;
  removePairLinkVisuals(boardDiv);
  boardDiv.querySelectorAll('.falling-piece,.ghost-piece,.pair-falling-member,.pair-ghost-member,.pair-settle-piece').forEach(el => el.remove());
}
function addPairConnector(boardDiv, aPos, bPos, className = 'pair-falling-link') {
  if (!boardDiv || !aPos || !bPos) return null;
  const ax = aPos.left + aPos.width / 2, ay = aPos.top + aPos.height / 2;
  const bx = bPos.left + bPos.width / 2, by = bPos.top + bPos.height / 2;
  const dx = bx - ax, dy = by - ay;
  const length = Math.max(10, Math.hypot(dx,dy));
  const angle = Math.atan2(dy,dx) * 180 / Math.PI;
  const link = document.createElement('div');
  link.className = className;
  link.style.setProperty('--pair-angle',`${angle}deg`);
  Object.assign(link.style,{left:ax+'px',top:(ay-6)+'px',width:length+'px',transform:`rotate(${angle}deg)`});
  boardDiv.appendChild(link);
  return link;
}
function renderPairFallingVisual(piece) {
  const boardDiv = document.getElementById('board');
  if (!boardDiv || !isPairBlock(piece)) return;
  const landingPivot = getPairLandingPivotRow(piece);
  const settlement = computePairSettlement(piece, landingPivot);
  settlement.forEach(item => {
    const pos = getVisualPosition(item.col, item.finalRow);
    if (!pos) return;
    const ghost = document.createElement('div');
    ghost.className = 'pair-ghost-member' + (item.finalRow >= BOARD_ROWS ? ' danger' : '');
    ghost.textContent = item.block.val;
    Object.assign(ghost.style,{left:pos.left+'px',top:pos.top+'px',width:pos.width+'px',height:pos.height+'px'});
    boardDiv.appendChild(ghost);
  });

  const cells = getPairCells(piece);
  const positions = cells.map(cell => getVisualPosition(cell.col,cell.row));
  cells.forEach((cell,index) => {
    const pos = positions[index]; if (!pos) return;
    const el=document.createElement('div');
    el.className='pair-falling-member'+(piece.phase==='locking'?' locking':'');
    el.dataset.pairMember=cell.key;
    el.textContent=cell.block.val;
    el.style.backgroundImage=`url('${cell.block.texture || BLOCK_IMAGES[index]}')`;
    Object.assign(el.style,{left:pos.left+'px',top:pos.top+'px',width:pos.width+'px',height:pos.height+'px'});
    boardDiv.appendChild(el);
  });
  if (positions[0] && positions[1]) addPairConnector(boardDiv,positions[0],positions[1]);
}
function renderFallingVisual() {
  if (!isFallingMode() || !fallingPiece || !isGameScreenActive()) return;
  const boardDiv = document.getElementById('board');
  if (!boardDiv) return;
  removePairLinkVisuals(boardDiv);
  boardDiv.querySelectorAll('.falling-piece,.ghost-piece,.pair-falling-member,.pair-ghost-member').forEach(el => el.remove());

  if (isPairFallingMode() && isPairBlock(fallingPiece)) {
    renderPairFallingVisual(fallingPiece);
    return;
  }

  const landingRow = getLandingRow(fallingPiece.col);
  const ghostPos = getVisualPosition(fallingPiece.col, landingRow);
  if (ghostPos) {
    const ghost = document.createElement('div');
    ghost.className = 'ghost-piece' + (isStarBlock(fallingPiece) ? ' star-block' : '') + (landingRow >= BOARD_ROWS ? ' danger' : '');
    ghost.textContent = isStarBlock(fallingPiece) ? '★' : fallingPiece.val;
    Object.assign(ghost.style, {
      left: ghostPos.left + 'px', top: ghostPos.top + 'px',
      width: ghostPos.width + 'px', height: ghostPos.height + 'px'
    });
    boardDiv.appendChild(ghost);
  }

  const piecePos = getVisualPosition(fallingPiece.col, fallingPiece.row);
  if (!piecePos) return;
  const pieceEl = document.createElement('div');
  pieceEl.className = 'falling-piece' + (isStarBlock(fallingPiece) ? ' star-block' : '') + (fallingPiece.phase === 'locking' ? ' locking' : '');
  pieceEl.textContent = isStarBlock(fallingPiece) ? '' : fallingPiece.val;
  pieceEl.style.backgroundImage = `url('${fallingPiece.texture || BLOCK_IMAGES[0]}')`;
  Object.assign(pieceEl.style, {
    left: piecePos.left + 'px', top: piecePos.top + 'px',
    width: piecePos.width + 'px', height: piecePos.height + 'px'
  });
  boardDiv.appendChild(pieceEl);
}

function updateInfoPanels() {
  ensureNumberQueue();
  const currentLabel = document.querySelector('.current-card .info-label');
  if (currentLabel) currentLabel.textContent = isPairFallingMode() ? 'いまの ペア' : 'いまの すうじ';
  renderBlockTile(document.getElementById('current-number'), numbersQueue[0], BLOCK_IMAGES[0]);
  renderBlockTile(document.getElementById('next1'), numbersQueue[1], BLOCK_IMAGES[1]);
  renderBlockTile(document.getElementById('next2'), numbersQueue[2], BLOCK_IMAGES[3]);
  renderBlockTile(document.getElementById('hold-block'), heldBlock, BLOCK_IMAGES[4]);
  updateHoldAvailability(); updateChainPowerUI();
  document.getElementById('tower-count').textContent = completedTowers + 'こ';
  document.getElementById('brick-count').textContent = bricks + ' / ' + TOWER_BRICKS;
  document.getElementById('ten-count').textContent = tenCount;
  document.getElementById('best-chain').textContent = bestChain;
  if (isBattleMode() && typeof battleUpdateLocalStats === 'function') battleUpdateLocalStats();
  if (window.TowerMobileLayout) TowerMobileLayout.updateSummary();
}
function updateTimeDisplay() {
  const m = Math.max(0, Math.floor(timeLeft / 60));
  const s = Math.max(0, timeLeft % 60);
  document.getElementById('time-left').textContent = m + ':' + String(s).padStart(2, '0');
}
function getTowerStage(brickCount) {
  let stage = 0;
  for (let i = 0; i < TOWER_THRESHOLDS.length; i++) {
    if (brickCount >= TOWER_THRESHOLDS[i]) stage = i + 1;
  }
  return Math.min(stage, TOWER_IMAGES.length - 1);
}
function updateTower(options = {}) {
  const completedNow = options.completedNow || 0;
  const oldStage = towerStage;
  towerStage = getTowerStage(bricks);
  const img = document.getElementById('tower-img');
  const box = document.getElementById('tower-container');
  const message = document.getElementById('tower-growth');
  const token = ++towerVisualToken;

  if (completedNow > 0) {
    if (window.TowerMobileLayout) TowerMobileLayout.completeTower(completedNow, completedTowers);
    img.src = TOWER_IMAGES[TOWER_IMAGES.length - 1];
    box.classList.remove('grow', 'complete');
    void box.offsetWidth;
    box.classList.add('complete');
    message.textContent = completedNow > 1 ? `とうが ${completedNow}こ できた！` : 'とうが できた！';
    message.classList.remove('show', 'complete-show');
    void message.offsetWidth;
    message.classList.add('complete-show');
    playSound(4);
    window.setTimeout(() => {
      if (token !== towerVisualToken) return;
      img.src = TOWER_IMAGES[towerStage];
      box.classList.remove('complete');
      box.classList.add('grow');
      message.textContent = 'つぎの とうを つくろう！';
      message.classList.remove('complete-show');
      void message.offsetWidth;
      message.classList.add('show');
    }, 1050);
    return;
  }

  img.src = TOWER_IMAGES[towerStage];
  box.classList.remove('complete');
  message.classList.remove('complete-show');
  if (towerStage > oldStage && oldStage >= 0) {
    box.classList.remove('grow', 'complete');
    void box.offsetWidth;
    box.classList.add('grow');
    message.textContent = 'とうが そだった！';
    message.classList.remove('show', 'complete-show');
    void message.offsetWidth;
    message.classList.add('show');
    playSound(3);
  }
}
function adjustTowerHeight() {
  // CSSグリッドで自動調整
}

// ========= ヒント =========
function clearHintHighlights() {
  document.querySelectorAll('#board .column').forEach(col => col.classList.remove('hint'));
  const hintIcon = document.getElementById('hint-icon');
  const hintText = document.getElementById('hint-text');
  if (hintIcon) hintIcon.style.display = 'none';
  if (hintText) hintText.textContent = '';
}
function getHintColumns(current) {
  const hintCols = [];
  for (let col = 0; col < BOARD_COLS; col++) {
    const colData = board[col];
    if (colData.length >= BOARD_ROWS) continue;
    const rowIndex = colData.length;
    let immediate = false;
    if (rowIndex > 0 && colData[rowIndex - 1].val + current === 10) immediate = true;
    if (col > 0 && board[col - 1].length > rowIndex && board[col - 1][rowIndex].val + current === 10) immediate = true;
    if (col < BOARD_COLS - 1 && board[col + 1].length > rowIndex && board[col + 1][rowIndex].val + current === 10) immediate = true;
    if (immediate) hintCols.push(col);
  }
  return hintCols;
}
function updateHints() {
  document.querySelectorAll('#board .column').forEach(col => col.classList.remove('hint'));
  const hintText = document.getElementById('hint-text');
  const hintIcon = document.getElementById('hint-icon');
  if (!hintText || !hintIcon) return;
  if (isTutorialMode()) { updateTutorialGuide(); return; }
  hintText.textContent = ''; hintIcon.style.display = 'none';
  if (isBattleMode()) return;
  if (!hintOn || numbersQueue.length === 0 || !isGameScreenActive()) return;
  const currentObj = fallingPiece || numbersQueue[0];
  if (isStarBlock(currentObj)) { hintIcon.style.display='block'; hintText.textContent='すきな れつで じゅうじに けそう！'; return; }
  if (isPairBlock(currentObj)) {
    hintIcon.style.display='block';
    hintText.textContent='2こを まわして 10と れんさを ねらおう！';
    return;
  }
  const current = currentObj.val;
  const hintCols = getHintColumns(current);
  hintIcon.style.display = 'block';
  if (hintCols.length > 0) {
    hintText.textContent = isFallingMode() ? `${10 - current}の となりを めざそう！` : `${10 - current}を さがしてみよう！`;
  } else {
    hintText.textContent = isFallingMode() ? 'つぎの すうじも みてみよう' : `${10 - current}を さがしてみよう！`;
  }
}

// ========= 通常モードの配置 =========
function placeNumber(col) {
  if (paused || animating || !gameRunning || isFallingMode()) return;
  if (isBasicTutorial() && col !== tutorialTargetCol) return;
  const colData = board[col]; if (!colData || colData.length >= BOARD_ROWS) return;
  const session = gameSessionToken; animating = true; clearHintHighlights(); clearTutorialHighlights();
  const currentObj = cloneBlockObject(numbersQueue[0]);
  advanceCurrentQueue(); holdUsedThisTurn = false;
  if (isBasicTutorial()) numbersQueue[numbersQueue.length-1] = makeNumberObject(1);
  colData.push(cloneBlockObject(currentObj));
  const row = colData.length - 1;
  updateBoardUI({ dropTarget: { col, row } }); updateInfoPanels();
  setTimeout(() => {
    if (!gameRunning || session !== gameSessionToken) return;
    updateBoardUI(); resolvePlacedBlock(col, row, currentObj);
  }, DROP_ANIMATION_MS);
}

// ========= おちてくるモード =========
function scheduleSpawn(delay = 180) {
  if (isThreeMinuteFallingMode() && fallingTimeExpired) { maybeFinalizeExpiredFalling(); return; }
  if (!isFallingMode() || !gameRunning || paused || animating || endingGame) return;
  if (isBattleMode() && typeof battleCanContinue === 'function' && !battleCanContinue()) return;
  clearNamedTimer('spawn');
  const session = gameSessionToken;
  spawnTimer = setTimeout(() => {
    spawnTimer = null;
    if (!gameRunning || paused || animating || session !== gameSessionToken) return;
    spawnFallingPiece();
  }, delay);
}
function findPairSpawnCol(pair) {
  const base = Math.floor(FALLING_COLS / 2);
  const attempts = [base, base - 1, base + 1, base - 2, base + 2];
  for (const col of attempts) if (canPairOccupyAt(pair,col,BOARD_ROWS,pair.orientation)) return col;
  return base;
}
function spawnFallingPiece() {
  if (isThreeMinuteFallingMode() && fallingTimeExpired) { maybeFinalizeExpiredFalling(); return; }
  if (!isFallingMode() || !gameRunning || paused || animating || fallingPiece || endingGame) return;
  if (isBattleMode() && typeof battleCanContinue === 'function' && !battleCanContinue()) return;
  ensureNumberQueue();
  const obj = numbersQueue[0];
  if (isPairFallingMode() && isPairBlock(obj)) {
    const pair = clonePairObject(obj);
    pair.col = findPairSpawnCol(pair);
    pair.row = BOARD_ROWS;
    pair.phase = 'falling';
    pair.lockElapsed = 0;
    pair.lockStartedAt = 0;
    pair.intervalMs = getFallingIntervalForLevel();
    fallingPiece = pair;
  } else {
    fallingPiece = {
      kind: obj.kind || BLOCK_KIND_NUMBER, val: obj.val, color: obj.color, texture: obj.texture || getRandomTexture(),
      col: Math.floor(FALLING_COLS / 2), row: BOARD_ROWS, phase: 'falling',
      lockElapsed: 0, lockStartedAt: 0, intervalMs: getFallingIntervalForLevel()
    };
  }
  updateBoardUI(); updateInfoPanels(); updateHints(); updateFallingControls();
  scheduleFallingStep(getPieceFallInterval());
}
function scheduleFallingStep(delay = null) {
  clearNamedTimer('falling');
  if (isThreeMinuteFallingMode() && fallingTimeExpired) return;
  if (!fallingPiece || paused || animating || !gameRunning || endingGame) return;
  const wait = delay === null ? getPieceFallInterval() : delay;
  const session = gameSessionToken;
  fallingTimer = setTimeout(() => {
    fallingTimer = null;
    if (!gameRunning || paused || animating || !fallingPiece || session !== gameSessionToken) return;
    fallingStep();
  }, wait);
}
function canOccupy(col, row) {
  if (col < 0 || col >= BOARD_COLS || row < 0 || row > BOARD_ROWS) return false;
  return board[col].length <= row;
}
function canFall(piece = fallingPiece) {
  if (!piece) return false;
  const nextRow = piece.row - 1;
  if (nextRow < 0) return false;
  if (isPairBlock(piece)) return canPairOccupyAt(piece,piece.col,nextRow,piece.orientation);
  return canOccupy(piece.col, nextRow);
}
function getLandingRow(col) {
  return board[col] ? board[col].length : BOARD_ROWS;
}
function fallingStep() {
  if (isThreeMinuteFallingMode() && fallingTimeExpired) { maybeFinalizeExpiredFalling(); return; }
  if (!fallingPiece || paused || animating || !gameRunning) return;
  if (canFall()) {
    clearNamedTimer('lock'); fallingPiece.phase = 'falling'; fallingPiece.row--;
    renderFallingVisual(); updateFallingControls(); scheduleFallingStep(getPieceFallInterval());
  } else {
    if (isFallingTutorial() && tutorialStep <= 2) { resetFallingTutorialPiece(); return; }
    beginLockDelay();
  }
}
function accrueLockTime() {
  if (!fallingPiece || !fallingPiece.lockStartedAt) return;
  fallingPiece.lockElapsed += Math.max(0, Date.now() - fallingPiece.lockStartedAt);
  fallingPiece.lockStartedAt = 0;
}
function beginLockDelay() {
  if (isThreeMinuteFallingMode() && fallingTimeExpired) { fallingPiece=null; removeFallingVisuals(); maybeFinalizeExpiredFalling(); return; }
  if (!fallingPiece || paused || animating || !gameRunning) return;
  clearNamedTimer('falling');
  clearNamedTimer('lock');
  fallingPiece.phase = 'locking';
  const remainingTotal = MAX_LOCK_DELAY_MS - fallingPiece.lockElapsed;
  if (remainingTotal <= 0) {
    lockFallingPiece(false);
    return;
  }
  const delay = Math.min(LOCK_DELAY_MS, remainingTotal);
  fallingPiece.lockStartedAt = Date.now();
  renderFallingVisual();
  updateFallingControls();
  const session = gameSessionToken;
  lockTimer = setTimeout(() => {
    lockTimer = null;
    if (!gameRunning || paused || animating || !fallingPiece || session !== gameSessionToken) return;
    accrueLockTime();
    if (canFall()) {
      fallingPiece.phase = 'falling';
      renderFallingVisual();
      scheduleFallingStep(180);
    } else {
      lockFallingPiece(false);
    }
  }, delay);
}
function moveFalling(direction) {
  if (!isFallingMode() || !fallingPiece || paused || animating || !gameRunning || endingGame || resumeCountdownActive || (isThreeMinuteFallingMode() && fallingTimeExpired)) return;
  if (isFallingTutorial()) {
    const expected = tutorialStep === 1 ? -1 : (tutorialStep === 2 ? 1 : null);
    if (expected !== null && direction !== expected) return;
  }
  const targetCol = fallingPiece.col + direction;
  const canMove = isPairBlock(fallingPiece)
    ? canPairOccupyAt(fallingPiece,targetCol,fallingPiece.row,fallingPiece.orientation)
    : canOccupy(targetCol, fallingPiece.row);
  if (!canMove) return;
  const wasLocking = fallingPiece.phase === 'locking';
  if (wasLocking) { accrueLockTime(); clearNamedTimer('lock'); }
  fallingPiece.col = targetCol; renderFallingVisual(); updateHints();
  if (isFallingTutorial() && (tutorialStep === 1 || tutorialStep === 2)) {
    clearNamedTimer('falling'); advanceFallingTutorialAfterMove(); updateFallingControls(); return;
  }
  if (canFall()) { fallingPiece.phase = 'falling'; if (wasLocking) scheduleFallingStep(180); }
  else beginLockDelay();
  updateFallingControls();
}
function rotatePair(direction) {
  if (!isPairFallingMode() || !fallingPiece || !isPairBlock(fallingPiece) || paused || animating || !gameRunning || endingGame || resumeCountdownActive || fallingTimeExpired) return;
  const step = direction < 0 ? -1 : 1;
  const nextOrientation = (fallingPiece.orientation + step + 4) % 4;
  const wasLocking = fallingPiece.phase === 'locking';
  if (wasLocking) { accrueLockTime(); clearNamedTimer('lock'); }
  let applied = false;
  const tryApplyRotation = targetCol => {
    if (!canPairOccupyAt(fallingPiece,targetCol,fallingPiece.row,nextOrientation)) return false;
    fallingPiece.col = targetCol;
    fallingPiece.orientation = nextOrientation;
    if (isPairBlock(numbersQueue[0])) numbersQueue[0].orientation = nextOrientation;
    return true;
  };
  applied = tryApplyRotation(fallingPiece.col);
  if (!applied) {
    // 簡易ウォールキックは「左右端へはみ出す場合」だけ1マス。
    // 盤面内の既存ブロックに阻まれた回転を横ずらしで回避しない。
    const rawCells = getPairCells(fallingPiece,fallingPiece.col,fallingPiece.row,nextOrientation);
    const leftOut = rawCells.some(cell => cell.col < 0);
    const rightOut = rawCells.some(cell => cell.col >= BOARD_COLS);
    if (leftOut && !rightOut) applied = tryApplyRotation(fallingPiece.col + 1);
    else if (rightOut && !leftOut) applied = tryApplyRotation(fallingPiece.col - 1);
  }
  if (!applied) {
    if (wasLocking) beginLockDelay();
    updateFallingControls();
    return;
  }
  renderFallingVisual(); updateInfoPanels(); updateHints();
  if (canFall()) { fallingPiece.phase='falling'; if (wasLocking) scheduleFallingStep(180); }
  else beginLockDelay();
  updateFallingControls();
}
function hardDropPiece() {
  if (!isFallingMode() || !fallingPiece || paused || animating || !gameRunning || endingGame || resumeCountdownActive || (isThreeMinuteFallingMode() && fallingTimeExpired)) return;
  if (isFallingTutorial() && tutorialStep < 3) return;
  clearNamedTimer('falling'); if (fallingPiece.phase === 'locking') accrueLockTime(); clearNamedTimer('lock');

  if (isPairBlock(fallingPiece)) {
    const targetRow = getPairLandingPivotRow(fallingPiece);
    const startRow = fallingPiece.row;
    const boardDiv = document.getElementById('board');
    const topCell = boardDiv ? boardDiv.querySelector('.cell') : null;
    const pitch = topCell ? topCell.offsetHeight + 4 : 44;
    const distance = Math.max(0,startRow-targetRow)*pitch;
    animating=true; updateFallingControls();
    const members = boardDiv ? boardDiv.querySelectorAll('.pair-falling-member') : [];
    const link = boardDiv ? boardDiv.querySelector('.pair-falling-link') : null;
    const motion = `${HARD_DROP_MS}ms cubic-bezier(.18,.75,.32,1)`;
    members.forEach(el=>{
      el.classList.remove('locking');
      el.style.transition=`transform ${motion}`;
    });
    if (link) link.style.transition=`top ${motion}`;
    // 回転・移動直後の新規DOMも、3要素の開始位置を同じ描画で確定する。
    if (boardDiv) void boardDiv.offsetHeight;
    members.forEach(el=>{ el.style.transform=`translateY(${distance}px)`; });
    // rotateは維持し、数字と共通の距離・時間・easingで縦位置だけを移動。
    if (link) link.style.top=(parseFloat(link.style.top)+distance)+'px';
    const session=gameSessionToken;
    setTimeout(()=>{
      if(!gameRunning||session!==gameSessionToken||!fallingPiece)return;
      fallingPiece.row=targetRow; animating=false; lockFallingPiece(true);
    },HARD_DROP_MS);
    return;
  }

  const targetRow = getLandingRow(fallingPiece.col);
  if (targetRow >= BOARD_ROWS) { finishFallingFull(); return; }
  const startRow = fallingPiece.row;
  const boardDiv = document.getElementById('board');
  const pieceEl = boardDiv ? boardDiv.querySelector('.falling-piece') : null;
  const topCell = boardDiv ? boardDiv.querySelector('.cell') : null;
  const pitch = topCell ? topCell.offsetHeight + 4 : 44;
  const distance = Math.max(0, startRow - targetRow) * pitch;
  animating = true; updateFallingControls();
  if (pieceEl) { pieceEl.classList.remove('locking'); pieceEl.classList.add('hard-dropping'); pieceEl.style.setProperty('--hard-distance', distance + 'px'); }
  const session = gameSessionToken;
  setTimeout(() => {
    if (!gameRunning || session !== gameSessionToken || !fallingPiece) return;
    fallingPiece.row = targetRow; animating = false; lockFallingPiece(true);
  }, HARD_DROP_MS);
}
function renderPairSettlementAnimation(piece, settlement) {
  const boardDiv=document.getElementById('board'); if(!boardDiv)return;
  // 分離開始時点で接続線は存在理由を失う。残像防止のため即時・全件削除する。
  removePairLinkVisuals(boardDiv);
  boardDiv.querySelectorAll('.pair-falling-member,.pair-ghost-member').forEach(el=>el.remove());
  const starts=settlement.map(item=>getVisualPosition(item.col,item.startRow));
  const finals=settlement.map(item=>getVisualPosition(item.col,item.finalRow));
  settlement.forEach((item,index)=>{
    const start=starts[index], end=finals[index]; if(!start||!end)return;
    const el=document.createElement('div');
    el.className='pair-settle-piece';
    el.textContent=item.block.val;
    el.style.backgroundImage=`url('${item.block.texture || BLOCK_IMAGES[index]}')`;
    el.style.setProperty('--pair-settle-ms',`${PAIR_FALLING_CONFIG.settleAnimationMs}ms`);
    el.style.setProperty('--pair-dx',`${end.left-start.left}px`);
    el.style.setProperty('--pair-dy',`${end.top-start.top}px`);
    Object.assign(el.style,{left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px'});
    boardDiv.appendChild(el);
  });
}
function commitPairSettlement(settlement) {
  const ordered=[...settlement].sort((a,b)=>a.finalRow-b.finalRow);
  for(const item of ordered){
    if(!board[item.col] || board[item.col].length!==item.finalRow) return false;
    board[item.col].push(cloneBlockObject(item.block));
  }
  return true;
}
function resolveSettledPair() {
  if(!gameRunning)return;
  const found=findAllPairs();
  updateBoardUI(); updateInfoPanels();
  if(found.count>0){
    noTenCounter=0;
    processRemovals(found.set,found.count);
    return;
  }
  noTenCounter++;
  animating=false; pairSettling=false;
  updateHints(); updateFallingControls();
  if(isThreeMinuteFallingMode()&&fallingTimeExpired){maybeFinalizeExpiredFalling();return;}
  scheduleSpawn(160);
}
function settlePairFallingPiece(fromHardDrop) {
  if(!fallingPiece||!isPairBlock(fallingPiece)||!gameRunning||endingGame)return;
  clearNamedTimer('falling');clearNamedTimer('lock');accrueLockTime();
  const piece=clonePairObject(fallingPiece);
  piece.col=fallingPiece.col;piece.row=fallingPiece.row;piece.orientation=fallingPiece.orientation;
  const settlement=computePairSettlement(piece,piece.row);
  if(!pairSettlementFits(settlement)){
    fallingPiece=null;pairSettling=false;animating=false;removeFallingVisuals();finishFallingFull();return;
  }
  const session=gameSessionToken;
  animating=true;pairSettling=true;clearHintHighlights();updateFallingControls();
  renderPairSettlementAnimation(piece,settlement);
  fallingPiece=null;
  setTimeout(()=>{
    if(!gameRunning||session!==gameSessionToken)return;
    removeFallingVisuals();
    if(!commitPairSettlement(settlement)){pairSettling=false;animating=false;finishFallingFull();return;}
    pairPlacements++;
    advanceCurrentQueue();
    holdUsedThisTurn=false;
    pairSettling=false;animating=false;
    updateBoardUI();updateInfoPanels();updateFallingControls();
    resolveSettledPair();
  },PAIR_FALLING_CONFIG.settleAnimationMs + (fromHardDrop?20:0));
}
function lockFallingPiece(fromHardDrop) {
  if (!fallingPiece || !gameRunning || endingGame) return;
  if (isPairFallingMode() && isPairBlock(fallingPiece)) {
    settlePairFallingPiece(fromHardDrop);
    return;
  }
  clearNamedTimer('falling');
  clearNamedTimer('lock');
  accrueLockTime();

  if (fallingPiece.row >= BOARD_ROWS || board[fallingPiece.col].length !== fallingPiece.row) {
    finishFallingFull();
    return;
  }

  const session = gameSessionToken;
  const col = fallingPiece.col;
  const row = fallingPiece.row;
  const currentObj = {
    kind: fallingPiece.kind || BLOCK_KIND_NUMBER,
    val: fallingPiece.val,
    color: fallingPiece.color,
    texture: fallingPiece.texture || getRandomTexture()
  };
  animating = true;
  clearHintHighlights();
  board[col].push(currentObj);
  fallingPiece = null;
  advanceCurrentQueue();
  holdUsedThisTurn = false;
  updateBoardUI({ landedTarget: { col, row } });
  updateInfoPanels();
  updateFallingControls();

  setTimeout(() => {
    if (!gameRunning || session !== gameSessionToken) return;
    resolvePlacedBlock(col, row, currentObj);
  }, fromHardDrop ? 190 : 230);
}
function updateFallingControls() {
  updateActionControlVisibility();
  const ids = ['move-left-btn','hard-drop-btn','move-right-btn','rotate-left-btn','rotate-right-btn'];
  const generallyDisabled = !isFallingMode() || !gameRunning || paused || animating || !fallingPiece || endingGame || resumeCountdownActive || (isThreeMinuteFallingMode() && fallingTimeExpired);
  ids.forEach(id => {
    const btn = document.getElementById(id); if (!btn) return;
    let disabled = generallyDisabled;
    if ((id==='rotate-left-btn'||id==='rotate-right-btn') && (!isPairFallingMode() || !isPairBlock(fallingPiece))) disabled = true;
    if (isFallingTutorial() && !generallyDisabled) {
      if (tutorialStep === 1) disabled = id !== 'move-left-btn';
      else if (tutorialStep === 2) disabled = id !== 'move-right-btn';
      else if (tutorialStep === 3 || tutorialStep === 4) disabled = id !== 'hard-drop-btn';
    }
    btn.disabled = disabled;
  });
  updateTutorialGuide();
  updateHoldAvailability();
}
function finishFallingFull() {
  if (isFallingTutorial()) { resetFallingTutorialPiece(); return; }
  if (isBattleMode() && typeof battleEliminate === 'function') { battleEliminate('full'); return; }
  if (endingGame || !gameRunning) return;
  endingGame = true; paused = true; animating = true; clearFallingTimers(); updateFallingControls();
  showToast('いっぱいになったよ！');
  const session = gameSessionToken;
  setTimeout(() => { if (gameRunning && session === gameSessionToken) endGame('full'); }, 850);
}

// ========= 配置後の共通処理 =========
function getImmediatePairs(col, row, currentObj) {
  const toDelete = new Set();
  let immediatePairs = 0;
  const colData = board[col];
  if (row > 0 && colData[row - 1].val + currentObj.val === 10) {
    toDelete.add(`${col},${row - 1}`);
    toDelete.add(`${col},${row}`);
    immediatePairs++;
  }
  if (col > 0 && board[col - 1].length > row && board[col - 1][row].val + currentObj.val === 10) {
    toDelete.add(`${col - 1},${row}`);
    toDelete.add(`${col},${row}`);
    immediatePairs++;
  }
  if (col < BOARD_COLS - 1 && board[col + 1].length > row && board[col + 1][row].val + currentObj.val === 10) {
    toDelete.add(`${col + 1},${row}`);
    toDelete.add(`${col},${row}`);
    immediatePairs++;
  }
  return { toDelete, immediatePairs };
}
function resolvePlacedBlock(col, row, currentObj) {
  if (!gameRunning) return;
  if (isStarBlock(currentObj)) { animating=false; updateBoardUI(); processStarCross(col,row); return; }
  const { toDelete, immediatePairs } = getImmediatePairs(col, row, currentObj);
  animating = false; updateBoardUI();
  if (immediatePairs > 0) { noTenCounter = 0; processRemovals(toDelete, immediatePairs); }
  else {
    noTenCounter++; updateHints(); updateFallingControls();
    if (isTutorialMode()) { handleTutorialResolution({ pairs: 0, chainStages: 0, completedNow: 0 }); return; }
    if (isBattleMode() && typeof battleAfterMove === 'function') { battleAfterMove({ pairs: 0, chainStages: 0, completedNow: 0 }); return; }
    if (isThreeMinuteFallingMode() && fallingTimeExpired) { maybeFinalizeExpiredFalling(); return; }
    if (isFallingMode()) scheduleSpawn(160); else if (isBoardFull()) endGame('full');
  }
}
function processRemovals(initialSet, initialPairs) {
  if (animating || !gameRunning) return;
  const session = gameSessionToken; animating = true; updateFallingControls();
  let totalPairs = initialPairs; let chainStages = 1;
  function highlightAndRemove(set) {
    if (!gameRunning || session !== gameSessionToken) return;
    if (isRealFallingMode() || isPairFallingMode()) playChainRiseSE(chainStages);
    highlightBlocks(set);
    setTimeout(() => {
      if (!gameRunning || session !== gameSessionToken) return;
      removeAndDrop(set); updateBoardUI();
      setTimeout(() => {
        if (!gameRunning || session !== gameSessionToken) return;
        const found = findAllPairs();
        if (found.count > 0) { totalPairs += found.count; chainStages++; highlightAndRemove(found.set); return; }
        const fallingChainBonus = getFallingChainBonus(chainStages);
        bricks += totalPairs + fallingChainBonus; tenCount += totalPairs;
        if (fallingChainBonus > 0) fallingChainBonusTotal += fallingChainBonus;
        const completedNow = Math.floor(bricks / TOWER_BRICKS);
        if (completedNow > 0) { completedTowers += completedNow; bricks %= TOWER_BRICKS; }
        if (chainStages > bestChain) bestChain = chainStages;
        addChainPower(chainStages);
        if (fallingChainBonus > 0) showFallingChainBonus(chainStages, fallingChainBonus);
        showToast(completedNow > 0 ? `とうが ${completedTowers}こ！` : (chainStages > 1 ? `${chainStages}れんさ！` : '10！'));
        if (completedNow === 0) playSound(Math.min(4, totalPairs));
        updateTower({ completedNow }); awardPendingStarBlock(); updateInfoPanels();
        if (isBattleMode() && typeof battleRecordAttack === 'function') battleRecordAttack(totalPairs, chainStages);
        const wait = completedNow > 0 ? 1180 : 0;
        setTimeout(() => {
          if (!gameRunning || session !== gameSessionToken) return;
          animating = false; updateBoardUI(); updateHints(); updateFallingControls();
          if (isTutorialMode()) { handleTutorialResolution({ pairs: totalPairs, chainStages, completedNow }); return; }
          if (isBattleMode() && typeof battleAfterMove === 'function') { battleAfterMove({ pairs: totalPairs, chainStages, completedNow }); return; }
          if (isThreeMinuteFallingMode() && fallingTimeExpired) { maybeFinalizeExpiredFalling(); return; }
          if (isFallingMode()) scheduleSpawn(150); else if (isBoardFull()) endGame('full');
        }, wait);
      }, 200);
    }, 250);
  }
  highlightAndRemove(initialSet);
}
function highlightBlocks(set) {
  set.forEach(key => {
    const [c, r] = key.split(',').map(Number);
    const cellIndex = BOARD_ROWS - 1 - r;
    const colDiv = document.querySelector(`#board .column[data-col="${c}"]`);
    if (!colDiv) return;
    const cell = colDiv.children[cellIndex];
    const block = cell && cell.querySelector('.block');
    if (block) block.classList.add('removing');
  });
}
function removeAndDrop(set) {
  set.forEach(key => {
    const [c, r] = key.split(',').map(Number);
    if (board[c] && board[c][r] !== undefined) board[c][r] = null;
  });
  for (let c = 0; c < BOARD_COLS; c++) board[c] = board[c].filter(item => item !== null);
}
function findAllPairs() {
  const toDelete = new Set();
  let countPairs = 0;
  for (let c = 0; c < BOARD_COLS; c++) {
    const colData = board[c];
    for (let r = 0; r < colData.length; r++) {
      const val = colData[r].val;
      if (r > 0 && val + colData[r - 1].val === 10) {
        toDelete.add(`${c},${r}`);
        toDelete.add(`${c},${r - 1}`);
        countPairs++;
      }
      if (c > 0 && board[c - 1].length > r && val + board[c - 1][r].val === 10) {
        toDelete.add(`${c},${r}`);
        toDelete.add(`${c - 1},${r}`);
        countPairs++;
      }
    }
  }
  return { set: toDelete, count: countPairs };
}
function isBoardFull() {
  return board.every(col => col.length >= BOARD_ROWS);
}

// ========= 一時停止 =========
function pauseGame() {
  if (isTutorialMode() || isBattleMode()) return;
  if (!gameRunning || animating || endingGame || resumeCountdownActive) return;
  const overlay = document.getElementById('pause-overlay');
  if (!paused) {
    paused = true;
    if (isFallingMode()) {
      if (fallingPiece && fallingPiece.phase === 'locking') accrueLockTime();
      clearNamedTimer('falling');
      clearNamedTimer('lock');
      clearNamedTimer('spawn');
    }
    setPauseButton(true);
    if (overlay) overlay.hidden = false;
    if (window.BGMController) BGMController.pauseForGame('manual');
    updateFallingControls();
    return;
  }

  if (isFallingMode()) {
    beginResumeCountdown();
  } else {
    paused = false;
    setPauseButton(false);
    if (overlay) overlay.hidden = true;
    if (window.BGMController) BGMController.resumeForGame();
    updateHints();
    updateHoldAvailability();
  }
}
function beginResumeCountdown() {
  if (!paused || resumeCountdownActive) return;
  resumeCountdownActive = true;
  const pauseOverlay = document.getElementById('pause-overlay');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownText = document.getElementById('countdown-text');
  if (pauseOverlay) pauseOverlay.hidden = true;
  if (countdownOverlay) countdownOverlay.hidden = false;
  updateFallingControls();
  const steps = ['3','2','1','スタート！'];
  let index = 0;
  const session = gameSessionToken;

  function next() {
    if (!gameRunning || session !== gameSessionToken) return;
    countdownText.textContent = steps[index];
    countdownText.classList.toggle('start-label', index === steps.length - 1);
    index++;
    if (index < steps.length) {
      countdownTimer = setTimeout(next, 620);
    } else {
      countdownTimer = setTimeout(() => {
        if (!gameRunning || session !== gameSessionToken) return;
        countdownOverlay.hidden = true;
        countdownText.classList.remove('start-label');
        resumeCountdownActive = false;
        paused = false;
        setPauseButton(false);
        if (window.BGMController) BGMController.resumeForGame();
        updateHints();
        updateFallingControls();
        if (fallingPiece) {
          if (canFall()) {
            fallingPiece.phase = 'falling';
            scheduleFallingStep(Math.min(500, getPieceFallInterval()));
          } else {
            beginLockDelay();
          }
        } else if (!animating) {
          scheduleSpawn(300);
        }
      }, 620);
    }
  }
  next();
}

// ========= 結果・記録 =========
function saveGeneralRecords() {
  try {
    const bestTowers = parseInt(localStorage.getItem('bestTowers') || '0', 10);
    if (completedTowers > bestTowers) localStorage.setItem('bestTowers', completedTowers.toString());
    const totalProgress = completedTowers * TOWER_BRICKS + bricks;
    const bestProgress = parseInt(localStorage.getItem('bestTowerProgress') || '0', 10);
    if (totalProgress > bestProgress) localStorage.setItem('bestTowerProgress', totalProgress.toString());
    const bestTen = parseInt(localStorage.getItem('bestTen') || '0', 10);
    if (tenCount > bestTen) localStorage.setItem('bestTen', tenCount.toString());
    const savedChain = parseInt(localStorage.getItem('bestChain') || '0', 10);
    if (bestChain > savedChain) localStorage.setItem('bestChain', bestChain.toString());
  } catch (e) {}
}
function getFallingTotalBricks() { return completedTowers * TOWER_BRICKS + bricks; }
function formatFallingTowerRecord(totalBricks) {
  const safe = Math.max(0, Math.floor(Number(totalBricks) || 0));
  const towers = Math.floor(safe / TOWER_BRICKS), remainder = safe % TOWER_BRICKS;
  return { totalBricks:safe, towers, bricks:remainder, text:`${towers}とう ＋ ${remainder}れんが` };
}
function saveAndGetFalling3MinuteRecord(totalBricks) {
  const info = { previousBestTotal:null, bestTotal:totalBricks, previousBestChain:null, bestChain:bestChain, isNewRecord:false, improvement:0, firstPlay:true };
  try {
    const rawTotal = localStorage.getItem('falling3minBestTotalBricks');
    const rawChain = localStorage.getItem('falling3minBestMaxChain');
    const previousTotal = rawTotal === null ? null : Math.max(0, parseInt(rawTotal,10) || 0);
    const previousChain = rawChain === null ? null : Math.max(0, parseInt(rawChain,10) || 0);
    info.previousBestTotal = previousTotal; info.previousBestChain = previousChain; info.firstPlay = previousTotal === null;
    if (previousTotal === null || totalBricks > previousTotal) {
      info.isNewRecord = true; info.improvement = previousTotal === null ? 0 : totalBricks - previousTotal; info.bestTotal = totalBricks;
      localStorage.setItem('falling3minBestTotalBricks', String(totalBricks));
    } else info.bestTotal = previousTotal;
    const bestChainNow = previousChain === null ? bestChain : Math.max(previousChain,bestChain);
    info.bestChain = bestChainNow; localStorage.setItem('falling3minBestMaxChain', String(bestChainNow));
    const oldBonus = Math.max(0, parseInt(localStorage.getItem('falling3minBestChainBonus') || '0',10) || 0);
    if (fallingChainBonusTotal > oldBonus) localStorage.setItem('falling3minBestChainBonus', String(fallingChainBonusTotal));
  } catch (e) {}
  return info;
}
function makeFallingResultId() {
  try { if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch (e) {}
  return 'fr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,12);
}
// 1つのJSONを書き込むことで、合計・連鎖・ボーナスの部分保存を避ける。
// 通常おちてくるのキーを読まず、共有端末では「この端末のベスト」として扱う。
function saveAndGetPair3MinuteRecord(snapshot) {
  const info={previousBestTotal:null,bestTotal:snapshot.totalBricks,previousBestChain:null,bestChain:snapshot.maxChain,
    isNewRecord:false,improvement:0,firstPlay:true,saved:false};
  try {
    const raw=localStorage.getItem(PAIR_RESULT_CONFIG.storageKey);
    const previous=raw===null?null:JSON.parse(raw);
    const valid=n=>typeof n==='number'&&Number.isFinite(n)&&Number.isInteger(n)&&n>=0;
    if(raw!==null&&(!previous||previous.version!==1||!valid(previous.bestTotalBricks)||!valid(previous.bestMaxChain)||!valid(previous.bestChainBonus))) {
      info.historyUnavailable=true;return info; // 壊れた既存データを無断で上書きしない。
    }
    info.previousBestTotal=previous?previous.bestTotalBricks:null;
    info.previousBestChain=previous?previous.bestMaxChain:null;
    info.firstPlay=!previous;
    info.bestTotal=Math.max(snapshot.totalBricks,previous?previous.bestTotalBricks:0);
    info.bestChain=Math.max(snapshot.maxChain,previous?previous.bestMaxChain:0);
    info.isNewRecord=!previous||snapshot.totalBricks>previous.bestTotalBricks;
    info.improvement=previous&&info.isNewRecord?snapshot.totalBricks-previous.bestTotalBricks:0;
    const record={version:1,bestTotalBricks:info.bestTotal,bestMaxChain:info.bestChain,
      bestChainBonus:Math.max(snapshot.chainBonusTotal,previous?previous.bestChainBonus:0)};
    localStorage.setItem(PAIR_RESULT_CONFIG.storageKey,JSON.stringify(record));
    info.saved=true;
  } catch(e) { info.storageUnavailable=true; }
  return info;
}
function chooseFallingNextGoal(snapshot, recordInfo, communityStats=null) {
  const total = snapshot.totalBricks;
  const remainder = total % TOWER_BRICKS;
  const toNextTower = remainder === 0 ? TOWER_BRICKS : TOWER_BRICKS - remainder;
  const nextTower = Math.floor(total / TOWER_BRICKS) + 1;
  const bestGap = recordInfo && recordInfo.previousBestTotal !== null && total < recordInfo.previousBestTotal ? recordInfo.previousBestTotal - total : null;
  if (bestGap !== null && bestGap <= FALLING_CONFIG.goalNearBrickThreshold && bestGap <= toNextTower) return `ベストまで あと${bestGap}れんが！`;
  if (toNextTower <= FALLING_CONFIG.goalNearBrickThreshold) return `あと${toNextTower}れんがで ${nextTower}とう！`;
  if (snapshot.maxChain < 5) return `つぎは ${Math.max(2,snapshot.maxChain + 1)}れんさを ねらおう！`;
  if (communityStats && !communityStats.collecting && communityStats.percentile > 10 && communityStats.percentile <= 25) {
    const milestone = communityStats.percentile <= 15 ? 10 : 20;
    return `つぎは 上位${milestone}％を めざそう！`;
  }
  return `あと${toNextTower}れんがで ${nextTower}とう！`;
}
function resetFallingResultPresentation() {
  const card=document.getElementById('result-card'); if(card) card.classList.remove('falling-result-active','pair-result-active');
  const panel=document.getElementById('falling-result-panel'); if(panel) panel.hidden=true;
  const pairPanel=document.getElementById('pair-result-panel'); if(pairPanel) pairPanel.hidden=true;
  const standard=document.getElementById('standard-result-numbers'); if(standard) standard.hidden=false;
  const titleBtn=document.getElementById('result-title-btn'); if(titleBtn) titleBtn.hidden=false;
  const retry=document.getElementById('result-retry-btn'); if(retry){retry.textContent='もういちど';retry.classList.remove('falling-retry-primary');}
  const modeBtn=document.getElementById('result-mode-btn'); if(modeBtn) modeBtn.textContent='モードをえらぶ';
  const timerItem=document.getElementById('timer-item'); if(timerItem) timerItem.classList.remove('falling-last10');
}
function renderFallingEnhancedResult(snapshot, recordInfo, reason) {
  const card=document.getElementById('result-card'); if(card) card.classList.add('falling-result-active');
  const panel=document.getElementById('falling-result-panel'); if(panel) panel.hidden=false;
  const standard=document.getElementById('standard-result-numbers'); if(standard) standard.hidden=true;
  const titleBtn=document.getElementById('result-title-btn'); if(titleBtn) titleBtn.hidden=true;
  const retry=document.getElementById('result-retry-btn'); if(retry){retry.textContent='もう1かい！';retry.classList.add('falling-retry-primary');}
  const modeBtn=document.getElementById('result-mode-btn'); if(modeBtn) modeBtn.textContent='メニューへ';
  const title=document.getElementById('result-title'); if(title) title.textContent=reason==='time'?'3ぷん おつかれさま！':'おつかれさま！';
  const message=document.getElementById('result-message'); if(message){message.firstChild?message.firstChild.textContent=(reason==='full'?'いっぱいまで よく がんばったね！':'つぎの きろくも ねらってみよう！'):message.textContent='つぎの きろくも ねらってみよう！';}
  const record=formatFallingTowerRecord(snapshot.totalBricks);
  document.getElementById('falling-result-record').textContent=record.text;
  document.getElementById('falling-result-max-chain').textContent=`${snapshot.maxChain}れんさ`;
  document.getElementById('falling-result-chain-bonus').textContent=`＋${snapshot.chainBonusTotal}れんが`;
  const hero=document.querySelector('.falling-record-hero'); if(hero) hero.classList.toggle('new-record',!!recordInfo.isNewRecord);
  const bestEl=document.getElementById('falling-result-best');
  if(bestEl){
    if(recordInfo.firstPlay) bestEl.textContent='はじめての きろく！';
    else if(recordInfo.isNewRecord) bestEl.textContent=`しんきろく！ ＋${recordInfo.improvement}れんが！`;
    else if(snapshot.totalBricks===recordInfo.bestTotal) bestEl.textContent='ベストと おなじ！';
    else bestEl.textContent=`ベストまで あと${Math.max(0,recordInfo.bestTotal-snapshot.totalBricks)}れんが！`;
  }
  const community=document.getElementById('falling-community-card'); if(community) community.classList.remove('community-high','community-soft');
  const communityValue=document.getElementById('falling-community-value'); if(communityValue) communityValue.textContent='みんなのきろくを みています…';
  const communityNote=document.getElementById('falling-community-note'); if(communityNote) communityNote.textContent='';
  const goal=document.getElementById('falling-next-goal'); if(goal) goal.textContent=chooseFallingNextGoal(snapshot,recordInfo,null);
  document.querySelectorAll('#falling-result-panel .result-pop-item').forEach(el=>{el.style.animation='none';void el.offsetWidth;el.style.animation='';});
}
function renderPairEnhancedResult(snapshot, recordInfo, reason) {
  const card=document.getElementById('result-card'); if(card) card.classList.add('falling-result-active','pair-result-active');
  const pairPanel=document.getElementById('pair-result-panel'); if(pairPanel) pairPanel.hidden=false;
  const fallingPanel=document.getElementById('falling-result-panel'); if(fallingPanel) fallingPanel.hidden=true;
  const standard=document.getElementById('standard-result-numbers'); if(standard) standard.hidden=true;
  const titleBtn=document.getElementById('result-title-btn'); if(titleBtn) titleBtn.hidden=true;
  const retry=document.getElementById('result-retry-btn'); if(retry){retry.textContent='もう1かい！';retry.classList.add('falling-retry-primary');}
  const modeBtn=document.getElementById('result-mode-btn'); if(modeBtn) modeBtn.textContent='メニューへ';
  const title=document.getElementById('result-title'); if(title) title.textContent=reason==='time'?'3ぷん おつかれさま！':'おつかれさま！';
  const message=document.getElementById('result-message');
  if(message){const text=reason==='full'?'いっぱいまで よく がんばったね！':'つぎの きろくも ねらってみよう！';message.firstChild?message.firstChild.textContent=text:message.textContent=text;}
  const record=formatFallingTowerRecord(snapshot.totalBricks);
  const recordEl=document.getElementById('pair-result-record'); if(recordEl) recordEl.textContent=record.text;
  const chainEl=document.getElementById('pair-result-max-chain'); if(chainEl) chainEl.textContent=`${snapshot.maxChain}れんさ`;
  const bonusEl=document.getElementById('pair-result-chain-bonus'); if(bonusEl) bonusEl.textContent=`＋${snapshot.chainBonusTotal}れんが`;
  const placementsEl=document.getElementById('pair-result-placements'); if(placementsEl) placementsEl.textContent=`${snapshot.pairPlacements}かい`;
  const hero=document.querySelector('#pair-result-panel .falling-record-hero');
  if(hero) hero.classList.toggle('new-record',recordInfo.saved&&recordInfo.isNewRecord);
  const best=document.getElementById('pair-result-best');
  if(best){
    if(!recordInfo.saved) best.textContent=recordInfo.historyUnavailable?'このたんまつの ベストを よみこめませんでした':'このたんまつに ベストを ほぞんできませんでした';
    else if(recordInfo.firstPlay) best.textContent='はじめての きろく！';
    else if(recordInfo.isNewRecord) best.textContent=`しんきろく！ ＋${recordInfo.improvement}れんが！`;
    else if(snapshot.totalBricks===recordInfo.bestTotal) best.textContent='ベストと おなじ！';
    else best.textContent=`ベストまで あと${recordInfo.bestTotal-snapshot.totalBricks}れんが！`;
  }
  const community=document.getElementById('pair-community-card');if(community)community.classList.remove('community-high','community-soft');
  document.getElementById('pair-community-value').textContent='みんなのきろくを みています…';
  document.getElementById('pair-community-note').textContent=recordInfo.saved?'ペアおちだけで くらべるよ／ベストは このたんまつの きろく':'ペアおちだけで くらべるよ';
  // 目標の計算だけを再利用する。記録データはペア専用のsnapshot/recordInfo。
  document.getElementById('pair-next-goal').textContent=chooseFallingNextGoal(snapshot,recordInfo,null);
  document.querySelectorAll('#pair-result-panel .result-pop-item').forEach(el=>{el.style.animation='none';void el.offsetWidth;el.style.animation='';});
}
function updatePairCommunityCard(stats,snapshot,recordInfo) {
  const card=document.getElementById('pair-community-card'),value=document.getElementById('pair-community-value'),note=document.getElementById('pair-community-note');
  if(!card||!value||!note)return;
  card.classList.remove('community-high','community-soft');
  const localNote=recordInfo.saved?'ベストは このたんまつに ほぞんしたよ':'このたんまつの ベストは ほぞんできていないよ';
  if(!stats||!stats.ok||stats.mode!==PAIR_RESULT_CONFIG.modeId){
    value.textContent='今回は みんなのきろくを よみこめませんでした';
    note.textContent=stats&&stats.mode===PAIR_RESULT_CONFIG.modeId&&stats.saved?'今回のきろくは おくれたよ／'+localNote:localNote;
    return;
  }
  const count=stats.totalRecordCount;
  if(typeof count!=='number'||!Number.isInteger(count)||count<0){value.textContent='今回は みんなのきろくを よみこめませんでした';note.textContent=localNote;return;}
  if(count<PAIR_RESULT_CONFIG.minCommunityRecords||stats.collecting){
    value.textContent='みんなのきろくを あつめています！';note.textContent=`ペアおち ${count}かいぶん／${PAIR_RESULT_CONFIG.minCommunityRecords}かいから くらべるよ`;return;
  }
  const percentile=stats.percentile;
  if(typeof percentile!=='number'||!Number.isFinite(percentile)||percentile<1||percentile>100){value.textContent='今回は みんなのきろくを よみこめませんでした';note.textContent=localNote;return;}
  const pct=Math.round(percentile);
  value.textContent=`上位${pct}％！`;note.textContent=`ペアおち ${count}かいぶんの きろくと くらべたよ`;
  if(pct<=20)card.classList.add('community-high');else if(pct>60)card.classList.add('community-soft');
  document.getElementById('pair-next-goal').textContent=chooseFallingNextGoal(snapshot,recordInfo,{collecting:false,percentile:pct});
}
function cancelPairResultRequest() {
  if(!pairResultRequest)return;
  clearTimeout(pairResultRequest.timeout);clearTimeout(pairResultRequest.retryTimer);
  pairResultRequest=null;
}
function submitPairCommunityResult(snapshot,recordInfo,viewToken) {
  cancelPairResultRequest();
  const request={viewToken,attempt:0,generation:0,timeout:null,retryTimer:null};pairResultRequest=request;
  const payload={mode:PAIR_RESULT_CONFIG.modeId,resultId:snapshot.resultId,totalBricks:snapshot.totalBricks,
    maxChain:snapshot.maxChain,chainBonusTotal:snapshot.chainBonusTotal,pairPlacements:snapshot.pairPlacements};
  const current=()=>pairResultRequest===request&&viewToken===fallingResultViewToken&&isPairFallingMode()&&
    document.getElementById('result-screen')?.classList.contains('active')&&document.getElementById('pair-result-panel')?.hidden===false;
  function finish(stats){
    if(!current()){if(pairResultRequest===request)cancelPairResultRequest();return;}
    cancelPairResultRequest();updatePairCommunityCard(stats,snapshot,recordInfo);
  }
  function send(){
    if(!current()){if(pairResultRequest===request)cancelPairResultRequest();return;}
    const generation=++request.generation;
    const live=()=>current()&&generation===request.generation;
    function receive(stats){
      if(!live())return;
      clearTimeout(request.timeout);request.generation++; // タイムアウト後に届く同じ試行の応答を無効化。
      if(stats&&stats.ok){finish(stats);return;}
      if(stats&&stats.retryable&&request.attempt<PAIR_RESULT_CONFIG.submitRetryMax){
        request.attempt++;request.retryTimer=setTimeout(send,650+Math.random()*700);return;
      }
      finish(stats);
    }
    if(!(window.TowerRecordTransport&&TowerRecordTransport.isConfigured())){finish({ok:false,mode:PAIR_RESULT_CONFIG.modeId});return;}
    request.timeout=setTimeout(()=>receive({ok:false,retryable:true,errorCode:'TIMEOUT',mode:PAIR_RESULT_CONFIG.modeId}),PAIR_RESULT_CONFIG.submitTimeoutMs);
    try{
      TowerRecordTransport.call('submitPairFallingResult',payload).then(receive)
        .catch(()=>receive({ok:false,retryable:true,errorCode:'NETWORK',mode:PAIR_RESULT_CONFIG.modeId}));
    }catch(e){receive({ok:false,retryable:false,mode:PAIR_RESULT_CONFIG.modeId});}
  }
  send();
}
function updateFallingCommunityCard(stats, snapshot, recordInfo) {
  const card=document.getElementById('falling-community-card'); const value=document.getElementById('falling-community-value'); const note=document.getElementById('falling-community-note');
  if(!card||!value||!note) return;
  card.classList.remove('community-high','community-soft');
  if(!stats||!stats.ok){value.textContent='今回は みんなのきろくを よみこめませんでした';note.textContent='じぶんの きろくは ほぞんできているよ';return;}
  if(stats.collecting || Number(stats.totalRecordCount||0)<FALLING_CONFIG.minCommunityRecords){value.textContent='みんなのきろくを あつめています！';note.textContent=`いま ${Number(stats.totalRecordCount||0)}かいぶん`;return;}
  const pct=Math.max(1,Math.min(100,Math.round(Number(stats.percentile)||100)));
  value.textContent=`上位${pct}％！`; note.textContent=`${Number(stats.totalRecordCount||0)}かいぶんの きろくと くらべたよ`;
  if(pct<=20) card.classList.add('community-high'); else if(pct>60) card.classList.add('community-soft');
  const goal=document.getElementById('falling-next-goal'); if(goal) goal.textContent=chooseFallingNextGoal(snapshot,recordInfo,{collecting:false,percentile:pct});
}
function submitFallingCommunityResult(snapshot, recordInfo, viewToken, attempt=0) {
  const payload={resultId:snapshot.resultId,totalBricks:snapshot.totalBricks,maxChain:snapshot.maxChain,chainBonusTotal:snapshot.chainBonusTotal,playedAt:Date.now()};
  if(!(window.TowerRecordTransport&&TowerRecordTransport.isConfigured())){updateFallingCommunityCard({ok:false,localPreview:true},snapshot,recordInfo);return;}
  try{
    TowerRecordTransport.call('submitFallingResult',payload)
      .then(res=>{
        if(viewToken!==fallingResultViewToken||!document.getElementById('result-screen')?.classList.contains('active'))return;
        if(res&&res.ok){updateFallingCommunityCard(res,snapshot,recordInfo);return;}
        if(res&&res.errorCode==='LOCK_BUSY'&&attempt<FALLING_CONFIG.resultSubmitRetryMax){setTimeout(()=>submitFallingCommunityResult(snapshot,recordInfo,viewToken,attempt+1),650+Math.random()*700);return;}
        updateFallingCommunityCard(res||{ok:false},snapshot,recordInfo);
      })
      .catch(()=>{
        if(viewToken!==fallingResultViewToken)return;
        updateFallingCommunityCard({ok:false},snapshot,recordInfo);
      });
  }catch(e){updateFallingCommunityCard({ok:false},snapshot,recordInfo);}
}
function endGame(reason = '') {
  if (isBattleMode()) { if (typeof battleEliminate === 'function') battleEliminate(reason || 'full'); return; }
  if (isBasicTutorial()) { completeBasicTutorial(); return; }
  if (isFallingTutorial()) { completeFallingTutorial(); return; }
  if (!gameRunning) return;
  const wasFalling=isRealFallingMode();
  const wasPair=isPairFallingMode();
  const finalTotalBricks=(wasFalling||wasPair)?getFallingTotalBricks():completedTowers*TOWER_BRICKS+bricks;
  const fallingSnapshot=wasFalling?{resultId:makeFallingResultId(),totalBricks:finalTotalBricks,maxChain:bestChain,chainBonusTotal:fallingChainBonusTotal}:null;
  const pairSnapshot=wasPair?{resultId:'pair-'+makeFallingResultId(),totalBricks:finalTotalBricks,maxChain:bestChain,chainBonusTotal:fallingChainBonusTotal,pairPlacements}:null;
  gameRunning = false;
  endingGame = false;
  paused = true;
  animating = false;
  fallingPiece = null;
  resumeCountdownActive = false;
  clearGameTimers();
  removeFallingVisuals();
  gameSessionToken++;
  if(!wasPair) saveGeneralRecords();
  const fallingRecord = wasFalling ? saveAndGetFalling3MinuteRecord(finalTotalBricks) : null;
  const pairRecord = wasPair ? saveAndGetPair3MinuteRecord(pairSnapshot) : null;

  document.getElementById('result-towers').textContent = completedTowers + 'こ';
  document.getElementById('result-bricks').textContent = bricks + ' / ' + TOWER_BRICKS;
  document.getElementById('result-ten').textContent = tenCount;
  document.getElementById('result-best-chain').textContent = bestChain;

  const resultTower = document.getElementById('result-tower-img');
  const resultBadge = document.getElementById('result-tower-badge');
  if (completedTowers > 0) {
    resultTower.src = TOWER_IMAGES[TOWER_IMAGES.length - 1];
    resultBadge.textContent = '× ' + completedTowers;
    resultBadge.hidden = false;
  } else {
    resultTower.src = TOWER_IMAGES[towerStage];
    resultBadge.hidden = true;
  }

  resetFallingResultPresentation();
  const bestNote = document.getElementById('falling-best-note'); if(bestNote) bestNote.hidden=true;
  if(wasFalling){
    const viewToken=++fallingResultViewToken;
    renderFallingEnhancedResult(fallingSnapshot,fallingRecord,reason);
    hidePauseLayers(); showScreen('result');
    submitFallingCommunityResult(fallingSnapshot,fallingRecord,viewToken);
    return;
  }
  if(wasPair){
    const viewToken=++fallingResultViewToken;
    renderPairEnhancedResult(pairSnapshot,pairRecord,reason);
    hidePauseLayers(); showScreen('result');
    submitPairCommunityResult(pairSnapshot,pairRecord,viewToken);
    return;
  }

  const title=document.getElementById('result-title'); if(title) title.textContent='おつかれさま！';
  let message;
  if (completedTowers >= 3) message = `とうが ${completedTowers}こも できた！すごい！`;
  else if (completedTowers > 0) message = `とうが ${completedTowers}こ できたよ！`;
  else if (towerStage >= TOWER_IMAGES.length - 2) message = 'あと すこしで とうが できそう！';
  else if (towerStage > 0) message = 'とうが そだってきたね！';
  else message = 'つぎは とうを たてよう！';
  const messageEl = document.getElementById('result-message');
  messageEl.firstChild ? messageEl.firstChild.textContent = message : messageEl.textContent = message;
  hidePauseLayers(); showScreen('result');
}


function resetTransientUI() {
  const chain = document.getElementById('chain-toast');
  const speed = document.getElementById('speed-toast');
  const tower = document.getElementById('tower-container');
  const growth = document.getElementById('tower-growth');
  const bonus = document.getElementById('falling-chain-bonus-toast');
  const timeToast = document.getElementById('falling-time-toast');
  if (chain) { chain.classList.remove('show'); chain.textContent = ''; }
  if (speed) speed.classList.remove('show');
  if (tower) tower.classList.remove('grow','complete');
  if (growth) { growth.classList.remove('show','complete-show'); growth.textContent = 'とうが そだった！'; }
  if (bonus) { bonus.classList.remove('show'); bonus.hidden = true; bonus.textContent = ''; }
  if (timeToast) { timeToast.classList.remove('show'); timeToast.hidden = true; }
  const timerItem=document.getElementById('timer-item'); if(timerItem) timerItem.classList.remove('falling-last10');
}

// ========= v1.1 段階加速 =========
function startSpeedClock() {
  if (!isThreeMinuteFallingMode()) return;
  if (speedClockTimer) clearInterval(speedClockTimer);
  activeClockLastAt = Date.now();
  speedClockTimer = setInterval(() => {
    const now = Date.now(); const delta = Math.max(0, Math.min(1000, now - activeClockLastAt)); activeClockLastAt = now;
    const active = gameRunning && isThreeMinuteFallingMode() && !fallingTimeExpired && isGameScreenActive() && !paused && !animating && !endingGame && !resumeCountdownActive && !!fallingPiece;
    if (!active) return;
    activeFallingTimeMs += delta;
    let nextLevel = 0;
    for (let i = 0; i < FALL_SPEED_THRESHOLDS_MS.length; i++) if (activeFallingTimeMs >= FALL_SPEED_THRESHOLDS_MS[i]) nextLevel = i;
    if (nextLevel > fallingSpeedLevel) { fallingSpeedLevel = nextLevel; showSpeedUp(); }
  }, 250);
}
function showSpeedUp() {
  const el = document.getElementById('speed-toast'); if (!el) return;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  if (soundOn) playSound(3);
  if (speedToastTimer) clearTimeout(speedToastTimer);
  speedToastTimer = setTimeout(() => el.classList.remove('show'), 820);
}

// ========= v1.1 チュートリアル共通 =========
function makeFixed(value, textureIndex = 0) {
  return { val: value, color: COLOR_PALETTE[textureIndex % COLOR_PALETTE.length], texture: BLOCK_IMAGES[textureIndex % BLOCK_IMAGES.length] };
}
function setTutorialChrome(active, total = 0) {
  const game = document.getElementById('game-screen'); const badge = document.getElementById('tutorial-step-badge');
  const pauseBtn = document.getElementById('pause-btn'); const homeBtn = document.getElementById('home-btn');
  if (game) game.classList.toggle('tutorial-mode', active);
  if (badge) { badge.hidden = !active; if (active) badge.textContent = `れんしゅう ${tutorialStep} / ${total}`; }
  if (pauseBtn) pauseBtn.style.display = active ? 'none' : '';
  if (homeBtn) { homeBtn.innerHTML = active ? `<img src="${APP_ASSETS['assets/ui/icons/home.png']}" alt="">やめる` : `<img src="${APP_ASSETS['assets/ui/icons/home.png']}" alt="">タイトルへ`; homeBtn.onclick = active ? exitTutorial : returnToTitle; }
}
function clearTutorialHighlights() {
  document.querySelectorAll('#board .column').forEach(el => el.classList.remove('tutorial-target'));
  document.querySelectorAll('.falling-control').forEach(el => el.classList.remove('tutorial-control-target'));
}
function setGuide(text, targetCol = null, expectedControl = null) {
  tutorialTargetCol = targetCol; tutorialExpectedControl = expectedControl;
  const textEl = document.getElementById('hint-text'); const icon = document.getElementById('hint-icon');
  if (textEl) textEl.innerHTML = text.replace(/\n/g,'<br>'); if (icon) icon.style.display = 'none';
  updateTutorialGuide();
}
function updateTutorialGuide() {
  if (!isTutorialMode() || !isGameScreenActive()) return;
  clearTutorialHighlights();
  if (tutorialTargetCol !== null) {
    const col = document.querySelector(`#board .column[data-col="${tutorialTargetCol}"]`); if (col) col.classList.add('tutorial-target');
  }
  const idMap = { left:'move-left-btn', right:'move-right-btn', drop:'hard-drop-btn' };
  if (tutorialExpectedControl && idMap[tutorialExpectedControl]) {
    const btn = document.getElementById(idMap[tutorialExpectedControl]); if (btn) btn.classList.add('tutorial-control-target');
  }
  const badge = document.getElementById('tutorial-step-badge');
  if (badge) { badge.hidden = false; badge.textContent = `れんしゅう ${tutorialStep} / ${isBasicTutorial() ? 7 : 5}`; }
}
function exitTutorial() { stopCurrentGame(); showScreen('mode'); }
function scheduleTutorialTransition(fn, delay = 800) {
  if (tutorialTransitionTimer) clearTimeout(tutorialTransitionTimer);
  const session = gameSessionToken;
  tutorialTransitionTimer = setTimeout(() => { tutorialTransitionTimer = null; if (gameRunning && session === gameSessionToken) fn(); }, delay);
}
function resetTutorialGameState(cols, rows, falling) {
  resetTransientUI();
  BOARD_COLS = cols; BOARD_ROWS = rows; board = Array.from({length:cols},()=>[]);
  bricks = 0; tenCount = 0; bestChain = 0; noTenCounter = 0; towerStage = 0; completedTowers = 0; towerVisualToken++; resetSpecialGameplayState();
  numbersQueue = [makeFixed(3,0),makeFixed(4,1),makeFixed(6,2)]; fallingPiece = null;
  paused = false; animating = false; gameRunning = true; endingGame = false; resumeCountdownActive = false;
  const game = document.getElementById('game-screen'); game.classList.toggle('falling-mode', falling); game.classList.add('tutorial-mode');
  updateActionControlVisibility(); document.getElementById('timer-item').style.display='none';
  setPauseButton(false); hidePauseLayers(); setTutorialChrome(true, falling ? 5 : 7);
}

// ========= 基本チュートリアル =========
function startBasicTutorial() {
  requestGameFullscreen(); stopCurrentGame(); currentMode='tutorial'; tutorialKind='basic'; tutorialStep=1; ++gameSessionToken;
  resetTutorialGameState(5,6,false); showScreen('game'); renderBoard(); updateTower(); updateInfoPanels(); setupBasicTutorialStep(1);
}
function setupBasicTutorialStep(step) {
  tutorialStep=step; clearTutorialHighlights(); animating=false; board=Array.from({length:5},()=>[]); fallingPiece=null;
  const caption=document.getElementById('board-caption'); caption.textContent='あそびながら おぼえよう！';
  if (step===1) { numbersQueue=[makeFixed(3,0),makeFixed(4,1),makeFixed(6,2)]; setGuide('うえの すうじを\nれつに おとしてみよう！',2); }
  else if (step===2) { board[2]=[makeFixed(6,2)]; numbersQueue=[makeFixed(4,1),makeFixed(2,3),makeFixed(8,4)]; setGuide('4と6で 10になるよ！\n6の となりに 4を おいてみよう！',3); }
  else if (step===3) { setGuide('10が できると\nすうじが きえるよ！\nれんがを 1こ ゲット！'); scheduleTutorialTransition(()=>setupBasicTutorialStep(4),2200); }
  else if (step===4) { board[2]=[makeFixed(6,2),makeFixed(2,3)]; numbersQueue=[makeFixed(4,1),makeFixed(3,0),makeFixed(7,4)]; setGuide('すうじが きえると\nうえの すうじが おちるよ！',1); }
  else if (step===5) { board[1]=[makeFixed(6,2),makeFixed(2,3)]; board[2]=[makeFixed(8,4)]; numbersQueue=[makeFixed(4,1),makeFixed(5,0),makeFixed(5,2)]; setGuide('つづけて 10が できると\nれんさだよ！',0); }
  else if (step===6) { bricks=24; completedTowers=0; board[2]=[makeFixed(6,2)]; numbersQueue=[makeFixed(4,1),makeFixed(3,0),makeFixed(7,4)]; setGuide('れんがを 25こ あつめると\nとうが かんせいするよ！',3); }
  renderBoard(); updateBoardUI(); updateInfoPanels(); updateTower(); updateTutorialGuide();
}
function handleBasicTutorialResolution(info) {
  if (tutorialStep===1) { scheduleTutorialTransition(()=>setupBasicTutorialStep(2),650); return; }
  if (tutorialStep===2) { tutorialStep=3; setGuide('10が できると\nすうじが きえるよ！\nれんがを 1こ ゲット！'); scheduleTutorialTransition(()=>setupBasicTutorialStep(4),2200); return; }
  if (tutorialStep===4) { scheduleTutorialTransition(()=>setupBasicTutorialStep(5),1050); return; }
  if (tutorialStep===5) { showToast('2れんさ！'); scheduleTutorialTransition(()=>setupBasicTutorialStep(6),1100); return; }
  if (tutorialStep===6) { tutorialStep=7; setTutorialChrome(true,7); scheduleTutorialTransition(completeBasicTutorial,700); }
}
function completeBasicTutorial() { stopCurrentGame(); showScreen('tutorialComplete'); }

// ========= おちてくる操作練習 =========
function startFallingTutorial() {
  requestGameFullscreen(); stopCurrentGame(); currentMode='fallingTutorial'; tutorialKind='falling'; tutorialStep=1; ++gameSessionToken;
  resetTutorialGameState(FALLING_COLS,FALLING_ROWS,true); showScreen('game'); renderBoard(); updateTower(); setupFallingTutorialStep(1);
}
function setupFallingTutorialStep(step) {
  tutorialStep=step; clearFallingTimers(); clearTutorialHighlights(); animating=false; paused=false; fallingPiece=null;
  board=Array.from({length:FALLING_COLS},()=>[]); bricks=0; tenCount=0; bestChain=0; completedTowers=0;
  const center=Math.floor(FALLING_COLS/2); document.getElementById('board-caption').textContent='ゆっくり そうさを おぼえよう！';
  if (step===1) { numbersQueue=[makeFixed(5,0),makeFixed(3,1),makeFixed(7,2)]; setGuide('◀を おして\nひだりへ うごかそう！',null,'left'); }
  else if (step===2) { numbersQueue=[makeFixed(5,0),makeFixed(3,1),makeFixed(7,2)]; setGuide('▶を おして\nみぎへ うごかそう！',null,'right'); }
  else if (step===3) { numbersQueue=[makeFixed(3,1),makeFixed(4,2),makeFixed(6,3)]; setGuide('▼を おすと\nいっきに おとせるよ！',null,'drop'); }
  else if (step===4) { board[center-1]=[makeFixed(6,2)]; numbersQueue=[makeFixed(4,1),makeFixed(2,3),makeFixed(8,4)]; setGuide('6の となりへ\n4を おとしてみよう！',center,'drop'); }
  renderBoard(); updateInfoPanels(); updateTower(); updateFallingControls(); scheduleSpawn(250);
}
function resetFallingTutorialPiece() { if (!isFallingTutorial()) return; clearFallingTimers(); fallingPiece=null; animating=false; scheduleSpawn(250); }
function advanceFallingTutorialAfterMove() {
  const next=tutorialStep+1; scheduleTutorialTransition(()=>setupFallingTutorialStep(next),500);
}
function handleFallingTutorialResolution(info) {
  if (tutorialStep===3) { scheduleTutorialTransition(()=>setupFallingTutorialStep(4),650); return; }
  if (tutorialStep===4 && info.pairs>0) { tutorialStep=5; setGuide('ばっちり！\nおちてくるモードに ちょうせんしよう！'); scheduleTutorialTransition(completeFallingTutorial,1000); return; }
  if (tutorialStep===4) resetFallingTutorialPiece();
}
function completeFallingTutorial() { stopCurrentGame(); showScreen('fallingTutorialComplete'); }
function handleTutorialResolution(info) {
  if (isBasicTutorial()) handleBasicTutorialResolution(info);
  else if (isFallingTutorial()) handleFallingTutorialResolution(info);
}

// ========= キーボード =========
document.addEventListener('keydown', event => {
  if (!isFallingMode() || !gameRunning || !isGameScreenActive()) return;
  const active = document.activeElement;
  const tag = active && active.tagName ? active.tagName.toLowerCase() : '';
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  if (!['ArrowLeft','ArrowRight','ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  if (event.repeat) return;
  if (event.key === 'ArrowLeft') moveFalling(-1);
  if (event.key === 'ArrowRight') moveFalling(1);
  if (event.key === 'ArrowDown') hardDropPiece();
}, { passive: false });

// ========= 起動・レイアウト =========
window.addEventListener('load', () => {
  loadStoredSettings();
  syncControls();
  if (window.BGMController) BGMController.init();
});
document.addEventListener('visibilitychange', () => {
  if (typeof isBattleMode === 'function' && isBattleMode()) return;
  const hidden = document.visibilityState === 'hidden';
  if (isThreeMinuteFallingMode()) {
    fallingChallengeClockLastAt = performance.now();
    if (hidden) {
      if (gameRunning && !paused && !endingGame && !fallingTimeExpired) {
        fallingVisibilityPaused = true;
        paused = true;
        if (fallingPiece && fallingPiece.phase === 'locking') accrueLockTime();
        clearNamedTimer('falling'); clearNamedTimer('lock'); clearNamedTimer('spawn');
        updateFallingControls();
      }
      if (window.BGMController) BGMController.handleVisibility(true);
      return;
    }
    const autoResume = fallingVisibilityPaused && gameRunning && !endingGame && !fallingTimeExpired;
    fallingVisibilityPaused = false;
    if (autoResume) {
      paused = false; setPauseButton(false); updateHints(); updateFallingControls();
      if (fallingPiece) {
        if (canFall()) { fallingPiece.phase = 'falling'; scheduleFallingStep(Math.min(500, getPieceFallInterval())); }
        else beginLockDelay();
      } else if (!animating) scheduleSpawn(250);
    }
    // 手動一時停止のまま戻った場合はBGMも止めたままにする。
    if (window.BGMController && !(gameRunning && paused)) BGMController.handleVisibility(false);
    return;
  }
  if (window.BGMController) BGMController.handleVisibility(hidden);
});
function refreshGameLayout() {
  if (isGameScreenActive() && !animating) {
    renderBoard();
    updateHints();
    updateFallingControls();
  }
  adjustTowerHeight();
}
window.addEventListener('resize', () => {
  window.clearTimeout(window.__tenTowerResizeTimer);
  window.__tenTowerResizeTimer = window.setTimeout(refreshGameLayout, 80);
});
document.addEventListener('fullscreenchange', () => {
  window.setTimeout(refreshGameLayout, 120);
});

function serializeTestPiece(obj) {
  if (!obj) return null;
  if (isPairBlock(obj)) return {
    kind: BLOCK_KIND_PAIR,
    pairId: obj.pairId || '',
    first: obj.first ? obj.first.val : null,
    second: obj.second ? obj.second.val : null,
    orientation: ((Number(obj.orientation)||0)%4+4)%4,
    col: Number.isFinite(obj.col) ? obj.col : null,
    row: Number.isFinite(obj.row) ? obj.row : null,
    phase: obj.phase || ''
  };
  if (isStarBlock(obj)) return {
    kind: BLOCK_KIND_STAR,
    val: 'STAR',
    col: Number.isFinite(obj.col) ? obj.col : null,
    row: Number.isFinite(obj.row) ? obj.row : null,
    phase: obj.phase || ''
  };
  return {
    kind: BLOCK_KIND_NUMBER,
    val: obj.val,
    col: Number.isFinite(obj.col) ? obj.col : null,
    row: Number.isFinite(obj.row) ? obj.row : null,
    phase: obj.phase || ''
  };
}

// 動作確認用（URL末尾に ?test=1 を付けた場合のみ公開）
if (new URLSearchParams(location.search).get('test') === '1') {
  window.__tenTowerTest = {
    getState: () => ({
      mode: currentMode, cols: BOARD_COLS, rows: BOARD_ROWS,
      board: board.map(col => col.map(x => x.val)),
      queue: numbersQueue.map(serializeTestPiece),
      falling: serializeTestPiece(fallingPiece),
      bricks, completedTowers, tenCount, bestChain, fallingChainBonusTotal, fallingChallengeElapsedMs, fallingTimeExpired, held: serializeTestPiece(heldBlock), holdUsedThisTurn, chainPower, pendingStarAward, pairPlacements, pairSettling,
      paused, animating, gameRunning, endingGame, tutorialStep, tutorialKind, activeFallingTimeMs, fallingSpeedLevel, fallInterval: getFallingIntervalForLevel(),
      bgm: window.BGMController ? BGMController.getState() : null
    }),
    setBoard: columns => {
      board = Array.from({ length: BOARD_COLS }, (_, c) => (columns[c] || []).map(v => makeNumberObject(v)));
      updateBoardUI(); updateHints();
    },
    setQueue: values => {
      numbersQueue = values.map(v => {
        if (v && typeof v === 'object' && (v.kind === BLOCK_KIND_PAIR || Array.isArray(v))) {
          const first = Array.isArray(v) ? v[0] : (v.first ?? 1);
          const second = Array.isArray(v) ? v[1] : (v.second ?? 1);
          const orientation = Array.isArray(v) ? (v[2] ?? 0) : (v.orientation ?? 0);
          return makePairObject(first, second, orientation);
        }
        if (v === 'STAR' || (v && v.kind === BLOCK_KIND_STAR)) return makeStarBlock();
        return makeNumberObject(v && typeof v === 'object' ? v.val : v);
      });
      while (numbersQueue.length < 3) numbersQueue.push(makeQueueObject());
      if (fallingPiece && numbersQueue[0]) {
        if (isPairBlock(numbersQueue[0])) {
          const next=clonePairObject(numbersQueue[0]);
          fallingPiece={...next,col:fallingPiece.col,row:fallingPiece.row,phase:fallingPiece.phase||'falling',lockElapsed:fallingPiece.lockElapsed||0,lockStartedAt:fallingPiece.lockStartedAt||0};
        } else {
          fallingPiece = { ...fallingPiece, ...cloneBlockObject(numbersQueue[0]) };
        }
      }
      updateInfoPanels(); updateBoardUI(); updateHints();
    },
    setFalling: (value, col = Math.floor(BOARD_COLS / 2), row = BOARD_ROWS, phase = 'falling') => {
      clearNamedTimer('falling'); clearNamedTimer('lock'); clearNamedTimer('spawn');
      const obj = makeNumberObject(value);
      numbersQueue[0] = obj;
      fallingPiece = { ...obj, col, row, phase, lockElapsed: 0, lockStartedAt: 0 };
      animating = false; paused = false; endingGame = false; pairSettling = false;
      updateInfoPanels(); updateBoardUI(); updateHints(); updateFallingControls();
    },
    setPairFalling: (first, second, orientation = 0, col = Math.floor(BOARD_COLS / 2), row = BOARD_ROWS, phase = 'falling') => {
      clearNamedTimer('falling'); clearNamedTimer('lock'); clearNamedTimer('spawn');
      const obj = makePairObject(first, second, orientation);
      numbersQueue[0] = clonePairObject(obj);
      fallingPiece = { ...clonePairObject(obj), col, row, phase, lockElapsed: 0, lockStartedAt: 0 };
      animating = false; paused = false; endingGame = false; pairSettling = false;
      updateInfoPanels(); updateBoardUI(); updateHints(); updateFallingControls();
      return serializeTestPiece(fallingPiece);
    },
    makePair: (first=null,second=null,orientation=0) => serializeTestPiece(makePairObject(first,second,orientation)),
    rotatePair: direction => { rotatePair(direction); return serializeTestPiece(fallingPiece); },
    pairLandingRow: () => fallingPiece && isPairBlock(fallingPiece) ? getPairLandingPivotRow(fallingPiece) : null,
    pairSettlement: () => {
      if(!fallingPiece || !isPairBlock(fallingPiece)) return null;
      const pivotRow=getPairLandingPivotRow(fallingPiece);
      return computePairSettlement(fallingPiece,pivotRow).map(x=>({key:x.key,col:x.col,startRow:x.startRow,finalRow:x.finalRow,val:x.block.val}));
    },
    settlePairNow: () => {
      if(!fallingPiece || !isPairBlock(fallingPiece)) return false;
      fallingPiece.row=getPairLandingPivotRow(fallingPiece);
      settlePairFallingPiece(true);
      return true;
    },
    hold: holdCurrentBlock,
    setChainPower: value => { chainPower=Math.max(0,Math.min(10,Number(value)||0)); pendingStarAward=chainPower>=10&&!hasStarBlockOwned(); updateInfoPanels(); },
    awardStar: () => { pendingStarAward=true; return awardPendingStarBlock(); },
    setCurrentStar: () => { numbersQueue.unshift(makeStarBlock()); updateInfoPanels(); if(isFallingMode()&&fallingPiece){fallingPiece={...fallingPiece,...makeStarBlock()};updateBoardUI();} },
    triggerStarAt: (col,row=board[col]?.length||0) => { if(!board[col])return; board[col].push(makeStarBlock()); updateBoardUI(); processStarCross(col,row); },
    exportSpecial: exportSpecialBattleState, importSpecial: importSpecialBattleState,
    setStats: values => {
      if (typeof values.bricks === 'number') bricks = values.bricks;
      if (typeof values.completedTowers === 'number') completedTowers = values.completedTowers;
      if (typeof values.tenCount === 'number') tenCount = values.tenCount;
      if (typeof values.bestChain === 'number') bestChain = values.bestChain;
      updateTower(); updateInfoPanels();
    },
    startFall: (delay = FALL_INTERVAL_MS) => scheduleFallingStep(delay),
    startLock: beginLockDelay,
    spawn: spawnFallingPiece,
    move: moveFalling,
    drop: hardDropPiece,
    pause: pauseGame,
    end: endGame,
    setActiveTime: ms => { activeFallingTimeMs = Math.max(0, ms); fallingSpeedLevel = 0; for (let i=0;i<FALL_SPEED_THRESHOLDS_MS.length;i++) if (activeFallingTimeMs>=FALL_SPEED_THRESHOLDS_MS[i]) fallingSpeedLevel=i; },
    setFallingChallengeElapsed: ms => { const cfg=getCurrentFallingConfig(); fallingChallengeElapsedMs=Math.max(0,Math.min(cfg.durationSec*1000,Number(ms)||0)); fallingChallengeClockLastAt=performance.now(); timeLeft=Math.ceil((cfg.durationSec*1000-fallingChallengeElapsedMs)/1000); updateTimeDisplay(); },
    getChainBonus: stages => getFallingChainBonus(stages),
    speedUp: showSpeedUp,
    startBasicTutorial, startFallingTutorial, setupBasicTutorialStep, setupFallingTutorialStep
  };
}
