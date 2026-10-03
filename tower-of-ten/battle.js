// =========================================================
// 10の塔 GAS版 v2.0.14 - ACK・通信シーケンス安定化
// =========================================================
const BATTLE_CHARACTER_NAMES = Object.freeze({ pipi:'ぴぴ', rabi:'らび', moko:'もこ', kon:'こん' });
const BATTLE_ASSETS = Object.freeze({
  pipi:{normal:'assets/battle/pipi_normal.png',attack:'assets/battle/pipi_attack.png',cheer:'assets/battle/pipi_cheer.png',win:'assets/battle/pipi_win.png'},
  rabi:{normal:'assets/battle/rabi_normal.png',attack:'assets/battle/rabi_attack.png',cheer:'assets/battle/rabi_cheer.png',win:'assets/battle/rabi_win.png'},
  moko:{normal:'assets/battle/moko_normal.png',attack:'assets/battle/moko_attack.png',cheer:'assets/battle/moko_cheer.png',win:'assets/battle/moko_win.png'},
  kon:{normal:'assets/battle/kon_normal.png',attack:'assets/battle/kon_attack.png',cheer:'assets/battle/kon_cheer.png',win:'assets/battle/kon_win.png'}
});
const BATTLE_MATCH_MS = 180000;
const BATTLE_APP_VERSION = '2.0.14';
const BATTLE_DIAGNOSTIC_CONFIG = Object.freeze({
  enabled:true,
  clientLogQueueMax:30,
  retryDelaysMs:[500,1200,2500],
  retryJitterMs:[120,220,350],
  lockBusyRetryExtraMinMs:250,
  lockBusyRetryExtraMaxMs:650,
  normalSyncJitterMs:450,
  explicitSyncLoopJitterMaxMs:160,
  queuedSyncJitterMinMs:30,
  queuedSyncJitterMaxMs:120,
  syncTimeoutMs:10000,
  actionTimeoutMs:15000,
  loadingDelayMs:500,
  showReconnectAfterFailures:1,
  diagnosticFlushDelayMs:2200,
  duplicateClientLogWindowMs:60000,
  waitingWarningMs:10000,
  waitingDisconnectMs:30000,
  battlePauseMs:5000,
  battleDisconnectMs:30000,
  resumeCountdownMs:3500,
  garbageWarningMs:3000,
  garbageWarningMinExtensionMs:1500,
  garbageWarningResumeMinimumMs:1000,
  garbageWarningMaxTotalMs:4500,
  garbageMaxDropAtOnce:5,
  localResumeTtlMs:45000,
  sequenceStorageEnabled:true,
  sequenceStorageVersion:1,
  sequenceStorageTtlMs:60*60*1000,
  ackMaxIdsPerSync:20,
  receivedAttackIdMaxCount:100,
  receivedAttackIdTtlMs:10*60*1000,
  duplicateAttackLogSuppressMs:30000
});
const BATTLE_ACTION_METHODS = new Set(['createBattleRoom','joinBattleRoom','selectBattleCharacter','setBattleReady','startBattleMatch','requestBattleRematch','leaveBattleRoom']);
const BATTLE_SESSION_METHODS = new Set(['selectBattleCharacter','setBattleReady','startBattleMatch','syncBattle','requestBattleRematch','leaveBattleRoom']);
const BATTLE_RETRYABLE_CODES = new Set(['LOCK_BUSY','LOCK_TIMEOUT','CLIENT_TIMEOUT','SCRIPT_RUN_FAILURE','GOOGLE_SERVER_ERROR','PROPERTY_READ_ERROR','PROPERTY_WRITE_ERROR']);
const BATTLE_NON_RETRYABLE_CODES = new Set(['ROOM_NOT_FOUND','SESSION_INVALID','SESSION_EXPIRED','ALREADY_STARTED','ROOM_FULL','NOT_WAITING','NOT_HOST','NEED_PLAYERS','NOT_READY','NO_CHARACTER','CHARACTER_TAKEN','CHARACTER_ALREADY_USED','INVALID_CHARACTER','INVALID_PIN','NOT_FINISHED','PLAYER_NOT_FOUND','CLIENT_OFFLINE','CLIENT_CANCELLED','QUOTA_LIMIT','EXECUTION_TIMEOUT']);
const BATTLE_CLIENT_DIAG_KEY = 'tenTowerBattleDiagnosticQueueV211';

const battleState = {
  token:null, room:null, me:null, pinInput:'', syncTimer:null, syncBusy:false,
  matchId:null, preparedMatchId:null, serverOffset:0, remainingMs:BATTLE_MATCH_MS,
  remainingSnapshotAt:0, remainingRunning:false, timerLoop:null, countdownLoop:null,
  rng:null, sequenceIndex:0, clientSequence:0, serverLastClientSequence:0, nextExpectedClientSequence:1,
  sequenceRestoredFromStorage:false, sequenceCorrectedFromServer:false,
  pendingMoves:[], pendingAcks:[], seenAttackIds:new Set(), seenAttackAt:new Map(),
  garbageQueue:[], garbageBatchActive:false, resolutionOrigin:'playerMove',
  attackToastTimer:null, sentGarbage:0, eliminated:false, timeExpired:false,
  finalized:false, networkPaused:false, resumeTimer:null, localSpeedLevel:0,
  lastRoomStatus:null,
  countdownActive:false, countdownTargetAt:0, countdownType:null, countdownFinishTimer:null, countdownCompletedKey:null,
  firstGarbageTipShown:false, recentGarbageBatchSeq:0,
  consecutiveSyncFailures:0, reconnecting:false, offline:typeof navigator!=='undefined'?!navigator.onLine:false,
  networkStatusTimer:null, diagnosticFlushTimer:null, diagnosticFlushBusy:false,
  lastSuccessfulSyncAt:0, resultMayBeInaccurate:false,
  sessionGeneration:0, sessionInvalidHandled:false, sessionExpiredHandled:false, syncRequestSerial:0, latestAppliedSyncSerial:0,
  actionInFlight:Object.create(null), seenSystemEventIds:new Set(), roomNotice:'', roomNoticeUntil:0,
  roomNoticeTimer:null, lastHostPlayerId:null, pageHiddenAt:0, connectionConfig:null,
  garbageWarningQueue:[], garbageWarningActive:false, garbageWarningRemainingMs:0, garbageWarningStartedAt:0, garbageWarningElapsedMs:0, garbageWarningRaf:null,
  restoredClientState:false, lastClientStateSavedAt:0
};
const battleRetryWaits = new Set();
const battleLoadingDelayTimers = new Set();

function battleAsset(characterId, pose='normal') {
  const set = BATTLE_ASSETS[characterId] || BATTLE_ASSETS.pipi;
  return APP_ASSETS[set[pose] || set.normal] || '';
}
function battleName(characterId) { return BATTLE_CHARACTER_NAMES[characterId] || '−'; }
function battleSetImage(img, characterId, pose='normal') { if (img) img.src = battleAsset(characterId, pose); }
function battleUuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
}
function battleCreateApiError(code, message, raw=null, retryable=null) {
  const error=new Error(message || 'つうしんできなかったよ');
  error.code=String(code || 'UNKNOWN_ERROR').toUpperCase();
  error.raw=raw;
  if(typeof retryable==='boolean') error.retryable=retryable;
  return error;
}
function battleNormalizeApiCode(code) {
  const value=String(code || 'UNKNOWN_ERROR').toUpperCase();
  const map={BUSY:'LOCK_BUSY',SERVER_ERROR:'GOOGLE_SERVER_ERROR',SESSION_NOT_FOUND:'SESSION_INVALID'};
  return map[value] || value;
}
function battleClassifyFailure(error) {
  if(error && error.code) return battleNormalizeApiCode(error.code);
  const raw=String(error&&error.message?error.message:error||'');
  if(/is not a function|Script function not found|スクリプト関数が見つかりません/i.test(raw)) return 'SCRIPT_RUN_FAILURE';
  if(/too many times|quota|limit exceeded|simultaneous|daily limit/i.test(raw)) return 'QUOTA_LIMIT';
  if(/maximum execution time|execution time/i.test(raw)) return 'EXECUTION_TIMEOUT';
  if(/offline|network.*disconnected|internet disconnected/i.test(raw)) return 'CLIENT_OFFLINE';
  if(/timeout|timed out/i.test(raw)) return 'CLIENT_TIMEOUT';
  if(/internal error|server error|service unavailable|backend/i.test(raw)) return 'GOOGLE_SERVER_ERROR';
  return 'SCRIPT_RUN_FAILURE';
}
function battleShouldRetry(error) {
  if(error && typeof error.retryable==='boolean') return error.retryable;
  const code=battleClassifyFailure(error);
  if(BATTLE_NON_RETRYABLE_CODES.has(code)) return false;
  return BATTLE_RETRYABLE_CODES.has(code);
}
function battleRetryDelay(attemptIndex,error=null) {
  const base=BATTLE_DIAGNOSTIC_CONFIG.retryDelaysMs[Math.min(attemptIndex,BATTLE_DIAGNOSTIC_CONFIG.retryDelaysMs.length-1)] || 1500;
  const jitter=BATTLE_DIAGNOSTIC_CONFIG.retryJitterMs[Math.min(attemptIndex,BATTLE_DIAGNOSTIC_CONFIG.retryJitterMs.length-1)] || 0;
  let delay=Math.max(200,Math.round(base+(Math.random()*2-1)*jitter));
  const code=battleClassifyFailure(error);
  if(code==='LOCK_BUSY'||code==='LOCK_TIMEOUT') {
    const min=Math.max(0,Number(BATTLE_DIAGNOSTIC_CONFIG.lockBusyRetryExtraMinMs)||0);
    const max=Math.max(min,Number(BATTLE_DIAGNOSTIC_CONFIG.lockBusyRetryExtraMaxMs)||min);
    delay+=Math.round(min+Math.random()*(max-min));
  }
  return delay;
}
function battleCancelRetryWaits(){
  Array.from(battleRetryWaits).forEach(entry=>{try{entry.cancel();}catch(e){}});
  battleRetryWaits.clear();
}
function battleSleep(ms,shouldContinue=null){
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(ok)=>{
      if(settled)return;
      settled=true;
      clearTimeout(entry.timer);
      battleRetryWaits.delete(entry);
      if(ok) resolve();
      else reject(battleCreateApiError('CLIENT_CANCELLED','通信処理を中止しました'));
    };
    const entry={
      timer:setTimeout(()=>finish(!shouldContinue||shouldContinue()),Math.max(0,Number(ms)||0)),
      cancel:()=>finish(false)
    };
    battleRetryWaits.add(entry);
  });
}
function battleClearLoadingDelayTimers(){
  Array.from(battleLoadingDelayTimers).forEach(timer=>clearTimeout(timer));
  battleLoadingDelayTimers.clear();
}
function battleRoomAnon(){
  const id=battleState.room&&battleState.room.roomId?String(battleState.room.roomId).replace(/[^a-z0-9]/gi,'').slice(-4).toUpperCase():'';
  return id?`ROOM-${id}`:'';
}
function battleCurrentStateName(){
  if(battleState.room&&battleState.room.status) return String(battleState.room.status);
  const active=document.querySelector('.screen.active');
  return active?String(active.id||'').replace(/-screen$/,''):'unknown';
}
function battleClientMeta(requestId='',retryCount=0,extra={}) {
  return {
    requestId:String(requestId||''), retryCount:Number(retryCount)||0,
    battleState:battleCurrentStateName(),
    participantCount:battleState.room&&Array.isArray(battleState.room.players)?battleState.room.players.length:0,
    roomAnon:battleRoomAnon(), online:typeof navigator==='undefined'?true:navigator.onLine!==false,
    screenSize:`${window.innerWidth||0}x${window.innerHeight||0}`, appVersion:BATTLE_APP_VERSION,
    sessionGeneration:Number(battleState.sessionGeneration)||0,
    syncRequestId:String(extra&&extra.syncRequestId||''),
    clientSequence:Number(battleState.clientSequence)||0,
    serverLastClientSequence:Number(battleState.serverLastClientSequence)||0,
    nextExpectedClientSequence:Number(battleState.nextExpectedClientSequence)||1,
    sequenceStatus:String(extra&&extra.sequenceStatus||''),
    ackTargetCount:Number(extra&&extra.ackTargetCount||0),
    ackSuccessCount:Number(extra&&extra.ackSuccessCount||0),
    ackEventIds:String(extra&&extra.ackEventIds||'').slice(0,240),
    sequenceRestoredFromStorage:!!battleState.sequenceRestoredFromStorage,
    sequenceCorrectedFromServer:!!battleState.sequenceCorrectedFromServer
  };
}
function battleBuildAttemptArgs(method,args,requestId,retryCount) {
  const built=args.slice();
  const meta=battleClientMeta(requestId,retryCount,{syncRequestId:method==='syncBattle'?requestId:''});
  if(method==='syncBattle') {
    const payload=Object.assign({},built[1]||{});
    meta.clientSequence=Math.max(0,Number(payload.clientSequence)||0);
    meta.ackTargetCount=Array.isArray(payload.ackEventIds)?payload.ackEventIds.length:0;
    meta.ackEventIds=Array.isArray(payload.ackEventIds)?payload.ackEventIds.map(String).join(',').slice(0,240):'';
    built[1]=Object.assign(payload,{clientMeta:meta});
  } else if(BATTLE_ACTION_METHODS.has(method)) {
    built.push(meta);
  }
  return built;
}
function battleApiOnce(method,args,timeoutMs) {
  return new Promise((resolve,reject)=>{
    if(typeof navigator!=='undefined' && navigator.onLine===false) {
      reject(battleCreateApiError('CLIENT_OFFLINE','ネットにつながるのを まっているよ'));
      return;
    }
    if(!window.TowerBattleTransport||!TowerBattleTransport.isConfigured()){
      reject(battleCreateApiError('SCRIPT_RUN_FAILURE','GAS_API_UNAVAILABLE'));
      return;
    }
    let settled=false;
    const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value);};
    const timer=setTimeout(()=>finish(reject,battleCreateApiError('CLIENT_TIMEOUT','つうしんの へんじを まっています')),Math.max(1000,Number(timeoutMs)||10000));
    const onSuccess=result=>{
      if(result&&result.ok===false){
        finish(reject,battleCreateApiError(battleNormalizeApiCode(result.errorCode||result.code),result.message||'つうしんできなかったよ',result,typeof result.retryable==='boolean'?result.retryable:null));
        return;
      }
      finish(resolve,result);
    };
    const onFailure=error=>{
      const raw=error&&error.message?String(error.message):String(error||'');
      if(/is not a function|Script function not found|スクリプト関数が見つかりません/i.test(raw)){
        finish(reject,battleCreateApiError('SCRIPT_RUN_FAILURE','対戦用のサーバー関数が公開されていません。Code.gsを差し替え、保存後に「新しいバージョン」で再デプロイしてください。',error));
        return;
      }
      finish(reject,battleCreateApiError(battleClassifyFailure(error),raw||'つうしんできなかったよ',error));
    };
    try{
      TowerBattleTransport.call(method,args,{timeoutMs}).then(onSuccess).catch(onFailure);
    }catch(error){onFailure(error);}
  });
}
async function battleExecuteWithRetry(executor,{method='unknown',maxRetries=3,onRetry=null,onRecovered=null,shouldContinue=null}={}) {
  let firstError=null;
  let retriesUsed=0;
  for(let attempt=0;;attempt++){
    if(shouldContinue && !shouldContinue()){
      const cancelled=battleCreateApiError('CLIENT_CANCELLED','通信処理を中止しました');
      cancelled.retryCount=retriesUsed;
      throw cancelled;
    }
    try{
      const result=await executor(attempt);
      if(shouldContinue && !shouldContinue()){
        const cancelled=battleCreateApiError('CLIENT_CANCELLED','古い通信結果を破棄しました');
        cancelled.retryCount=retriesUsed;
        throw cancelled;
      }
      if(retriesUsed>0&&onRecovered) onRecovered({attempt:retriesUsed,error:firstError,result});
      return result;
    }catch(error){
      if(!firstError) firstError=error;
      error.retryCount=retriesUsed;
      const canRetry=retriesUsed<maxRetries&&battleShouldRetry(error)&&(typeof navigator==='undefined'||navigator.onLine!==false)&&(!shouldContinue||shouldContinue());
      if(!canRetry) throw error;
      const delay=battleRetryDelay(retriesUsed,error);
      error.retryDelayMs=delay;
      retriesUsed++;
      if(onRetry) onRetry({attempt:retriesUsed,error,delay,method});
      await battleSleep(delay,shouldContinue);
    }
  }
}
function battleSetLoadingMessage(message){const label=document.getElementById('battle-loading-label');if(label)label.textContent=message;}
function battleHandleApiRetry(method,info){
  if(method==='syncBattle'){
    battleState.reconnecting=true;
    battleShowNetworkStatus('reconnecting','つうしんを つなぎなおしているよ');
  }else{
    battleSetLoadingMessage('つうしんを つなぎなおしているよ');
  }
}
function battleHandleApiRecovered(method,info){
  if(method==='syncBattle'){
    battleState.reconnecting=false;
    battleShowNetworkStatus('connected','つながったよ！',800);
  }
  if(info&&info.error) battleQueueClientDiagnostic(method,info.error,info.attempt,'自動再試行で復旧');
}
function battleUserMessage(error,fallback='つうしんできなかったよ'){
  const code=battleClassifyFailure(error);
  const map={
    NOT_FINISHED:'まだ しょうぶの とちゅうだよ',
    NOT_READY:'みんなの じゅんびを まってね',
    NOT_WAITING:'いまは じゅんびを かえられないよ',
    ROOM_NOT_FOUND:'へやが みつからなかったよ',
    CHARACTER_TAKEN:'そのキャラクターは ほかの人が つかっているよ',
    CHARACTER_ALREADY_USED:'そのキャラクターは ほかの人が つかっているよ',
    ROOM_FULL:'このへやは いっぱいだよ',
    INVALID_PIN:'へやの ばんごうを たしかめてね',
    SESSION_EXPIRED:'たいせんから はずれたよ。つぎの たいせんに さんかしてね',
    CLIENT_OFFLINE:'ネットにつながっていないみたい',
    LOCK_BUSY:'つうしんが こんでいるよ。もういちど ためすね',
    LOCK_TIMEOUT:'つうしんが こんでいるよ。もういちど ためすね'
  };
  return map[code] || String(error&&error.message||fallback);
}
function battleIsRequestCurrent(generation,tokenAtStart,method){
  if(method==='reportBattleClientDiagnostics') return true;
  if(Number(generation)!==Number(battleState.sessionGeneration)) return false;
  if(BATTLE_SESSION_METHODS.has(method) && tokenAtStart && tokenAtStart!==battleState.token) return false;
  return !battleState.sessionInvalidHandled&&!battleState.sessionExpiredHandled;
}
function battleHandleSessionInvalid(error){
  if(battleState.sessionInvalidHandled) return;
  const message=battleUserMessage(error,'へやとの つながりが きれたよ');
  battleState.sessionInvalidHandled=true;
  battleResetState(false,{preserveSessionInvalidHandled:true});
  battleState.sessionInvalidHandled=true;
  stopCurrentGame();
  showScreen('battleMenu');
  battleHydrateImages();
  battleShowError('battle-menu-message',`${message}　もういちど へやを えらんでね`);
}

