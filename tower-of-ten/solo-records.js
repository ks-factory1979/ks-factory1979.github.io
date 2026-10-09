(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TenTowerSoloRecords=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const gameModes=Object.freeze(['free','timed','falling','pairFalling']);
  const ruleModes=Object.freeze(['two','three','either']);
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  function key(gameMode,ruleMode){
    if(!gameModes.includes(gameMode)||!ruleModes.includes(ruleMode))throw new RangeError('Invalid department');
    return `tenTowerSoloRecordV1:${gameMode}:${ruleMode}`;
  }
  function validRecord(value,gameMode,ruleMode){
    return value&&value.version===1&&value.gameMode===gameMode&&value.ruleMode===ruleMode&&
      ['bestTotalBricks','bestMaxChain','bestChainBonus','bestTenCount'].every(k=>integer(value[k]));
  }
  function legacy(store,gameMode,ruleMode){
    if(ruleMode!=='two'||!['falling','pairFalling'].includes(gameMode))return null;
    let old;
    if(gameMode==='pairFalling'){
      const raw=store.getItem('pairFalling3minRecordV1');if(raw===null)return null;
      old=JSON.parse(raw);
      if(!old||old.version!==1||!['bestTotalBricks','bestMaxChain','bestChainBonus'].every(k=>integer(old[k])))throw Error('Invalid legacy record');
    }else{
      const read=k=>{const raw=store.getItem(k);if(raw===null)return null;if(!/^\d+$/.test(raw)||!integer(Number(raw)))throw Error('Invalid legacy record');return Number(raw);};
      const total=read('falling3minBestTotalBricks');if(total===null)return null;
      old={bestTotalBricks:total,bestMaxChain:read('falling3minBestMaxChain')??0,bestChainBonus:read('falling3minBestChainBonus')??0};
    }
    return {version:1,gameMode,ruleMode,bestTotalBricks:old.bestTotalBricks,bestMaxChain:old.bestMaxChain,bestChainBonus:old.bestChainBonus,bestTenCount:0};
  }
  function read(store,gameMode,ruleMode){
    const raw=store.getItem(key(gameMode,ruleMode));
    if(raw===null)return legacy(store,gameMode,ruleMode);
    const value=JSON.parse(raw);if(!validRecord(value,gameMode,ruleMode))throw Error('Invalid department record');
    return value;
  }
  function save(store,snapshot){
    const {gameMode,ruleMode,totalBricks,maxChain,chainBonusTotal,tenCount}=snapshot;
    key(gameMode,ruleMode);
    if(![totalBricks,maxChain,chainBonusTotal,tenCount].every(integer))throw new RangeError('Invalid result');
    const info={saved:false,firstPlay:true,isNewRecord:false,improvement:0,previousBestTotal:null,bestTotal:totalBricks,bestChain:maxChain};
    let previous;
    try{previous=read(store,gameMode,ruleMode);}catch(e){info.historyUnavailable=true;return info;}
    info.firstPlay=!previous;info.previousBestTotal=previous?previous.bestTotalBricks:null;
    info.bestTotal=Math.max(totalBricks,previous?previous.bestTotalBricks:0);
    info.bestChain=Math.max(maxChain,previous?previous.bestMaxChain:0);
    info.isNewRecord=!previous||totalBricks>previous.bestTotalBricks;
    info.improvement=previous&&info.isNewRecord?totalBricks-previous.bestTotalBricks:0;
    const record={version:1,gameMode,ruleMode,bestTotalBricks:info.bestTotal,bestMaxChain:info.bestChain,
      bestChainBonus:Math.max(chainBonusTotal,previous?previous.bestChainBonus:0),bestTenCount:Math.max(tenCount,previous?previous.bestTenCount:0)};
    try{store.setItem(key(gameMode,ruleMode),JSON.stringify(record));info.saved=true;}catch(e){info.storageUnavailable=true;}
    return info;
  }
  function legacyGeneral(store){
    // The old common keys cannot identify free versus timed versus falling.
    // Preserve and display them separately rather than guessing a department.
    try{const raw=store.getItem('bestTowerProgress');if(raw===null||!/^\d+$/.test(raw)||!integer(Number(raw)))return null;return Number(raw);}catch(e){return null;}
  }
  function payloadValid(p){
    if(!p||typeof p!=='object'||Array.isArray(p))return false;
    const fields=['gameMode','ruleMode','resultId','totalBricks','maxChain','chainBonusTotal','tenCount','pairPlacements','endReason'];
    if(Object.keys(p).some(k=>!fields.includes(k))||!gameModes.includes(p.gameMode)||!ruleModes.includes(p.ruleMode))return false;
    if(typeof p.resultId!=='string'||!(p.gameMode==='pairFalling'?/^pair-[A-Za-z0-9_-]{1,75}$/:/^[A-Za-z0-9_-]{1,80}$/).test(p.resultId))return false;
    if(!['totalBricks','maxChain','chainBonusTotal','tenCount','pairPlacements'].every(k=>integer(p[k])))return false;
    return p.totalBricks<=99999&&p.maxChain<=99&&p.chainBonusTotal<=99999&&p.tenCount<=99999&&p.pairPlacements<=9999&&
      (p.gameMode==='pairFalling'||p.pairPlacements===0)&&(['falling','pairFalling'].includes(p.gameMode)||p.chainBonusTotal===0)&&
      (p.endReason==='full'||p.endReason==='time'&&p.gameMode!=='free');
  }
  function createSubmission({transport,onUpdate,setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=10000,retryMax=2,retryDelay=800}){
    let cancelled=false,started=false,generation=0,attempt=0,timer=null,retryTimer=null;
    const cancel=()=>{cancelled=true;generation++;clearTimer(timer);clearTimer(retryTimer);};
    function start(payload){
      if(cancelled||started)throw Error('Submission already closed');started=true;
      if(!payloadValid(payload)){cancel();onUpdate({ok:false,errorCode:'INVALID_RESULT'});return;}
      const stable=Object.freeze({...payload});
      function send(){
        if(cancelled)return;const mine=++generation;
        function receive(stats){
          if(cancelled||mine!==generation)return;clearTimer(timer);generation++;
          if(stats?.ok&&(stats.gameMode!==stable.gameMode||stats.ruleMode!==stable.ruleMode))stats={ok:false,errorCode:'DEPARTMENT_MISMATCH'};
          if(!stats?.ok&&stats?.retryable&&attempt<retryMax){attempt++;retryTimer=setTimer(send,retryDelay);return;}
          cancel();onUpdate(stats||{ok:false,errorCode:'INVALID_RESPONSE'});
        }
        if(!transport?.isConfigured()){receive({ok:false,errorCode:'NOT_CONFIGURED'});return;}
        timer=setTimer(()=>receive({ok:false,retryable:true,errorCode:'TIMEOUT'}),timeoutMs);
        try{Promise.resolve(transport.call('submitSoloResult',stable)).then(receive,()=>receive({ok:false,retryable:true,errorCode:'NETWORK'}));}
        catch(e){receive({ok:false,retryable:true,errorCode:'NETWORK'});}
      }
      send();
    }
    return Object.freeze({start,cancel});
  }
  return Object.freeze({gameModes,ruleModes,key,read,save,legacyGeneral,payloadValid,createSubmission});
});
