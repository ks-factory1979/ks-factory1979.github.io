'use strict';
(() => {
const SAVE_KEY='hiraganaTownSave_v5_a_latest_map';
const DB_NAME='ksFactoryHiraganaTownPacksDB';
const DB_VERSION=2;
const STORE_NAME='packs';
const MAP_W=3200, MAP_H=2000, ITEM_SIZE=36;
const MIN_HIT_SCREEN=44, MIN_HIT_MAP=72, AUTO_SCROLL_EDGE=84, AUTO_SCROLL_MAX=19;
const MANIFEST=window.HIRAGANA_MANIFEST;
const ASSETS=window.HIRAGANA_ASSETS;
const ROWS=[...MANIFEST.rows].sort((a,b)=>a.sortOrder-b.sortOrder);
const ROW_BY_KEY=new Map(ROWS.map(r=>[r.rowKey,r]));
const WORD_META=new Map(MANIFEST.words.map(w=>[w.id,w]));
const VALID_IDS=new Set(MANIFEST.words.map(w=>w.id));
const VALID_PACK_IDS=new Set(ROWS.map(r=>r.packId));

const runtime={
  currentMode:'row',currentRowKey:null,currentPack:null,questions:[],questionChoices:new Map(),currentIndex:0,
  currentMissed:false,inputLocked:false,batchNewIds:[],batchFirstTry:0,recentIds:[],
  loadedPacks:new Map(),townFromBatch:false,chestAnimating:false,lastLoadAction:null
};
const dragState={active:false,finishing:false,item:null,id:null,pointerId:null,pointerType:null,grabOffsetX:0,grabOffsetY:0,clientX:0,clientY:0,raf:0,changed:false};
const saveState={unlockedIds:[],reviewIds:[],placements:{},zOrder:{},nextZ:20,completedPacks:[],lastRowKey:'a',playMode:'row',mapZoom:.70};
let saveAvailable=true,toastTimer=null;

const $=id=>document.getElementById(id);
const els={
 menuScreen:$('menuScreen'),rowScreen:$('rowScreen'),quizScreen:$('quizScreen'),townScreen:$('townScreen'),
 menuLogo:$('menuLogo'),menuQuizImage:$('menuQuizImage'),menuTownImage:$('menuTownImage'),
 menuQuizBtn:$('menuQuizBtn'),menuTownBtn:$('menuTownBtn'),teacherBtn:$('teacherBtn'),rowBackBtn:$('rowBackBtn'),rowGrid:$('rowGrid'),
 quizRowBtn:$('quizRowBtn'),quizMenuBtn:$('quizMenuBtn'),quizRowLabel:$('quizRowLabel'),questionNo:$('questionNo'),batchTreasureCount:$('batchTreasureCount'),questionWord:$('questionWord'),choices:$('choices'),feedback:$('feedback'),
 townMenuBtn:$('townMenuBtn'),townRowBtn:$('townRowBtn'),townMessage:$('townMessage'),zoomRange:$('zoomRange'),zoomLabel:$('zoomLabel'),mapShell:$('mapShell'),mapSizer:$('mapSizer'),bigMap:$('bigMap'),mapItems:$('mapItems'),chestLayer:$('chestLayer'),completionBanner:$('completionBanner'),townContinueBar:$('townContinueBar'),continueBatchBtn:$('continueBatchBtn'),
 loadingOverlay:$('loadingOverlay'),loadingText:$('loadingText'),loadingDetail:$('loadingDetail'),errorOverlay:$('errorOverlay'),errorMessage:$('errorMessage'),retryBtn:$('retryBtn'),errorMenuBtn:$('errorMenuBtn'),
 teacherModal:$('teacherModal'),teacherCloseBtn:$('teacherCloseBtn'),exportSaveBtn:$('exportSaveBtn'),importSaveBtn:$('importSaveBtn'),importSaveInput:$('importSaveInput'),clearCacheBtn:$('clearCacheBtn'),resetSaveBtn:$('resetSaveBtn'),teacherInfo:$('teacherInfo'),toast:$('toast')
};

function unique(a){return [...new Set(a)]}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function sample(a,n){return shuffle(a).slice(0,n)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2300)}
function setScreen(name){for(const s of [els.menuScreen,els.rowScreen,els.quizScreen,els.townScreen])s.classList.toggle('active',s.id===name+'Screen')}
function showLoading(title='じゅんびしているよ…',detail=''){els.loadingText.textContent=title;els.loadingDetail.textContent=detail;els.loadingOverlay.classList.remove('hidden')}
function hideLoading(){els.loadingOverlay.classList.add('hidden')}
function showError(err,retry){hideLoading();runtime.lastLoadAction=retry;els.errorMessage.textContent=err&&err.message?err.message:String(err||'もういちど ためしてね');els.errorOverlay.classList.remove('hidden')}
function hideError(){els.errorOverlay.classList.add('hidden')}
function requestFullscreenSafe(){try{const el=document.documentElement;const fn=el.requestFullscreen||el.webkitRequestFullscreen;if(fn){const p=fn.call(el);if(p&&p.catch)p.catch(()=>{})}}catch(_){}}

function initializeAssets(){
  els.menuScreen.style.backgroundImage=`url("${ASSETS.menuBackground}")`;
  els.menuLogo.src=ASSETS.menuLogo;els.menuQuizImage.src=ASSETS.quizButton;els.menuTownImage.src=ASSETS.townButton;
  els.bigMap.style.backgroundImage=`url("${ASSETS.townMap}")`;
}

function sanitizeSave(data){
  const out={unlockedIds:[],reviewIds:[],placements:{},zOrder:{},nextZ:20,completedPacks:[],lastRowKey:'a',playMode:'row',mapZoom:.70};
  if(!data||typeof data!=='object')return out;
  out.unlockedIds=unique(Array.isArray(data.unlockedIds)?data.unlockedIds.filter(id=>VALID_IDS.has(id)):[]);
  out.reviewIds=unique(Array.isArray(data.reviewIds)?data.reviewIds.filter(id=>VALID_IDS.has(id)):[]);
  out.completedPacks=unique(Array.isArray(data.completedPacks)?data.completedPacks.filter(id=>VALID_PACK_IDS.has(id)):[]);
  if(data.placements&&typeof data.placements==='object'){
    for(const [id,p] of Object.entries(data.placements)){
      if(!VALID_IDS.has(id)||!p)continue;const x=Number(p.x),y=Number(p.y);
      if(Number.isFinite(x)&&Number.isFinite(y))out.placements[id]={x:clamp(x,24,MAP_W-24),y:clamp(y,24,MAP_H-24)};
    }
  }
  if(data.zOrder&&typeof data.zOrder==='object'){
    for(const [id,z] of Object.entries(data.zOrder)){const n=Number(z);if(VALID_IDS.has(id)&&Number.isFinite(n))out.zOrder[id]=Math.max(1,Math.floor(n));}
  }
  const savedNextZ=Number(data.nextZ);const maxZ=Math.max(20,...Object.values(out.zOrder));out.nextZ=Number.isFinite(savedNextZ)?Math.max(maxZ,Math.floor(savedNextZ)):maxZ;
  if(ROW_BY_KEY.has(data.lastRowKey))out.lastRowKey=data.lastRowKey;
  if(data.playMode==='all'||data.playMode==='row')out.playMode=data.playMode;
  const z=Number(data.mapZoom??data.zoom??.70);if(Number.isFinite(z))out.mapZoom=clamp(z,.35,1.10);
  return out;
}
function loadSave(){try{const raw=localStorage.getItem(SAVE_KEY);if(raw)Object.assign(saveState,sanitizeSave(JSON.parse(raw)))}catch(e){saveAvailable=false;console.warn(e)}}
function saveNow(){
  const data={app:'hiragana-town',saveVersion:8,appVersion:'1.2.1-pages',updatedAt:new Date().toISOString(),unlockedIds:unique(saveState.unlockedIds).filter(id=>VALID_IDS.has(id)),reviewIds:unique(saveState.reviewIds).filter(id=>VALID_IDS.has(id)),placements:saveState.placements,zOrder:saveState.zOrder,nextZ:saveState.nextZ,completedPacks:unique(saveState.completedPacks).filter(id=>VALID_PACK_IDS.has(id)),lastRowKey:saveState.lastRowKey,playMode:saveState.playMode,mapZoom:saveState.mapZoom};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));saveAvailable=true}catch(e){saveAvailable=false;showToast('この端末では 保存できませんでした')}
  updateTeacherInfo();return data;
}
function updateTeacherInfo(){if(!els.teacherInfo)return;els.teacherInfo.innerHTML=`ことば：${saveState.unlockedIds.length} / ${MANIFEST.totalWords}<br>ふくしゅう：${saveState.reviewIds.length}<br>端末保存：${saveAvailable?'できています':'できていません'}`}

