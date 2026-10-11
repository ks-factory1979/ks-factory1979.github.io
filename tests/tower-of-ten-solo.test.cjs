const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers/tower-of-ten-game.cjs');
const rules=require('../tower-of-ten/rules.js');
const board=cols=>cols.map(col=>col.map(val=>Object.freeze({kind:'number',val})));
function game(rule='two',mode='free'){
  const g=createGame();
  const names=['clonePairObject','cloneQueueObject','normalizeBlockObject','cloneBlockObject','makeQueueObject','ensureNumberQueue','advanceCurrentQueue',
    'getPairOffset','getPairCells','canPairCellOccupy','canPairOccupyAt','getPairLandingPivotRow','computePairSettlement','pairSettlementFits',
    'makeQueueObjectFromFalling','respawnCurrentPairQueuePiece','holdCurrentPairBlock','holdCurrentBlock','pauseGame','beginResumeCountdown','canOccupy','canFall',
    'getFallingIntervalForLevel','getPieceFallInterval','clearFallingTimers',
    'startFallingChallengeClock','tickFallingChallengeClock','showFallingLastTenSeconds','finishFallingFull','commitPairSettlement','settlePairFallingPiece','lockFallingPiece'];
  g.run(names.map(g.actual).join('\n'));
  for(const name of ['playHoldSound','renderFallingVisual','scheduleFallingStep','beginLockDelay','accrueLockTime','renderPairSettlementAnimation','clearHintHighlights'])g.c[name]=()=>{};
  g.c.startGame(mode,{ruleMode:rule});
  return g;
}

test('placement hints simulate legal tops and leave frozen boards untouched',()=>{
  const b=Object.freeze(board([[2],[3],[]]).map(Object.freeze)),before=JSON.stringify(b);
  const h=rules.findPlacementHints(b,{ruleMode:'three',value:5,maxRows:2});
  assert.deepEqual(h.map(x=>x.col),[2]);assert.equal(h[0].groupCount,1);assert.equal(JSON.stringify(b),before);
  assert.equal(rules.findPlacementHints(b,{ruleMode:'two',value:5}).length,0);
});
test('placement hints reject full columns, unrelated matches, diagonal and gaps',()=>{
  assert.equal(rules.findPlacementHints(board([[4,6],[1]]),{ruleMode:'two',value:2,maxRows:2}).length,0);
  assert.equal(rules.findPlacementHints(board([[2],[],[3]]),{ruleMode:'three',value:5,maxRows:1})[0].col,1);
  assert.equal(rules.findPlacementHints(board([[2],[],[],[3]]),{ruleMode:'three',value:5}).length,0);
  assert.equal(rules.findPlacementHints(board([[2],[1,3],[]]),{ruleMode:'three',value:5}).length,0);
  assert.equal(rules.findPlacementHints(board([[]]),{value:'5'}).length,0);
  assert.throws(()=>rules.findPlacementHints([[]],{ruleMode:'bad',value:5}),RangeError);
});
for(const rule of ['two','three','either'])test(`${rule}: selected menu starts all four modes and never changes active rules mid-game`,()=>{
  const g=game();g.c.selectSoloRule(rule);
  for(const mode of ['free','timed','falling','pairFalling']){
    g.c.startSelectedSoloMode(mode);assert.equal(g.state().ruleMode,rule);assert.equal(g.state().currentMode,mode);
    g.c.selectSoloRule(rule==='two'?'three':'two');assert.equal(g.state().ruleMode,rule);g.c.selectSoloRule(rule);
  }
  assert.throws(()=>g.c.startSelectedSoloMode('battle'),/Invalid solo mode/);
});
test('three rescue uses real triple opportunities at threshold 4 and respects allowed numbers',()=>{
  const g=game('three');g.setBoard([[2,3],[]]);g.c.Math.random=()=>0;g.run('noTenCounter=3');assert.equal(g.c.randomNumber(),1);
  g.run('noTenCounter=4');assert.equal(g.c.randomNumber(),5);
  g.run("numberRangeType='custom';customNumbers=[6,7]");assert.equal(g.c.randomNumber(),6);
});
test('either rescue waits until threshold 6 and can complete a triple',()=>{
  const g=game('either');g.setBoard([[2,3],[]]);g.c.Math.random=()=>0;g.run('noTenCounter=5');assert.equal(g.c.randomNumber(),1);
  g.run('noTenCounter=6');assert.equal(g.c.randomNumber(),5);
});
for(const rule of ['two','three','either'])for(const mode of ['falling','pairFalling'])test(`${mode}/${rule}: a long drought cannot activate rescue`,()=>{
  const g=game(rule,mode);g.setBoard([[2,3],[]]);g.c.Math.random=()=>0;g.run('noTenCounter=100');assert.equal(g.c.randomNumber(),1);
});
test('three/either hint text names the actual numbers of a legal triple',()=>{
  for(const rule of ['three','either']){const g=game(rule);g.setBoard([[2],[3],[]]);assert.deepEqual([...g.c.getHintColumns(5)],[2]);assert.equal(g.c.getNumberHintText(5),'2と3に つなげよう！');}
  const g=game('three');g.setBoard([[4],[]]);assert.equal(g.c.getNumberHintText(6),'たて・よこに 3こで10！');
});
test('three hints explain that nine needs a star while other rules can match it',()=>{
  const g=game('three');g.setBoard([[1]]);assert.equal(g.c.getNumberHintText(9),'9は ほしで けそう！');assert.equal(g.c.getHintColumns(9).length,0);
  for(const rule of ['two','either']){const other=game(rule);other.setBoard([[1]]);assert.ok(other.c.getHintColumns(9).length>0);assert.doesNotMatch(other.c.getNumberHintText(9),/ほし/);}
});

