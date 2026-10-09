// Run selected production game functions with a deterministic clock and no browser/network.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../tower-of-ten/game.js'),'utf8');
const functions=[...source.matchAll(/^function (\w+)\(/gm)];
function actual(name){const i=functions.findIndex(x=>x[1]===name);if(i<0)throw Error(name);return source.slice(functions[i].index,functions[i+1]?.index??source.length);}
const names=['getRandomColor','getRandomTexture','makeNumberObject','makeStarBlock','isStarBlock','isPairBlock','makePairNumberValue','makePairObject',
  'isBattleMode','getActiveRuleMode','isPairFallingMode','isThreeMinuteFallingMode','isFallingMode','isRealFallingMode','getCurrentFallingConfig','isBasicTutorial','isFallingTutorial','isTutorialMode',
  'getImmediatePairs','findAllPairs','removeAndDrop','isBoardFull','resolvePlacedBlock','resolveSettledPair','processRemovals','processStarCross','getFallingChainBonus','randomNumber','canUseHold',
  'saveAndGetFalling3MinuteRecord','saveAndGetPair3MinuteRecord','saveGeneralRecords','getFallingTotalBricks','makeFallingResultId',
  'startGame','getRuleLabel','selectSoloRule','startSelectedSoloMode','getHintColumns','getNumberHintText','expireFallingChallenge','maybeFinalizeExpiredFalling','endGame','renderRuleTrialNotice'];
function createGame(){
  let now=0,nextId=0;const timers=new Map(),intervals=new Map(),stored=new Map(),elements=new Map(),calls={submits:[],screens:[],spawns:[]};
  const no=()=>{};
  const element=id=>{if(!elements.has(id)){const classes=new Set();elements.set(id,{textContent:'',firstChild:{textContent:''},hidden:false,src:'',style:{removeProperty:no},
    classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,v)=>v?classes.add(x):classes.delete(x)}});}return elements.get(id);};
  const mocks={console,Math:Object.create(Math),Date,Set,Map,Number,Array,JSON,TenTowerRules:require('../../tower-of-ten/rules.js'),
    APP_ASSETS:new Proxy({},{get:(_,key)=>key}),window:{},crypto:{randomUUID:()=>`test-result-${++nextId}`},performance:{now:()=>now},
    setTimeout:(fn,delay=0)=>{const id=++nextId;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),
    setInterval:fn=>{const id=++nextId;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),
    document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:element,visibilityState:'visible'},
    localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v))},
    battleNextNumber:()=>8,isGameScreenActive:()=>true};
  for(const name of ['updateBoardUI','updateInfoPanels','updateHints','updateFallingControls','updateHoldAvailability','highlightBlocks','playChainRiseSE','addChainPower',
    'showFallingChainBonus','showToast','playSound','updateTower','awardPendingStarBlock','playStarCrashSound','createStarEffect','cleanupStarEffectDom',
    'requestGameFullscreen','resetTransientUI','loadStoredSettings','resetSpecialGameplayState','updateActionControlVisibility','setTutorialChrome','updateTimeDisplay',
    'renderBoard','setPauseButton','hidePauseLayers','resetFallingResultPresentation','startSpeedClock','startFallingChallengeClock','clearNamedTimer',
    'removeFallingVisuals','clearGameTimers','renderFallingEnhancedResult','renderPairEnhancedResult','completeBasicTutorial','completeFallingTutorial'])mocks[name]=no;
  mocks.stopCurrentGame=no;
  mocks.scheduleSpawn=delay=>calls.spawns.push(delay);
  mocks.showScreen=screen=>{calls.screens.push(screen);element('result-screen').classList.toggle('active',screen==='result');};
  mocks.submitFallingCommunityResult=snapshot=>calls.submits.push({mode:'falling',snapshot});
  mocks.submitPairCommunityResult=snapshot=>calls.submits.push({mode:'pairFalling',snapshot});
  const c=vm.createContext(mocks),run=s=>vm.runInContext(s,c);
  run(source.slice(0,functions[0].index));
  run(names.map(actual).join('\n'));
  run('gameRunning=true;');
  function setBoard(columns){c.input=columns;run('BOARD_COLS=input.length;board=input.map(col=>col.map(val=>val===null?null:val==="STAR"?{kind:"star",val:null}:{kind:"number",val}));');}
  function state(){return JSON.parse(run('JSON.stringify({currentMode,ruleMode: getActiveRuleMode(),board,bricks,tenCount,bestChain,completedTowers,fallingChainBonusTotal,gameRunning,animating,paused,resumeCountdownActive,fallingChallengeElapsedMs,fallingTimeExpired,fallingPiece,heldBlock,holdUsedThisTurn,numbersQueue,timeLeft})'));}
  function flush(){let guard=0;while(timers.size){if(++guard>1000)throw Error('timer loop');const [id,timer]=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];timers.delete(id);now=Math.max(now,timer.at);timer.fn();}}
  function elapse(ms){now+=ms;for(const [id,fn]of [...intervals])if(intervals.has(id))fn();}
  return {c,run,setBoard,state,flush,elapse,stored,calls,elements,actual};
}
module.exports={createGame};