function openDB(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(new Error('IndexedDBなし'));const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'cacheKey'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function idbGet(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readonly');const r=tx.objectStore(STORE_NAME).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
async function idbPut(record){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).put(record);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function idbClear(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function loadPack(rowKey,{force=false}={}){
  const row=ROW_BY_KEY.get(rowKey);if(!row)throw new Error('この行は見つかりません');
  if(!force&&runtime.loadedPacks.has(rowKey))return runtime.loadedPacks.get(rowKey);
  const cacheKey=`pages-20260910@${row.packId}@${row.packVersion}`;
  if(!force){try{const cached=await idbGet(cacheKey);if(cached&&cached.pack){normalizePack(cached.pack,rowKey);runtime.loadedPacks.set(rowKey,cached.pack);return cached.pack}}catch(_){}}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
  let pack;
  try{
    els.loadingDetail.textContent=row.row+' のことばを よみこんでいるよ';
    const response=await fetch('./pack-'+rowKey+'.json',{signal:controller.signal,credentials:'omit'});
    if(!response.ok)throw new Error('ことばを よみこめませんでした。もういちど ためしてね。');
    pack=await response.json();normalizePack(pack,rowKey);
  }catch(e){if(e.name==='AbortError')throw new Error('よみこみに じかんが かかっています。つうしんを たしかめてね。');throw e}
  finally{clearTimeout(timer)}
  runtime.loadedPacks.set(rowKey,pack);
  try{await idbPut({cacheKey,pack,packVersion:row.packVersion,updatedAt:Date.now()})}catch(_){}
  return pack;
}
function normalizePack(pack,rowKey){
  if(!pack||pack.schema!=='hiragana-town-pack-v1'||!Array.isArray(pack.words))throw new Error('対応していない問題データです');
  const row=ROW_BY_KEY.get(rowKey);if(pack.packId!==row.packId||String(pack.packVersion)!==String(row.packVersion))throw new Error('問題データの版が一致しません');
  if(pack.words.length!==row.wordCount)throw new Error('問題の数が一致しません');
  const seen=new Set();for(const w of pack.words){if(!w.id||!w.word||!w.kana||!w.image||seen.has(w.id)||WORD_META.get(w.id)?.rowKey!==rowKey||WORD_META.get(w.id)?.word!==w.word||!/^\.\/word-[a-zA-Z0-9_-]+\.(png|webp|jpg)$/.test(w.image))throw new Error('ことばデータに不足があります');seen.add(w.id);w.packId=pack.packId;w.rowKey=rowKey}
  pack.treasureAssets=ASSETS.treasure;pack.rowKey=rowKey;return pack;
}

function buildRows(){
  els.rowGrid.innerHTML='';
  for(const row of ROWS){const owned=MANIFEST.words.filter(w=>w.rowKey===row.rowKey&&saveState.unlockedIds.includes(w.id)).length;const b=document.createElement('button');b.type='button';b.className='row-card';b.innerHTML=`<span class="row-initial">${row.initial}</span><span class="row-name">${row.initial}ぎょう</span><span class="row-progress">${owned} / ${row.wordCount}</span>`;b.addEventListener('click',()=>selectRow(row.rowKey));els.rowGrid.appendChild(b)}
  const allBtn=document.createElement('button');allBtn.type='button';allBtn.className='row-card all-row-card';allBtn.setAttribute('aria-label','ぜんぶから ランダム');
  allBtn.innerHTML=`<span class="all-row-icon" aria-hidden="true">🌈</span><span class="all-row-copy"><strong>ぜんぶから</strong><small>いろんな ことばに ちょうせん！</small></span><span class="row-progress all-progress">${saveState.unlockedIds.length} / ${MANIFEST.totalWords}</span>`;
  allBtn.addEventListener('click',selectAllRows);els.rowGrid.appendChild(allBtn);
}
async function selectRow(rowKey){
  saveState.lastRowKey=rowKey;saveState.playMode='row';saveNow();showLoading('じゅんびしているよ…',ROW_BY_KEY.get(rowKey).row);
  try{const pack=await loadPack(rowKey);runtime.currentMode='row';runtime.currentRowKey=rowKey;runtime.currentPack=pack;await startBatch();hideLoading();setScreen('quiz')}catch(e){showError(e,()=>selectRow(rowKey))}
}
async function selectAllRows(){
  saveState.playMode='all';saveNow();showLoading('じゅんびしているよ…','ぜんぶから 5もん');
  try{runtime.currentMode='all';runtime.currentRowKey=null;runtime.currentPack=null;await startAllBatch();hideLoading();setScreen('quiz')}catch(e){showError(e,selectAllRows)}
}
function weightedQuestionPool(pack,selected){
  const recent=new Set(runtime.recentIds.slice(-8)),chosen=new Set(selected.map(w=>w.id));
  const unowned=pack.words.filter(w=>!chosen.has(w.id)&&!saveState.unlockedIds.includes(w.id)&&!recent.has(w.id));
  const fresh=pack.words.filter(w=>!chosen.has(w.id)&&!recent.has(w.id));
  const any=pack.words.filter(w=>!chosen.has(w.id));
  return [...shuffle(unowned),...shuffle(fresh.filter(w=>!unowned.includes(w))),...shuffle(any.filter(w=>!unowned.includes(w)&&!fresh.includes(w)))];
}
function makeBatch(pack){
  const reviewSet=new Set(saveState.reviewIds);const review=shuffle(pack.words.filter(w=>reviewSet.has(w.id)&&!runtime.recentIds.slice(-3).includes(w.id)));
  const selected=review.slice(0,Math.min(2,review.length));
  for(const w of weightedQuestionPool(pack,selected)){if(selected.length>=5)break;if(!selected.some(x=>x.id===w.id))selected.push(w)}
  if(selected.length<5){for(const w of shuffle(pack.words)){if(selected.length>=5)break;if(!selected.some(x=>x.id===w.id))selected.push(w)}}
  const batch=shuffle(selected.slice(0,5));runtime.recentIds=[...runtime.recentIds,...batch.map(w=>w.id)].slice(-15);return batch;
}
function addAllCandidates(pool,selected,usedRows,limit,preferNewRow){
  for(const meta of pool){
    if(selected.length>=limit)break;
    if(selected.some(w=>w.id===meta.id))continue;
    if(preferNewRow&&usedRows.has(meta.rowKey))continue;
    selected.push(meta);usedRows.add(meta.rowKey);
  }
}
function makeAllBatchMeta(){
  const selected=[],usedRows=new Set(),reviewSet=new Set(saveState.reviewIds),recentShort=new Set(runtime.recentIds.slice(-4)),recentLong=new Set(runtime.recentIds.slice(-15));
  const reviews=shuffle(MANIFEST.words.filter(w=>reviewSet.has(w.id)&&!recentShort.has(w.id)));
  addAllCandidates(reviews,selected,usedRows,2,true);
  addAllCandidates(reviews,selected,usedRows,2,false);
  const nonReview=w=>!reviewSet.has(w.id);
  const unownedFresh=shuffle(MANIFEST.words.filter(w=>nonReview(w)&&!saveState.unlockedIds.includes(w.id)&&!recentLong.has(w.id)));
  const fresh=shuffle(MANIFEST.words.filter(w=>nonReview(w)&&!recentLong.has(w.id)));
  const unowned=shuffle(MANIFEST.words.filter(w=>nonReview(w)&&!saveState.unlockedIds.includes(w.id)));
  const anyNonReview=shuffle(MANIFEST.words.filter(nonReview));
  for(const pool of [unownedFresh,fresh,unowned,anyNonReview])addAllCandidates(pool,selected,usedRows,5,true);
  for(const pool of [unownedFresh,fresh,unowned,anyNonReview])addAllCandidates(pool,selected,usedRows,5,false);
  if(selected.length<5)addAllCandidates(shuffle(MANIFEST.words),selected,usedRows,5,false);
  const batch=shuffle(selected.slice(0,5));runtime.recentIds=[...runtime.recentIds,...batch.map(w=>w.id)].slice(-20);return batch;
}
async function hydrateAllQuestions(metas){
  const rowKeys=unique(metas.map(w=>w.rowKey));
  for(let i=0;i<rowKeys.length;i++){const row=ROW_BY_KEY.get(rowKeys[i]);els.loadingDetail.textContent=`${row?row.row:'ことば'} ${i+1}/${rowKeys.length}`;await loadPack(rowKeys[i])}
  return metas.map(meta=>{const pack=runtime.loadedPacks.get(meta.rowKey);const word=pack&&pack.words.find(w=>w.id===meta.id);if(!word)throw new Error('問題データを見つけられませんでした');return word});
}
function makeChoices(question,pack){const others=sample(pack.words.filter(w=>w.id!==question.id),2);return shuffle([question,...others])}
async function preloadImages(urls){
  await Promise.all(unique(urls).map(src=>new Promise((resolve,reject)=>{
    const img=new Image();let timer;
    const finish=error=>{clearTimeout(timer);img.onload=null;img.onerror=null;error?reject(error):resolve()};
    img.onload=()=>finish();img.onerror=()=>finish(new Error('えを よみこめませんでした。もういちど ためしてね。'));
    timer=setTimeout(()=>finish(new Error('えの よみこみに じかんが かかっています。もういちど ためしてね。')),20000);img.src=src;
  })));
}
const QUIZ_IMAGE_FIT_CACHE=new Map();
function loadImageElement(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
async function getAutoFittedChoiceImage(src){
  if(QUIZ_IMAGE_FIT_CACHE.has(src))return QUIZ_IMAGE_FIT_CACHE.get(src);
  const job=(async()=>{
    const img=await loadImageElement(src);
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    if(!w||!h)return src;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const data=ctx.getImageData(0,0,w,h).data;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const a=data[(y*w+x)*4+3];
        if(a>12){if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y;}
      }
    }
    if(maxX<0||maxY<0)return src;
    const bw=maxX-minX+1,bh=maxY-minY+1;
    const pad=Math.max(18,Math.round(Math.max(bw,bh)*0.14));
    const out=document.createElement('canvas');out.width=bw+pad*2;out.height=bh+pad*2;
    const octx=out.getContext('2d');
    octx.drawImage(img,minX,minY,bw,bh,pad,pad,bw,bh);
    return out.toDataURL('image/png');
  })().catch(()=>src);
  QUIZ_IMAGE_FIT_CACHE.set(src,job);
  return job;
}
async function startBatch(){
  const pack=runtime.currentPack;if(!pack)throw new Error('問題データがありません');
  runtime.questions=makeBatch(pack);runtime.questionChoices=new Map();runtime.currentIndex=0;runtime.currentMissed=false;runtime.inputLocked=false;runtime.batchNewIds=[];runtime.batchFirstTry=0;
  const urls=[];for(const q of runtime.questions){const c=makeChoices(q,pack);runtime.questionChoices.set(q.id,c);urls.push(...c.map(x=>x.image))}urls.push(ASSETS.treasure.closed,ASSETS.treasure.open,ASSETS.treasure.sparkle);await preloadImages(urls.filter(Boolean));renderQuestion();
}
async function startAllBatch(){
  const metas=makeAllBatchMeta();if(metas.length!==5)throw new Error('ランダム問題を5問えらべませんでした');
  runtime.questions=await hydrateAllQuestions(metas);runtime.questionChoices=new Map();runtime.currentIndex=0;runtime.currentMissed=false;runtime.inputLocked=false;runtime.batchNewIds=[];runtime.batchFirstTry=0;
  const urls=[];for(const q of runtime.questions){const pack=runtime.loadedPacks.get(q.rowKey);const c=makeChoices(q,pack);runtime.questionChoices.set(q.id,c);urls.push(...c.map(x=>x.image))}urls.push(ASSETS.treasure.closed,ASSETS.treasure.open,ASSETS.treasure.sparkle);await preloadImages(urls.filter(Boolean));renderQuestion();
}
function startCurrentBatch(){return runtime.currentMode==='all'?startAllBatch():startBatch()}
function renderQuestion(){
  const q=runtime.questions[runtime.currentIndex];if(!q){enterTownBreak();return}
  const renderToken=(runtime.questionRenderToken=(runtime.questionRenderToken||0)+1);
  runtime.currentMissed=false;runtime.inputLocked=false;els.quizRowLabel.textContent=runtime.currentMode==='all'?'ぜんぶ':ROW_BY_KEY.get(runtime.currentRowKey).initial+'ぎょう';els.questionNo.textContent=runtime.currentIndex+1;els.batchTreasureCount.textContent=runtime.batchNewIds.length;els.questionWord.textContent=q.word;els.feedback.textContent='えを えらんでね';els.feedback.className='feedback';els.choices.innerHTML='';
  for(const c of runtime.questionChoices.get(q.id)){
    const b=document.createElement('button');b.type='button';b.className='choice-card';b.dataset.id=c.id;b.setAttribute('aria-label',c.word);
    const img=document.createElement('img');img.src=c.image;img.alt=c.word;img.draggable=false;
    b.appendChild(img);
    b.addEventListener('click',()=>answerChoice(q,c,b));
    els.choices.appendChild(b);
    getAutoFittedChoiceImage(c.image).then(fitted=>{
      if(renderToken!==runtime.questionRenderToken||!img.isConnected)return;
      if(fitted)img.src=fitted;
    });
  }
}
function answerChoice(q,c,button){
  if(runtime.inputLocked||button.disabled)return;runtime.inputLocked=true;
  if(c.id!==q.id){runtime.currentMissed=true;if(!saveState.reviewIds.includes(q.id))saveState.reviewIds.push(q.id);saveNow();button.classList.add('wrong');button.disabled=true;els.feedback.textContent='もういちど かんがえてみよう！';els.feedback.className='feedback try';setTimeout(()=>{button.classList.remove('wrong');button.classList.add('used-wrong');runtime.inputLocked=false},360);return}
  button.classList.add('correct');for(const b of els.choices.querySelectorAll('button'))b.disabled=true;els.feedback.textContent='せいかい！';els.feedback.className='feedback ok';
  if(!runtime.currentMissed){saveState.reviewIds=saveState.reviewIds.filter(id=>id!==q.id);runtime.batchFirstTry++;if(!saveState.unlockedIds.includes(q.id)){saveState.unlockedIds.push(q.id);runtime.batchNewIds.push(q.id)}}
  saveNow();els.batchTreasureCount.textContent=runtime.batchNewIds.length;
  setTimeout(()=>{runtime.currentIndex++;renderQuestion()},560);
}

function rowsNeededForUnlocked(){return unique(saveState.unlockedIds.map(id=>WORD_META.get(id)?.rowKey).filter(Boolean))}
async function ensureTownPacks(){const keys=rowsNeededForUnlocked();for(let i=0;i<keys.length;i++){els.loadingDetail.textContent=`まちのアイテム ${i+1}/${keys.length}`;await loadPack(keys[i])}}
function allLoadedWords(){const a=[];for(const p of runtime.loadedPacks.values())a.push(...p.words);return a}
function getWord(id){const meta=WORD_META.get(id);if(!meta)return null;const pack=runtime.loadedPacks.get(meta.rowKey);return pack?pack.words.find(w=>w.id===id):null}

const SAFE_ZONES=[
 [80,90,640,690],[700,100,1180,710],[1210,110,2190,730],[2280,90,3100,720],
 [130,850,820,1430],[880,840,1830,1420],[1920,830,3020,1390],
 [720,1390,1510,1910],[1580,1400,2310,1920],[2350,1390,3080,1910]
];
function placementDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function findSafePlacement(extra=[]){
  const used=[...Object.values(saveState.placements),...extra];
  for(let n=0;n<180;n++){const z=SAFE_ZONES[Math.floor(Math.random()*SAFE_ZONES.length)];const p={x:Math.round(z[0]+Math.random()*(z[2]-z[0])),y:Math.round(z[1]+Math.random()*(z[3]-z[1]))};if(used.every(u=>placementDistance(p,u)>58))return p}
  const idx=Object.keys(saveState.placements).length+extra.length;return{x:100+(idx%30)*100,y:110+(Math.floor(idx/30)%18)*100}
}
function ensurePlacements(pending=[]){const extra=[];for(const id of saveState.unlockedIds){if(!saveState.placements[id]){const p=findSafePlacement(extra);saveState.placements[id]=p;extra.push(p)}}saveNow()}
function getHitboxMapSize(scale=saveState.mapZoom){return Math.max(MIN_HIT_MAP,MIN_HIT_SCREEN/Math.max(.01,scale))}
function getItemMargin(scale=saveState.mapZoom){return Math.max(ITEM_SIZE/2,getHitboxMapSize(scale)/2)}
function updateMapHitSize(){els.bigMap.style.setProperty('--map-hit-size',getHitboxMapSize()+'px')}
function mapMetrics(){
  const rect=els.mapShell.getBoundingClientRect();
  return{left:rect.left+els.mapShell.clientLeft,top:rect.top+els.mapShell.clientTop,width:els.mapShell.clientWidth,height:els.mapShell.clientHeight,scrollLeft:els.mapShell.scrollLeft,scrollTop:els.mapShell.scrollTop,zoom:saveState.mapZoom};
}
function mapPointFromMetrics(clientX,clientY,m){return{x:(clientX-m.left+m.scrollLeft)/m.zoom,y:(clientY-m.top+m.scrollTop)/m.zoom}}
function clientToMap(clientX,clientY){return mapPointFromMetrics(clientX,clientY,mapMetrics())}
function clampItemCenter(x,y,scale=saveState.mapZoom){const margin=getItemMargin(scale);return{x:clamp(x,margin,MAP_W-margin),y:clamp(y,margin,MAP_H-margin)}}
function axisAutoScroll(pointer,start,size){
  const nearStart=pointer-start,nearEnd=start+size-pointer;
  if(nearStart<AUTO_SCROLL_EDGE){const t=clamp((AUTO_SCROLL_EDGE-nearStart)/AUTO_SCROLL_EDGE,0,1);return-AUTO_SCROLL_MAX*t*t}
  if(nearEnd<AUTO_SCROLL_EDGE){const t=clamp((AUTO_SCROLL_EDGE-nearEnd)/AUTO_SCROLL_EDGE,0,1);return AUTO_SCROLL_MAX*t*t}
  return 0;
}
function autoScrollVelocity(clientX,clientY,m){return{x:axisAutoScroll(clientX,m.left,m.width),y:axisAutoScroll(clientY,m.top,m.height)}}
function ensureZOrders(){
  let max=Math.max(20,Number(saveState.nextZ)||20,...Object.values(saveState.zOrder||{}).map(Number).filter(Number.isFinite));
  if(!saveState.zOrder||typeof saveState.zOrder!=='object')saveState.zOrder={};
  for(const id of saveState.unlockedIds){if(!Number.isFinite(Number(saveState.zOrder[id])))saveState.zOrder[id]=++max}
  saveState.nextZ=max;
}
function bringItemToFront(id,item){saveState.nextZ=Math.max(20,Number(saveState.nextZ)||20)+1;saveState.zOrder[id]=saveState.nextZ;item.style.zIndex=String(saveState.nextZ)}
function applyZoom(scale,keepCenter=true){
  if(dragState.active)finishActiveDrag('zoom');
  const old=saveState.mapZoom||.70;const cx=(els.mapShell.scrollLeft+els.mapShell.clientWidth/2)/old,cy=(els.mapShell.scrollTop+els.mapShell.clientHeight/2)/old;saveState.mapZoom=clamp(Number(scale),.35,1.10);els.zoomRange.value=Math.round(saveState.mapZoom*100);els.zoomLabel.textContent=Math.round(saveState.mapZoom*100)+'%';els.mapSizer.style.width=(MAP_W*saveState.mapZoom)+'px';els.mapSizer.style.height=(MAP_H*saveState.mapZoom)+'px';els.bigMap.style.transform=`scale(${saveState.mapZoom})`;updateMapHitSize();if(keepCenter){requestAnimationFrame(()=>{els.mapShell.scrollLeft=Math.max(0,cx*saveState.mapZoom-els.mapShell.clientWidth/2);els.mapShell.scrollTop=Math.max(0,cy*saveState.mapZoom-els.mapShell.clientHeight/2)})}saveNow()
}
function renderTown(pendingIds=[]){
  ensurePlacements(pendingIds);ensureZOrders();const pending=new Set(pendingIds);els.mapItems.innerHTML='';
  for(const id of saveState.unlockedIds){const w=getWord(id);if(!w)continue;const p=clampItemCenter(saveState.placements[id].x,saveState.placements[id].y);saveState.placements[id]=p;const d=document.createElement('div');d.className='map-item'+(pending.has(id)?' pending':'');d.dataset.id=id;d.style.left=p.x+'px';d.style.top=p.y+'px';d.style.zIndex=String(saveState.zOrder[id]||20);d.innerHTML=`<img src="${w.image}" alt="${w.word}" draggable="false">`;els.mapItems.appendChild(d)}
}
function updateDraggedItemPosition(){
  if(!dragState.active||!dragState.item)return;
  const point=clientToMap(dragState.clientX,dragState.clientY);const next=clampItemCenter(point.x-dragState.grabOffsetX,point.y-dragState.grabOffsetY);const p=saveState.placements[dragState.id];
  if(!p||Math.abs(p.x-next.x)>.01||Math.abs(p.y-next.y)>.01){saveState.placements[dragState.id]=next;dragState.item.style.left=next.x+'px';dragState.item.style.top=next.y+'px';dragState.changed=true}
}
function dragAnimationLoop(){
  if(!dragState.active){dragState.raf=0;return}
  const m=mapMetrics(),v=autoScrollVelocity(dragState.clientX,dragState.clientY,m);let moved=false;
  if(v.x||v.y){const maxX=Math.max(0,els.mapShell.scrollWidth-els.mapShell.clientWidth),maxY=Math.max(0,els.mapShell.scrollHeight-els.mapShell.clientHeight);const nx=clamp(els.mapShell.scrollLeft+v.x,0,maxX),ny=clamp(els.mapShell.scrollTop+v.y,0,maxY);moved=nx!==els.mapShell.scrollLeft||ny!==els.mapShell.scrollTop;els.mapShell.scrollLeft=nx;els.mapShell.scrollTop=ny}
  updateDraggedItemPosition();dragState.raf=requestAnimationFrame(dragAnimationLoop);
}
function startItemDrag(item,id,e){
  if(runtime.chestAnimating||dragState.active||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  const placement=saveState.placements[id];if(!placement)return;e.preventDefault();bringItemToFront(id,item);const point=clientToMap(e.clientX,e.clientY);
  Object.assign(dragState,{active:true,finishing:false,item,id,pointerId:e.pointerId,pointerType:e.pointerType||'mouse',grabOffsetX:point.x-placement.x,grabOffsetY:point.y-placement.y,clientX:e.clientX,clientY:e.clientY,changed:false});
  item.classList.add('dragging');els.mapShell.classList.add('drag-active');els.zoomRange.disabled=true;try{item.setPointerCapture(e.pointerId)}catch(_){}dragState.raf=requestAnimationFrame(dragAnimationLoop);
}
function finishActiveDrag(reason='end'){
  if(!dragState.active||dragState.finishing)return;dragState.finishing=true;updateDraggedItemPosition();const item=dragState.item,id=dragState.id,pointerId=dragState.pointerId;
  dragState.active=false;if(dragState.raf)cancelAnimationFrame(dragState.raf);dragState.raf=0;
  if(id&&saveState.placements[id]){const p=clampItemCenter(saveState.placements[id].x,saveState.placements[id].y);saveState.placements[id]=p;if(item){item.style.left=p.x+'px';item.style.top=p.y+'px';item.style.zIndex=String(saveState.zOrder[id]||20)}}
  if(item){item.classList.remove('dragging');try{if(item.hasPointerCapture&&item.hasPointerCapture(pointerId))item.releasePointerCapture(pointerId)}catch(_){}}
  els.mapShell.classList.remove('drag-active');els.zoomRange.disabled=runtime.chestAnimating;saveNow();Object.assign(dragState,{active:false,finishing:false,item:null,id:null,pointerId:null,pointerType:null,grabOffsetX:0,grabOffsetY:0,clientX:0,clientY:0,raf:0,changed:false});
}
function onMapPointerDown(e){const item=e.target.closest&&e.target.closest('.map-item');if(!item||!els.mapItems.contains(item)||item.classList.contains('pending'))return;startItemDrag(item,item.dataset.id,e)}
function onDragPointerMove(e){if(!dragState.active||e.pointerId!==dragState.pointerId)return;e.preventDefault();dragState.clientX=e.clientX;dragState.clientY=e.clientY}
function onDragPointerEnd(e){if(!dragState.active||e.pointerId!==dragState.pointerId)return;dragState.clientX=e.clientX;dragState.clientY=e.clientY;finishActiveDrag(e.type)}
function onLostPointerCapture(e){if(dragState.active&&e.pointerId===dragState.pointerId)finishActiveDrag('lostpointercapture')}
function panToPoint(p,behavior='smooth'){els.mapShell.scrollTo({left:clamp(p.x*saveState.mapZoom-els.mapShell.clientWidth/2,0,Math.max(0,MAP_W*saveState.mapZoom-els.mapShell.clientWidth)),top:clamp(p.y*saveState.mapZoom-els.mapShell.clientHeight/2,0,Math.max(0,MAP_H*saveState.mapZoom-els.mapShell.clientHeight)),behavior})}
async function showTown({fromBatch=false}={}){
  runtime.townFromBatch=fromBatch;showLoading('まちを じゅんびしているよ…','');
  try{await ensureTownPacks();hideLoading();setScreen('town');applyZoom(saveState.mapZoom,false);const pending=fromBatch?[...runtime.batchNewIds]:[];renderTown(pending);els.townContinueBar.classList.add('hidden');els.townRowBtn.style.display=fromBatch?'inline-block':'inline-block';if(fromBatch){if(pending.length){els.townMessage.textContent=`たからばこを ${pending.length}こ あけるよ！`;await runChestSequence(pending)}else{els.townMessage.textContent='また ちょうせんしよう！';finishTownBreak()}}else{els.townMessage.textContent='アイテムを すきなばしょへ うごかせるよ'}}catch(e){showError(e,()=>showTown({fromBatch}))}
}
async function enterTownBreak(){await showTown({fromBatch:true})}
async function runChestSequence(ids){
  runtime.chestAnimating=true;setTownControlsDisabled(true);els.chestLayer.innerHTML='';
  for(let i=0;i<ids.length;i++){const id=ids[i],p=saveState.placements[id];els.townMessage.textContent=`たからばこ ${i+1} / ${ids.length}`;panToPoint(p);await sleep(420);const chest=document.createElement('div');chest.className='chest wiggle';chest.style.left=(p.x-37)+'px';chest.style.top=(p.y-37)+'px';chest.innerHTML=`<img src="${ASSETS.treasure.closed}" alt="たからばこ">`;els.chestLayer.innerHTML='';els.chestLayer.appendChild(chest);await sleep(500);chest.classList.remove('wiggle');chest.innerHTML=`<img src="${ASSETS.treasure.open}" alt="ひらいた たからばこ">${ASSETS.treasure.sparkle?`<img class="sparkle" src="${ASSETS.treasure.sparkle}" alt="">`:''}`;await sleep(650);const item=els.mapItems.querySelector(`[data-id="${CSS.escape(id)}"]`);if(item){item.classList.remove('pending');item.classList.add('reveal');setTimeout(()=>item.classList.remove('reveal'),650)}els.chestLayer.innerHTML='';await sleep(280)}
  runtime.chestAnimating=false;setTownControlsDisabled(false);saveNow();checkCompletions();finishTownBreak();
}
function setTownControlsDisabled(v){els.townMenuBtn.disabled=v;els.townRowBtn.disabled=v;els.zoomRange.disabled=v}
function finishTownBreak(){runtime.batchNewIds=[];els.townMessage.textContent='アイテムを すきなばしょへ うごかせるよ';els.townContinueBar.classList.remove('hidden')}
function checkCompletions(){
  const unlocked=new Set(saveState.unlockedIds);for(const row of ROWS){if(saveState.completedPacks.includes(row.packId))continue;const ids=MANIFEST.words.filter(w=>w.rowKey===row.rowKey).map(w=>w.id);if(ids.length&&ids.every(id=>unlocked.has(id))){saveState.completedPacks.push(row.packId);saveNow();showCompletion(row);break}}
}
function showCompletion(row){const c=row.completion||{};els.completionBanner.textContent=c.message||`${row.row} かんせい！`;els.completionBanner.classList.add('show');launchConfetti();setTimeout(()=>els.completionBanner.classList.remove('show'),2400)}
function launchConfetti(){const colors=['#ffd54f','#4db6e8','#ff7bac','#72d47e','#9b6ee7'];for(let i=0;i<36;i++){const d=document.createElement('div');d.className='confetti';d.style.left=(10+Math.random()*80)+'vw';d.style.top='-25px';d.style.background=colors[i%colors.length];d.style.setProperty('--dx',(Math.random()*240-120)+'px');d.style.animationDelay=(Math.random()*.35)+'s';document.body.appendChild(d);setTimeout(()=>d.remove(),1900)}}

function exportSave(){const data=saveNow();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ひらがなタウン_セーブデータ.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast('セーブを書き出しました')}
async function importSaveFile(file){
  try{
    if(file.size>512000)throw new Error('大きすぎるファイル');
    const data=JSON.parse(await file.text());
    if(!data||data.app!=='hiragana-town'||!Array.isArray(data.unlockedIds)||!Array.isArray(data.reviewIds))throw new Error('別のファイル');
    const next=sanitizeSave(data);
    if(saveState.unlockedIds.length&&!confirm('この端末の町を、読み込むセーブの町に置き換えます。よろしいですか？'))return;
    Object.assign(saveState,next);saveNow();buildRows();els.teacherModal.classList.add('hidden');showToast('セーブを読み込みました');
  }catch(e){showToast('ひらがなタウンの セーブファイルを えらんでね')}
}
function resetSave(){if(!confirm('町の記録をぜんぶ消します。よろしいですか？'))return;Object.assign(saveState,{unlockedIds:[],reviewIds:[],placements:{},zOrder:{},nextZ:20,completedPacks:[],lastRowKey:'a',playMode:'row',mapZoom:.70});saveNow();buildRows();els.teacherModal.classList.add('hidden');showToast('町の記録をリセットしました')}

function goMenu(){if(runtime.chestAnimating)return;if(dragState.active)finishActiveDrag('menu');setScreen('menu');buildRows()}
function goRows(){if(runtime.chestAnimating)return;if(dragState.active)finishActiveDrag('rows');setScreen('row');buildRows()}
function wireEvents(){
  els.menuQuizBtn.addEventListener('click',()=>{requestFullscreenSafe();goRows()});
  els.menuTownBtn.addEventListener('click',()=>{requestFullscreenSafe();showTown({fromBatch:false})});
  els.rowBackBtn.addEventListener('click',goMenu);els.quizRowBtn.addEventListener('click',goRows);els.quizMenuBtn.addEventListener('click',goMenu);els.townMenuBtn.addEventListener('click',goMenu);els.townRowBtn.addEventListener('click',goRows);
  els.continueBatchBtn.addEventListener('click',async()=>{if(runtime.chestAnimating)return;els.townContinueBar.classList.add('hidden');showLoading('つぎの もんだいを じゅんびしているよ…',runtime.currentMode==='all'?'ぜんぶから 5もん':'');try{await startCurrentBatch();hideLoading();setScreen('quiz')}catch(e){showError(e,()=>runtime.currentMode==='all'?selectAllRows():selectRow(runtime.currentRowKey))}});
  els.zoomRange.addEventListener('input',()=>{if(dragState.active)finishActiveDrag('zoom-input');applyZoom(Number(els.zoomRange.value)/100,true)});
  els.mapItems.addEventListener('pointerdown',onMapPointerDown);window.addEventListener('pointermove',onDragPointerMove,{passive:false});window.addEventListener('pointerup',onDragPointerEnd);window.addEventListener('pointercancel',onDragPointerEnd);document.addEventListener('lostpointercapture',onLostPointerCapture,true);window.addEventListener('blur',()=>finishActiveDrag('blur'));
  els.retryBtn.addEventListener('click',()=>{const fn=runtime.lastLoadAction;hideError();if(fn)fn()});els.errorMenuBtn.addEventListener('click',()=>{hideError();goMenu()});
  els.teacherBtn.addEventListener('click',()=>{updateTeacherInfo();els.teacherModal.classList.remove('hidden')});els.teacherCloseBtn.addEventListener('click',()=>els.teacherModal.classList.add('hidden'));els.teacherModal.addEventListener('click',e=>{if(e.target===els.teacherModal)els.teacherModal.classList.add('hidden')});
  els.exportSaveBtn.addEventListener('click',exportSave);els.importSaveBtn.addEventListener('click',()=>els.importSaveInput.click());els.importSaveInput.addEventListener('change',()=>{const f=els.importSaveInput.files[0];if(f)importSaveFile(f);els.importSaveInput.value='' });els.clearCacheBtn.addEventListener('click',async()=>{try{await idbClear();runtime.loadedPacks.clear();showToast('問題データのキャッシュを消しました')}catch(_){showToast('キャッシュを消せませんでした')}});els.resetSaveBtn.addEventListener('click',resetSave);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){finishActiveDrag('visibilitychange');saveNow()}});window.addEventListener('beforeunload',()=>{finishActiveDrag('beforeunload');saveNow()});
}
function init(){initializeAssets();loadSave();wireEvents();buildRows();applyZoom(saveState.mapZoom,false);updateTeacherInfo();setScreen('menu')}
init();
})();