function battleHandleSessionExpired(error){
  if(battleState.sessionExpiredHandled) return;
  const message=battleUserMessage(error,'たいせんから はずれたよ。つぎの たいせんに さんかしてね');
  battleState.sessionExpiredHandled=true;
  battleResetState(false,{preserveSessionExpiredHandled:true});
  battleState.sessionExpiredHandled=true;
  stopCurrentGame();
  showScreen('battleMenu');
  battleHydrateImages();
  battleShowError('battle-menu-message',message);
}
function battleHandleActionError(error,targetId=null){
  const code=battleClassifyFailure(error);
  if(code==='CLIENT_CANCELLED'||code==='SESSION_INVALID'||code==='SESSION_EXPIRED') return;
  const message=battleUserMessage(error);
  if(targetId) battleShowError(targetId,message);
  else alert(message);
}
async function battleRunSingleAction(key,action){
  if(battleState.actionInFlight[key]) return null;
  const generation=battleState.sessionGeneration;
  battleState.actionInFlight[key]=true;
  try{return await action();}
  finally{
    if(generation===battleState.sessionGeneration) delete battleState.actionInFlight[key];
  }
}
async function battleApi(method,...args){
  const requestId=method==='reportBattleClientDiagnostics'?'':battleUuid();
  const timeoutMs=method==='syncBattle'?BATTLE_DIAGNOSTIC_CONFIG.syncTimeoutMs:BATTLE_DIAGNOSTIC_CONFIG.actionTimeoutMs;
  const maxRetries=method==='reportBattleClientDiagnostics'?0:3;
  const startedAt=performance.now();
  const generation=battleState.sessionGeneration;
  const tokenAtStart=BATTLE_SESSION_METHODS.has(method)?String(args[0]||''):'';
  let retriesUsed=0;
  const shouldContinue=()=>battleIsRequestCurrent(generation,tokenAtStart,method);
  try{
    const result=await battleExecuteWithRetry(
      attempt=>battleApiOnce(method,battleBuildAttemptArgs(method,args,requestId,attempt),timeoutMs),
      {method,maxRetries,shouldContinue,onRetry:info=>{retriesUsed=info.attempt;battleHandleApiRetry(method,info);},onRecovered:info=>{
        retriesUsed=info&&Number(info.attempt)||retriesUsed;
        if(info&&info.error){info.error.requestId=requestId;info.error.totalMs=Math.round(performance.now()-startedAt);info.error.retryCount=retriesUsed;}
        battleHandleApiRecovered(method,info);
      }}
    );
    if(!shouldContinue()) throw battleCreateApiError('CLIENT_CANCELLED','古い通信結果を破棄しました');
    if(method!=='reportBattleClientDiagnostics') battleScheduleDiagnosticFlush();
    return result;
  }catch(error){
    error.requestId=requestId;
    error.totalMs=Math.round(performance.now()-startedAt);
    error.retryCount=Number.isFinite(Number(error.retryCount))?Number(error.retryCount):retriesUsed;
    const code=battleClassifyFailure(error);
    const current=shouldContinue();
    if(method!=='reportBattleClientDiagnostics'&&code!=='CLIENT_CANCELLED'&&current) battleQueueClientDiagnostic(method,error,error.retryCount,'最終失敗');
    if(code==='SESSION_INVALID'&&current) battleHandleSessionInvalid(error);
    if(code==='SESSION_EXPIRED'&&current) battleHandleSessionExpired(error);
    throw error;
  }
}
function battleResultOrThrow(result){
  if(!result||result.ok===false) throw battleCreateApiError(battleNormalizeApiCode(result&&(result.errorCode||result.code)),(result&&result.message)||'つうしんできなかったよ',result,result&&typeof result.retryable==='boolean'?result.retryable:null);
  return result;
}
function battleReadDiagnosticQueue(){
  try{const parsed=JSON.parse(localStorage.getItem(BATTLE_CLIENT_DIAG_KEY)||'[]');return Array.isArray(parsed)?parsed.slice(-BATTLE_DIAGNOSTIC_CONFIG.clientLogQueueMax):[];}catch(e){return [];}
}
function battleWriteDiagnosticQueue(queue){
  try{localStorage.setItem(BATTLE_CLIENT_DIAG_KEY,JSON.stringify((queue||[]).slice(-BATTLE_DIAGNOSTIC_CONFIG.clientLogQueueMax)));}catch(e){}
}
function battleQueueClientDiagnostic(method,error,retryCount=0,note=''){
  if(!BATTLE_DIAGNOSTIC_CONFIG.enabled) return;
  const code=battleClassifyFailure(error);
  if(code==='CLIENT_CANCELLED') return;
  const queue=battleReadDiagnosticQueue();
  const now=Date.now();
  const eventDetail=(code==='DUPLICATE_ATTACK_EVENT'||code==='STALE_ATTACK_EVENT')?String(note||'').slice(-24):'';
  const signature=`${method}|${code}|${battleRoomAnon()}|${eventDetail}`;
  const duplicateWindow=code==='DUPLICATE_ATTACK_EVENT'?BATTLE_DIAGNOSTIC_CONFIG.duplicateAttackLogSuppressMs:BATTLE_DIAGNOSTIC_CONFIG.duplicateClientLogWindowMs;
  const recent=queue.find(item=>item.signature===signature&&now-Number(item.lastAt||item.timestamp||0)<duplicateWindow);
  if(recent){
    recent.retryCount=Math.max(Number(recent.retryCount||0),Number(retryCount||0));
    recent.message=`${note?note+': ':''}${String(error&&error.message?error.message:error||'').slice(0,140)}`.slice(0,180);
    recent.occurrenceCount=Number(recent.occurrenceCount||1)+1;
    recent.lastAt=now;
    battleWriteDiagnosticQueue(queue);
    return;
  }
  const meta=battleClientMeta(String(error&&error.requestId||''),retryCount,{syncRequestId:method==='syncBattle'?String(error&&error.requestId||''):''});
  queue.push({
    timestamp:now,lastAt:now,occurrenceCount:1,method:String(method||'unknown').slice(0,40),code,
    message:`${note?note+': ':''}${String(error&&error.message?error.message:error||'').slice(0,140)}`.slice(0,180),
    totalMs:Math.max(0,Number(error&&error.totalMs||0)),retryCount:Number(retryCount)||0,retryable:battleShouldRetry(error),finalFailure:note==='最終失敗',
    battleState:meta.battleState,participantCount:meta.participantCount,
    roomAnon:meta.roomAnon,requestSuffix:String(error&&error.requestId||'').slice(-8),online:meta.online,screenSize:meta.screenSize,appVersion:BATTLE_APP_VERSION,
    sessionGeneration:meta.sessionGeneration,syncRequestId:meta.syncRequestId,
    clientSequence:meta.clientSequence,serverLastClientSequence:meta.serverLastClientSequence,nextExpectedClientSequence:meta.nextExpectedClientSequence,
    sequenceStatus:meta.sequenceStatus,ackTargetCount:meta.ackTargetCount,ackSuccessCount:meta.ackSuccessCount,ackEventIds:eventDetail||meta.ackEventIds,
    sequenceRestoredFromStorage:meta.sequenceRestoredFromStorage,sequenceCorrectedFromServer:meta.sequenceCorrectedFromServer,
    signature
  });
  battleWriteDiagnosticQueue(queue);
}
function battleScheduleDiagnosticFlush(){
  if(battleState.diagnosticFlushTimer||battleState.diagnosticFlushBusy||typeof navigator!=='undefined'&&navigator.onLine===false) return;
  if(!battleReadDiagnosticQueue().length) return;
  battleState.diagnosticFlushTimer=setTimeout(()=>{battleState.diagnosticFlushTimer=null;battleFlushClientDiagnostics();},BATTLE_DIAGNOSTIC_CONFIG.diagnosticFlushDelayMs);
}
async function battleFlushClientDiagnostics(){
  if(battleState.diagnosticFlushBusy||typeof navigator!=='undefined'&&navigator.onLine===false) return;
  const queue=battleReadDiagnosticQueue();if(!queue.length)return;
  const batch=queue.slice(0,20).map(({signature,...item})=>item);
  battleState.diagnosticFlushBusy=true;
  try{
    const result=await battleApiOnce('reportBattleClientDiagnostics',[batch],BATTLE_DIAGNOSTIC_CONFIG.actionTimeoutMs);
    if(result&&result.ok!==false){const latest=battleReadDiagnosticQueue();latest.splice(0,Math.min(batch.length,latest.length));battleWriteDiagnosticQueue(latest);}
  }catch(e){}finally{battleState.diagnosticFlushBusy=false;}
}
function battleShowNetworkStatus(kind,message,duration=0){
  const box=document.getElementById('battle-network-status');
  const icon=document.getElementById('battle-network-status-icon');
  const label=document.getElementById('battle-network-status-label');
  if(!box)return;
  if(battleState.networkStatusTimer){clearTimeout(battleState.networkStatusTimer);battleState.networkStatusTimer=null;}
  box.className=`battle-network-status ${kind||'reconnecting'}`;
  if(icon) icon.textContent=kind==='connected'?'✓':(kind==='offline'?'📡':'⏳');
  if(label) label.textContent=message||'つうしんを つなぎなおしているよ';
  box.hidden=false;
  if(duration>0) battleState.networkStatusTimer=setTimeout(()=>battleHideNetworkStatus(),duration);
}
function battleHideNetworkStatus(){
  const box=document.getElementById('battle-network-status');if(box)box.hidden=true;
  if(battleState.networkStatusTimer){clearTimeout(battleState.networkStatusTimer);battleState.networkStatusTimer=null;}
}


