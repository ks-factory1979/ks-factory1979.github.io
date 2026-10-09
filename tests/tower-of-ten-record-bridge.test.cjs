const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const records=require('../tower-of-ten/solo-records.js');
function setup(){
  let id=0;const timers=new Map(),sent=[];const source={postMessage:(data,origin)=>sent.push({data,origin})};source.parent=source;
  const win={TenTowerSoloRecords:records,addEventListener(){},removeEventListener(){}};win.top=win;
  const c=vm.createContext({window:win,URL,URLSearchParams,location:{origin:'http://127.0.0.1:8783',search:''},crypto:{getRandomValues:a=>a.fill(1)},Uint8Array,Map,Set,Promise,Date,
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
    document:{createElement:()=>({contentWindow:source,setAttribute(){},remove(){}}),body:{appendChild(){}}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tower-of-ten/gas-bridge-client.js'),'utf8'),c);
  const client=new win.TowerRecordGasBridgeClient('https://script.google.com/macros/s/test-script/exec');
  const origin='https://test-script.googleusercontent.com';
  function ready(){client.receive({source,origin,data:{protocol:'ten-tower-record-bridge-v1',channel:client.channel,type:'ready'}});}
  function reply(result,changes={}){const request=sent.at(-1).data;client.receive({source,origin,data:{protocol:request.protocol,channel:request.channel,type:'response',requestId:request.requestId,ok:true,result},...changes});}
  return {client,ready,reply,source,origin,timers,sent};
}
const payload={gameMode:'free',ruleMode:'three',resultId:'solo-test',totalBricks:12,maxChain:2,chainBonusTotal:0,tenCount:12,pairPlacements:0,endReason:'full'};
async function drain(){for(let i=0;i<6;i++)await Promise.resolve();}
test('new fixed method traverses the actual Bridge client; spoofed responses cannot resolve it',async()=>{
  const s=setup(),connection=s.client.connect();s.ready();await connection;const task=s.client.call('submitSoloResult',payload);await drain();
  assert.equal(s.sent.length,1);assert.equal(s.sent[0].data.method,'submitSoloResult');assert.equal(s.sent[0].origin,s.origin);
  s.reply({ok:true},{origin:'https://evil.invalid'});assert.equal(s.client.pending.size,1);
  s.reply({ok:true},{source:{}});assert.equal(s.client.pending.size,1);
  s.reply({ok:true,gameMode:'free',ruleMode:'three'});assert.equal((await task).ruleMode,'three');assert.equal(s.client.pending.size,0);s.client.destroy();assert.equal(s.timers.size,0);
});
test('unknown methods and extra personal fields are rejected before any iframe connection',async()=>{
  const s=setup();await assert.rejects(s.client.call('deleteRecords',payload),/BRIDGE_METHOD_NOT_ALLOWED/);await assert.rejects(s.client.call('submitSoloResult',{...payload,email:'x'}),/INVALID_RESULT/);assert.equal(s.sent.length,0);assert.equal(s.client.frame,undefined);
});
test('transport timeout rejects once and never automatically replays a submitted write',async()=>{
  const s=setup(),connection=s.client.connect();s.ready();await connection;const task=s.client.call('submitSoloResult',payload);await drain();
  const rejected=assert.rejects(task,/BRIDGE_REQUEST_TIMEOUT/);const entry=[...s.timers].at(-1);s.timers.delete(entry[0]);entry[1].fn();await rejected;assert.equal(s.sent.length,1);assert.equal(s.client.pending.size,0);s.client.destroy();
});
