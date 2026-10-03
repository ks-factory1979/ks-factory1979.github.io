// Approved portrait layout with compact tablet/landscape variants. Never reads drafts.
(() => {
  'use strict';
  const game = document.getElementById('game-screen');
  const shell = game.querySelector('.game-shell');
  const stage = document.createElement('div');
  stage.className = 'mobile-game-layout';
  stage.innerHTML = '<div class="mobile-status-row"><div class="mobile-status" data-layout-group="status"></div>' +
    '<div class="mobile-tower" data-layout-group="tower" aria-label="塔の進み具合"><img alt=""><strong></strong><span></span></div></div>';
  shell.appendChild(stage);
  const celebration = document.createElement('div');
  celebration.className = 'mobile-tower-celebration'; celebration.hidden = true;
  celebration.setAttribute('role','status'); celebration.setAttribute('aria-live','polite');
  celebration.innerHTML = '<img alt="完成した塔"><strong></strong>';
  game.appendChild(celebration);
  const preview = document.getElementById('info-bar');
  preview.dataset.layoutGroup = 'preview';
  const status = stage.querySelector('.mobile-status');
  const tower = stage.querySelector('.mobile-tower');
  const board = game.querySelector('.board-stage');
  const caption = document.getElementById('board-caption');
  const tutorialBadge = document.getElementById('tutorial-step-badge');
  const power = document.getElementById('chain-power-panel');
  const controls = document.getElementById('falling-controls');
  const battleHud = document.getElementById('battle-hud');
  const battleOpponents = document.getElementById('battle-opponents');
  board.dataset.layoutGroup = 'board'; power.dataset.layoutGroup = 'power'; controls.dataset.layoutGroup = 'controls';
  const moves = [];
  const remember = node => { const marker = document.createComment('portrait slot'); node.before(marker); moves.push({ node, marker }); return node; };
  remember(preview);
  const timer = remember(document.getElementById('timer-item'));
  [board, caption, tutorialBadge, power, controls].forEach(remember);
  [battleHud, battleOpponents].forEach(remember);
  let portrait = false, landscape = false, compact = false, celebrationTimer = null, brickTimer = null, previousTotal = null;
  function dismissCompletion() {
    clearTimeout(celebrationTimer); celebrationTimer = null;
    celebration.hidden = true; celebration.classList.remove('show');
    clearTimeout(brickTimer); tower.querySelector('img').classList.remove('brick-gain');
  }
  function completeTower(completedNow, completedTotal) {
    if (!compact || !game.classList.contains('active') || completedNow < 1) return;
    dismissCompletion();
    celebration.querySelector('img').src = APP_ASSETS['assets/towers/tower_5.png'];
    celebration.querySelector('strong').textContent = completedNow > 1 ? `とうが ${completedNow}こ できた！` : `${completedTotal}とうめ かんせい！`;
    celebration.hidden = false; void celebration.offsetWidth; celebration.classList.add('show');
    // Runs within the existing completion sequence; adds no timer or input lock.
    celebrationTimer = setTimeout(dismissCompletion,700);
  }
  function updateResult() {
    const badge = document.getElementById('result-tower-badge');
    const count = Number.parseInt(document.getElementById('result-towers').textContent,10) || 0;
    badge.textContent = compact ? `${count}とう` : `× ${count}`;
    badge.hidden = !compact && count === 0;
    badge.setAttribute('aria-label', `完成した塔 ${count}とう`);
  }
  function updateSummary() {
    if (!compact) return;
    const count = document.getElementById('tower-count').textContent.replace('こ', 'とう');
    const progress = document.getElementById('brick-count').textContent.replace(/\s/g, '');
    tower.querySelector('strong').textContent = count;
    tower.querySelector('span').textContent = progress;
    tower.setAttribute('aria-label', `できた塔 ${count}、れんが ${progress}`);
    const bricks = Number(progress.split('/')[0]) || 0;
    const key = `assets/towers/tower_${getTowerStage(bricks)}.png`;
    const image = tower.querySelector('img'); image.src = APP_ASSETS[key];
    const total = (Number.parseInt(count,10) || 0) * TOWER_BRICKS + bricks;
    if (previousTotal !== null && total > previousTotal && game.classList.contains('active')) {
      clearTimeout(brickTimer); image.classList.remove('brick-gain'); void image.offsetWidth; image.classList.add('brick-gain');
      brickTimer = setTimeout(()=>image.classList.remove('brick-gain'),280);
    }
    previousTotal = total;
    if (timer.style.display === 'none') status.dataset.free = 'true'; else delete status.dataset.free;
  }
  function resize() {
    portrait = window.matchMedia('(max-width:850px) and (orientation:portrait)').matches;
    landscape = window.matchMedia('(max-height:540px) and (orientation:landscape)').matches;
    const next = portrait || landscape;
    document.documentElement.classList.toggle('tower-portrait', portrait);
    document.documentElement.classList.toggle('tower-landscape', landscape);
    document.documentElement.classList.toggle('tower-mobile', next);
    if (next !== compact) {
      compact = next;
      if (compact) {
        preview.classList.add('mobile-preview'); stage.prepend(preview); status.append(timer,tutorialBadge);
        stage.append(battleHud, battleOpponents, board, power, controls); board.prepend(caption);
      } else { moves.forEach(({node,marker}) => marker.after(node)); preview.classList.remove('mobile-preview'); dismissCompletion(); }
      updateSummary();
      if (document.getElementById('result-screen').classList.contains('active')) updateResult();
    }
    if (compact) {
      const height = window.visualViewport ? window.visualViewport.height : innerHeight;
      document.documentElement.style.setProperty('--tower-viewport-height', `${Math.round(height)}px`);
    }
    if (typeof refreshGameLayout === 'function') requestAnimationFrame(refreshGameLayout);
    window.dispatchEvent(new CustomEvent('tower-portrait-change', { detail: { portrait, landscape, compact } }));
  }
  function cellSize(cols, rows, above) {
    const width = board.clientWidth || innerWidth - 16;
    const height = board.clientHeight || innerHeight * .55;
    const battle = game.classList.contains('battle-mode');
    const topSpace = landscape || (battle && height < 240) ? 40 : 26;
    const pitch = Math.floor(Math.min((width - 28) / cols, (height - topSpace) / (rows + above)));
    const minimum = landscape || battle ? 14 : 22;
    return Math.max(minimum, Math.min(60, pitch - 4));
  }
  window.TowerMobileLayout = Object.freeze({ isPortrait: () => portrait, isCompact: () => compact, cellSize, updateSummary, completeTower, resize, groups: { board, tower, status, preview, power, controls } });
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.addEventListener('tower-screen-change', event => {
    dismissCompletion(); previousTotal = null; updateSummary();
    if(event.detail.name === 'result') updateResult();
    requestAnimationFrame(refreshGameLayout);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)dismissCompletion();});
  resize();
})();