const BATTLE_LOCAL_RESUME_KEY = 'tenTowerBattleResumeV211';
const BATTLE_SEQUENCE_STORAGE_PREFIX = 'tenTowerBattleSequenceV213:';

function battleSequenceIdentity(room=battleState.room){
  const me=(room&&Array.isArray(room.players)?room.players.find(p=>p.isMe):null)||battleState.me;
  const roomId=String(room&&room.roomId||battleState.room&&battleState.room.roomId||'');
  const matchId=String(room&&room.matchId||battleState.matchId||'');
  const playerId=String(me&&me.playerId||'');
  if(!roomId||!matchId||!playerId)return null;
  return {roomId,matchId,playerId};
}
function battleSequenceStorageKey(room=battleState.room){
  const id=battleSequenceIdentity(room);if(!id)return '';
  return BATTLE_SEQUENCE_STORAGE_PREFIX+[BATTLE_DIAGNOSTIC_CONFIG.sequenceStorageVersion,id.roomId,id.matchId,id.playerId].map(v=>encodeURIComponent(String(v))).join(':');
}
function battleReadStoredClientSequence(room=battleState.room){
  if(!BATTLE_DIAGNOSTIC_CONFIG.sequenceStorageEnabled)return 0;
  const key=battleSequenceStorageKey(room);if(!key)return 0;
  try{
    const record=JSON.parse(localStorage.getItem(key)||'null');
    if(!record||Date.now()-Number(record.savedAt||0)>BATTLE_DIAGNOSTIC_CONFIG.sequenceStorageTtlMs){localStorage.removeItem(key);return 0;}
    return Math.max(0,Number(record.lastClientSequence)||0);
  }catch(e){return 0;}
}
function battlePersistClientSequence(room=battleState.room){
  if(!BATTLE_DIAGNOSTIC_CONFIG.sequenceStorageEnabled)return;
  const key=battleSequenceStorageKey(room);if(!key)return;
  try{localStorage.setItem(key,JSON.stringify({lastClientSequence:Math.max(0,Number(battleState.clientSequence)||0),savedAt:Date.now()}));}catch(e){}
}
function battleClearCurrentSequenceStorage(){
  const key=battleSequenceStorageKey();if(!key)return;
  try{localStorage.removeItem(key);}catch(e){}
}
function battleReconcileClientSequence(serverLast,nextExpected,source='server'){
  const server=Math.max(0,Number(serverLast)||0);
  const expected=Math.max(1,Number(nextExpected)||server+1);
  const stored=battleReadStoredClientSequence();
  const before=Math.max(0,Number(battleState.clientSequence)||0);
  const corrected=Math.max(before,stored,server,expected-1);
  battleState.serverLastClientSequence=server;
  battleState.nextExpectedClientSequence=Math.max(expected,server+1);
  battleState.sequenceRestoredFromStorage=battleState.sequenceRestoredFromStorage||stored>before;
  battleState.sequenceCorrectedFromServer=battleState.sequenceCorrectedFromServer||server>Math.max(before,stored);
  if(corrected!==before){
    battleState.clientSequence=corrected;
    battlePersistClientSequence();
    const error=battleCreateApiError(source==='storage'?'CLIENT_SEQUENCE_RESTORED':'CLIENT_SEQUENCE_CORRECTED','通信番号を安全な値へ合わせました');
    battleQueueClientDiagnostic('clientSequence',error,0,source);
  }
  return corrected;
}
function battleQueueAck(eventId){
  const id=String(eventId||'');if(!id)return;
  if(!battleState.pendingAcks.includes(id))battleState.pendingAcks.push(id);
  if(battleState.pendingAcks.length>BATTLE_DIAGNOSTIC_CONFIG.ackMaxIdsPerSync*3)battleState.pendingAcks=battleState.pendingAcks.slice(-BATTLE_DIAGNOSTIC_CONFIG.ackMaxIdsPerSync*3);
}
function battleResolvePendingAcks(ids){
  const resolved=new Set((Array.isArray(ids)?ids:[]).map(String));
  if(!resolved.size)return;
  battleState.pendingAcks=battleState.pendingAcks.filter(id=>!resolved.has(String(id)));
}
function battlePruneReceivedAttackIds(now=Date.now()){
  const ttl=BATTLE_DIAGNOSTIC_CONFIG.receivedAttackIdTtlMs;
  for(const [id,at] of battleState.seenAttackAt.entries()){
    if(now-Number(at||0)>ttl){battleState.seenAttackAt.delete(id);battleState.seenAttackIds.delete(id);}
  }
  const entries=[...battleState.seenAttackAt.entries()].sort((a,b)=>a[1]-b[1]);
  const excess=entries.length-BATTLE_DIAGNOSTIC_CONFIG.receivedAttackIdMaxCount;
  for(let i=0;i<excess;i++){battleState.seenAttackAt.delete(entries[i][0]);battleState.seenAttackIds.delete(entries[i][0]);}
}
function battleRememberAttackId(eventId,at=Date.now()){
  const id=String(eventId||'');if(!id)return false;
  battlePruneReceivedAttackIds(at);
  const existed=battleState.seenAttackIds.has(id);
  battleState.seenAttackIds.add(id);battleState.seenAttackAt.set(id,at);
  battlePruneReceivedAttackIds(at);
  return !existed;
}
function battleExportReceivedAttackRecords(){
  battlePruneReceivedAttackIds();
  return [...battleState.seenAttackAt.entries()].sort((a,b)=>a[1]-b[1]).slice(-BATTLE_DIAGNOSTIC_CONFIG.receivedAttackIdMaxCount).map(([eventId,receivedAt])=>({eventId,receivedAt}));
}
function battleSerializeBlock(obj){if(!obj)return null;return {kind:isStarBlock(obj)?'star':'number',val:isStarBlock(obj)?null:Number(obj.val),recentGarbage:!!obj.recentGarbage,garbageBatchId:obj.garbageBatchId||''};}
function battleBuildClientState(){
  if(!isBattleMode()||!battleState.matchId||animating||starEffectActive)return null;
  const special=exportSpecialBattleState();
  return {...special,matchId:battleState.matchId,sequenceIndex:battleState.sequenceIndex,bricks,tenCount,bestChain,completedTowers,towerStage,
    garbageQueue:battleState.garbageQueue.slice(0,30).map(x=>({value:Number(x.value),eventId:String(x.eventId||''),senderCharacterId:String(x.senderCharacterId||'')})),
    garbageWarningQueue:battleState.garbageWarningQueue.slice(0,30).map(x=>({value:Number(x.value),eventId:String(x.eventId||''),senderCharacterId:String(x.senderCharacterId||'')})),
    garbageWarningRemainingMs:Math.max(0,Math.round(battleGarbageWarningRemaining())),
    clientSequence:Math.max(0,Number(battleState.clientSequence)||0),
    pendingAcks:battleState.pendingAcks.slice(0,BATTLE_DIAGNOSTIC_CONFIG.ackMaxIdsPerSync*3).map(String),
    receivedAttackRecords:battleExportReceivedAttackRecords(),
    seenAttackIds:Array.from(battleState.seenAttackIds).slice(-BATTLE_DIAGNOSTIC_CONFIG.receivedAttackIdMaxCount)};
}
function battlePersistLocalSnapshot(){
  if(!battleState.token||!battleState.matchId||!isBattleMode())return;
  try{const state=battleBuildClientState();if(!state)return;const record={token:battleState.token,matchId:battleState.matchId,savedAt:Date.now(),state};localStorage.setItem(BATTLE_LOCAL_RESUME_KEY,JSON.stringify(record));battleState.lastClientStateSavedAt=record.savedAt;}catch(e){}
}
function battleReadLocalSnapshot(){try{const record=JSON.parse(localStorage.getItem(BATTLE_LOCAL_RESUME_KEY)||'null');if(!record||!record.token||Date.now()-Number(record.savedAt||0)>BATTLE_DIAGNOSTIC_CONFIG.localResumeTtlMs)return null;return record;}catch(e){return null;}}
function battleClearLocalSnapshot(){try{localStorage.removeItem(BATTLE_LOCAL_RESUME_KEY);}catch(e){}}
function battleRestoreClientState(state,room){
  if(!state||state.matchId!==room.matchId){if(state)battleQueueClientDiagnostic('clientStateRestore',battleCreateApiError('CLIENT_STATE_MATCH_MISMATCH','ふっきデータのたいせんが一致しません'),0,'復帰状態を破棄');return false;}
  const ok=importSpecialBattleState(state);if(!ok){battleQueueClientDiagnostic('clientStateRestore',battleCreateApiError('CLIENT_STATE_RESTORE_FAILED','ふっきデータを読みこめませんでした'),0,'復帰状態を破棄');return false;}
  bricks=Math.max(0,Number(state.bricks)||0);tenCount=Math.max(0,Number(state.tenCount)||0);bestChain=Math.max(0,Number(state.bestChain)||0);completedTowers=Math.max(0,Number(state.completedTowers)||0);towerStage=Math.max(0,Number(state.towerStage)||0);
  battleState.sequenceIndex=Math.max(0,Number(state.sequenceIndex)||0);battleState.rng=mulberry32(Number(room.randomSeed)||1);for(let i=0;i<battleState.sequenceIndex;i++)battleState.rng();
  battleState.garbageQueue=(state.garbageQueue||[]).map(x=>({value:Number(x.value),eventId:String(x.eventId||''),senderCharacterId:String(x.senderCharacterId||'')}));
  battleState.garbageWarningQueue=(state.garbageWarningQueue||[]).map(x=>({value:Number(x.value),eventId:String(x.eventId||''),senderCharacterId:String(x.senderCharacterId||'')}));
  battleState.garbageWarningRemainingMs=Math.max(0,Number(state.garbageWarningRemainingMs)||0);
  const receivedRecords=Array.isArray(state.receivedAttackRecords)?state.receivedAttackRecords:[];
  battleState.seenAttackIds=new Set((state.seenAttackIds||receivedRecords.map(x=>x&&x.eventId)||[]).map(String));
  battleState.seenAttackAt=new Map();
  receivedRecords.forEach(x=>{if(x&&x.eventId)battleState.seenAttackAt.set(String(x.eventId),Number(x.receivedAt)||Date.now());});
  battleState.seenAttackIds.forEach(id=>{if(!battleState.seenAttackAt.has(id))battleState.seenAttackAt.set(id,Date.now());});
  battleState.pendingAcks=[...new Set((state.pendingAcks||[]).map(String).filter(Boolean))].slice(0,BATTLE_DIAGNOSTIC_CONFIG.ackMaxIdsPerSync*3);
  battleState.clientSequence=Math.max(Number(battleState.clientSequence)||0,Number(state.clientSequence)||0,battleReadStoredClientSequence(room));
  battlePersistClientSequence(room);
  battleState.restoredClientState=true;updateTower();updateInfoPanels();updateBoardUI();battleUpdateLocalStats();if(battleState.garbageWarningQueue.length)battleStartGarbageWarning(true);return true;
}
function battleGarbageWarningRemaining(){
  if(!battleState.garbageWarningActive)return Math.max(0,battleState.garbageWarningRemainingMs||0);
  return Math.max(0,battleState.garbageWarningRemainingMs-(performance.now()-battleState.garbageWarningStartedAt));
}
function battleUpdateGarbageWarningUI(){
  const box=document.getElementById('battle-garbage-warning'),text=document.getElementById('battle-garbage-warning-text'),bar=document.getElementById('battle-garbage-warning-bar');if(!box)return;
  const count=battleState.garbageWarningQueue.length;if(!count){box.hidden=true;box.classList.remove('urgent');return;}
  const remaining=battleGarbageWarningRemaining();const base=Math.max(1,BATTLE_DIAGNOSTIC_CONFIG.garbageWarningMs);if(text)text.textContent=remaining<650?`おじゃま ${count}こ　くるよ！`:`おじゃま ${count}こ くるよ！`;if(bar)bar.style.transform=`scaleX(${Math.max(0,Math.min(1,remaining/base))})`;box.classList.toggle('urgent',remaining<800);box.hidden=false;
}
function battlePauseGarbageWarning(){if(!battleState.garbageWarningActive)return;battleState.garbageWarningRemainingMs=battleGarbageWarningRemaining();battleState.garbageWarningActive=false;if(battleState.garbageWarningRaf)cancelAnimationFrame(battleState.garbageWarningRaf);battleState.garbageWarningRaf=null;battleUpdateGarbageWarningUI();battlePersistLocalSnapshot();}
function battleResumeGarbageWarning(){if(!battleState.garbageWarningQueue.length)return;battleState.garbageWarningRemainingMs=Math.max(BATTLE_DIAGNOSTIC_CONFIG.garbageWarningResumeMinimumMs,battleState.garbageWarningRemainingMs||0);battleStartGarbageWarning(true);}
function battleStartGarbageWarning(resume=false){
  if(!battleState.garbageWarningQueue.length)return;
  if(battleState.garbageWarningActive){const remaining=battleGarbageWarningRemaining();if(remaining<BATTLE_DIAGNOSTIC_CONFIG.garbageWarningMinExtensionMs)battleState.garbageWarningRemainingMs=Math.min(BATTLE_DIAGNOSTIC_CONFIG.garbageWarningMaxTotalMs,BATTLE_DIAGNOSTIC_CONFIG.garbageWarningMinExtensionMs),battleState.garbageWarningStartedAt=performance.now();battleUpdateGarbageWarningUI();return;}
  battleState.garbageWarningRemainingMs=resume&&battleState.garbageWarningRemainingMs>0?battleState.garbageWarningRemainingMs:BATTLE_DIAGNOSTIC_CONFIG.garbageWarningMs;
  battleState.garbageWarningStartedAt=performance.now();battleState.garbageWarningActive=true;
  const tick=()=>{if(!battleState.garbageWarningActive)return;if(document.visibilityState==='hidden'||battleState.offline||battleState.networkPaused||paused||resumeCountdownActive){battlePauseGarbageWarning();return;}battleUpdateGarbageWarningUI();if(battleGarbageWarningRemaining()<=0){battleFinishGarbageWarning();return;}battleState.garbageWarningRaf=requestAnimationFrame(tick);};
  battleState.garbageWarningRaf=requestAnimationFrame(tick);battleUpdateGarbageWarningUI();battlePersistLocalSnapshot();
}
function battleFinishGarbageWarning(){
  if(battleState.garbageWarningRaf)cancelAnimationFrame(battleState.garbageWarningRaf);battleState.garbageWarningRaf=null;battleState.garbageWarningActive=false;battleState.garbageWarningRemainingMs=0;
  battleState.garbageQueue.push(...battleState.garbageWarningQueue.splice(0));battleUpdateGarbageWarningUI();battleUpdateLocalStats();battlePersistLocalSnapshot();
  if(!fallingPiece&&!animating&&!paused&&battleState.garbageQueue.length)battleProcessGarbageBatch();
}
function battleClearGarbageWarning(){if(battleState.garbageWarningRaf)cancelAnimationFrame(battleState.garbageWarningRaf);battleState.garbageWarningRaf=null;battleState.garbageWarningActive=false;battleState.garbageWarningRemainingMs=0;battleState.garbageWarningQueue=[];battleUpdateGarbageWarningUI();}

