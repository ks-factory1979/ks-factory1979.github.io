const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const records=require('../tower-of-ten/solo-records.js'),{createGame}=require('./helpers/tower-of-ten-game.cjs');
function store(){const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};}
const result=(gameMode='free',ruleMode='two',extra={})=>({gameMode,ruleMode,resultId:(gameMode==='pairFalling'?'pair-':'')+'test-1',totalBricks:37,maxChain:4,chainBonusTotal:['falling','pairFalling'].includes(gameMode)?5:0,tenCount:32,pairPlacements:gameMode==='pairFalling'?12:0,endReason:'full',...extra});
for(const mode of records.gameModes)for(const rule of records.ruleModes)test(`${mode}/${rule}: independent bests cannot decrease or touch another department`,()=>{
  const s=store();for(const m of records.gameModes)for(const r of records.ruleModes)records.save(s,result(m,r,{totalBricks:1}));
  const before=new Map(s.values),info=records.save(s,result(mode,rule));assert.equal(info.saved,true);assert.equal(info.improvement,36);
  assert.equal(records.save(s,result(mode,rule,{totalBricks:2,maxChain:1})).bestTotal,37);
  assert.equal(records.read(s,mode,rule).bestMaxChain,4);
  for(const [key,value]of before)if(key!==records.key(mode,rule))assert.equal(s.values.get(key),value);
});
test('legacy falling and pair bests are imported once without rewriting their old keys',()=>{
  const s=store();s.setItem('falling3minBestTotalBricks','70');s.setItem('falling3minBestMaxChain','7');s.setItem('falling3minBestChainBonus','12');
  const oldPair=JSON.stringify({version:1,bestTotalBricks:80,bestMaxChain:8,bestChainBonus:15});s.setItem('pairFalling3minRecordV1',oldPair);
  for(let repeat=0;repeat<3;repeat++){assert.equal(records.save(s,result('falling')).bestTotal,70);assert.equal(records.save(s,result('pairFalling')).bestTotal,80);}
  assert.equal(s.getItem('falling3minBestTotalBricks'),'70');assert.equal(s.getItem('pairFalling3minRecordV1'),oldPair);
  assert.equal(records.save(s,result('falling','three')).bestTotal,37);
});
test('ambiguous common best is retained separately and never assigned to free or timed',()=>{
  const s=store();s.setItem('bestTowerProgress','90');assert.equal(records.legacyGeneral(s),90);
  assert.equal(records.save(s,result()).firstPlay,true);assert.equal(records.save(s,result('timed')).bestTotal,37);assert.equal(s.getItem('bestTowerProgress'),'90');
});
for(const raw of ['broken','{"version":0}','{"version":1,"gameMode":"timed","ruleMode":"two"}'])test('corrupt scoped history is preserved: '+raw,()=>{
  const s=store(),key=records.key('free','two');s.setItem(key,raw);const info=records.save(s,result());assert.equal(info.saved,false);assert.equal(info.historyUnavailable,true);assert.equal(s.getItem(key),raw);
});
test('unavailable storage cannot prevent a usable result',()=>{
  const s=store();s.setItem=()=>{throw Error('quota');};assert.equal(records.save(s,result()).storageUnavailable,true);
  const g=createGame();g.c.localStorage.getItem=()=>{throw Error('blocked');};g.c.endGame('full');assert.equal(g.calls.screens.at(-1),'result');
});
for(const rule of records.ruleModes)test(`free/${rule}: self-ending saves locally, never sends, and repeated end is inert`,()=>{
  const g=createGame();g.c.startGame('free',{ruleMode:rule});g.run(g.actual('returnToTitle'));g.run('bricks=12');g.c.returnToTitle();
  assert.equal(g.calls.submits.length,0);assert.equal(g.calls.screens.at(-1),'result');assert.equal(JSON.parse(g.stored.get(records.key('free',rule))).bestTotalBricks,12);
  g.c.endGame('full');assert.equal(g.calls.submits.length,0);
});
test('reset removes exactly the twelve department keys and keeps other apps and unknown namespaces',()=>{
  const s=store();for(const mode of records.gameModes)for(const rule of records.ruleModes)s.setItem(records.key(mode,rule),'record');s.setItem('otherAppBest','77');s.setItem('tenTowerSoloRecordV1:unknown:two','keep');
  s.removeItem=k=>s.values.delete(k);s.key=i=>[...s.values.keys()][i];Object.defineProperty(s,'length',{get:()=>s.values.size});
  const c=vm.createContext({localStorage:s,sessionStorage:{removeItem(){}}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../tower-of-ten/storage.js'),'utf8'),c);c.clearTowerOfTenStoredData();assert.deepEqual([...s.values],[['otherAppBest','77'],['tenTowerSoloRecordV1:unknown:two','keep']]);
});
test('page departure never finalizes an active free game or sends an unconfirmed result',()=>{
  const g=createGame();g.c.startGame('free',{ruleMode:'three'});g.run([g.actual('cancelPairResultRequest'),g.actual('cancelSoloOnPageHide')].join('\n'));g.run('bricks=12');g.c.cancelSoloOnPageHide();
  assert.equal(g.calls.submits.length,0);assert.equal(g.stored.size,0);assert.equal(g.state().gameRunning,true);
});
test('client payload rejects personal fields, invalid identifiers, quit, fractional and cross-mode values',()=>{
  for(const extra of [{fullName:'name'},{email:'mail'},{resultId:'=FORMULA()'},{totalBricks:1.5},{ruleMode:'bad'},{gameMode:'battle'},{endReason:'quit'},{pairPlacements:1},{chainBonusTotal:2},{maxChain:100}])assert.equal(records.payloadValid(result('free','two',extra)),false);
  for(const m of records.gameModes)for(const r of records.ruleModes)assert.equal(records.payloadValid(result(m,r)),true);
});
function clock(){let id=0;const timers=new Map();return {timers,setTimer:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimer:id=>timers.delete(id),fire(){const entry=[...timers][0];assert.ok(entry);timers.delete(entry[0]);entry[1].fn();}};}
const tick=async()=>{await Promise.resolve();await Promise.resolve();};
test('timeout retry keeps one immutable result ID and ignores a late earlier response',async()=>{
  const c=clock(),calls=[],updates=[];const transport={isConfigured:()=>true,call:(method,payload)=>new Promise(resolve=>calls.push({method,payload,resolve}))};
  const task=records.createSubmission({...c,transport,onUpdate:x=>updates.push(x),timeoutMs:10,retryDelay:1});const p=result('timed','three');task.start(p);p.totalBricks=999;
  c.fire();c.fire();assert.equal(calls.length,2);assert.strictEqual(calls[0].payload,calls[1].payload);assert.equal(calls[1].payload.totalBricks,37);
  calls[1].resolve({ok:true,gameMode:'timed',ruleMode:'three',totalRecordCount:50,percentile:40});await tick();
  calls[0].resolve({ok:true,gameMode:'free',ruleMode:'two'});await tick();assert.equal(updates.length,1);assert.equal(updates[0].percentile,40);assert.equal(c.timers.size,0);
});
test('network failure stops after three attempts; cancellation suppresses pending writes and responses',async()=>{
  const c=clock(),updates=[];let attempts=0;const transport={isConfigured:()=>true,call:()=>{attempts++;return Promise.reject(Error('offline'));}};
  const task=records.createSubmission({...c,transport,onUpdate:x=>updates.push(x)});task.start(result());await tick();c.fire();await tick();c.fire();await tick();assert.equal(attempts,3);assert.equal(updates.length,1);assert.equal(c.timers.size,0);
  const d=clock();let resolve;const next=records.createSubmission({...d,transport:{isConfigured:()=>true,call:()=>new Promise(r=>resolve=r)},onUpdate:()=>assert.fail('stale update')});next.start(result());next.cancel();resolve({ok:true,gameMode:'free',ruleMode:'two'});await tick();assert.equal(d.timers.size,0);
});
test('a success from another department is rejected without a retry',async()=>{
  const c=clock(),updates=[];const task=records.createSubmission({...c,transport:{isConfigured:()=>true,call:()=>Promise.resolve({ok:true,gameMode:'free',ruleMode:'three'})},onUpdate:x=>updates.push(x)});
  task.start(result());await tick();assert.equal(updates[0].errorCode,'DEPARTMENT_MISMATCH');assert.equal(c.timers.size,0);
});
test('percentile is hidden at 49 valid records, visible at 50, and never shown for the wrong department',()=>{
  const g=createGame();g.run([g.actual('updateSoloCommunityCard'),g.actual('chooseFallingNextGoal')].join('\n'));const p=result(),info={saved:true,previousBestTotal:null};
  g.c.updateSoloCommunityCard({ok:true,gameMode:'free',ruleMode:'two',totalRecordCount:49,collecting:false,percentile:20},p,info);assert.doesNotMatch(g.elements.get('pair-community-value').textContent,/上位/);
  g.c.updateSoloCommunityCard({ok:true,gameMode:'free',ruleMode:'two',totalRecordCount:50,collecting:false,percentile:20},p,info);assert.equal(g.elements.get('pair-community-value').textContent,'上位20％！');
  g.c.updateSoloCommunityCard({ok:true,gameMode:'free',ruleMode:'three',totalRecordCount:50,percentile:20},p,info);assert.doesNotMatch(g.elements.get('pair-community-value').textContent,/上位/);
});
