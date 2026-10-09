const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers/tower-of-ten-game.cjs');
const setup=(rule='two',mode='free')=>{const g=createGame();g.run(`ruleMode='${rule}';currentMode='${mode}';`);return g;};

for(const [name,board,count,cells] of [
  ['vertical',[[4,6]],1,2],['horizontal',[[4],[6]],1,2],['diagonal',[[4],[1,6]],0,0],
  ['gap',[[4],[],[6]],0,0],['triple excluded',[[2],[3],[5]],0,0],['overlap',[[4,6,4]],2,3]
])test(`baseline two: ${name}`,()=>{const g=setup();g.setBoard(board);const x=g.c.findAllPairs();assert.equal(x.count,count);assert.equal(x.set.size,cells);});
test('baseline placement checks below and both sides',()=>{
  const g=setup();g.setBoard([[7,7],[7,3],[7,7]]);const x=g.c.getImmediatePairs(1,1,{val:3});assert.equal(x.immediatePairs,3);assert.equal(x.toDelete.size,4);
});
for(const rule of ['two','three','either'])test(`${rule}: unrelated existing group waits at a nonmatching single placement`,()=>{
  const g=setup(rule);g.setBoard(rule==='three'?[[2,3,5],[1],[]]:[[4,6],[1],[]]);
  g.c.resolvePlacedBlock(1,0,{val:1});g.flush();assert.equal(g.state().tenCount,0);assert.equal(g.c.findAllPairs().count,1);
});
for(const rule of ['two','three','either'])test(`${rule}: pair settlement initially scans the whole board`,()=>{
  const g=setup(rule,'pairFalling');g.setBoard(rule==='three'?[[2,3,5],[1],[]]:[[4,6],[1],[]]);
  g.c.resolveSettledPair();g.flush();assert.equal(g.state().tenCount,1);assert.equal(g.state().bestChain,1);
});
for(const rule of ['two','three','either'])for(const mode of ['free','timed','falling','pairFalling'])test(`${mode} / ${rule}: gravity creates a second wave, with original bonus`,()=>{
  const g=setup(rule,mode),three=rule==='three';
  g.setBoard(three?[[2,3,1,5],[1,1,4],[1,1,5]]:[[3,4,7],[1,6]]);
  const col=three?2:1,row=three?2:1;
  g.c.resolvePlacedBlock(col,row,{val:three?5:6});g.flush();
  const s=g.state();assert.equal(s.tenCount,2);assert.equal(s.bestChain,2);assert.equal(s.bricks,mode==='falling'||mode==='pairFalling'?3:2);
  assert.equal(s.fallingChainBonusTotal,mode==='falling'||mode==='pairFalling'?1:0);
});
test('either: overlapping pair and triple are one wave, two bricks and four erased cells',()=>{
  const g=setup('either');g.setBoard([[4],[6],[1],[3]]);g.c.resolvePlacedBlock(1,0,{val:6});g.flush();
  assert.equal(g.state().tenCount,2);assert.equal(g.state().bricks,2);assert.equal(g.state().bestChain,1);assert.ok(g.state().board.every(col=>col.length===0));
});
test('three: overlapping triples after pair settlement count separately',()=>{
  const g=setup('three','pairFalling');g.setBoard([[2,3,5,2]]);g.c.resolveSettledPair();g.flush();
  assert.equal(g.state().tenCount,2);assert.equal(g.state().bricks,2);assert.equal(g.state().bestChain,1);assert.equal(g.state().board[0].length,0);
});
test('removal compacts columns without double deletion',()=>{
  const g=setup();g.setBoard([[1,2,3],[4,5]]);g.c.removeAndDrop(new Set(['0,1','1,0']));assert.deepEqual(g.state().board.map(c=>c.map(x=>x.val)),[[1,3],[5]]);
});
for(const rule of ['two','three','either'])test(`${rule}: 25 bricks complete one tower with remainder`,()=>{
  const g=setup(rule);g.run('bricks=24');g.setBoard(rule==='three'?[[2,3,5]]:[[4,6]]);const x=g.c.findAllPairs();g.c.processRemovals(x.set,x.count);g.flush();
  assert.equal(g.state().completedTowers,1);assert.equal(g.state().bricks,0);
});
for(const rule of ['two','three','either'])test(`${rule}: star cross itself adds no tens or bricks`,()=>{
  const g=setup(rule);g.setBoard([[1],[2,3],[8]]);g.c.processStarCross(1,0);g.flush();
  assert.ok(g.state().board.every(col=>col.length===0));assert.equal(g.state().bricks,0);assert.equal(g.state().tenCount,0);
});
for(const rule of ['two','three','either'])test(`${rule}: star aftermath uses the selected full-board rule`,()=>{
  const g=setup(rule);g.setBoard(rule==='three'?[[1,2],[1,3],[1,5],['STAR']]:[[1,4],[1,6],['STAR']]);
  g.c.processStarCross(rule==='three'?3:2,0);g.flush();assert.equal(g.state().tenCount,1);assert.equal(g.state().bricks,1);
});
test('an old session cannot finish a removal in a new game',()=>{
  const g=setup('three');g.setBoard([[2,3,5]]);const x=g.c.findAllPairs();g.c.processRemovals(x.set,x.count);g.run('gameSessionToken++');g.flush();assert.equal(g.state().bricks,0);assert.equal(g.state().board[0].length,3);
});
for(const rule of ['two','three','either'])test(`${rule}: time expiry waits for the active chain to finish`,()=>{
  const g=setup(rule,'falling'),three=rule==='three';g.setBoard(three?[[2,3,1,5],[1,1,4],[1,1,5]]:[[3,4,7],[1,6]]);
  g.c.resolvePlacedBlock(three?2:1,three?2:1,{val:three?5:6});g.c.expireFallingChallenge();
  assert.equal(g.state().gameRunning,true);g.flush();assert.equal(g.state().gameRunning,false);assert.equal(g.state().tenCount,2);assert.equal(g.state().bricks,3);assert.equal(g.calls.screens.at(-1),'result');
});
test('pair generator excludes internal ten in all rules, including explicit complementary inputs',()=>{
  const g=setup();for(const rule of ['two','three','either']){g.run(`ruleMode='${rule}'`);for(let i=0;i<1000;i++){const p=g.c.makePairObject();assert.notEqual(p.first.val+p.second.val,10);}const p=g.c.makePairObject(4,6);assert.notEqual(p.first.val+p.second.val,10);}
});
test('two rescue remains in free/timed and is absent from all falling modes',()=>{
  const g=setup();g.setBoard([[9],[],[]]);g.c.Math.random=()=>0;g.run('noTenCounter=4');
  for(const mode of ['free','timed']){g.run(`currentMode='${mode}'`);assert.equal(g.c.randomNumber(),1);}
  g.c.Math.random=()=>0.5;
  for(const mode of ['falling','pairFalling','fallingTutorial']){g.run(`currentMode='${mode}'`);assert.equal(g.c.randomNumber(),5);}
  g.run("currentMode='battle'");assert.equal(g.c.randomNumber(),8);
});
test('hold is disabled after one use and while paused',()=>{
  const g=setup();g.run('numbersQueue=[{kind:"number",val:3}]');assert.equal(g.c.canUseHold(),true);
  g.run('holdUsedThisTurn=true');assert.equal(g.c.canUseHold(),false);g.run('holdUsedThisTurn=false;paused=true');assert.equal(g.c.canUseHold(),false);
});
test('normal and pair bests remain independent and cannot decrease',()=>{
  const g=setup();g.run('bestChain=4;fallingChainBonusTotal=3');g.c.saveAndGetFalling3MinuteRecord(30);g.c.saveAndGetPair3MinuteRecord({totalBricks:40,maxChain:3,chainBonusTotal:6});g.c.saveAndGetFalling3MinuteRecord(5);
  assert.equal(g.stored.get('falling3minBestTotalBricks'),'30');assert.equal(JSON.parse(g.stored.get('pairFalling3minRecordV1')).bestTotalBricks,40);
});
for(const [raw,flag] of [['{"version":0}','historyUnavailable'],['broken','storageUnavailable']])test(`invalid pair best is preserved: ${flag}`,()=>{
  const g=setup();g.stored.set('pairFalling3minRecordV1',raw);assert.equal(g.c.saveAndGetPair3MinuteRecord({totalBricks:40,maxChain:3,chainBonusTotal:6})[flag],true);assert.equal(g.stored.get('pairFalling3minRecordV1'),raw);
});
test('legacy common best remains in the original keys',()=>{
  const g=setup();g.run('completedTowers=2;bricks=6;tenCount=22;bestChain=4');g.c.saveGeneralRecords();assert.equal(g.stored.get('bestTowerProgress'),'56');assert.equal(g.stored.has('freeBest'),false);
});
for(const mode of ['free','timed','falling','pairFalling'])for(const rule of ['three','either'])test(`${mode} / ${rule}: ending cannot write legacy records or submit`,()=>{
  const g=setup(rule,mode);g.run('completedTowers=2;bricks=6;tenCount=22;bestChain=4');g.stored.set('bestTowerProgress','77');g.stored.set('pairFalling3minRecordV1','existing');
  const before=[...g.stored];g.c.endGame('full');assert.deepEqual([...g.stored],before);assert.deepEqual(g.calls.submits,[]);assert.equal(g.calls.screens.at(-1),'result');
  if(mode==='falling'||mode==='pairFalling')assert.match(g.elements.get((mode==='falling'?'falling':'pair')+'-community-note').textContent,/ほぞんしません/);
});
for(const mode of ['falling','pairFalling'])test(`${mode} / two: existing save and submit still occur`,()=>{
  const g=setup('two',mode);g.run('completedTowers=1;bricks=2');g.c.endGame('full');assert.equal(g.calls.submits.length,1);assert.ok(g.stored.size>0);assert.equal(g.calls.submits[0].snapshot.totalBricks,27);
});
for(const mode of ['free','timed','falling','pairFalling'])for(const rule of ['two','three','either'])test(`start ${mode} with ${rule} keeps separate mode/rule state`,()=>{
  const g=setup();g.c.startGame(mode,{ruleMode:rule});assert.equal(g.state().currentMode,mode);assert.equal(g.state().ruleMode,rule);assert.equal(g.state().gameRunning,true);assert.equal(g.state().tenCount,0);
});
for(const mode of ['battle','tutorial','fallingTutorial'])test(`${mode} forces two even after a three trial`,()=>{
  const g=setup('three');g.c.startGame(mode,{ruleMode:'three'});assert.equal(g.state().ruleMode,'two');g.setBoard([[2,3,5]]);assert.equal(g.c.findAllPairs().count,0);
});
test('starting without an explicit rule restores the existing two default',()=>{
  const g=setup('three');g.c.startGame('free');assert.equal(g.state().ruleMode,'two');assert.throws(()=>g.c.startGame('free',{ruleMode:'bad'}),/Invalid ruleMode/);
});