function battleStoreSession() {
  try {
    if (battleState.token) { sessionStorage.setItem('tenTowerBattleToken', battleState.token); localStorage.setItem('tenTowerBattleTokenV211', JSON.stringify({token:battleState.token,savedAt:Date.now()})); }
    else { sessionStorage.removeItem('tenTowerBattleToken'); localStorage.removeItem('tenTowerBattleTokenV211'); battleClearLocalSnapshot(); }
  } catch (e) {}
}
function battleServerNow() { return Date.now() + battleState.serverOffset; }
function battleUpdateOffset(serverNow) {
  if (Number.isFinite(Number(serverNow))) battleState.serverOffset = Number(serverNow) - Date.now();
}
function battleClearTimers() {
  if (battleState.syncTimer) clearTimeout(battleState.syncTimer);
  if (battleState.timerLoop) clearInterval(battleState.timerLoop);
  if (battleState.countdownLoop) clearInterval(battleState.countdownLoop);
  if (battleState.countdownFinishTimer) clearTimeout(battleState.countdownFinishTimer);
  if (battleState.resumeTimer) clearTimeout(battleState.resumeTimer);
  if (battleState.attackToastTimer) clearTimeout(battleState.attackToastTimer);
  if (battleState.networkStatusTimer) clearTimeout(battleState.networkStatusTimer);
  if (battleState.diagnosticFlushTimer) clearTimeout(battleState.diagnosticFlushTimer);
  if (battleState.roomNoticeTimer) clearTimeout(battleState.roomNoticeTimer);
  battlePauseGarbageWarning();
  battleCancelRetryWaits();
  battleClearLoadingDelayTimers();
  battleState.syncTimer = battleState.timerLoop = battleState.countdownLoop = battleState.countdownFinishTimer = battleState.resumeTimer = battleState.attackToastTimer = battleState.networkStatusTimer = battleState.diagnosticFlushTimer = battleState.roomNoticeTimer = null;
  battleState.countdownActive = false;
  battleState.countdownTargetAt = 0;
  battleState.countdownType = null;
}
function battleResetState(keepToken=false,options={}) {
  const preserveInvalid=!!(options&&options.preserveSessionInvalidHandled);
  const preserveExpired=!!(options&&options.preserveSessionExpiredHandled);
  battleClearCurrentSequenceStorage();
  battleState.sessionGeneration=(Number(battleState.sessionGeneration)||0)+1;
  battleClearTimers();
  const token = keepToken ? battleState.token : null;
  battleState.token=token; battleState.room=null; battleState.me=null; battleState.pinInput=''; battleState.syncBusy=false;
  battleState.matchId=null; battleState.preparedMatchId=null; battleState.serverOffset=0; battleState.remainingMs=BATTLE_MATCH_MS;
  battleState.remainingSnapshotAt=0; battleState.remainingRunning=false; battleState.rng=null; battleState.sequenceIndex=0; battleState.clientSequence=0;
  battleState.serverLastClientSequence=0; battleState.nextExpectedClientSequence=1; battleState.sequenceRestoredFromStorage=false; battleState.sequenceCorrectedFromServer=false;
  battleState.pendingMoves=[]; battleState.pendingAcks=[]; battleState.seenAttackIds=new Set(); battleState.seenAttackAt=new Map(); battleState.garbageQueue=[]; battleClearGarbageWarning();
  battleState.garbageBatchActive=false; battleState.resolutionOrigin='playerMove'; battleState.sentGarbage=0;
  battleState.eliminated=false; battleState.timeExpired=false; battleState.finalized=false; battleState.networkPaused=false;
  battleState.localSpeedLevel=0; battleState.lastRoomStatus=null;
  battleState.countdownActive=false; battleState.countdownTargetAt=0; battleState.countdownType=null; battleState.countdownFinishTimer=null; battleState.countdownCompletedKey=null;
  battleState.firstGarbageTipShown=false; battleState.recentGarbageBatchSeq=0;
  battleState.consecutiveSyncFailures=0; battleState.reconnecting=false; battleState.offline=typeof navigator!=='undefined'?!navigator.onLine:false; battleState.diagnosticFlushBusy=false; battleState.lastSuccessfulSyncAt=0; battleState.resultMayBeInaccurate=false;
  battleState.sessionInvalidHandled=preserveInvalid;
  battleState.sessionExpiredHandled=preserveExpired;
  battleState.syncRequestSerial=0; battleState.latestAppliedSyncSerial=0; battleState.actionInFlight=Object.create(null);
  battleState.seenSystemEventIds=new Set(); battleState.roomNotice=''; battleState.roomNoticeUntil=0; battleState.lastHostPlayerId=null; battleState.pageHiddenAt=0; battleState.connectionConfig=null; battleState.restoredClientState=false; battleState.lastClientStateSavedAt=0;
  battleStoreSession();
  const attack=document.getElementById('battle-attack-toast'); if(attack) attack.hidden=true;
  const garbageTip=document.getElementById('battle-garbage-tip'); if(garbageTip) garbageTip.hidden=true;
  const connect=document.getElementById('battle-connection-overlay'); if(connect) connect.hidden=true;
  battleHideLoading(true);
  battleHideNetworkStatus();
}

function openBattleMenu() {
  requestGameFullscreen();
  stopCurrentGame();
  const oldToken=battleState.token;
  battleResetState(false);
  battleShowError('battle-menu-message','');
  showScreen('battleMenu');
  battleHydrateImages();
  if(oldToken) battleLeaveSilently(oldToken);
}
function battleBackToModes() { battleResetState(false); showScreen('mode'); }
function openBattlePin() {
  battleState.pinInput=''; battleRenderPin();
  const error=document.getElementById('battle-pin-error'); if(error) error.textContent='';
  showScreen('battlePin');
}
function battlePinInput(digit) {
  if (!/^\d$/.test(String(digit)) || battleState.pinInput.length>=4) return;
  battleState.pinInput += digit; battleRenderPin();
}
function battlePinBackspace() { battleState.pinInput=battleState.pinInput.slice(0,-1); battleRenderPin(); }
function battlePinClear() { battleState.pinInput=''; battleRenderPin(); }
function battleRenderPin() {
  const boxes=document.querySelectorAll('#battle-pin-boxes span');
  boxes.forEach((el,i)=>el.textContent=battleState.pinInput[i] || '−');
  const btn=document.getElementById('battle-join-btn'); if(btn) btn.disabled=battleState.pinInput.length!==4;
}
function battleShowError(id, message) { const el=document.getElementById(id); if(el) el.textContent=message === '' ? '' : message || 'つうしんできなかったよ'; }
function battleSetBusy(button, busy, text) {
  if(!button) return; if(!button.dataset.originalText) button.dataset.originalText=button.textContent;
  button.disabled=!!busy; button.textContent=busy?'つうしんちゅう…':button.dataset.originalText;
}

let battleLoadingDepth = 0;
function battleShowLoading(message='つうしんちゅう…') {
  battleLoadingDepth += 1;
  const overlay=document.getElementById('battle-loading-overlay');
  const label=document.getElementById('battle-loading-label');
  if(label) label.textContent=message;
  if(overlay) overlay.hidden=false;
}
function battleHideLoading(force=false) {
  battleLoadingDepth = force ? 0 : Math.max(0, battleLoadingDepth - 1);
  if(battleLoadingDepth > 0) return;
  const overlay=document.getElementById('battle-loading-overlay');
  if(overlay) overlay.hidden=true;
}
async function battleWithLoading(message, action) {
  let shown=false;
  const generation=battleState.sessionGeneration;
  const timer=setTimeout(()=>{
    battleLoadingDelayTimers.delete(timer);
    if(generation!==battleState.sessionGeneration||battleState.sessionInvalidHandled) return;
    shown=true;
    battleShowLoading(message);
  },BATTLE_DIAGNOSTIC_CONFIG.loadingDelayMs);
  battleLoadingDelayTimers.add(timer);
  try { return await action(); }
  finally {
    clearTimeout(timer);
    battleLoadingDelayTimers.delete(timer);
    if(shown) battleHideLoading();
  }
}