for(const rule of ['two','three','either'])for(const mode of ['free','timed','falling','pairFalling']){
  test(`${mode}/${rule}: actual hold, pause/resume and a second-turn swap preserve pieces`,()=>{
    const g=game(rule,mode);
    g.run(mode==='pairFalling'?'fallingPiece={...numbersQueue[0],col:3,row:8,phase:"falling"}':mode==='falling'?'fallingPiece={...numbersQueue[0],col:3,row:8,phase:"falling"}':'');
    const original=g.state().numbersQueue[0];g.c.holdCurrentBlock();const held=g.state().heldBlock;
    assert.equal(held.kind,original.kind);if(mode==='pairFalling'){assert.equal(held.first.val,original.first.val);assert.equal(held.second.val,original.second.val);}else assert.equal(held.val,original.val);
    assert.equal(g.state().holdUsedThisTurn,true);g.c.holdCurrentBlock();assert.deepEqual(g.state().heldBlock,held);
    g.c.pauseGame();assert.equal(g.state().paused,true);g.c.holdCurrentBlock();assert.deepEqual(g.state().heldBlock,held);
    g.c.pauseGame();g.flush();assert.equal(g.state().paused,false);assert.equal(g.state().resumeCountdownActive,false);
    g.run('holdUsedThisTurn=false');if(mode==='pairFalling')g.run('fallingPiece={...numbersQueue[0],col:3,row:8,phase:"falling"}');
    g.c.holdCurrentBlock();const current=g.state().numbersQueue[0];assert.equal(current.kind,held.kind);
    if(mode==='pairFalling'){assert.equal(current.first.val,held.first.val);assert.equal(current.second.val,held.second.val);}else assert.equal(current.val,held.val);
    assert.equal(g.state().ruleMode,rule);
  });
  test(`${mode}/${rule}: star aftermath clears a group using the active rule`,()=>{
    const g=game(rule,mode);g.setBoard(rule==='three'?[[1,2],[1,3],[1,5],['STAR']]:[[1,4],[1,6],['STAR']]);
    g.c.processStarCross(rule==='three'?3:2,0);g.flush();assert.equal(g.state().tenCount,1);assert.equal(g.state().bricks,1);
  });
  test(`${mode}/${rule}: the 25th brick completes one tower and resets its remainder`,()=>{
    const g=game(rule,mode);g.run('bricks=24');
    g.setBoard(rule==='three'?[[2],[3],[5]]:[[4],[6]]);
    g.c.resolvePlacedBlock(rule==='three'?2:1,0,{kind:'number',val:rule==='three'?5:6});g.flush();
    assert.equal(g.state().tenCount,1);assert.equal(g.state().completedTowers,1);assert.equal(g.state().bricks,0);
  });
  test(`${mode}/${rule}: full-board game over reaches a usable result`,()=>{
    const g=game(rule,mode),s=g.state();g.setBoard(Array.from({length:s.board.length},()=>Array(mode==='free'||mode==='timed'?6:8).fill(9)));
    if(mode==='pairFalling'){g.run('fallingPiece={...numbersQueue[0],col:3,row:8,phase:"falling"}');g.c.settlePairFallingPiece(true);}
    else if(mode==='falling'){g.run('fallingPiece={...numbersQueue[0],col:3,row:8,phase:"falling"}');g.c.lockFallingPiece(true);}
    else g.c.resolvePlacedBlock(0,5,{kind:'number',val:9});
    g.flush();assert.equal(g.state().gameRunning,false);assert.equal(g.calls.screens.at(-1),'result');
  });
  if(mode!=='free')test(`${mode}/${rule}: actual clock excludes manual pause then expires`,()=>{
    const g=game(rule,mode);g.elapse(1000);const before=g.state();assert.ok(before.timeLeft<180);
    g.c.pauseGame();for(let i=0;i<5;i++)g.elapse(1000);assert.equal(g.state().timeLeft,before.timeLeft);
    g.c.pauseGame();g.flush();for(let i=0;i<182;i++)g.elapse(1000);g.flush();assert.equal(g.state().gameRunning,false);assert.equal(g.calls.screens.at(-1),'result');
  });
}
for(const rule of ['two','three','either'])test(`${rule}: horizontal pair splits into uneven columns with both members intact`,()=>{
  const g=game(rule,'pairFalling');g.setBoard([[9,9],[],[]]);g.run('fallingPiece={...makePairObject(2,3,1),col:0,row:8,phase:"falling"}');
  const actual=g.run('computePairSettlement(fallingPiece,getPairLandingPivotRow(fallingPiece))');
  assert.deepEqual(Array.from(actual,x=>[x.col,x.finalRow,x.block.val]),[[0,2,2],[1,0,3]]);
  g.c.settlePairFallingPiece(true);g.flush();assert.deepEqual(g.state().board.map(col=>col.map(x=>x.val)),[[9,9,2],[3],[]]);
});
