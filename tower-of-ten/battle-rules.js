// Shared battle settings and anonymous resume schema. Also copied into the private GAS draft.
var TenTowerBattleRules = (() => {
  'use strict';
  const defaults = Object.freeze({fallMode:'falling', ruleMode:'two'});
  const object = (v, keys) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => keys.includes(k));
  const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
  const id = v => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(v);
  function settings(value) {
    if (value === undefined) return {...defaults};
    return object(value,['fallMode','ruleMode']) && ['falling','pairFalling'].includes(value.fallMode) && ['two','three','either'].includes(value.ruleMode) ? {fallMode:value.fallMode,ruleMode:value.ruleMode} : null;
  }
  function roomSettings(room) {
    if (!room) return null;
    if (room.fallMode === undefined && room.ruleMode === undefined) return {...defaults};
    return settings({fallMode:room.fallMode,ruleMode:room.ruleMode});
  }
  function block(v, pairAllowed = false) {
    if (pairAllowed && v && v.kind === 'pair') {
      return object(v,['kind','pairId','first','second','orientation']) && id(v.pairId) && integer(v.orientation,0,3) && block(v.first) && block(v.second) && v.first.kind === 'number' && v.second.kind === 'number' && v.first.val + v.second.val !== 10;
    }
    return object(v,['kind','val','recentGarbage','garbageBatchId']) && (v.kind === 'star' && v.val === null || v.kind === 'number' && integer(v.val,1,9)) && (v.recentGarbage === undefined || typeof v.recentGarbage === 'boolean') && (v.garbageBatchId === undefined || v.garbageBatchId === '' || id(v.garbageBatchId));
  }
  function moves(list) {
    return Array.isArray(list) && list.length <= 10 && list.every(v => object(v,['clientMoveEventId','totalPairsInMove','chainDepth','createdAt','moveSerial']) && id(v.clientMoveEventId) && integer(v.totalPairsInMove,1,999) && integer(v.chainDepth,1,999) && integer(v.createdAt,0,9999999999999) && (v.moveSerial===undefined||integer(v.moveSerial,1,2147483647)));
  }
  function samePiece(a,b) {
    if(!a||!b||a.kind!==b.kind)return false;
    return a.kind==='pair'?a.pairId===b.pairId&&a.orientation===b.orientation&&samePiece(a.first,b.first)&&samePiece(a.second,b.second):a.val===b.val;
  }
  function validState(s, expected) {
    const keys = ['version','savedAt','fallMode','ruleMode','board','queue','held','holdUsed','chainPower','pendingStarAward','falling','matchId','sequenceIndex','bricks','tenCount','bestChain','completedTowers','towerStage','garbageQueue','garbageWarningQueue','garbageWarningRemainingMs','clientSequence','pendingAcks','receivedAttackRecords','seenAttackIds','pairPlacements','fallingChainBonusTotal','pendingMoves','moveSerial','appliedDropIds','garbageResolutionPending'];
    if (!object(s,keys) || ![1,2].includes(s.version)) return false;
    const config = s.version === 1 ? {...defaults} : settings({fallMode:s.fallMode,ruleMode:s.ruleMode});
    if (!config || expected && (config.fallMode !== expected.fallMode || config.ruleMode !== expected.ruleMode)) return false;
    const pair = config.fallMode === 'pairFalling';
    if (!Array.isArray(s.board) || s.board.length > 7 || (s.version === 2 && s.board.length !== 7) || !s.board.every(c => Array.isArray(c) && c.length <= 8 && c.every(v => block(v)))) return false;
    const queueBlock = v => block(v,pair) && (pair ? v.kind !== 'number' : v.kind !== 'pair');
    if (!Array.isArray(s.queue) || !s.queue.length || s.queue.length > 5 || !s.queue.every(queueBlock) || s.held != null && !queueBlock(s.held)) return false;
    if (s.falling != null) {
      const f=s.falling, base={...f};
      for (const k of ['col','row','phase','lockElapsed','intervalMs']) delete base[k];
      if (!queueBlock(base) || !integer(f.col,0,6) || !integer(f.row,0,8) || !['falling','locking'].includes(f.phase) || !integer(f.lockElapsed,0,3000) || !integer(f.intervalMs,0,3000)) return false;
      if (s.version === 2 && !samePiece(base,s.queue[0])) return false;
    }
    const limits={savedAt:9999999999999,sequenceIndex:999999,bricks:24,tenCount:99999,bestChain:999,completedTowers:999,towerStage:10,chainPower:10,garbageWarningRemainingMs:10000,clientSequence:2147483647,pairPlacements:99999,fallingChainBonusTotal:99999};
    if (!Object.entries(limits).every(([k,max]) => s[k] === undefined || integer(s[k],0,max)) || !['holdUsed','pendingStarAward'].every(k => s[k] === undefined || typeof s[k] === 'boolean') || s.matchId !== undefined && !id(s.matchId)) return false;
    for (const k of ['pendingAcks','seenAttackIds']) if (s[k] !== undefined && (!Array.isArray(s[k]) || s[k].length > 100 || !s[k].every(id))) return false;
    for (const k of ['garbageQueue','garbageWarningQueue']) if (s[k] !== undefined && (!Array.isArray(s[k]) || s[k].length > 30 || !s[k].every(v => object(v,['value','eventId','senderCharacterId']) && integer(v.value,1,9) && id(v.eventId) && ['pipi','rabi','moko','kon',''].includes(v.senderCharacterId)))) return false;
    if (s.receivedAttackRecords !== undefined && (!Array.isArray(s.receivedAttackRecords) || s.receivedAttackRecords.length > 100 || !s.receivedAttackRecords.every(v => object(v,['eventId','receivedAt']) && id(v.eventId) && integer(v.receivedAt,0,9999999999999)))) return false;
    if(s.moveSerial!==undefined&&!integer(s.moveSerial,0,2147483647))return false;
    if(s.garbageResolutionPending!==undefined&&typeof s.garbageResolutionPending!=='boolean')return false;
    if(s.appliedDropIds!==undefined&&(!Array.isArray(s.appliedDropIds)||s.appliedDropIds.length>300||!s.appliedDropIds.every(id)))return false;
    return s.pendingMoves === undefined || moves(s.pendingMoves);
  }
  function nextPair(rng) {
    const first=Math.floor(rng()*9)+1, candidates=[1,2,3,4,5,6,7,8,9].filter(v => first+v !== 10);
    return [first,candidates[Math.floor(rng()*candidates.length)]];
  }
  return Object.freeze({defaults,settings,roomSettings,block,moves,validState,nextPair});
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TenTowerBattleRules;