async function battleCreateRoom() {
  const btn=window.event && window.event.currentTarget ? window.event.currentTarget : null; battleSetBusy(btn,true);
  battleResetState(false);
  battleShowError('battle-menu-message','');
  try {
    await battleWithLoading('へやを つくっているよ', async()=>{
      const result=battleResultOrThrow(await battleApi('createBattleRoom'));
      battleState.token=result.sessionToken; battleStoreSession(); battleApplyRoom(result.room); battleStartSyncLoop(500);
    });
  } catch(e) { battleHandleActionError(e); }
  finally { battleSetBusy(btn,false); }
}
async function battleJoinRoom() {
  if(battleState.pinInput.length!==4) return;
  const btn=document.getElementById('battle-join-btn'); battleSetBusy(btn,true); battleShowError('battle-pin-error','');
  const pin=battleState.pinInput;
  battleResetState(false);
  try {
    await battleWithLoading('へやを さがしているよ', async()=>{
      const result=battleResultOrThrow(await battleApi('joinBattleRoom', pin));
      battleState.token=result.sessionToken; battleStoreSession(); battleApplyRoom(result.room); battleStartSyncLoop(500);
    });
  } catch(e) { battleHandleActionError(e,'battle-pin-error'); }
  finally { battleSetBusy(btn,false); }
}
async function battleSelectCharacter(characterId) {
  if(!battleState.token) return;
  return battleRunSingleAction('selectCharacter',async()=>{
    try {
      await battleWithLoading('キャラクターを えらんでいるよ', async()=>{
        const r=battleResultOrThrow(await battleApi('selectBattleCharacter',battleState.token,characterId)); battleApplyRoom(r.room);
      });
    } catch(e){ battleHandleActionError(e,'battle-room-message'); }
  });
}
async function battleToggleReady() {
  if(!battleState.me || !battleState.me.characterId || !battleState.token) return;
  return battleRunSingleAction('toggleReady',async()=>{
    try {
      await battleWithLoading('じゅんびを つたえているよ', async()=>{
        const r=battleResultOrThrow(await battleApi('setBattleReady',battleState.token,!battleState.me.ready)); battleApplyRoom(r.room);
      });
    } catch(e){ battleHandleActionError(e,'battle-room-message'); }
  });
}
async function battleStartMatch() {
  const btn=document.getElementById('battle-start-btn'); battleSetBusy(btn,true);
  try {
    await battleRunSingleAction('startMatch',()=>battleWithLoading('たいせんを はじめるよ', async()=>{
      const r=battleResultOrThrow(await battleApi('startBattleMatch',battleState.token)); battleApplyRoom(r.room); battleQueueSync(300);
    }));
  } catch(e){ battleHandleActionError(e,'battle-room-message'); }
  finally { battleSetBusy(btn,false); }
}
async function battleRequestRematch() {
  return battleRunSingleAction('rematch',async()=>{
    try {
      await battleWithLoading('つぎの たいせんを じゅんびしているよ', async()=>{
        const r=battleResultOrThrow(await battleApi('requestBattleRematch',battleState.token)); stopCurrentGame(); battleApplyRoom(r.room); battleStartSyncLoop(500);
      });
    } catch(e){ battleHandleActionError(e); }
  });
}
async function battleLeaveSilently(token=battleState.token) {
  token=String(token||'');
  if(!token) return;
  try{
    const requestId=battleUuid();
    const args=battleBuildAttemptArgs('leaveBattleRoom',[token],requestId,0);
    await battleApiOnce('leaveBattleRoom',args,Math.min(5000,BATTLE_DIAGNOSTIC_CONFIG.actionTimeoutMs));
  }catch(e){}
}
async function battleLeaveToModes() {
  const token=battleState.token;
  battleResetState(false);
  stopCurrentGame();
  showScreen('mode');
  if(token) battleLeaveSilently(token);
}

function battleHydrateImages() {
  document.querySelectorAll('[data-battle-asset]').forEach(img=>{
    const key=img.dataset.battleAsset; const parts=key.split('_'); const pose=parts.pop(); const character=parts.join('_');
    battleSetImage(img,character,pose);
  });
}

function battleShowRoomNotice(message,duration=3500){
  battleState.roomNotice=String(message||'');
  battleState.roomNoticeUntil=Date.now()+Math.max(800,Number(duration)||3500);
  if(battleState.roomNoticeTimer) clearTimeout(battleState.roomNoticeTimer);
  battleState.roomNoticeTimer=setTimeout(()=>{
    battleState.roomNoticeTimer=null;
    battleState.roomNotice='';
    battleState.roomNoticeUntil=0;
    if(battleState.room&&battleState.room.status==='waiting') battleRenderRoom(battleState.room);
  },Math.max(800,Number(duration)||3500));
  if(battleState.room&&battleState.room.status==='waiting'){
    const el=document.getElementById('battle-room-message');
    if(el) el.textContent=battleState.roomNotice;
  }
}

function battleIngestSystemEvents(events){
  const now=battleServerNow();
  (Array.isArray(events)?events:[]).forEach(event=>{
    if(!event||!event.eventId||battleState.seenSystemEventIds.has(event.eventId)) return;
    battleState.seenSystemEventIds.add(event.eventId);
    if(now-Number(event.createdAt||0)>15000) return;
    const isMe=!!(battleState.me&&event.playerId===battleState.me.playerId);
    switch(event.type){
      case 'waiting_auto_leave':
      case 'waiting_left':
        battleShowRoomNotice('ひとり へやから はずれたよ');
        battleQueueClientDiagnostic('connectionEvent',battleCreateApiError('WAITING_AUTO_LEAVE','待機部屋から参加者を整理しました'),0,event.type);
        break;
      case 'host_transferred':
        battleShowRoomNotice(battleState.me&&event.newHostPlayerId===battleState.me.playerId?'あなたが ホストになったよ':'ホストが かわったよ',4200);
        battleQueueClientDiagnostic('connectionEvent',battleCreateApiError('HOST_TRANSFER','ホストを交代しました'),0,'ホスト自動交代');
        break;
      case 'reconnected':
        battleShowNetworkStatus('connected','もどってきたよ',1000);
        battleQueueClientDiagnostic('connectionEvent',battleCreateApiError('RECONNECT_SUCCESS','通信待ちから復帰しました'),0,event.phase||'');
        break;
      case 'battle_disconnected':
        if(!isMe) battleShowNetworkStatus('unstable','ひとり つうしんが きれました',2200);
        battleQueueClientDiagnostic('connectionEvent',battleCreateApiError('BATTLE_DISCONNECTED','対戦参加者の通信切れが確定しました'),0,event.reason||'');
        break;
    }
  });
}

function battleApplyRoom(room) {
  if(!room||battleState.sessionInvalidHandled||battleState.sessionExpiredHandled||!battleState.token) return;
  if(battleState.room&&battleState.room.roomId&&room.roomId&&battleState.room.roomId!==room.roomId) return;
  battleState.room=room; battleUpdateOffset(room.serverNow);
  if(room.connectionConfig&&typeof room.connectionConfig==='object'){
    battleState.connectionConfig=Object.assign({},room.connectionConfig);
  }
  battleState.me=(room.players||[]).find(p=>p.isMe) || battleState.me;
  battleState.matchId=room.matchId || null;
  if(battleState.matchId)battleReconcileClientSequence(room.serverLastClientSequence,room.nextExpectedClientSequence,'room');
  battleIngestSystemEvents(room.systemEvents||[]);
  if(battleState.me) battleState.sentGarbage=Number(battleState.me.sentGarbage||battleState.sentGarbage||0);

  if(room.status==='waiting') {
    if(currentMode==='battle') stopCurrentGame();
    battleRenderRoom(room); showScreen('battleRoom'); battleHydrateImages(); battleStartSyncLoop(); return;
  }
  if(['countdown','playing','paused','finishing'].includes(room.status)) {
    if(room.matchId && battleState.preparedMatchId!==room.matchId) battlePrepareMatch(room);
    battleUpdateBattleHud(room); battleHandleRuntimeStatus(room); if(battleState.eliminated) battleRenderSpectator(room); battleStartSyncLoop(); return;
  }
  if(room.status==='finished') { battleShowResult(room); battleStartSyncLoop(3000); }
}
function battleRenderRoom(room) {
  document.getElementById('battle-room-pin').textContent=room.pin || '0000';
  document.getElementById('battle-room-count').textContent=`${(room.players||[]).length} / 4`;
  const used=new Set((room.players||[]).filter(p=>!p.isMe&&p.characterId).map(p=>p.characterId));
  const grid=document.getElementById('battle-character-grid'); grid.innerHTML='';
  Object.keys(BATTLE_CHARACTER_NAMES).forEach(id=>{
    const card=document.createElement('button'); card.type='button'; card.className='battle-character-card';
    if(used.has(id)) card.classList.add('taken');
    if(battleState.me && battleState.me.characterId===id) card.classList.add('selected');
    card.disabled=used.has(id); card.onclick=()=>battleSelectCharacter(id);
    const img=document.createElement('img'); battleSetImage(img,id,'normal'); img.alt=battleName(id);
    const copy=document.createElement('div'); copy.innerHTML=`<strong>${battleName(id)}</strong><small>${used.has(id)?'えらばれています':'これにする！'}</small>`;
    card.append(img,copy); grid.appendChild(card);
  });
  const slots=document.getElementById('battle-member-slots'); slots.innerHTML='';
  for(let i=0;i<4;i++) {
    const p=room.players[i]; const waiting=!!(p&&(!p.connected||p.connectionState==='waitingReconnect'));
    const slot=document.createElement('div'); slot.className='battle-member-slot'+(p?'':' empty')+(waiting?' waiting':'');
    if(p){
      const img=document.createElement('img'); battleSetImage(img,p.characterId||'pipi','normal'); img.alt='';
      const copy=document.createElement('div'); copy.innerHTML=`<strong>${p.characterId?battleName(p.characterId):'えらんでいるよ'}</strong><span>${p.isHost?'へやを つくったひと':''}</span>`;
      const state=document.createElement('span');
      if(waiting){state.className='member-waiting';state.textContent='つうしん待ち';}
      else{state.className=p.ready?'member-ready':'';state.textContent=p.ready?'じゅんびOK！':'じゅんびちゅう';}
      slot.append(img,copy,state);
    } else {
      const copy=document.createElement('div'); copy.innerHTML='<strong>あいてを</strong><span>まっているよ</span>'; slot.appendChild(copy);
    }
    slots.appendChild(slot);
  }
  const ready=document.getElementById('battle-ready-btn');
  const meWaiting=!!(battleState.me&&(!battleState.me.connected||battleState.me.connectionState==='waitingReconnect'));
  ready.disabled=!(battleState.me&&battleState.me.characterId)||meWaiting;
  ready.textContent=battleState.me&&battleState.me.ready?'じゅんびを なおす':'じゅんびOK！';
  ready.classList.toggle('ready',!!(battleState.me&&battleState.me.ready));
  const isHost=room.hostPlayerId===(battleState.me&&battleState.me.playerId);
  const start=document.getElementById('battle-start-btn'); start.hidden=!isHost;
  const allReady=(room.players||[]).length>=2 && room.players.every(p=>p.connected!==false&&p.connectionState!=='waitingReconnect'&&p.characterId&&p.ready);
  start.disabled=!allReady;
  const waitingCount=(room.players||[]).filter(p=>p.connected===false||p.connectionState==='waitingReconnect').length;
  const notice=battleState.roomNotice&&Date.now()<battleState.roomNoticeUntil?battleState.roomNotice:'';
  document.getElementById('battle-room-message').textContent=notice||(waitingCount?'ひとり つうしんを まっているよ':(allReady?(isHost?'たいせんを はじめられるよ！':'スタートを まってね'):'みんなの じゅんびを まってね'));
}

function mulberry32(seed){ let a=seed>>>0; return function(){ a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}; }
function battleNextNumber(){ battleState.sequenceIndex++; return Math.floor((battleState.rng?battleState.rng():Math.random())*9)+1; }
function battleGetFallInterval(){
  const elapsed=Math.max(0,BATTLE_MATCH_MS-battleCurrentRemaining());
  if(elapsed>=120000) return 900; if(elapsed>=60000) return 1050; return 1200;
}
function battleCanContinue(){ const r=battleState.room; const me=battleState.me; const started=r&&r.status==='countdown'&&!r.pauseState&&battleServerNow()>=Number(r.startAt||Infinity); return !!(me&&me.active!==false&&!me.disconnectedAt&&!battleState.eliminated&&!battleState.timeExpired&&!battleState.networkPaused&&r&&(r.status==='playing'||started)); }

