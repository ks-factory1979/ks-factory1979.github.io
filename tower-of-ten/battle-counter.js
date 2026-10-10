// The server owns deadlines, cancellation and commitment. This file only renders and applies it.
let battleCounterFrame=null,battleCounterNotice='',battleCounterNoticeUntil=0;
let battleCounterResolutionTimer=null,battleCounterResolutionSession=null;
const battleCounterBar=document.getElementById('battle-garbage-warning');
const battleCounterMarker=document.createComment('battle warning home');battleCounterBar.before(battleCounterMarker);
function battleSetupCounterLayout(){
  const active=isBattleMode()&&battleState.counterVersion===1,game=document.getElementById('game-screen');game.classList.toggle('counter-battle',active);battleCounterBar.classList.toggle('server-counter',active);
  if(active){const stage=document.querySelector('.mobile-game-layout');if(document.documentElement.classList.contains('tower-mobile')&&stage)stage.insertBefore(battleCounterBar,stage.querySelector('.board-stage'));else document.getElementById('battle-hud').after(battleCounterBar);battleCounterBar.hidden=false;if(!battleCounterFrame)battleCounterTick();}
  else{battleCounterMarker.after(battleCounterBar);battleCounterBar.hidden=true;}
}
window.addEventListener('tower-portrait-change',battleSetupCounterLayout);
function battleCounterClock(){
  const running=battleState.room?.status==='playing'&&!paused&&!battleState.networkPaused;
  return Number(battleState.counterClockAt||0)+(running?Math.max(0,performance.now()-Number(battleState.counterClockStamp||performance.now())):0);
}
function battleCounterTick(){
  battleCounterFrame=null;
  if(!isBattleMode()||battleState.counterVersion!==1||!document.getElementById('game-screen').classList.contains('active')){battleCounterBar.hidden=true;return;}
  battleRenderCounterWarning();battleCounterFrame=requestAnimationFrame(battleCounterTick);
}
function battleRenderCounterWarning(){
  const data=battleState.counterData,warnings=data?.warnings||[],committed=data?.committed||[];
  const waiting=committed.reduce((n,e)=>n+e.numbers.filter(x=>!battleState.appliedDropIds.has(x.dropId)).length,0),total=warnings.reduce((n,e)=>n+e.numbers.length,0)+waiting;
  const ms=warnings.length?Math.max(0,warnings[0].dueAt-battleCounterClock()):0;
  document.getElementById('battle-garbage-warning-text').textContent=`おじゃま ${total}こ`;
  document.getElementById('battle-garbage-time').textContent=warnings.length?`${(ms/1000).toFixed(1)}秒`:waiting?'落下待ち':'よこくなし';
  document.getElementById('battle-counter-result').textContent=Date.now()<battleCounterNoticeUntil?battleCounterNotice:'';
  document.getElementById('battle-garbage-warning-bar').style.transform=`scaleX(${Math.min(1,ms/3000)})`;
  battleCounterBar.classList.toggle('urgent',total>0&&ms<800);battleCounterBar.hidden=false;
}
function battleCounterPendingCount(){return (battleState.counterData?.warnings||[]).reduce((n,e)=>n+e.numbers.length,0)+(battleState.counterData?.committed||[]).reduce((n,e)=>n+e.numbers.filter(x=>!battleState.appliedDropIds.has(x.dropId)).length,0);}
function battleApplyCounterState(data){
  if(battleState.counterVersion!==1||data.version!==1||data.matchId!==battleState.matchId)return;
  battleState.counterData=data;battleState.counterClockAt=Number(data.clockNow)||0;battleState.counterClockStamp=performance.now();battleState.moveSerial=Math.max(battleState.moveSerial,Number(data.lastMoveSerial)||0);
  for(const outcome of data.outcomes||[]){if(outcome.moveSerial<=battleState.lastCounterOutcome)continue;battleState.lastCounterOutcome=outcome.moveSerial;if(outcome.cancelled>0){battleCounterNotice=outcome.allCleared?'ぜんぶそうさい！':'そうさい！';battleCounterNoticeUntil=Date.now()+1000;}}
  // Preserve IDs awaiting a durable server ACK; older confirmed IDs may be compacted.
  const recent=Array.from(battleState.appliedDropIds).slice(-200);battleState.appliedDropIds=new Set([...recent,...battleState.pendingDropAcks]);
  battleSetupCounterLayout();battleRenderCounterWarning();battleUpdateLocalStats();
  if(gameRunning&&!paused&&!animating&&!fallingPiece)battleProcessCounterGarbage();
}
function battleProcessCounterGarbage(){
  if(battleState.counterVersion!==1||!gameRunning||paused||animating||battleState.garbageBatchActive||battleState.timeExpired||battleState.eliminated)return false;
  const batch=(battleState.counterData?.committed||[]).flatMap(e=>e.numbers.map(x=>({...x,eventId:e.eventId}))).filter(x=>!battleState.appliedDropIds.has(x.dropId)).slice(0,BATTLE_DIAGNOSTIC_CONFIG.garbageMaxDropAtOnce);
  if(!batch.length)return false;
  const next=board.map(c=>c.slice()),used=Array(BOARD_COLS).fill(0);
  for(const entry of batch){let candidates=[],min=Infinity;for(let c=0;c<BOARD_COLS;c++){if(next[c].length>=BOARD_ROWS)continue;const score=next[c].length+(used[c]>=2?100:0);if(score<min){min=score;candidates=[c];}else if(score===min)candidates.push(c);}if(!candidates.length){battleEliminate('garbage');return true;}const col=candidates[Math.floor(Math.random()*candidates.length)];used[col]++;next[col].push({...makeNumberObject(entry.value),recentGarbage:true,garbageBatchId:entry.eventId});}
  clearNamedTimer('spawn');board=next;batch.forEach(x=>{battleState.appliedDropIds.add(x.dropId);battleState.pendingDropAcks.add(x.dropId);});battleState.garbageBatchActive=true;battleState.resolutionOrigin='garbageInsertion';
  battleState.garbageResolutionPending=true;updateBoardUI();updateInfoPanels();battlePersistLocalSnapshot();battleQueueSync(20);battleResumeCounterResolution();
  return true;
}
function battleResumeCounterResolution(){
  if(!battleState.garbageResolutionPending)return;
  if(battleCounterResolutionTimer!==null&&battleCounterResolutionSession===gameSessionToken)return;
  if(battleCounterResolutionTimer!==null)clearTimeout(battleCounterResolutionTimer);
  battleState.garbageBatchActive=true;battleState.resolutionOrigin='garbageInsertion';animating=true;updateFallingControls();playSound(1);const session=gameSessionToken;
  battleCounterResolutionSession=session;
  battleCounterResolutionTimer=setTimeout(()=>{battleCounterResolutionTimer=null;if(session!==gameSessionToken||!gameRunning||paused)return;battleState.garbageResolutionPending=false;animating=false;const found=findAllPairs();if(found.count)processRemovals(found.set,found.count);else battleAfterMove();},380);
}
