const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createGame}=require('./helpers/tower-of-ten-game.cjs');
const rules=require('../tower-of-ten/battle-rules.js');
const battleSource=fs.readFileSync(path.join(__dirname,'../tower-of-ten/battle.js'),'utf8');
function game(fallMode='falling',ruleMode='two'){
  const g=createGame();g.c.TenTowerBattleRules=rules;g.c.location={search:''};g.c.URLSearchParams=URLSearchParams;
  g.c.window.addEventListener=()=>{};g.c.document.addEventListener=()=>{};
  const names=['clonePairObject','cloneQueueObject','normalizeBlockObject','cloneBlockObject','makeQueueObject','ensureNumberQueue','advanceCurrentQueue','hasStarBlockOwned',
    'getPairOffset','getPairCells','canPairCellOccupy','canPairOccupyAt','getPairLandingPivotRow','computePairSettlement','pairSettlementFits',
    'makeQueueObjectFromFalling','respawnCurrentPairQueuePiece','holdCurrentPairBlock','holdCurrentBlock','canOccupy','getLandingRow','canFall','rotatePair','hardDropPiece',
    'getFallingIntervalForLevel','getPieceFallInterval','clearFallingTimers','finishFallingFull','commitPairSettlement','settlePairFallingPiece','lockFallingPiece',
    'exportSpecialBattleState','importSpecialBattleState','findPairSpawnCol','spawnFallingPiece'];
  g.run(names.map(g.actual).join('\n'));g.run(battleSource);
  const boardElement=g.c.document.getElementById('board');boardElement.querySelector=()=>null;boardElement.querySelectorAll=()=>[];
  g.c.showStarAwardToast=()=>{};g.c.playStarAwardSound=()=>{};
  for(const name of ['playHoldSound','renderFallingVisual','scheduleFallingStep','beginLockDelay','accrueLockTime','renderPairSettlementAnimation','clearHintHighlights','battleQueueSync','battleUpdateLocalStats','battleUpdateGarbageWarningUI','battleShowNetworkStatus','battleRenderRoom','battleUpdateBattleHud','battleShowCountdown','battleStartTimerLoop','battleClearGarbageWarning'])g.run(`${name}=()=>{};`);
  g.c.battleRoom={roomId:'room-1',matchId:'match-1',randomSeed:123,fallMode,ruleMode,status:'playing',players:[{playerId:'p1',isMe:true,active:true}],serverLastClientSequence:0};
  g.run(`currentMode='battle';BOARD_COLS=7;BOARD_ROWS=8;board=Array.from({length:7},()=>[]);battleState.token='test-token';battleState.room=battleRoom;battleState.me=battleRoom.players[0];battleState.matchId='match-1';battleState.fallMode=battleRoom.fallMode;battleState.ruleMode=battleRoom.ruleMode;battleState.rng=mulberry32(123);battleState.remainingMs=180000;numbersQueue=[makeQueueObject(),makeQueueObject(),makeQueueObject()];paused=false;fallingPiece=null;spawnFallingPiece();`);
  return g;
}
const plain=v=>JSON.parse(JSON.stringify(v));
const counterSource=fs.readFileSync(path.join(__dirname,'../tower-of-ten/battle-counter.js'),'utf8');
function enableCounter(g){
  g.c.battleRoom.counterVersion=1;
  g.run('battleState.counterVersion=1;');
  g.run('let battleCounterResolutionTimer=null,battleCounterResolutionSession=null;');
  const entries=[...counterSource.matchAll(/^function (\w+)\(/gm)];
  for(const name of ['battleCounterPendingCount','battleProcessCounterGarbage','battleResumeCounterResolution']){
    const index=entries.findIndex(m=>m[1]===name);
    g.run(counterSource.slice(entries[index].index,entries[index+1]?.index??counterSource.length));
  }
}
for(const fallMode of ['falling','pairFalling'])for(const ruleMode of ['two','three','either']){
  test(`${fallMode}/${ruleMode}: counter serial, applied IDs and pending resolution survive strict recovery`,()=>{
    const g=game(fallMode,ruleMode);enableCounter(g);
    g.run("fallingPiece=null;battleState.moveSerial=27;battleState.appliedDropIds=new Set(['drop-1:0','drop-1:1']);battleState.garbageResolutionPending=true;");
    const saved=plain(g.c.battleBuildClientState());assert.equal(rules.validState(saved,{fallMode,ruleMode}),true);
    const other=game(fallMode,ruleMode);enableCounter(other);assert.equal(other.c.battleRestoreClientState(saved,other.c.battleRoom),true);
    assert.equal(other.run('battleState.moveSerial'),27);assert.equal(other.run('battleState.garbageResolutionPending'),true);assert.deepEqual(plain(other.run('Array.from(battleState.pendingDropAcks)')),saved.appliedDropIds);
    for(const patch of [{moveSerial:-1},{garbageResolutionPending:'yes'},{appliedDropIds:['email@example.test']},{appliedDropIds:Array(301).fill('drop:0')},{privateName:'name'}])assert.equal(rules.validState({...saved,...patch},{fallMode,ruleMode}),false);
  });
  test(`${fallMode}/${ruleMode}: repeated committed drops apply once and persist before the animation`,()=>{
    const g=game(fallMode,ruleMode);enableCounter(g);g.run("fallingPiece=null;battleState.counterData={committed:[{eventId:'drop-1',numbers:[{dropId:'drop-1:0',value:1},{dropId:'drop-1:1',value:1}]}]};");
    assert.equal(g.c.battleProcessCounterGarbage(),true);assert.equal(g.c.battleProcessCounterGarbage(),false);
    const checkpoint=JSON.parse(g.stored.get(g.run('BATTLE_LOCAL_RESUME_KEY')));
    assert.equal(checkpoint.state.garbageResolutionPending,true);assert.equal(checkpoint.state.board.flat().length,2);assert.equal(checkpoint.state.appliedDropIds.length,2);
    g.flush();assert.equal(g.run('battleState.garbageResolutionPending'),false);assert.equal(g.c.battleProcessCounterGarbage(),false);assert.equal(g.state().board.flat().length,2);assert.equal(g.c.battleCounterPendingCount(),0);
  });
  test(`${fallMode}/${ruleMode}: a pre-animation checkpoint resumes garbage clears once without sending an attack`,()=>{
    const original=game(fallMode,ruleMode);enableCounter(original);original.setBoard(ruleMode==='two'?[[4],[6],[],[],[],[],[]]:[[2],[3],[5],[],[],[],[]]);
    original.run("fallingPiece=null;battleState.appliedDropIds=new Set(['drop-1:0']);battleState.garbageResolutionPending=true;");const snapshot=plain(original.c.battleBuildClientState());
    const restored=game(fallMode,ruleMode);enableCounter(restored);assert.equal(restored.c.battleRestoreClientState(snapshot,restored.c.battleRoom),true);restored.c.battleResumeCounterResolution();restored.c.battleResumeCounterResolution();restored.flush();
    assert.equal(restored.state().tenCount,1);assert.equal(restored.state().bricks,1);assert.equal(restored.state().board.flat().length,0);assert.equal(restored.run('battleState.pendingMoves.length'),0);assert.equal(restored.run('battleState.garbageResolutionPending'),false);
    restored.c.battleResumeCounterResolution();restored.flush();assert.equal(restored.state().tenCount,1);assert.equal(restored.state().bricks,1);
  });
  test(`${fallMode}/${ruleMode}: battle state stays distinct, seeded queue, hold and star survive full export/import`,()=>{
    const g=game(fallMode,ruleMode);assert.equal(g.state().currentMode,'battle');assert.equal(g.state().ruleMode,ruleMode);
    g.c.holdCurrentBlock();assert.equal(g.state().holdUsedThisTurn,true);assert.equal(g.state().heldBlock.kind,fallMode==='pairFalling'?'pair':'number');
    g.run('fallingPiece=null;spawnFallingPiece();');g.run('chainPower=8;pendingStarAward=true;');
    const before=plain(g.c.battleBuildClientState());assert.equal(before.version,2);assert.equal(rules.validState(before,{fallMode,ruleMode}),true);
    g.c.input=before;g.run('numbersQueue=[];heldBlock=null;fallingPiece=null;chainPower=0;');assert.equal(g.c.battleRestoreClientState(g.c.input,g.c.battleRoom),true);
    const after=plain(g.c.battleBuildClientState());for(const key of ['queue','held','falling','board','chainPower','holdUsed','sequenceIndex'])assert.deepEqual(after[key],before[key]);
    g.run('pendingStarAward=true;');g.run(g.actual('awardPendingStarBlock'));assert.equal(g.c.awardPendingStarBlock(),true);assert.equal(g.state().numbersQueue[0].kind,'star');
    g.run('fallingPiece=null;spawnFallingPiece();');const star=g.c.battleBuildClientState();assert.equal(star.falling.kind,'star');assert.equal(rules.validState(star,{fallMode,ruleMode}),true);
  });
  test(`${fallMode}/${ruleMode}: active rule controls clears; battle attack uses groups and no solo chain bonus`,()=>{
    const g=game(fallMode,ruleMode);g.setBoard(ruleMode==='two'?[[4],[6],[],[],[],[],[]]:[[2],[3],[5],[],[],[],[]]);g.run('fallingPiece=null;');
    const found=g.c.findAllPairs();assert.equal(found.count,1);g.c.processRemovals(found.set,found.count);g.flush();assert.equal(g.state().tenCount,1);assert.equal(g.state().bricks,1);assert.equal(g.state().fallingChainBonusTotal,0);assert.equal(g.run('battleState.pendingMoves.length'),1);assert.equal(g.run('battleState.pendingMoves[0].totalPairsInMove'),1);assert.equal(g.calls.submits.length,0);
  });
  test(`${fallMode}/${ruleMode}: garbage cannot produce attacks and an empty move returns to battle routing`,()=>{
    const g=game(fallMode,ruleMode);g.run("fallingPiece=null;battleState.resolutionOrigin='garbageInsertion';");g.c.battleRecordAttack(3,2);assert.equal(g.run('battleState.pendingMoves.length'),0);
    g.run("battleState.garbageBatchActive=true;");g.c.battleAfterMove();assert.equal(g.run('battleState.garbageBatchActive'),false);assert.equal(g.run('battleState.resolutionOrigin'),'playerMove');assert.ok(g.calls.spawns.length);
  });
  test(`${fallMode}/${ruleMode}: time expires during hard drop and still finalizes exactly once`,()=>{
    const g=game(fallMode,ruleMode);let finalCalls=0;g.c.battleSyncNow=()=>{finalCalls++;};g.c.hardDropPiece();assert.equal(g.state().animating,true);g.c.battleBeginTimeFinish();assert.ok(g.state().fallingPiece);g.flush();assert.equal(g.state().gameRunning,false);assert.equal(g.run('battleState.finalized'),true);assert.equal(finalCalls,1);g.c.battleFinalizeLocal();assert.equal(finalCalls,1);
  });
}
test('network pause during committed-drop animation defers clearing until one resume',()=>{
  const g=game('falling','two');enableCounter(g);g.setBoard([[4],[6],[],[],[],[],[]]);g.run('fallingPiece=null;battleState.garbageResolutionPending=true;');g.c.battleResumeCounterResolution();g.run('paused=true;');g.flush();
  assert.equal(g.state().tenCount,0);assert.equal(g.run('battleState.garbageResolutionPending'),true);
  g.run('paused=false;');g.c.battleResumeCounterResolution();g.c.battleResumeCounterResolution();g.flush();assert.equal(g.state().tenCount,1);assert.equal(g.run('battleState.pendingMoves.length'),0);
});
for(const fallMode of ['falling','pairFalling'])for(const ruleMode of ['two','three','either'])test(`${fallMode}/${ruleMode}: moves survive an unprocessed paused response and clear only after server confirmation`,async()=>{
 const g=game(fallMode,ruleMode);enableCounter(g);const sent=[];
 g.run("battleStartSyncLoop=()=>{};battleApplyRoom=()=>{};battlePersistLocalSnapshot=()=>{};battleIngestAttacks=()=>{};battleState.pendingMoves=[{clientMoveEventId:'move-1',moveSerial:1,totalPairsInMove:1,chainDepth:1,createdAt:1},{clientMoveEventId:'move-2',moveSerial:2,totalPairsInMove:1,chainDepth:1,createdAt:2}];");
 let watermark=0,duplicate=false,missing=false;
 g.c.battleApi=async(method,token,payload)=>{sent.push(plain(payload.clientMoveEvents));return {ok:true,room:{status:watermark?'playing':'paused'},garbageState:missing?null:{lastMoveSerial:watermark},duplicateSequence:duplicate,serverLastClientSequence:payload.clientSequence,nextExpectedClientSequence:payload.clientSequence+1};};
 await g.c.battleSyncNow();assert.deepEqual(plain(g.run('battleState.pendingMoves.map(m=>m.moveSerial)')),[1,2]);
 missing=true;await g.c.battleSyncNow();assert.equal(g.run('battleState.pendingMoves.length'),2);missing=false;
 watermark=1;await g.c.battleSyncNow();assert.deepEqual(plain(g.run('battleState.pendingMoves.map(m=>m.moveSerial)')),[2]);assert.deepEqual(sent[2].map(m=>m.clientMoveEventId),['move-1','move-2']);
 duplicate=true;watermark=2;await g.c.battleSyncNow();assert.equal(g.run('battleState.pendingMoves.length'),1);
 duplicate=false;await g.c.battleSyncNow();assert.equal(g.run('battleState.pendingMoves.length'),0);assert.deepEqual(sent.at(-1).map(m=>m.clientMoveEventId),['move-2']);
});
for(const ruleMode of ['two','three','either'])test(`pair/${ruleMode}: rotation, uneven separation, no-match garbage routing and pair placements`,()=>{
  const g=game('pairFalling',ruleMode);g.setBoard([[9,9],[],[],[],[],[],[]]);g.run('numbersQueue[0]=makePairObject(2,3,0);fallingPiece={...clonePairObject(numbersQueue[0]),col:0,row:8,phase:"falling",lockElapsed:0,intervalMs:1200};');g.c.rotatePair(1);assert.equal(g.state().fallingPiece.orientation,1);
  g.c.settlePairFallingPiece(true);g.flush();assert.deepEqual(g.state().board.map(c=>c.map(x=>x.val)),[[9,9,2],[3],[],[],[],[],[]]);assert.equal(g.run('pairPlacements'),1);assert.equal(g.run('battleState.resolutionOrigin'),'playerMove');assert.ok(g.calls.spawns.length);assert.equal(g.state().currentMode,'battle');
});
test('pair sequence is fair, reproducible after restoring RNG index and never totals ten in 1000 pairs',()=>{const a=game('pairFalling','either'),b=game('pairFalling','either');for(let i=0;i<1000;i++){const p=plain(a.c.battleNextPair()),q=plain(b.c.battleNextPair());assert.deepEqual(p,q);assert.notEqual(p[0]+p[1],10);}const snapshot=a.c.battleBuildClientState();const expected=plain(a.c.battleNextPair());assert.equal(b.c.battleRestoreClientState(snapshot,b.c.battleRoom),true);assert.deepEqual(plain(b.c.battleNextPair()),expected);});
test('legacy resume belongs only to falling/two and corrupt or mismatched snapshots leave live state intact',()=>{const g=game(),snapshot=plain(g.c.battleBuildClientState());snapshot.version=1;delete snapshot.fallMode;delete snapshot.ruleMode;assert.equal(g.c.battleRestoreClientState(snapshot,g.c.battleRoom),true);const pair=game('pairFalling','three'),before=pair.state();assert.equal(pair.c.battleRestoreClientState(snapshot,pair.c.battleRoom),false);assert.deepEqual(pair.state(),before);snapshot.version=99;assert.equal(g.c.battleRestoreClientState(snapshot,g.c.battleRoom),false);});
test('create request carries immutable settings alongside metadata and keeps requestId on retry',()=>{const g=game();const setting={fallMode:'pairFalling',ruleMode:'either'},a=g.c.battleBuildAttemptArgs('createBattleRoom',[setting],'request-1',0),b=g.c.battleBuildAttemptArgs('createBattleRoom',[setting],'request-1',1);assert.deepEqual(plain(a[1]),setting);assert.equal(a[0].requestId,b[0].requestId);assert.equal(a[0].battleRulesVersion,3);assert.equal(b[0].retryCount,1);});
test('first participant sync can have a positive sequence before it has ever played',()=>{const g=game('pairFalling','three');g.c.battleRoom={...g.c.battleRoom,status:'countdown',startAt:Date.now()+4000,serverLastClientSequence:1,resumeStateRequired:false};g.c.battlePrepareMatch(g.c.battleRoom);assert.equal(g.run('battleState.restoreFailed'),false);assert.equal(g.state().gameRunning,true);assert.equal(g.calls.screens.at(-1),'game');});
test('missing required recovery state stops play without silently starting a fresh board',()=>{const g=game('pairFalling','either');g.c.battleRoom={...g.c.battleRoom,serverLastClientSequence:12,resumeStateRequired:true,resumeState:null};g.c.battlePrepareMatch(g.c.battleRoom);assert.equal(g.run('battleState.restoreFailed'),true);assert.equal(g.state().gameRunning,false);assert.equal(g.calls.screens.at(-1),'battleRoom');});

function transport(){
  const vm=require('node:vm'),frames=[],sent=[];let serial=0;
  const window={addEventListener(){},removeEventListener(){}};window.top=window;
  const context=vm.createContext({window,TenTowerBattleRules:rules,location:{origin:'http://127.0.0.1:8784',search:''},URL,URLSearchParams,Uint8Array,Date,
    crypto:{getRandomValues:a=>{a.fill(1);return a;}},setTimeout:()=>++serial,clearTimeout(){},
    document:{createElement(){const f={contentWindow:{},setAttribute(){},remove(){}};frames.push(f);return f;},body:{appendChild(){}}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tower-of-ten/battle-bridge-client.js'),'utf8'),context);
  const c=new window.TowerBattleGasBridgeClient('https://script.google.com/macros/s/LocalContract/exec');
  function ready(){const source={parent:c.frame.contentWindow,postMessage:(value,origin)=>sent.push({value,origin})};c.receive({origin:'https://script.googleusercontent.com',source,data:{protocol:'ten-tower-battle-bridge-v1',channel:c.channel,type:'ready'}});}
  const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  function respond(item,result){c.receive({origin:c.bridgeOrigin,source:c.bridgeWindow,data:{protocol:'ten-tower-battle-bridge-v1',channel:c.channel,type:'response',requestId:item.value.requestId,ok:true,result}});}
  return{c,frames,sent,ready,tick,respond};
}
test('real transport rejects invalid explicit room settings before opening a connection',async()=>{const h=transport();for(const config of [{fallMode:'free',ruleMode:'two'},{fallMode:'pairFalling',ruleMode:'bad'},{fallMode:'falling',ruleMode:'two',email:'private'},{}])await assert.rejects(h.c.call('createBattleRoom',[{battleRulesVersion:2},config]),e=>e.code==='INVALID_ARGUMENT');assert.equal(h.frames.length,0);h.c.destroy();});
test('real transport rejects corrupt pair recovery data before opening a connection',async()=>{for(const mutate of [s=>s.queue[0].second.val=10-s.queue[0].first.val,s=>s.falling.orientation=(s.falling.orientation+1)%4,s=>s.held.email='private']){const h=transport(),g=game('pairFalling','three');g.c.holdCurrentBlock();g.run('fallingPiece=null;spawnFallingPiece();');const state=plain(g.c.battleBuildClientState());mutate(state);await assert.rejects(h.c.call('syncBattle',['a'.repeat(64),{clientState:state}]),e=>e.code==='INVALID_ARGUMENT');assert.equal(h.frames.length,0);h.c.destroy();}});
test('real transport sends six-mode settings and pair recovery unchanged through the pinned bridge',async()=>{const h=transport(),settings={fallMode:'pairFalling',ruleMode:'either'},state=plain(game('pairFalling','either').c.battleBuildClientState()),create=[{battleRulesVersion:2},settings],sync=['a'.repeat(64),{clientSequence:3,clientState:state,ackEventIds:['event-1']}];const p=h.c.call('createBattleRoom',create),q=h.c.call('syncBattle',sync);h.ready();await h.tick();assert.equal(h.sent.length,2);assert.strictEqual(h.sent[0].value.args,create);assert.strictEqual(h.sent[1].value.args,sync);assert.equal(h.sent[1].origin,'https://script.googleusercontent.com');h.respond(h.sent[1],{ok:true,serverLastClientSequence:3});h.respond(h.sent[0],{ok:true,room:settings});assert.equal((await q).serverLastClientSequence,3);assert.deepEqual((await p).room,settings);h.c.destroy();});