function battlePrepareMatch(room) {
  requestGameFullscreen(); stopCurrentGame(); resetTransientUI(); loadStoredSettings();
  currentMode='battle'; tutorialKind=null; BOARD_COLS=FALLING_COLS; BOARD_ROWS=FALLING_ROWS;
  paused=true; animating=false; gameRunning=true; endingGame=false; resumeCountdownActive=false;
  ++gameSessionToken; board=Array.from({length:BOARD_COLS},()=>[]); bricks=0;tenCount=0;bestChain=0;noTenCounter=0;towerStage=0;completedTowers=0;towerVisualToken++; resetSpecialGameplayState();
  battleState.preparedMatchId=room.matchId; battleState.matchId=room.matchId; battleState.rng=mulberry32(Number(room.randomSeed)||1); battleState.sequenceIndex=0; battleState.clientSequence=0;
  battleState.serverLastClientSequence=Math.max(0,Number(room.serverLastClientSequence)||0);battleState.nextExpectedClientSequence=Math.max(1,Number(room.nextExpectedClientSequence)||battleState.serverLastClientSequence+1);
  battleState.pendingMoves=[];battleState.pendingAcks=[];battleState.seenAttackIds=new Set();battleState.seenAttackAt=new Map();battleState.garbageQueue=[];battleClearGarbageWarning();battleState.garbageBatchActive=false;battleState.resolutionOrigin='playerMove';battleState.eliminated=false;battleState.timeExpired=false;battleState.finalized=false;battleState.networkPaused=false;battleState.localSpeedLevel=0;
  battleState.firstGarbageTipShown=false; battleState.recentGarbageBatchSeq=0;
  battleState.consecutiveSyncFailures=0; battleState.reconnecting=false; battleState.offline=typeof navigator!=='undefined'?!navigator.onLine:false; battleState.diagnosticFlushBusy=false; battleState.lastSuccessfulSyncAt=0; battleState.resultMayBeInaccurate=false; battleState.countdownCompletedKey=null;
  numbersQueue=[makeNumberObject(),makeNumberObject(),makeNumberObject()]; fallingPiece=null;
  const localRecord=battleReadLocalSnapshot(); const localState=localRecord&&localRecord.token===battleState.token&&localRecord.matchId===room.matchId?localRecord.state:null; const serverState=room.resumeState||null; const chosenState=localState&&Number(localState.savedAt||0)>=Number(serverState&&serverState.savedAt||0)?localState:serverState;
  if(chosenState) battleRestoreClientState(chosenState,room);
  battleReconcileClientSequence(room.serverLastClientSequence,room.nextExpectedClientSequence,chosenState?'resume':'server');
  const game=document.getElementById('game-screen'); game.classList.add('falling-mode','battle-mode'); game.classList.remove('tutorial-mode');
  updateActionControlVisibility(); document.getElementById('timer-item').style.display='flex'; document.getElementById('board-caption').textContent='◀ ▶で うごかそう！';
  document.getElementById('battle-hud').hidden=false; document.getElementById('battle-opponents').hidden=false; document.getElementById('pause-btn').style.display='none';
  showScreen('game'); renderBoard(); updateTower(); updateInfoPanels(); updateFallingControls(); battleUpdateBattleHud(room); hidePauseLayers();
  if(window.BGMController) BGMController.prepareBattleMatch(room.matchId);
  battleState.remainingMs=Number(room.remainingMs)||BATTLE_MATCH_MS; battleState.remainingSnapshotAt=performance.now(); battleState.remainingRunning=false;
  battleStartTimerLoop(); battleShowCountdown({targetTime:room.startAt,type:'start'});
}
function battleCancelCountdown(hideOverlay=true) {
  if (battleState.countdownLoop) clearInterval(battleState.countdownLoop);
  if (battleState.countdownFinishTimer) clearTimeout(battleState.countdownFinishTimer);
  battleState.countdownLoop=null; battleState.countdownFinishTimer=null;
  battleState.countdownActive=false; battleState.countdownTargetAt=0; battleState.countdownType=null;
  const overlay=document.getElementById('countdown-overlay');
  const text=document.getElementById('countdown-text');
  if(text) text.classList.remove('start-label');
  if(overlay&&hideOverlay) overlay.hidden=true;
}
function battleShowCountdown({targetTime,type='start'}={}) {
  const target=Number(targetTime);
  if(!Number.isFinite(target)) return;
  const countdownKey=`${type}:${target}`;
  if(battleState.countdownCompletedKey===countdownKey) return;
  if(battleState.countdownActive && battleState.countdownTargetAt===target && battleState.countdownType===type) return;
  battleCancelCountdown(false);
  paused=true; battleState.remainingRunning=false; clearFallingTimers(); updateFallingControls();
  if(window.BGMController) BGMController.pauseForGame(type==='resume'?'battle-resume-countdown':'battle-start-countdown');
  const overlay=document.getElementById('countdown-overlay');
  const text=document.getElementById('countdown-text');
  if(overlay) overlay.hidden=false;
  battleState.countdownActive=true; battleState.countdownTargetAt=target; battleState.countdownType=type;
  const session=gameSessionToken;
  const isResume=type==='resume';
  function finishStartLabel(delay=420){
    if(!battleState.countdownActive || battleState.countdownFinishTimer) return;
    if(battleState.countdownLoop) clearInterval(battleState.countdownLoop);
    battleState.countdownLoop=null;
    if(text){text.textContent='スタート！';text.classList.add('start-label');}
    battleState.countdownFinishTimer=setTimeout(()=>{
      if(session!==gameSessionToken) return;
      battleState.countdownCompletedKey=countdownKey;
      battleCancelCountdown(true);
      battleBeginPlay(isResume);
    },delay);
  }
  function tick(){
    if(session!==gameSessionToken){battleCancelCountdown(true);return;}
    const diff=target-battleServerNow();
    if(diff<=0){
      // 大きく遅れて状態を受け取った端末は、安全に即時開始する。
      if(diff < -900){battleState.countdownCompletedKey=countdownKey;battleCancelCountdown(true);battleBeginPlay(isResume);return;}
      finishStartLabel(420); return;
    }
    const n=Math.min(3,Math.max(1,Math.ceil(diff/1000)));
    if(text){text.classList.remove('start-label');text.textContent=String(n);}
  }
  tick();
  if(battleState.countdownActive && !battleState.countdownFinishTimer) battleState.countdownLoop=setInterval(tick,100);
}
function battleBeginPlay(isResume) {
  if(battleState.eliminated||battleState.timeExpired) return;
  battleState.networkPaused=false; paused=false; battleState.remainingSnapshotAt=performance.now(); battleState.remainingRunning=true;
  document.getElementById('battle-connection-overlay').hidden=true; updateFallingControls(); battleResumeGarbageWarning();
  if(window.BGMController) BGMController.syncBattle(battleCurrentRemaining(),{reason:isResume?'resume':'start',force:!!isResume});
  if(isResume&&fallingPiece){ if(canFall()){fallingPiece.phase='falling';scheduleFallingStep(Math.min(450,getPieceFallInterval()));}else beginLockDelay(); }
  else if(!fallingPiece&&!animating) scheduleSpawn(100);
}
function battleHandleRuntimeStatus(room) {
  const me=(room.players||[]).find(p=>p.isMe);
  if(me&&(me.active===false||me.disconnectedAt)){
    battleHandleSessionExpired(battleCreateApiError('SESSION_EXPIRED','たいせんから はずれたよ。つぎの たいせんに さんかしてね'));
    return;
  }
  battleState.remainingMs=Number(room.remainingMs)||0; battleState.remainingSnapshotAt=performance.now();
  battleState.remainingRunning=room.status==='playing'&&!battleState.timeExpired&&!battleState.countdownActive;
  if(room.status==='paused'){ battlePauseForNetwork(room); }
  else if(room.status==='countdown'&&room.pauseState&&room.pauseState.kind==='resuming'){
    battlePauseForNetwork(room); battleShowCountdown({targetTime:room.resumeAt,type:'resume'});
  }
  else if(room.status==='countdown'&&!room.pauseState){
    battleShowCountdown({targetTime:room.startAt,type:'start'});
  }
  else if(room.status==='playing'&&battleState.networkPaused&&!battleState.countdownActive){ battleBeginPlay(true); }
  else if(room.status==='finishing'){ battleCancelCountdown(true); battleBeginTimeFinish(); }
  if(room.status==='playing'&&!battleState.countdownActive&&!battleState.networkPaused&&window.BGMController){
    BGMController.syncBattle(battleCurrentRemaining(),{reason:'server-sync',spectator:!!battleState.eliminated});
  }
}
function battlePauseForNetwork(room) {
  if(!battleState.networkPaused){
    battleState.networkPaused=true; paused=true; if(fallingPiece&&fallingPiece.phase==='locking') accrueLockTime(); clearFallingTimers(); battlePauseGarbageWarning(); updateFallingControls();
    if(window.BGMController) BGMController.pauseForGame('battle-network');
  }
  const overlay=document.getElementById('battle-connection-overlay'); if(overlay) overlay.hidden=false;
  const label=document.getElementById('battle-connection-label'); if(label) label.textContent=(room.pauseState&&room.pauseState.kind==='resuming')?'もうすぐ はじまるよ':'つうしんを まっているよ';
}
function battleCurrentRemaining(){
  if(!battleState.remainingRunning) return Math.max(0,battleState.remainingMs);
  return Math.max(0,battleState.remainingMs-(performance.now()-battleState.remainingSnapshotAt));
}
function battleStartTimerLoop(){
  if(battleState.timerLoop) clearInterval(battleState.timerLoop);
  battleState.timerLoop=setInterval(()=>{
    const rem=battleCurrentRemaining(); const sec=Math.ceil(rem/1000); const m=Math.floor(sec/60); const s=sec%60;
    const display=document.getElementById('time-left'); if(display) display.textContent=`${m}:${String(s).padStart(2,'0')}`;
    const watch=document.getElementById('battle-spectator-time'); if(watch) watch.textContent=`${m}:${String(s).padStart(2,'0')}`;
    const elapsed=BATTLE_MATCH_MS-rem; const level=elapsed>=120000?2:(elapsed>=60000?1:0);
    if(level>battleState.localSpeedLevel){ battleState.localSpeedLevel=level; fallingSpeedLevel=level; showSpeedUp(); }
    if(window.BGMController&&!battleState.networkPaused&&!battleState.countdownActive) BGMController.syncBattle(rem,{reason:'timer',spectator:!!battleState.eliminated});
    if(rem<=0&&!battleState.timeExpired) battleBeginTimeFinish();
  },120);
}
function battleBeginTimeFinish(){
  if(battleState.timeExpired) return; battleState.timeExpired=true; paused=true; battleState.remainingRunning=false; clearFallingTimers(); updateFallingControls();
  if(window.BGMController) BGMController.finishBattleAtZero();
  if(fallingPiece){ fallingPiece=null; removeFallingVisuals(); }
  if(!animating) battleFinalizeLocal(); else { const wait=setInterval(()=>{if(!animating){clearInterval(wait);battleFinalizeLocal();}},100); }
}
function battleFinalizeLocal(){
  if(battleState.finalized) return; battleState.finalized=true; gameRunning=false; clearFallingTimers();
  const overlay=document.getElementById('battle-connection-overlay'); if(overlay){overlay.hidden=false;document.getElementById('battle-connection-label').textContent='けっかを まとめているよ';}
  battleSyncNow(true);
}

function battleUpdateLocalStats(){
  if(!isBattleMode()) return;
  const wait=document.getElementById('battle-garbage-waiting'); if(wait) wait.textContent=(battleState.garbageQueue.length+battleState.garbageWarningQueue.length)+'こ';
}
function battleProgress(){ return {towers:completedTowers,bricks:bricks,totalTens:tenCount,sentGarbage:battleState.sentGarbage,sequenceIndex:battleState.sequenceIndex}; }
function battleRecordAttack(totalPairs,chainDepth){
  if(!isBattleMode()||battleState.resolutionOrigin!=='playerMove'||battleState.timeExpired||totalPairs<=0) return;
  battleState.pendingMoves.push({clientMoveEventId:battleUuid(),totalPairsInMove:totalPairs,chainDepth:chainDepth,createdAt:battleServerNow()});
  battleQueueSync(20);
}
function battleClearRecentGarbageMarks(){
  let changed=false;
  board.forEach(col=>col.forEach(obj=>{
    if(obj&&obj.recentGarbage){ delete obj.recentGarbage; delete obj.garbageBatchId; changed=true; }
  }));
  if(changed) updateBoardUI();
}
function battleAfterMove(){
  if(!isBattleMode()) return;
  const finishedPlayerMove=battleState.resolutionOrigin==='playerMove';
  if(finishedPlayerMove) battleClearRecentGarbageMarks();
  battlePersistLocalSnapshot(); battleQueueSync(20);
  if(battleState.timeExpired){ battleFinalizeLocal(); return; }
  if(battleState.garbageBatchActive){ battleState.garbageBatchActive=false; battleState.resolutionOrigin='playerMove'; scheduleSpawn(160); return; }
  if(battleState.garbageWarningQueue.length>0){ battleStartGarbageWarning(true); battleState.resolutionOrigin='playerMove'; scheduleSpawn(150); return; }
  if(battleState.garbageQueue.length>0){ battleProcessGarbageBatch(); return; }
  battleState.resolutionOrigin='playerMove'; scheduleSpawn(150);
}
function battleProcessGarbageBatch(){
  if(!isBattleMode()||battleState.garbageBatchActive||battleState.timeExpired||battleState.eliminated) return;
  const batch=battleState.garbageQueue.splice(0,BATTLE_DIAGNOSTIC_CONFIG.garbageMaxDropAtOnce); if(!batch.length){scheduleSpawn(150);return;}
  battleState.garbageBatchActive=true; battleState.resolutionOrigin='garbageInsertion'; animating=true; updateFallingControls();
  const used=Array(BOARD_COLS).fill(0); let i=0; const session=gameSessionToken;
  function addOne(){
    if(!gameRunning||session!==gameSessionToken) return;
    if(i>=batch.length){
      updateBoardUI(); animating=false; updateInfoPanels();
      const found=findAllPairs();
      if(found.count>0) processRemovals(found.set,found.count);
      else { battleState.garbageBatchActive=false; battleState.resolutionOrigin='playerMove'; scheduleSpawn(170); }
      return;
    }
    let candidates=[]; let min=Infinity;
    for(let c=0;c<BOARD_COLS;c++){ if(board[c].length>=BOARD_ROWS) continue; const penalty=used[c]>=2?100:0; const score=board[c].length+penalty; if(score<min){min=score;candidates=[c];}else if(score===min)candidates.push(c); }
    if(!candidates.length){animating=false;battleEliminate('garbage');return;}
    const col=candidates[Math.floor(Math.random()*candidates.length)]; used[col]++;
    const entry=batch[i];
    const obj=makeNumberObject(entry.value);
    obj.recentGarbage=true;
    obj.garbageBatchId=entry.eventId || `garbage-${battleState.matchId||'match'}-${++battleState.recentGarbageBatchSeq}`;
    board[col].push(obj); i++;
    updateBoardUI({landedTarget:{col,row:board[col].length-1}}); playSound(1); setTimeout(addOne,190);
  }
  addOne();
}
function battleEliminate(){
  if(battleState.eliminated||battleState.timeExpired) return; battleState.eliminated=true; battleState.remainingRunning=false; gameRunning=false; paused=true; clearGameTimers(); fallingPiece=null; removeFallingVisuals();
  const myChar=(battleState.me&&battleState.me.characterId)||'pipi'; battleSetImage(document.getElementById('battle-spectator-character'),myChar,'cheer');
  showScreen('battleSpectator'); battleRenderSpectator(battleState.room); if(window.BGMController) BGMController.syncBattle(battleCurrentRemaining(),{reason:'spectator-enter',spectator:true,force:true}); battleSyncNow(false,true); battleStartSyncLoop(400);
}

function battleQueueSync(delay=80){
  if(!battleState.token||battleState.sessionInvalidHandled||battleState.sessionExpiredHandled) return;
  if(battleState.syncTimer) clearTimeout(battleState.syncTimer);
  const base=Math.max(0,Number(delay)||0);
  // 操作直後・復帰直後のほぼ同時syncだけを数十ms単位で分散し、ACK/おじゃまの即時性は維持する。
  let jitter=0;
  if(base<=120){
    const min=Math.max(0,Number(BATTLE_DIAGNOSTIC_CONFIG.queuedSyncJitterMinMs)||0);
    const max=Math.max(min,Number(BATTLE_DIAGNOSTIC_CONFIG.queuedSyncJitterMaxMs)||min);
    jitter=Math.round(min+Math.random()*(max-min));
  }
  const generation=battleState.sessionGeneration;
  battleState.syncTimer=setTimeout(()=>{
    battleState.syncTimer=null;
    if(generation===battleState.sessionGeneration&&!battleState.sessionInvalidHandled) battleSyncNow();
  },base+jitter);
}
function battleStartSyncLoop(delay=null){
  if(!battleState.token||battleState.sessionInvalidHandled||battleState.sessionExpiredHandled) return;
  if(battleState.syncTimer) clearTimeout(battleState.syncTimer);
  let base=delay;
  const defaultCadence=base===null;
  if(defaultCadence){ const status=battleState.room&&battleState.room.status; base=status==='waiting'?2600:(status==='finished'?3000:1900); }
  const jitterMax=defaultCadence?Math.max(0,Number(BATTLE_DIAGNOSTIC_CONFIG.normalSyncJitterMs)||0):Math.min(Math.max(0,Number(BATTLE_DIAGNOSTIC_CONFIG.explicitSyncLoopJitterMaxMs)||0),Math.max(60,Math.round(Number(base||0)*0.2)));
  const generation=battleState.sessionGeneration;
  battleState.syncTimer=setTimeout(()=>{
    battleState.syncTimer=null;
    if(generation===battleState.sessionGeneration&&!battleState.sessionInvalidHandled) battleSyncNow();
  },Math.max(0,Number(base)||0)+Math.floor(Math.random()*(jitterMax+1)));
}
async function battleSyncNow(forceFinal=false,elimination=false){
  if(!battleState.token||battleState.sessionInvalidHandled||battleState.sessionExpiredHandled) return;
  if(battleState.syncBusy){if(!battleState.syncTimer) battleStartSyncLoop(220);return;}
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
    battleState.offline=true;
    battleShowNetworkStatus('offline','ネットにつながっていないみたい');
    battleStartSyncLoop(1800);
    return;
  }
  const generation=battleState.sessionGeneration;
  const tokenAtStart=battleState.token;
  const matchAtStart=battleState.matchId;
  const syncSerial=++battleState.syncRequestSerial;
  battleState.syncBusy=true;
  const moveIds=battleState.pendingMoves.slice(0,10).map(x=>String(x&&x.clientMoveEventId||'')).filter(Boolean);
  const ackIds=[...new Set(battleState.pendingAcks.slice(0,BATTLE_DIAGNOSTIC_CONFIG.ackMaxIdsPerSync).map(String).filter(Boolean))];
  const clientSequence=++battleState.clientSequence;
  battlePersistClientSequence();
  const payload={heartbeat:true,matchId:battleState.matchId,clientSequence,requestResumeState:!battleState.preparedMatchId,progress:battleProgress(),clientState:battleBuildClientState(),clientMoveEvents:battleState.pendingMoves.slice(0,10),ackEventIds:ackIds,elimination:!!elimination,finalized:!!(forceFinal||battleState.finalized)};
  try{
    const r=battleResultOrThrow(await battleApi('syncBattle',tokenAtStart,payload));
    if(generation!==battleState.sessionGeneration||tokenAtStart!==battleState.token||battleState.sessionInvalidHandled) return;
    if(matchAtStart&&battleState.matchId&&matchAtStart!==battleState.matchId) return;
    if(syncSerial<battleState.latestAppliedSyncSerial) return;
    battleState.latestAppliedSyncSerial=syncSerial;

    battleReconcileClientSequence(r.serverLastClientSequence,r.nextExpectedClientSequence,r.duplicateSequence?'stale-response':'sync-response');
    const resolvedAcks=r.resolvedAckEventIds||r.acknowledgedEventIds||[];
    battleResolvePendingAcks(resolvedAcks);

    // 古いsequenceではゲーム操作をサーバーが再実行しないため、moveは次の新しいsequenceへ残す。
    if(!r.duplicateSequence&&moveIds.length){
      const done=new Set(moveIds);
      battleState.pendingMoves=battleState.pendingMoves.filter(x=>!done.has(String(x&&x.clientMoveEventId||'')));
    }

    battleState.consecutiveSyncFailures=0;
    battleState.reconnecting=false;
    battleState.offline=false;
    battleState.lastSuccessfulSyncAt=Date.now();
    battleApplyRoom(r.room);
    battleIngestAttacks(r.newAttackEvents||[]);
    battlePersistLocalSnapshot();
  }catch(e){
    if(generation!==battleState.sessionGeneration||tokenAtStart!==battleState.token) return;
    const code=battleClassifyFailure(e);
    if(code==='CLIENT_CANCELLED'||code==='SESSION_INVALID'||code==='SESSION_EXPIRED') return;
    battleState.consecutiveSyncFailures++;
    if(code==='CLIENT_OFFLINE'){
      battleState.offline=true;
      battleShowNetworkStatus('offline','ネットにつながっていないみたい');
    }else if(BATTLE_NON_RETRYABLE_CODES.has(code)){
      battleShowNetworkStatus('unstable',battleUserMessage(e));
    }else{
      battleState.resultMayBeInaccurate=true;
      battleShowNetworkStatus('unstable','つうしんが ふあんていです　ゲームは そのまま つづけられるよ');
    }
  }finally{
    if(generation===battleState.sessionGeneration&&tokenAtStart===battleState.token&&!battleState.sessionInvalidHandled&&!battleState.sessionExpiredHandled){
      battleState.syncBusy=false;
      battleStartSyncLoop(battleState.offline?1800:null);
    }
  }
}
function battleIngestAttacks(events){
  const fresh=[];
  battlePruneReceivedAttackIds();
  events.forEach(ev=>{
    if(!ev||!ev.eventId) return;
    const eventId=String(ev.eventId);
    if(ev.matchId&&battleState.matchId&&ev.matchId!==battleState.matchId){battleQueueClientDiagnostic('battleIngestAttacks',battleCreateApiError('STALE_ATTACK_EVENT','前のたいせんのおじゃまを破棄しました'),0,eventId.slice(-12));return;}
    if(!battleRememberAttackId(eventId)){
      // サーバーが再送してきた場合もACKを再度キューへ入れ、再送ループを止める。
      battleQueueAck(eventId);
      battleQueueClientDiagnostic('battleIngestAttacks',battleCreateApiError('DUPLICATE_ATTACK_EVENT','同じおじゃまを重複受信しました'),0,eventId.slice(-12));
      return;
    }
    battleQueueAck(eventId); fresh.push(ev);
    (ev.garbageNumbers||[]).forEach(value=>battleState.garbageWarningQueue.push({value:Number(value),eventId,senderCharacterId:ev.senderCharacterId}));
  });
  if(fresh.length){ battleShowAttackToast(fresh); battleStartGarbageWarning(false); battlePersistLocalSnapshot(); }
  else if(events&&events.length)battlePersistLocalSnapshot();
  battleUpdateLocalStats();
}
function battleShowAttackToast(input){
  const events=Array.isArray(input)?input:[input];
  const valid=events.filter(Boolean); if(!valid.length) return;
  const toast=document.getElementById('battle-attack-toast'); if(!toast) return;
  const names=[...new Set(valid.map(ev=>battleName(ev.senderCharacterId)))];
  const total=valid.reduce((sum,ev)=>sum+Number(ev.attackCount||((ev.garbageNumbers||[]).length)||0),0);
  const first=valid[0];
  battleSetImage(document.getElementById('battle-attack-character'),first.senderCharacterId||'pipi','attack');
  document.getElementById('battle-attack-sender').textContent=names.length===1?`${names[0]}から`:(names.length===2?`${names[0]}・${names[1]}から`:'みんなから');
  document.getElementById('battle-attack-message').textContent=`おじゃま ${total}こ！`;
  const tip=document.getElementById('battle-garbage-tip');
  const showTip=!battleState.firstGarbageTipShown;
  if(showTip) battleState.firstGarbageTipShown=true;
  if(tip) tip.hidden=!showTip;
  toast.hidden=false;
  if(battleState.attackToastTimer) clearTimeout(battleState.attackToastTimer);
  battleState.attackToastTimer=setTimeout(()=>{toast.hidden=true;if(tip)tip.hidden=true;},showTip?1150:760);
}

function battleUpdateBattleHud(room){
  const me=(room.players||[]).find(p=>p.isMe)||battleState.me; if(!me) return; battleState.me=me;
  battleSetImage(document.getElementById('battle-self-icon'),me.characterId||'pipi','normal'); document.getElementById('battle-self-name').textContent=battleName(me.characterId);
  const target=(room.players||[]).find(p=>p.playerId===room.nextTargetPlayerId); document.getElementById('battle-target-name').textContent=target?battleName(target.characterId):'−';
  document.getElementById('battle-garbage-waiting').textContent=(battleState.garbageQueue.length+battleState.garbageWarningQueue.length)+'こ';
  const wrap=document.getElementById('battle-opponents'); if(!wrap) return; wrap.innerHTML='';
  (room.players||[]).filter(p=>!p.isMe).forEach(p=>{
    const card=document.createElement('div'); card.className='battle-opponent-card'+(p.eliminatedAt?' eliminated':'')+(!p.connected?' waiting':'');
    const img=document.createElement('img'); battleSetImage(img,p.characterId||'pipi',p.eliminatedAt?'cheer':'normal');
    const copy=document.createElement('div'); copy.innerHTML=`<strong>${battleName(p.characterId)}</strong><small>とう ${p.towers}こ　れんが ${p.bricks}/25</small>`;
    const status=document.createElement('span'); status.className='op-status'; status.textContent=p.disconnectedAt?'つうしん切れ':(p.eliminatedAt?'いっぱい':(!p.connected?'つうしん待ち':'たいせん中'));
    card.append(img,copy,status); wrap.appendChild(card);
  });
}
function battleRenderSpectator(room){
  if(!room) return; const list=document.getElementById('battle-spectator-list'); list.innerHTML='';
  (room.players||[]).forEach(p=>{ const card=document.createElement('div'); card.className='battle-watch-card'; const img=document.createElement('img'); battleSetImage(img,p.characterId||'pipi',p.eliminatedAt?'cheer':'normal'); const copy=document.createElement('div'); copy.innerHTML=`<strong>${battleName(p.characterId)}</strong><small>とう ${p.towers}こ<br>れんが ${p.bricks} / 25<br>${p.eliminatedAt?'いっぱい':(!p.connected?'つうしん待ち':'たいせん中')}</small>`; card.append(img,copy); list.appendChild(card); });
}
function battleShowResult(room){
  battleClearCurrentSequenceStorage();
  battleCancelCountdown(true);
  if(battleState.timerLoop){clearInterval(battleState.timerLoop);battleState.timerLoop=null;}
  stopCurrentGame(); battleState.room=room; const result=room.result||{players:[]}; const me=(room.players||[]).find(p=>p.isMe); battleState.me=me||battleState.me;
  const myResult=(result.players||[]).find(p=>battleState.me&&p.playerId===battleState.me.playerId); const title=document.getElementById('battle-result-title');
  title.textContent=result.winnerByDisconnect&&myResult&&myResult.rank===1?'つうしんが きれたため、あなたの かちです':(myResult&&myResult.rank===1?'やったね！ 1ばん！':(myResult&&myResult.rank?'いい たいせんだったね！':'たいせん おつかれさま！'));
  const networkNote=document.getElementById('battle-result-network-note'); if(networkNote) networkNote.hidden=!battleState.resultMayBeInaccurate;
  const list=document.getElementById('battle-result-list'); list.innerHTML='';
  (result.players||[]).forEach(p=>{
    const card=document.createElement('article'); card.className='battle-result-card'+(p.rank===1?' first':'')+(battleState.me&&p.playerId===battleState.me.playerId?' me':'');
    const img=document.createElement('img'); battleSetImage(img,p.characterId||'pipi',p.rank===1?'win':(p.disconnected?'normal':'cheer'));
    const copy=document.createElement('div'); const rank=p.disconnected?'つうしん切れ':`${p.rank}ばん`; copy.innerHTML=`<div class="battle-result-rank">${rank}</div><div class="battle-result-name">${battleName(p.characterId)}</div><div class="battle-result-stats">とう ${p.towers}こ　れんが ${p.bricks}/25<br>できた10 ${p.totalTens}かい<br>おくった おじゃま ${p.sentGarbage}こ</div>`;
    card.append(img,copy); if(battleState.me&&p.playerId===battleState.me.playerId){const badge=document.createElement('span');badge.className='battle-you-badge';badge.textContent='あなた';card.appendChild(badge);} list.appendChild(card);
  });
  document.getElementById('battle-connection-overlay').hidden=true; showScreen('battleResult'); battleHydrateImages();
}

// PIN画面のキーボード
window.addEventListener('keydown',e=>{
  const screen=document.getElementById('battle-pin-screen'); if(!screen||!screen.classList.contains('active')) return;
  if(/^\d$/.test(e.key)){e.preventDefault();battlePinInput(e.key);} else if(e.key==='Backspace'){e.preventDefault();battlePinBackspace();} else if(e.key==='Enter'&&battleState.pinInput.length===4){e.preventDefault();battleJoinRoom();}
},{passive:false});

window.addEventListener('offline',()=>{
  battleState.offline=true;
  if(battleState.token){battleShowNetworkStatus('offline','ネットにつながっていないみたい');battleQueueClientDiagnostic('syncBattle',battleCreateApiError('CLIENT_OFFLINE','ブラウザがオフラインになりました'),0,'オフライン検出');}
});
window.addEventListener('online',()=>{
  const wasOffline=battleState.offline;
  battleState.offline=false;
  if(battleState.token){battleShowNetworkStatus('reconnecting','つうしんを つなぎなおしているよ');battleQueueSync(80);battleScheduleDiagnosticFlush();}
  else if(wasOffline) battleShowNetworkStatus('connected','つながったよ！',800);
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){
    battleState.pageHiddenAt=Date.now(); battlePauseGarbageWarning(); battlePersistLocalSnapshot();
    if(window.BGMController) BGMController.handleVisibility(true);
    return;
  }
  if(window.BGMController) BGMController.handleVisibility(false);
  if(battleState.token&&!battleState.sessionInvalidHandled&&!battleState.sessionExpiredHandled){
    battleShowNetworkStatus('reconnecting','つうしんを たしかめているよ');
    battleResumeGarbageWarning(); battleQueueSync(40);
  }
});
window.addEventListener('pageshow',()=>{
  if(battleState.token&&!battleState.sessionInvalidHandled&&!battleState.sessionExpiredHandled){
    battleShowNetworkStatus('reconnecting','つうしんを たしかめているよ');
    battleResumeGarbageWarning(); battleQueueSync(40);
  }
});
window.addEventListener('pagehide',()=>{
  // 終了通知は端末によって届かないため送信に依存せず、サーバーのheartbeat判定へ任せる。
  battleState.pageHiddenAt=Date.now(); battlePauseGarbageWarning(); battlePersistLocalSnapshot();
  if(window.BGMController) BGMController.handleVisibility(true);
});
async function battleRestoreStoredSession(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem('tenTowerBattleTokenV211')||'null');}catch(e){}
  if(!saved||!saved.token||Date.now()-Number(saved.savedAt||0)>BATTLE_DIAGNOSTIC_CONFIG.localResumeTtlMs)return;
  battleState.token=String(saved.token);battleStoreSession();battleShowNetworkStatus('reconnecting','たいせんを もどしているよ');battleQueueSync(40);
}
window.addEventListener('load',()=>{ battleHydrateImages(); battleScheduleDiagnosticFlush(); battleRestoreStoredSession(); });

// ローカル確認・自動テスト用
window.__battleTest={
  state:battleState,
  previewMenu:()=>{showScreen('battleMenu');battleHydrateImages();},
  previewPin:()=>{battleState.pinInput='0382';battleRenderPin();showScreen('battlePin');},
  previewRoom:(count=4)=>{const chars=['pipi','rabi','moko','kon'];const players=chars.slice(0,count).map((c,i)=>({playerId:'p'+i,joinOrder:i+1,characterId:c,ready:true,connected:true,towers:0,bricks:0,isMe:i===0,isHost:i===0}));battleState.me=players[0];battleRenderRoom({pin:'0382',players,hostPlayerId:'p0'});showScreen('battleRoom');},
  previewGame:()=>{const players=['pipi','rabi','moko','kon'].map((c,i)=>({playerId:'p'+i,characterId:c,isMe:i===0,towers:i,bricks:i*5,connected:true}));battleState.token='test';battleState.me=players[0];battlePrepareMatch({matchId:'preview',randomSeed:123,startAt:battleServerNow()+999999,remainingMs:146000,players,hostPlayerId:'p0',nextTargetPlayerId:'p1',status:'countdown'});battleState.room={status:'playing',players,nextTargetPlayerId:'p1',startAt:battleServerNow()-100};battleUpdateBattleHud(battleState.room);document.getElementById('countdown-overlay').hidden=true;clearFallingTimers();paused=false;board=Array.from({length:7},()=>[]);board[0]=[makeNumberObject(6),makeNumberObject(2)];board[1]=[makeNumberObject(4)];board[2]=[makeNumberObject(7),makeNumberObject(1),makeNumberObject(5)];board[4]=[makeNumberObject(3),makeNumberObject(8)];board[5]=[makeNumberObject(9)];const obj=numbersQueue[0];fallingPiece={val:obj.val,color:obj.color,texture:obj.texture,col:3,row:5,phase:'falling',lockElapsed:0,lockStartedAt:0,intervalMs:1200};updateBoardUI();updateInfoPanels();updateFallingControls();},
  previewAttack:()=>{battleShowAttackToast({senderCharacterId:'moko',attackCount:3});},
  previewWarning:()=>{window.__battleTest.previewGame();battleState.garbageWarningQueue=[{value:8,eventId:'w1',senderCharacterId:'moko'},{value:3,eventId:'w1',senderCharacterId:'moko'},{value:6,eventId:'w1',senderCharacterId:'moko'}];battleState.garbageWarningRemainingMs=3000;battleStartGarbageWarning(true);},
  previewStar:()=>{window.__battleTest.previewGame();chainPower=10;pendingStarAward=true;awardPendingStarBlock();updateInfoPanels();},
  previewCountdown:(type='start')=>{window.__battleTest.previewGame();battleShowCountdown({targetTime:battleServerNow()+3200,type});},
  previewGarbage:()=>{window.__battleTest.previewGame();battleState.firstGarbageTipShown=false;battleState.garbageQueue=[{value:8,eventId:'g1',senderCharacterId:'moko'},{value:3,eventId:'g1',senderCharacterId:'moko'},{value:6,eventId:'g1',senderCharacterId:'moko'}];battleShowAttackToast({senderCharacterId:'moko',attackCount:3});fallingPiece=null;animating=false;battleProcessGarbageBatch();},
  clearGarbageMarks:()=>battleClearRecentGarbageMarks(),
  previewLoading:(message='へやを つくっているよ')=>{showScreen('battleMenu');battleHydrateImages();battleShowLoading(message);},
  previewSpectator:()=>{const players=['pipi','rabi','moko','kon'].map((c,i)=>({playerId:'p'+i,characterId:c,isMe:i===0,towers:i,bricks:i*5,connected:true,eliminatedAt:i===0?Date.now():null}));battleState.me=players[0];battleState.room={players};battleSetImage(document.getElementById('battle-spectator-character'),'pipi','cheer');battleRenderSpectator(battleState.room);showScreen('battleSpectator');},
  previewResult:()=>{const players=['pipi','rabi','moko','kon'].map((c,i)=>({playerId:'p'+i,characterId:c,isMe:i===0}));battleState.me=players[0];battleShowResult({players,result:{players:players.map((p,i)=>({...p,rank:i+1,towers:3-i,bricks:5+i*3,totalTens:35-i*4,sentGarbage:12-i*2,disconnected:false}))}});}
};

// 通信診断の開発用モック。児童画面には操作部品を出さない。
window.__battleDiagnosticTest={
  retryDelay:battleRetryDelay,
  shouldRetry:code=>battleShouldRetry(battleCreateApiError(code,code)),
  getGeneration:()=>battleState.sessionGeneration,
  invalidate:()=>battleHandleSessionInvalid(battleCreateApiError('SESSION_INVALID','へやとの つながりが きれたよ')),
  expire:()=>battleHandleSessionExpired(battleCreateApiError('SESSION_EXPIRED','たいせんから はずれたよ。つぎの たいせんに さんかしてね')),
  ingestEvents:events=>battleIngestSystemEvents(events),
  runPlan:async(plan=[])=>{
    let calls=0;
    const result=await battleExecuteWithRetry(async()=>{
      const step=plan[calls++]||'SUCCESS';
      if(step==='SUCCESS') return {ok:true,calls};
      throw battleCreateApiError(step,step);
    },{method:'mock',maxRetries:3});
    return {result,calls};
  },
  runFailPlan:async(plan=[])=>{
    let calls=0;
    try{await battleExecuteWithRetry(async()=>{const step=plan[calls++]||'SCRIPT_RUN_FAILURE';throw battleCreateApiError(step,step);},{method:'mock',maxRetries:3});}
    catch(error){return {code:battleClassifyFailure(error),calls};}
  },
  queue:()=>battleReadDiagnosticQueue(),
  clearQueue:()=>battleWriteDiagnosticQueue([]),
  previewReconnect:()=>battleShowNetworkStatus('reconnecting','つうしんを つなぎなおしているよ'),
  previewConnected:()=>battleShowNetworkStatus('connected','つながったよ！'),
  previewOffline:()=>battleShowNetworkStatus('offline','ネットにつながっていないみたい'),
  previewUnstable:()=>battleShowNetworkStatus('unstable','つうしんが ふあんていです　ゲームは そのまま つづけられるよ'),
  reconcileSequence:(serverLast,nextExpected)=>battleReconcileClientSequence(serverLast,nextExpected,'test'),
  getSequence:()=>({client:battleState.clientSequence,server:battleState.serverLastClientSequence,next:battleState.nextExpectedClientSequence}),
  queueAck:id=>battleQueueAck(id),
  resolveAcks:ids=>battleResolvePendingAcks(ids),
  pendingAcks:()=>battleState.pendingAcks.slice(),
  ingestAttacks:events=>battleIngestAttacks(events)
};
if (new URLSearchParams(location.search).get('test') === '1') {
  window.__tenTowerBgmBattleTest = {
    sync: ms => window.BGMController && BGMController.syncBattle(ms,{reason:'test',force:true}),
    finish: () => window.BGMController && BGMController.finishBattleAtZero(),
    state: () => window.BGMController ? BGMController.getState() : null,
    remaining: () => battleCurrentRemaining()
  };
}
