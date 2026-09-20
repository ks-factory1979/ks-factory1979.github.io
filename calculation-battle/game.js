
    'use strict';
    const CONFIG = window.APP_CONFIG;
    const LION_ASSETS = Object.freeze({"normal":"assets/characters/7bb2a35ed9f725aabca3.png","tug":"assets/characters/638e9e6a9071e6dc37d6.png","roar":"assets/characters/b7ae9b7b9aafb9fda24b.png","defeated":"assets/characters/51bebb9184224da8071c.png","defeatBadge":"assets/characters/a56302480197536c0997.png","conquestEmblem":"assets/characters/b5bb7bf410d5a06b8b35.png","crownShockwave":"assets/characters/0b49cd8dfa9e8f27971e.png","royalAura":"assets/characters/c5aa5b5874d394be708b.png"});
    const MASTER_CROWN_SRC = 'assets/characters/ad0c9d5d204ba165bb4d.png';

    /* ---------- データ定義 ---------- */
    const CPU_DEFS = {
      mole: {
        name: 'まじめなモグラ', icon: '⛏️', message: 'ゆっくりだけど、まちがえない！',
        abilities: [['はやさ','★★'],['せいかくさ','★★★★★'],['ねばり','★★★★']],
        status: ['コツコツ けいさん中…'], remark: 'さいごまで ていねいに けいさんしてたね！'
      },
      rabbit: {
        name: 'せっかちウサギ', icon: '⚡', message: 'すごくはやい！でも、お手つきもあるよ！',
        abilities: [['はやさ','★★★★★'],['せいかくさ','★★★'],['ねばり','★★']],
        status: ['ものすごい スピード！','ちょっと ひとやすみ…'], remark: 'はやかったね！つぎも しょうぶしよう！'
      },
      turtle: {
        name: 'ねばりのカメ', icon: 'turtle', message: 'さいごまで あきらめない！',
        abilities: [['はやさ','★★★'],['せいかくさ','★★★★'],['ねばり','★★★★★']],
        status: ['だんだん はやくなってきた！','ここから ほんき！'], remark: 'さいごまで あきらめなかったね！'
      },
      lion: {
        name: '王者ライオン', icon: 'lion', message: 'さいきょうの王者！まけても きろくは のこるよ！',
        abilities: [['はやさ','★★★★★'],['せいかくさ','★★★★★'],['おうじゃ','★★★★★']],
        status: ['がおー！まだまだ ひくぞ！','おうじゃのほうこう！'],
        remark: 'まだまだ！でも きろくは しっかり のこったぞ！',
        officialOnly: true
      }
    };

    const CHARACTER_DEFS = {
      boy: {
        name:'おとこのこ', moveName:'いなずま！サンダープル', moveShort:'4びょう パワー1.5ばい',
        effectLabel:'POWER ×1.5', duration:CONFIG.SPECIAL.boySeconds
      },
      girl: {
        name:'おんなのこ', moveName:'しっぷう！コンボラッシュ', moveShort:'1かい ミスをまもる',
        effectLabel:'COMBO GUARD', duration:CONFIG.SPECIAL.girlSeconds
      },
      mole: {
        name:'モグラ', moveName:'すなけむり！モグラストーム', moveShort:'あいてに すなけむり',
        effectLabel:'DUST ATTACK', duration:CONFIG.SPECIAL.dustSeconds
      },
      rabbit: {
        name:'ウサギ', moveName:'ぴょんぴょん！パッドシャッフル', moveShort:'すうじキーを シャッフル',
        effectLabel:'PAD SHUFFLE', duration:CONFIG.SPECIAL.rabbitSeconds
      },
      turtle: {
        name:'カメ', moveName:'こうらガード！', moveShort:'3びょう・2かい ガード',
        effectLabel:'SHELL GUARD', duration:CONFIG.SPECIAL.turtleSeconds
      },
      lion: {
        name:'王者ライオン', moveName:'おうじゃのほうこう！キングスロアー', moveShort:'こうげき＋ぼうぎょ',
        effectLabel:'POWER ×1.6 / PULL ×0.65', duration:CONFIG.SPECIAL.lionSeconds,
        selectable:false
      }
    };

    /* 320px四方の各ドット絵で、握っている手の中心が上から何割か。 */
    const CHARACTER_GRIP_Y = Object.freeze({
      boy: 0.488,
      girl: 0.488,
      mole: 0.434,
      rabbit: 0.584,
      turtle: 0.516,
      lion: 0.553
    });

    /* v1.2.4：位置調整エディタで確定した、対戦arena専用の正規化補正。 */
    const BATTLE_POSITION_CONFIG = Object.freeze({
      schemaVersion:'hkb-position/1',
      editorVersion:'1.0.0',
      sourceSha256:'06bc014dcd952ce8cca8432df1b3ad6ca180850346aa39e86280b33c95c010ac',
      sourceZipSha256:'4a4ecef00c2ec3bebd1f48d759368b8e1a29050e42336e2e516b128f5d75e39a',
      sourceIndexSha256:'671ef7977f6a18265f0210c449b036f017ac9bcd14de998632aebb48cf066a6a',
      profiles:Object.freeze({
        solo:Object.freeze({offsetX:0,offsetY:-.138,start:0,end:1,thickness:1}),
        'duo-landscape':Object.freeze({offsetX:0,offsetY:0,start:0,end:1,thickness:1}),
        'duo-portrait':Object.freeze({offsetX:0,offsetY:0,start:0,end:1,thickness:1})
      }),
      characters:Object.freeze(Object.fromEntries([
        ['solo|player|boy|player_red_boy',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|player|girl|player_red_girl',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|player|mole|cpu_mole',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|player|rabbit|cpu_rabbit',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|player|turtle|cpu_turtle',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|cpu|mole|cpu_mole',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|cpu|rabbit|cpu_rabbit',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|cpu|turtle|cpu_turtle',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|ghost|boy|player_white_boy',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|ghost|girl|player_white_girl',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|ghost|mole|cpu_mole',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|ghost|rabbit|cpu_rabbit',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|ghost|turtle|cpu_turtle',{dx:0,dy:-.220,scale:1,snap:false}],
        ['solo|official|lion|lion_tug',{dx:0,dy:-.230,scale:1,snap:false}],
        ['solo|official|lion|lion_roar',{dx:0,dy:-.230,scale:1,snap:false}],
        ['solo|official|lion|lion_defeated',{dx:0,dy:-.230,scale:1,snap:false}],
        ['duo-landscape|red|boy|player_red_boy',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|red|girl|player_red_girl',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|red|mole|cpu_mole',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|red|rabbit|cpu_rabbit',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|red|turtle|cpu_turtle',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|white|boy|player_white_boy',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|white|girl|player_white_girl',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|white|mole|cpu_mole',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|white|rabbit|cpu_rabbit',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-landscape|white|turtle|cpu_turtle',{dx:0,dy:0,scale:1,snap:false}],
        ['duo-portrait|red|boy|player_red_boy',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|red|girl|player_red_girl',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|red|mole|cpu_mole',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|red|rabbit|cpu_rabbit',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|red|turtle|cpu_turtle',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|white|boy|player_white_boy',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|white|girl|player_white_girl',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|white|mole|cpu_mole',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|white|rabbit|cpu_rabbit',{dx:0,dy:-.080,scale:1,snap:false}],
        ['duo-portrait|white|turtle|cpu_turtle',{dx:0,dy:-.080,scale:1,snap:false}]
      ].map(([key,value])=>[key,Object.freeze(value)])))
    });

    const CATEGORY_DEFS = {
      add:{name:'たし算'}, sub:{name:'ひき算'}, mul:{name:'かけ算'},
      div:{name:'わり算'}, all:{name:'ぜんぶ'}
    };

    const COURSE_DEFS = {
      add_no_carry:{category:'add',name:'くり上がりなし',sample:'3 ＋ 4',description:'10まで',cpuFactor:1},
      add_carry:{category:'add',name:'くり上がりあり',sample:'8 ＋ 7',description:'20まで',cpuFactor:1.08},
      add_mix:{category:'add',name:'たし算ミックス',sample:'6 ＋ 3／8 ＋ 7',description:'2コース',cpuFactor:1.05},
      sub_no_borrow:{category:'sub',name:'くり下がりなし',sample:'9 − 4',description:'10まで',cpuFactor:1.04},
      sub_borrow:{category:'sub',name:'くり下がりあり',sample:'13 − 8',description:'20まで',cpuFactor:1.14},
      sub_mix:{category:'sub',name:'ひき算ミックス',sample:'9 − 4／13 − 8',description:'2コース',cpuFactor:1.1},
      mul_1:{category:'mul',name:'1のだん',sample:'1 × 8',description:'九九',cpuFactor:1.02},
      mul_2:{category:'mul',name:'2のだん',sample:'2 × 7',description:'九九',cpuFactor:1.04},
      mul_3:{category:'mul',name:'3のだん',sample:'3 × 6',description:'九九',cpuFactor:1.06},
      mul_4:{category:'mul',name:'4のだん',sample:'4 × 7',description:'九九',cpuFactor:1.08},
      mul_5:{category:'mul',name:'5のだん',sample:'5 × 8',description:'九九',cpuFactor:1.06},
      mul_6:{category:'mul',name:'6のだん',sample:'6 × 7',description:'九九',cpuFactor:1.12},
      mul_7:{category:'mul',name:'7のだん',sample:'7 × 8',description:'九九',cpuFactor:1.14},
      mul_8:{category:'mul',name:'8のだん',sample:'8 × 6',description:'九九',cpuFactor:1.13},
      mul_9:{category:'mul',name:'9のだん',sample:'9 × 7',description:'九九',cpuFactor:1.12},
      mul_mix:{category:'mul',name:'九九ミックス',sample:'3 × 8／7 × 6',description:'1〜9のだん',cpuFactor:1.14},
      div_exact:{category:'div',name:'あまりなし',sample:'24 ÷ 6',description:'わり切れる',cpuFactor:1.22},
      div_remainder:{category:'div',name:'あまりあり',sample:'17 ÷ 5',description:'商とあまり',cpuFactor:1.38},
      div_mix:{category:'div',name:'わり算ミックス',sample:'24 ÷ 6／17 ÷ 5',description:'あまりあり・なし',cpuFactor:1.31},
      all_mix:{category:'all',name:'四則ミックス',sample:'＋ − × ÷',description:'わり算は あまりなし',cpuFactor:1.2},
      all_challenge:{category:'all',name:'四則チャレンジ',sample:'＋ − × ÷',description:'あまりありも 出る',cpuFactor:1.3}
    };
    const LEVEL_DEFS = COURSE_DEFS;

    function createSideState(kind, name) {
      return {
        kind, name, correct: 0, wrong: 0, combo: 0, maxCombo: 0,
        burst: { active: false, remaining: 0, duration: CONFIG.BURST_SECONDS, count: 0, moveId: null },
        effects: {
          guardCharges:0, dustRemaining:0, shufflePending:false, shuffleActive:false,
          keyOrder:['7','8','9','4','5','6','1','2','3','0'],
          shieldRemaining:0, shieldBlocks:0
        },
        powerMultiplier: 1
      };
    }

    function createDuoSide(name) {
      return {
        ...createSideState('human', name),
        input: '', remainderInput:'', inputPart:'answer', currentProblem: null, problemNo: 0, problemId: 0, judged: false,
        lockRemaining: 0, feedbackRemaining: 0, pendingProblem: false,
        feedback: 'じゅんびしよう！', feedbackKind: '', ready: false, retryReady: false,
        hand: 'right', pointerIds: []
      };
    }

    /* 1人用と2人用は入口で分け、各対戦内でも両側の状態を独立させます。 */
    /* SafariのブラウザUIによる短い非表示は許容し、実際の画面離脱だけを対象外にします。 */
    const OFFICIAL_VISIBILITY_GRACE_MS = 2000;
    let officialVisibilityTimer = 0;

    function createOfficialAttempt() {
      return {
        playId: '', pausedUsed: false, interrupted: false,
        events: [], questionStartedAtMs: 0, submitted: false,
        lionFirstDefeatLocal: false,
        diagnostics: [], diagnosticStartedAt: performance.now(),
        hiddenSince: 0, hiddenSource: '', pageHidden: false,
        eligibilityDecision: null
      };
    }

    function officialMatchIsActive() {
      return state.playType==='official'&&(state.phase==='playing'||state.phase==='countdown');
    }

    function recordOfficialDiagnostic(type,detail={}) {
      if(state.playType!=='official'||!state.officialAttempt) return;
      const attempt=state.officialAttempt;
      const entry={
        type:String(type||'event').slice(0,40),
        matchMs:clamp(Math.round(state.elapsed*1000),0,CONFIG.MATCH_SECONDS*1000),
        sinceStartMs:Math.max(0,Math.round(performance.now()-attempt.diagnosticStartedAt)),
        visibility:document.visibilityState
      };
      Object.entries(detail||{}).forEach(([key,value])=>{
        if(['string','number','boolean'].includes(typeof value)) entry[key]=value;
      });
      attempt.diagnostics.push(entry);
      if(attempt.diagnostics.length>40) attempt.diagnostics.splice(0,attempt.diagnostics.length-40);
    }

    function clearOfficialVisibilityTimer() {
      clearTimeout(officialVisibilityTimer);
      officialVisibilityTimer=0;
    }

    function markOfficialInterrupted(source,durationMs=0) {
      if(!officialMatchIsActive()) return false;
      const attempt=state.officialAttempt;
      if(!attempt.interrupted) {
        attempt.interrupted=true;
        recordOfficialDiagnostic('interrupted',{source,durationMs:Math.max(0,Math.round(durationMs))});
      }
      return true;
    }

    function beginOfficialHidden(source,persisted=false) {
      if(!officialMatchIsActive()) return;
      const attempt=state.officialAttempt;
      if(!attempt.hiddenSince) attempt.hiddenSince=Date.now();
      attempt.hiddenSource=source;
      attempt.pageHidden=attempt.pageHidden||Boolean(persisted);
      recordOfficialDiagnostic(source,{state:'hidden',persisted:Boolean(persisted)});
      clearOfficialVisibilityTimer();
      const currentAttempt=attempt;
      officialVisibilityTimer=setTimeout(()=>{
        if(state.officialAttempt!==currentAttempt||!officialMatchIsActive()) return;
        const hiddenFor=Date.now()-currentAttempt.hiddenSince;
        if(document.hidden||currentAttempt.pageHidden) markOfficialInterrupted(currentAttempt.hiddenSource||source,hiddenFor);
      },OFFICIAL_VISIBILITY_GRACE_MS);
    }

    function restoreOfficialVisibility(source) {
      const attempt=state.officialAttempt;
      if(!attempt?.hiddenSince) return;
      const hiddenFor=Date.now()-attempt.hiddenSince;
      clearOfficialVisibilityTimer();
      if(officialMatchIsActive()&&hiddenFor>=OFFICIAL_VISIBILITY_GRACE_MS) {
        markOfficialInterrupted(attempt.hiddenSource||source,hiddenFor);
      }
      recordOfficialDiagnostic(source,{state:'visible',durationMs:Math.max(0,Math.round(hiddenFor))});
      attempt.hiddenSince=0;
      attempt.hiddenSource='';
      attempt.pageHidden=false;
    }

    const state = {
      screen: 'title', mode: null, playType: 'free', selectedCpu: null, selectedLevel: 'add_no_carry',
      selectedLevels: { red:'add_no_carry', white:'add_no_carry' },
      selectedCategories: { red:'add', white:'add' },
      selectedCharacters: { red: 'boy', white: 'boy' },
      sides: { player: createSideState('human','赤ぐみ'), opponent: createSideState('cpu','CPU') },
      phase: 'menu', paused: false, soundOn: true, gentleEffects:false, input: '', remainderInput:'', inputPart:'answer', currentProblem: null,
      ropeTarget: 0, ropeDisplay: 0, finalRope: 0, winner: 'draw',
      matchStart: 0, elapsed: 0, remaining: CONFIG.MATCH_SECONDS, lastFrame: 0,
      countdownStart: 0, inputLockRemaining: 0, feedbackRemaining: 0,
      pendingProblem: false, warningPlayed: false, resultTimer: 0,
      cpuRuntime: { nextEvent: 0, rabbitBurst: 0, resting: false }, history: [],
      ghost: null,
      ghostRuntime: { index: 0, delay: 0 },
      officialAttempt: createOfficialAttempt(),
      competition: {
        network: 'loading', monthKey: '', monthLabel: '',
        appVersion: '', rulesVersion: '',
        champions: {}, myChampionCourses: [], previousChampionCourses: [],
        lionDefeatedCourses: []
      },
      duo: {
        phase: 'idle', paused: false, pendingStart: false,
        sides: { red: createDuoSide('赤ぐみ'), white: createDuoSide('白ぐみ') },
        blocks: [], ropeTarget: 0, ropeDisplay: 0, finalRope: 0, winner: 'draw',
        elapsed: 0, remaining: CONFIG.MATCH_SECONDS, lastFrame: 0, countdownStart: 0,
        resumeCountdown: false, warningPlayed: false, pendingPulls: [], pullTimer: 0,
        finishTimer: 0, confirmAction: null
      }
    };

    const $ = (id) => document.getElementById(id);
    const screens = ['title','mode','solo-type','character','cpu','level','battle','duo','duo-result','result'];
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const rand = (min, max) => min + Math.random() * (max - min);
    const randInt = (min, max) => Math.floor(rand(min, max + 1));
    const soloCharacterType = sideKey => {
      if(sideKey==='player') return state.selectedCharacters.red;
      if(state.playType==='ghost') return state.ghost?.ghost?.characterId || state.ghost?.champion?.characterId || 'mole';
      if(state.playType==='official') return 'lion';
      return state.selectedCpu;
    };
    const duoCharacterType = sideKey => state.selectedCharacters[sideKey];
    const opponentSide = sideKey => sideKey==='red'?'white':'red';
    const standardKeyOrder = () => ['7','8','9','4','5','6','1','2','3','0'];

    const COURSE_MASTER_NAMES = Object.freeze({
      add_no_carry:'たし算・くり上がりなしマスター',
      add_carry:'たし算・くり上がりありマスター',
      add_mix:'たし算ミックスマスター',
      sub_no_borrow:'ひき算・くり下がりなしマスター',
      sub_borrow:'ひき算・くり下がりありマスター',
      sub_mix:'ひき算ミックスマスター',
      mul_1:'かけ算・1のだんマスター',
      mul_2:'かけ算・2のだんマスター',
      mul_3:'かけ算・3のだんマスター',
      mul_4:'かけ算・4のだんマスター',
      mul_5:'かけ算・5のだんマスター',
      mul_6:'かけ算・6のだんマスター',
      mul_7:'かけ算・7のだんマスター',
      mul_8:'かけ算・8のだんマスター',
      mul_9:'かけ算・9のだんマスター',
      mul_mix:'九九ミックスマスター',
      div_exact:'わり算・あまりなしマスター',
      div_remainder:'わり算・あまりありマスター',
      div_mix:'わり算ミックスマスター',
      all_mix:'四則ミックスマスター',
      all_challenge:'四則チャレンジマスター'
    });

    function createClientId() {
      if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
      return `hkb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }

    function getDeviceId() {
      const key='hkb-device-id-v1';
      try {
        let value=localStorage.getItem(key);
        if(!value) { value=createClientId(); localStorage.setItem(key,value); }
        return value;
      } catch (_) {
        if(!window.__HKB_DEVICE_ID__) window.__HKB_DEVICE_ID__=createClientId();
        return window.__HKB_DEVICE_ID__;
      }
    }

    function milestoneTitle(count) {
      if(count>=21) return '計算グランドマスター';
      if(count>=10) return '計算レジェンド';
      if(count>=5) return 'ファイブクラウン';
      if(count>=3) return 'トリプルマスター';
      return '';
    }

    const CompetitionService = createHkbCompetitionService();

    if (CONFIG.REDUCED_MOTION) document.body.classList.add('reduced-motion');

    const PIXEL_ASSETS = Object.freeze(    {
          "player_red_boy": "assets/characters/3d0368ef734227ada55d.png",
          "player_red_girl": "assets/characters/10fd3aa1f7453be31c84.png",
          "player_white_boy": "assets/characters/a3342372d52a14a1aa9a.png",
          "player_white_girl": "assets/characters/ebe6f938e03c53e39104.png",
          "cpu_mole": "assets/characters/fa696c6be740fbc140df.png",
          "cpu_rabbit": "assets/characters/a025e8cdd4d5ce81ebeb.png",
          "cpu_turtle": "assets/characters/20d189bf86495bbce974.png",
          "rope": "assets/characters/b55da1e747fb1685d4c6.png",
          "rope_marker": "assets/characters/841d4bb60614ab7e495d.png",
          "menu_background": "assets/characters/17c516aac6e586eb7300.png",
          "icon_apple": "assets/characters/2e6cc5cfde30c8f2ddc1.png",
          "icon_rocket": "assets/characters/2f510d565a3b8edd04c7.png",
          "icon_balloon": "assets/characters/9732b3be0ed1ea9f981a.png"
    });

    for (const [key,value] of Object.entries(PIXEL_ASSETS)) {
      document.documentElement.style.setProperty(`--asset-${key.replaceAll('_','-')}`, `url("${value}")`);
    }
    document.documentElement.style.setProperty('--asset-title-emblem', 'url("assets/characters/14675ac9a6247abfec21.png")');

    /* ---------- キャラクター ---------- */
    const Art = {
      character(side='red', type=state.selectedCharacters[side] || 'boy') {
        const team=side==='white'?'白ぐみ':'赤ぐみ';
        const human=type==='boy'||type==='girl';
        const key=human?`player_${side}_${type}`:`cpu_${type}`;
        const ribbon=human?'':`<i class="team-ribbon ${side}" aria-hidden="true"></i>`;
        return `<img src="${PIXEL_ASSETS[key]}" alt="${team}の${CHARACTER_DEFS[type].name}" draggable="false">${ribbon}`;
      },
      player(side='red', type=state.selectedCharacters[side] || 'boy') {
        return this.character(side,type);
      },
      duoPerson(side) {
        return this.character(side,state.selectedCharacters[side]);
      },
      lion(pose='normal') {
        const src=LION_ASSETS[pose]||LION_ASSETS.normal;
        const label={
          normal:'王者ライオン',
          tug:'綱を引く王者ライオン',
          roar:'必殺技を放つ王者ライオン',
          defeated:'プレイヤーをたたえる王者ライオン'
        }[pose]||'王者ライオン';
        return `<img src="${src}" alt="${label}" draggable="false">`;
      },
      cpu(type) {
        if(type==='lion') return this.lion('normal');
        return `<img src="${PIXEL_ASSETS[`cpu_${type}`]}" alt="${CPU_DEFS[type].name}" draggable="false">`;
      }
    };

    /* ---------- v1.2.4：対戦arena位置補正 ---------- */
    const BattlePositioning = (() => {
      const BASE_ADJUSTMENT=Object.freeze({dx:0,dy:0,scale:1,snap:false});
      let scheduledFrame=0;
      let generation=0;
      let applyCount=0;
      let lastState={
        profile:null,arena:null,rope:null,characters:[],generation:0,applyCount:0,
        unresolved:[],lastSkip:null
      };

      const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
      const px=value=>Math.abs(value)<.0005?'0px':`${value.toFixed(3)}px`;
      const copy=value=>JSON.parse(JSON.stringify(value));
      const assetFor=(side,character)=>['boy','girl'].includes(character)
        ? `player_${side}_${character}`
        : `cpu_${character}`;

      function resolveProfile(mode,portraitOverride) {
        if(mode==='solo') return 'solo';
        if(mode!=='duo') return null;
        const portrait=typeof portraitOverride==='boolean'
          ? portraitOverride
          : window.matchMedia('(orientation: portrait)').matches;
        return portrait?'duo-portrait':'duo-landscape';
      }

      function resolveCharacterAdjustment(profile,role,character,asset,pose='normal') {
        const resolvedAsset=role==='official'&&character==='lion'
          ? (asset||`lion_${pose}`)
          : asset;
        const key=[profile,role,character,resolvedAsset].join('|');
        const found=Boolean(profile&&role&&character&&resolvedAsset&&BATTLE_POSITION_CONFIG.characters[key]);
        return {key,found,...(found?BATTLE_POSITION_CONFIG.characters[key]:BASE_ADJUSTMENT)};
      }

      function calculatePixels(adjustment,arenaWidth,arenaHeight) {
        const width=finite(arenaWidth),height=finite(arenaHeight);
        return {
          x:finite(adjustment?.dx??adjustment?.offsetX)*width,
          y:finite(adjustment?.dy??adjustment?.offsetY)*height,
          scale:finite(adjustment?.scale,1)
        };
      }

      function clearVisual(element,clearIdentity=false) {
        if(!element) return;
        element.style.removeProperty('translate');
        element.style.removeProperty('scale');
        if(clearIdentity) {
          delete element.dataset.positionProfile;
          delete element.dataset.positionRole;
          delete element.dataset.positionCharacter;
          delete element.dataset.positionAsset;
          delete element.dataset.positionPose;
          delete element.dataset.positionKey;
        }
      }

      function clearTargets(clearIdentity=true) {
        const arena=$('arena');
        clearVisual(arena?.querySelector('.rope-track'),clearIdentity);
        for(const id of ['player-character','cpu-character']) {
          const element=$(id);
          clearVisual(element,clearIdentity);
          element?.style.removeProperty('top');
          element?.style.removeProperty('bottom');
        }
        const duoArena=$('duo-arena');
        clearVisual(duoArena?.querySelector('.vertical-rope'),clearIdentity);
        clearVisual($('duo-red-person'),clearIdentity);
        clearVisual($('duo-white-person'),clearIdentity);
      }

      function setIdentity(element,{profile,role,character,asset,pose='normal',key}) {
        if(!element) return;
        element.dataset.positionProfile=profile||'';
        element.dataset.positionRole=role||'';
        element.dataset.positionCharacter=character||'';
        element.dataset.positionAsset=asset||'';
        element.dataset.positionPose=pose||'normal';
        element.dataset.positionKey=key||'';
      }

      function applyVisual(element,adjustment,arenaRect) {
        const applied=calculatePixels(adjustment,arenaRect.width,arenaRect.height);
        if(applied.x||applied.y) element.style.translate=`${px(applied.x)} ${px(applied.y)}`;
        else element.style.removeProperty('translate');
        if(applied.scale!==1) element.style.scale=String(applied.scale);
        else element.style.removeProperty('scale');
        return applied;
      }

      function soloIdentities() {
        const playerCharacter=state.selectedCharacters.red;
        const playerAsset=assetFor('red',playerCharacter);
        let opponentRole='cpu';
        let opponentCharacter=state.selectedCpu;
        let opponentPose='normal';
        let opponentAsset=assetFor('white',opponentCharacter);
        if(state.playType==='ghost') {
          opponentRole='ghost';
          opponentCharacter=soloCharacterType('opponent');
          opponentAsset=assetFor('white',opponentCharacter);
        } else if(state.playType==='official') {
          opponentRole='official';
          opponentCharacter='lion';
          opponentPose=$('cpu-character')?.dataset.positionPose||'tug';
          opponentAsset=`lion_${opponentPose}`;
        }
        return [
          {element:$('player-character'),role:'player',character:playerCharacter,asset:playerAsset,pose:'normal'},
          {element:$('cpu-character'),role:opponentRole,character:opponentCharacter,asset:opponentAsset,pose:opponentPose}
        ];
      }

      function applySoloPositions() {
        if(state.screen!=='battle'||state.mode!=='solo') return false;
        const profile='solo';
        const arena=$('arena');
        const rope=arena?.querySelector('.rope-track');
        const identities=soloIdentities();
        if(!arena||!rope||identities.some(item=>!item.element)) return false;

        /* 基準測定前に前回の補正だけを外す。CSS transform/animationは触らない。 */
        clearVisual(rope);
        identities.forEach(item=>{
          clearVisual(item.element);
          item.element.style.removeProperty('top');
          item.element.style.removeProperty('bottom');
        });
        const arenaRect=arena.getBoundingClientRect();
        if(!(arenaRect.width>0&&arenaRect.height>0)) return false;
        const unresolved=[];
        const characterStates=[];

        /*
         * 位置調整エディタで確定した値は「既存のレスポンシブ基準配置 + 補正値」。
         * ここで手の位置を綱へ再スナップすると、基準配置そのものが置き換わり、
         * 綱 offsetY とキャラ dy が意図と違う相対位置で二重に効いてしまう。
         * そのため top/bottom はCSSの基準配置へ戻し、補正は個別 translate のみで重ねる。
         */
        for(const item of identities) {
          const element=item.element;
          const adjustment=resolveCharacterAdjustment(profile,item.role,item.character,item.asset,item.pose);
          setIdentity(element,{profile,...item,key:adjustment.key});
          if(!adjustment.found) {
            clearVisual(element);
            unresolved.push(adjustment.key);
            characterStates.push({role:item.role,character:item.character,asset:item.asset,pose:item.pose,
              key:adjustment.key,found:false,dx:0,dy:0,scale:1,appliedPx:{x:0,y:0,scale:1}});
            continue;
          }
          const appliedPx=applyVisual(element,adjustment,arenaRect);
          characterStates.push({role:item.role,character:item.character,asset:item.asset,pose:item.pose,
            key:adjustment.key,found:true,dx:adjustment.dx,dy:adjustment.dy,scale:adjustment.scale,appliedPx});
        }

        const ropeAdjustment=BATTLE_POSITION_CONFIG.profiles[profile];
        const ropePx=applyVisual(rope,ropeAdjustment,arenaRect);
        setIdentity(rope,{profile,role:'rope',character:'rope',asset:'rope',pose:'normal',key:`${profile}|rope`});
        applyCount++;
        lastState={
          profile,arena:{width:arenaRect.width,height:arenaRect.height},
          rope:{...ropeAdjustment,appliedPx:ropePx},characters:characterStates,
          generation,applyCount,unresolved,lastSkip:null
        };
        return true;
      }

      function applyDuoPositions() {
        if(state.screen!=='duo'||state.mode!=='duo') return false;
        const profile=resolveProfile('duo');
        const arena=$('duo-arena');
        const rope=arena?.querySelector('.vertical-rope');
        const identities=['red','white'].map(role=>{
          const character=state.selectedCharacters[role];
          return {element:$(`duo-${role}-person`),role,character,asset:assetFor(role,character),pose:'normal'};
        });
        if(!arena||!rope||identities.some(item=>!item.element)) return false;
        clearVisual(rope);
        identities.forEach(item=>clearVisual(item.element));
        const arenaRect=arena.getBoundingClientRect();
        if(!(arenaRect.width>0&&arenaRect.height>0)) return false;
        const unresolved=[];
        const characterStates=[];
        for(const item of identities) {
          const adjustment=resolveCharacterAdjustment(profile,item.role,item.character,item.asset,item.pose);
          setIdentity(item.element,{profile,...item,key:adjustment.key});
          if(!adjustment.found) {
            clearVisual(item.element);
            unresolved.push(adjustment.key);
          }
          const appliedPx=adjustment.found
            ? applyVisual(item.element,adjustment,arenaRect)
            : {x:0,y:0,scale:1};
          characterStates.push({role:item.role,character:item.character,asset:item.asset,pose:item.pose,
            key:adjustment.key,found:adjustment.found,dx:adjustment.found?adjustment.dx:0,
            dy:adjustment.found?adjustment.dy:0,scale:adjustment.found?adjustment.scale:1,appliedPx});
        }
        const ropeAdjustment=BATTLE_POSITION_CONFIG.profiles[profile];
        const ropePx=applyVisual(rope,ropeAdjustment,arenaRect);
        setIdentity(rope,{profile,role:'rope',character:'rope',asset:'rope',pose:'normal',key:`${profile}|rope`});
        applyCount++;
        lastState={
          profile,arena:{width:arenaRect.width,height:arenaRect.height},
          rope:{...ropeAdjustment,appliedPx:ropePx},characters:characterStates,
          generation,applyCount,unresolved,lastSkip:null
        };
        return true;
      }

      function schedule(expectedScreen=state.screen,retry=0) {
        if(scheduledFrame) cancelAnimationFrame(scheduledFrame);
        const token=++generation;
        scheduledFrame=requestAnimationFrame(()=>{
          scheduledFrame=0;
          if(token!==generation||state.screen!==expectedScreen) return;
          const applied=expectedScreen==='battle'
            ? applySoloPositions()
            : expectedScreen==='duo'
              ? applyDuoPositions()
              : false;
          if(!applied&&retry<2&&state.screen===expectedScreen) schedule(expectedScreen,retry+1);
          else if(!applied) lastState={...lastState,generation,applyCount,lastSkip:'zero-size-or-missing'};
        });
        return token;
      }

      function clearStaleAdjustments() {
        if(scheduledFrame) cancelAnimationFrame(scheduledFrame);
        scheduledFrame=0;
        generation++;
        clearTargets(true);
        lastState={profile:null,arena:null,rope:null,characters:[],generation,applyCount,unresolved:[],lastSkip:null};
      }

      function syncToCurrentState() {
        if(state.screen==='battle'||state.screen==='duo') return schedule(state.screen);
        clearStaleAdjustments();
        return generation;
      }

      function onScreenChange(name) {
        if(name==='battle'||name==='duo') schedule(name);
        else clearStaleAdjustments();
      }

      function setLionPose(pose) {
        const element=$('cpu-character');
        if(!element) return;
        const currentPose=String(pose||'');
        element.dataset.positionPose=currentPose;
        if(state.screen!=='battle'||state.mode!=='solo'||state.playType!=='official') return;
        const arena=$('arena');
        const arenaRect=arena?.getBoundingClientRect();
        if(!arenaRect||!(arenaRect.width>0&&arenaRect.height>0)) return;
        const asset=`lion_${currentPose}`;
        const adjustment=resolveCharacterAdjustment('solo','official','lion',asset,currentPose);
        setIdentity(element,{profile:'solo',role:'official',character:'lion',asset,pose:currentPose,key:adjustment.key});
        if(!adjustment.found) clearVisual(element);
        const appliedPx=adjustment.found
          ? applyVisual(element,adjustment,arenaRect)
          : {x:0,y:0,scale:1};
        applyCount++;
        const characterState={role:'official',character:'lion',asset,pose:currentPose,key:adjustment.key,
          found:adjustment.found,dx:adjustment.found?adjustment.dx:0,dy:adjustment.found?adjustment.dy:0,
          scale:adjustment.found?adjustment.scale:1,appliedPx};
        const characters=lastState.profile==='solo'
          ? lastState.characters.filter(item=>item.role!=='official').concat(characterState)
          : [characterState];
        const unresolved=adjustment.found
          ? (lastState.unresolved||[]).filter(key=>!key.includes('|official|lion|'))
          : [...(lastState.unresolved||[]).filter(key=>!key.includes('|official|lion|')),adjustment.key];
        lastState={...lastState,profile:'solo',arena:{width:arenaRect.width,height:arenaRect.height},
          characters,generation,applyCount,unresolved,lastSkip:null};
      }

      return {
        resolveProfile,resolveCharacterAdjustment,calculatePixels,applySoloPositions,applyDuoPositions,
        clearStaleAdjustments,syncToCurrentState,onScreenChange,setLionPose,
        getState:()=>copy(lastState)
      };
    })();

    /* ---------- 音処理（外部ファイルなし） ---------- */
    const AudioManager = {
      ctx: null,
      ensure() {
        if (!state.soundOn) return null;
        try {
          GameBGM.notifyUserGesture();
          if (!this.ctx) this.ctx = window.HikippareAudio.ensureContextSync();
          return this.ctx;
        } catch (_) { return null; }
      },
      tone(freq, duration=.08, type='sine', volume=.055, delay=0) {
        const ctx = this.ensure(); if (!ctx) return;
        const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(.001, t);
        g.gain.exponentialRampToValueAtTime(volume, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + duration);
        o.connect(g).connect(window.HikippareAudio.getSfxDestination()); o.start(t); o.stop(t + duration + .02);
      },
      play(name) {
        if (!state.soundOn) return;
        const map = {
          tap: [[430,.045,'sine',.035,0]],
          correct: [[660,.1,'sine',.06,0],[880,.13,'sine',.055,.08]],
          wrong: [[250,.13,'triangle',.05,0],[190,.15,'triangle',.045,.1]],
          pull: [[135,.08,'square',.025,0]],
          combo: [[660,.06,'square',.035,0],[880,.08,'square',.04,.05],[1100,.1,'sine',.045,.11]],
          burst: [[92,.18,'sawtooth',.055,0],[184,.16,'square',.045,.06],[368,.18,'square',.045,.16],[736,.22,'triangle',.06,.28],[1104,.3,'sine',.065,.38]],
          roar: [[72,.34,'sawtooth',.065,0],[96,.32,'square',.05,.05],[144,.26,'sawtooth',.045,.12],[288,.2,'triangle',.05,.24],[576,.28,'sine',.06,.34]],
          warning: [[760,.1,'square',.045,0]],
          finish: [[300,.18,'triangle',.05,0],[220,.24,'triangle',.05,.14]],
          victory: [[523,.12,'sine',.055,0],[659,.12,'sine',.055,.12],[784,.28,'sine',.06,.24]],
          draw: [[440,.16,'sine',.05,0],[523,.24,'sine',.05,.16]]
        };
        (map[name] || []).forEach(v => this.tone(...v));
      }
    };

    /* ---------- 画面描画 ---------- */
    const UI = {
      duoFxTimers: {},
      battleAlignmentFrame: 0,
      showScreen(name) {
        CompetitionService.cancelBattlePreparation();
        state.screen = name;
        screens.forEach(s => $(`${s}-screen`).classList.toggle('active', s === name));
        if(name==='title') {
          const wrap=document.querySelector('.title-wrap');
          wrap.classList.remove('title-enter'); void wrap.offsetWidth; wrap.classList.add('title-enter');
        }
        BattlePositioning.onScreenChange(name);
        CompetitionService.onScreenChanged(name);
        void GameBGM.onScreenChange(name);
        ViewportManager.schedule();
      },
      setDustEffect(element,remaining) {
        if(!element)return;
        const active=remaining>0;
        element.classList.toggle('dusted',active);
        if(!active) {
          element.style.removeProperty('--dust-opacity');
          return;
        }
        const total=state.gentleEffects?1.3:CONFIG.SPECIAL.dustSeconds;
        const elapsed=Math.max(0,total-remaining);
        let opacity;
        if(state.gentleEffects) {
          opacity=.18+.30*clamp(remaining/Math.max(.1,total),0,1);
        } else {
          opacity=elapsed<=.8 ? .98 : .98*Math.pow(clamp(remaining/Math.max(.1,total-.8),0,1),.68);
        }
        element.style.setProperty('--dust-opacity',opacity.toFixed(3));
      },
      showLionSpecial() {
        if(state.playType!=='official') return;
        clearTimeout(this.lionPoseTimer);
        $('cpu-character').innerHTML=Art.lion('roar');
        $('cpu-character').classList.add('lion');
        BattlePositioning.setLionPose('roar');
        $('arena').classList.remove('lion-roar-active');
        $('lion-shockwave').classList.remove('active');
        $('lion-special-banner').classList.remove('active');
        void $('arena').offsetWidth;
        $('arena').classList.add('lion-roar-active');
        $('lion-shockwave').classList.add('active');
        $('lion-special-banner').classList.add('active');
        this.lionPoseTimer=setTimeout(()=>{
          if(state.playType==='official'&&state.phase==='playing') {
            $('cpu-character').innerHTML=Art.lion('tug');
            $('cpu-character').classList.add('lion');
            BattlePositioning.setLionPose('tug');
          }
          $('arena').classList.remove('lion-roar-active');
          $('lion-shockwave').classList.remove('active');
          $('lion-special-banner').classList.remove('active');
        },CONFIG.REDUCED_MOTION?120:900);
      },
      clearLionSpecial() {
        clearTimeout(this.lionPoseTimer);
        $('lion-special-aura').classList.remove('active');
        $('lion-shockwave').classList.remove('active');
        $('lion-special-banner').classList.remove('active');
        $('arena').classList.remove('lion-roar-active','lion-defense-active');
      },
      renderCharacterCards() {
        const teams=state.mode==='duo'?['red','white']:['red'];
        document.querySelector('#character-screen .back-button').dataset.go=state.mode==='duo'?'mode':'solo-type';
        $('character-select-grid').classList.toggle('solo',state.mode!=='duo');
        $('character-select-grid').innerHTML=teams.map(team=>{
          const teamName=team==='red'?'赤ぐみ':'白ぐみ';
          return `<section class="character-team-block ${team}">
            <h3>${teamName}</h3>
            <div class="character-options">
              ${Object.entries(CHARACTER_DEFS).filter(([,character])=>character.selectable!==false).map(([type,character])=>{
                const selected=state.selectedCharacters[team]===type;
                return `<button type="button" class="character-card ${selected?'selected':''}" data-character-team="${team}" data-character="${type}" aria-pressed="${selected}">
                  <span class="character-picture">${Art.character(team,type)}</span>
                  <strong>${character.name}</strong>
                  <small>${character.moveShort}</small>
                </button>`;
              }).join('')}
            </div>
          </section>`;
        }).join('');
        $('character-next').textContent=state.mode==='duo'?'もんだいを えらぶ！':'あいてを えらぶ！';
      },
      renderCpuCards() {
        $('cpu-grid').innerHTML = Object.entries(CPU_DEFS).filter(([,cpu])=>!cpu.officialOnly).map(([id,cpu]) => `
          <button type="button" class="choice-card cpu-card ${state.selectedCpu===id?'selected':''}" data-cpu="${id}" aria-pressed="${state.selectedCpu===id}">
            <div class="cpu-picture">${Art.cpu(id)}</div><h3>${cpu.name}</h3><p>${cpu.message}</p>
            <div class="ability">${cpu.abilities.map(([a,b])=>`<span>${a}</span><span class="stars">${b}</span>`).join('')}</div>
          </button>`).join('');
        $('cpu-next').disabled = !state.selectedCpu;
      },
      renderLevelCards() {
        const teams=state.mode==='duo'?['red','white']:['red'];
        $('level-grid').className=`course-select-grid screen-content ${state.mode==='duo'?'':'solo'}`;
        $('level-grid').innerHTML=teams.map(team=>{
          const category=state.selectedCategories[team];
          const courses=Object.entries(COURSE_DEFS).filter(([,course])=>course.category===category);
          return `<section class="course-team-block ${team}">
            <h3>${team==='red'?'赤ぐみ':'白ぐみ'}の もんだい</h3>
            <div class="course-category-tabs">
              ${Object.entries(CATEGORY_DEFS).map(([id,item])=>`
                <button type="button" class="course-category-button ${category===id?'selected':''}" data-course-team="${team}" data-category="${id}" aria-pressed="${category===id}">${item.name}</button>
              `).join('')}
            </div>
            <div class="course-options ${category==='mul'?'multiplication':''}">
              ${courses.map(([id,course])=>{
                const champion=state.competition.champions[id];
                const ghostUnavailable=state.mode==='solo'&&state.playType==='ghost'&&!champion;
                const mine=Boolean(champion?.mine);
                const championBadge=state.mode==='solo'&&state.playType!=='free'
                  ? `<span class="course-champion-badge"><span class="crown-icon"><img class="master-crown-img" alt="" src="${MASTER_CROWN_SRC}"></span>${champion?(mine?'自分が王者':'王者あり'):'ぼしゅう中'}</span>`
                  : '';
                const lionDefeated=state.competition.lionDefeatedCourses.includes(id);
                const lionBadge=state.mode==='solo'&&state.playType==='official'&&lionDefeated
                  ? `<span class="course-lion-badge"><img alt="" src="${LION_ASSETS.defeatBadge}">げきは</span>`
                  : '';
                const badge=championBadge||lionBadge
                  ? `<span class="course-badge-stack">${championBadge}${lionBadge}</span>`
                  : '';
                return `
                <button type="button" class="course-option ${state.selectedLevels[team]===id?'selected':''} ${mine?'mine':''} ${ghostUnavailable?'recruiting':''}" data-course-team="${team}" data-level="${id}" aria-pressed="${state.selectedLevels[team]===id}" ${ghostUnavailable?'disabled':''}>
                  <span><strong>${course.name}</strong><small>${course.sample}</small></span>
                  ${badge}
                </button>`;
              }).join('')}
            </div>
          </section>`;
        }).join('');
        CompetitionService.applyCrownImages();
        state.selectedLevel=state.selectedLevels.red;
        $('solo-official-condition').hidden=state.mode==='duo'||state.playType!=='official';
        const ghostReady=state.playType!=='ghost'||Boolean(state.competition.champions[state.selectedLevels.red]);
        const preparing=CompetitionService.isBattlePreparationCurrent(CompetitionService.battlePreparation);
        $('battle-start').disabled = preparing||teams.some(team=>!state.selectedLevels[team])||!ghostReady;
        $('battle-start').textContent = preparing
          ? '王者データ よみこみ中…'
          : state.mode === 'duo'
            ? 'じゅんび画面へ！'
            : state.playType==='official'
              ? '公式戦スタート！'
              : state.playType==='ghost'
                ? '王者ゴーストに ちょうせん！'
                : 'たいせんスタート！';
      },
      prepareBattle() {
        const ghostMode=state.playType==='ghost';
        const officialMode=state.playType==='official';
        const playerType=state.selectedCharacters.red;
        const opponentType=officialMode?'lion':ghostMode?soloCharacterType('opponent'):state.selectedCpu;
        $('battle-cpu-name').textContent = ghostMode?'王者ゴースト':officialMode?'王者ライオン':CPU_DEFS[state.selectedCpu].name;
        $('player-character').innerHTML = Art.character('red',playerType);
        $('cpu-character').innerHTML = officialMode
          ? Art.lion('tug')
          : ghostMode
          ? Art.character('white',opponentType)
          : Art.cpu(state.selectedCpu);
        $('player-character').dataset.character=playerType;
        $('cpu-character').dataset.character=opponentType;
        $('cpu-character').classList.toggle('lion',officialMode);
        if(officialMode) BattlePositioning.setLionPose('tug');
        $('cpu-status').textContent = ghostMode?'王者の動きを さいせい中…':officialMode?'さいきょうの王者！まけても きろくは のこるよ！':CPU_DEFS[state.selectedCpu].status[0];
        this.clearLionSpecial();
        this.alignBattleCharacters();
        this.updateBattle(true);
      },
      alignBattleCharacters() {
        this.battleAlignmentFrame=BattlePositioning.syncToCurrentState();
      },
      updateBattle(force=false) {
        $('timer').textContent = `のこり ${Math.max(0, Math.ceil(state.remaining))}`;
        $('timer').classList.toggle('warning', state.remaining <= 10 && state.phase === 'playing');
        $('combo-value').textContent = state.sides.player.combo;
        $('burst-meter-fill').style.width = `${state.sides.player.burst.active ? 100 : Math.min(100, state.sides.player.combo * 10)}%`;
        const ratio = state.sides.player.burst.active ? state.sides.player.burst.remaining / Math.max(.1,state.sides.player.burst.duration) : 0;
        $('burst-time-fill').style.width = `${clamp(ratio * 100, 0, 100)}%`;
        $('burst-overlay').classList.toggle('active', state.sides.player.burst.active);
        $('burst-banner').classList.toggle('active', state.sides.player.burst.active);
        $('player-character').classList.toggle('powered',state.sides.player.burst.active);
        $('cpu-character').classList.toggle('powered',state.sides.opponent.burst.active);
        const lionActive=state.playType==='official'&&state.sides.opponent.burst.active&&state.sides.opponent.burst.moveId==='lion';
        $('lion-special-aura').classList.toggle('active',lionActive);
        $('arena').classList.toggle('lion-defense-active',lionActive);
        $('player-character').classList.toggle('shielded',state.sides.player.effects.shieldRemaining>0&&state.sides.player.effects.shieldBlocks>0);
        $('cpu-character').classList.toggle('shielded',state.sides.opponent.effects.shieldRemaining>0&&state.sides.opponent.effects.shieldBlocks>0);
        this.setDustEffect($('keypad'),state.sides.player.effects.dustRemaining);
        $('keypad').classList.toggle('shuffled',state.sides.player.effects.shuffleActive);
        $('keypad').classList.toggle('locked', state.phase !== 'playing' || state.paused || state.inputLockRemaining > 0);
        this.updateInput();
        if (force) $('rope-marker').style.left = '50%';
      },
      updateInput() {
        $('answer-display').textContent = state.input;
        $('answer-display').classList.toggle('empty', !state.input);
        const remainderMode=Boolean(state.currentProblem?.requiresRemainder);
        $('answer-card').classList.toggle('remainder-mode',remainderMode);
        $('remainder-display').textContent=state.remainderInput;
        $('remainder-display').classList.toggle('empty',!state.remainderInput);
        $('answer-display').classList.toggle('input-part-active',remainderMode&&state.inputPart==='answer');
        $('remainder-display').classList.toggle('input-part-active',remainderMode&&state.inputPart==='remainder');
      },
      feedback(text, kind='', seconds=.5) {
        $('feedback').textContent = text; $('feedback').className = `feedback-card ${kind}`; state.feedbackRemaining = seconds;
      },
      resetFeedback() { $('feedback').textContent = 'こたえを いれよう！'; $('feedback').className = 'feedback-card'; },
      setCpuStatus(text) { $('cpu-status').textContent = text; },
      animateCharacter(side, cls) {
        const el = side === 'player' ? $('player-character') : $('cpu-character');
        el.classList.remove('strain','mistake'); void el.offsetWidth; el.classList.add(cls);
        window.setTimeout(() => el.classList.remove(cls), CONFIG.REDUCED_MOTION ? 20 : 430);
      },
      toast(text) {
        $('toast').textContent = text; $('toast').classList.add('show');
        clearTimeout(this.toastTimer); this.toastTimer = setTimeout(()=>$('toast').classList.remove('show'), 2800);
      },
      prepareDuo() {
        $('duo-white-person').innerHTML = Art.duoPerson('white');
        $('duo-red-person').innerHTML = Art.duoPerson('red');
        $('duo-white-ready-character').innerHTML = Art.duoPerson('white');
        $('duo-red-ready-character').innerHTML = Art.duoPerson('red');
        $('duo-ready-level').textContent = state.selectedLevels.red===state.selectedLevels.white ? COURSE_DEFS[state.selectedLevels.red].name : 'ハンデたいせん';
        $('duo-red-ready-course').textContent=`もんだい：${COURSE_DEFS[state.selectedLevels.red].name}`;
        $('duo-white-ready-course').textContent=`もんだい：${COURSE_DEFS[state.selectedLevels.white].name}`;
        $('duo-arena').classList.remove('end-shake');
        $('duo-white-person').className = 'duo-person white';
        $('duo-red-person').className = 'duo-person red';
        $('duo-ready-overlay').style.display = 'grid';
        $('duo-countdown').classList.remove('active');
        $('duo-pause-overlay').classList.remove('active');
        this.clearDuoFx();
        this.updateDuo(true);
        BattlePositioning.syncToCurrentState();
      },
      updateDuo(force=false) {
        const d = state.duo;
        for (const sideKey of ['white','red']) {
          const side = d.sides[sideKey];
          const prefix = `duo-${sideKey}`;
          const move=CHARACTER_DEFS[duoCharacterType(sideKey)];
          $(`${prefix}-combo`).textContent = side.combo;
          $(`${prefix}-meter`).style.width = `${side.burst.active ? clamp(side.burst.remaining / Math.max(.1,side.burst.duration) * 100,0,100) : Math.min(100,side.combo*10)}%`;
          $(`${prefix}-meter-count`).textContent = side.burst.active ? '10 / 10' : `${Math.min(10,side.combo)} / 10`;
          $(`${prefix}-burst-label`).textContent = side.burst.active ? `${move.effectLabel}　あと ${Math.max(0,side.burst.remaining).toFixed(1)}びょう` : side.combo ? `あと ${Math.max(0,10-side.combo)}で ひっさつ！` : '10コンボで ひっさつ！';
          $(`${prefix}-burst-label`).classList.toggle('active',side.burst.active);
          $(`${prefix}-burst`).classList.toggle('active', side.burst.active);
          $(`${prefix}-person`).classList.toggle('powered',side.burst.active);
          $(`${prefix}-person`).classList.toggle('shielded',side.effects.shieldRemaining>0&&side.effects.shieldBlocks>0);
          $('duo-arena').classList.toggle(`${sideKey}-power`,side.burst.active);
          const showProblem = ['playing','paused','settling','ending'].includes(d.phase);
          $(`${prefix}-problem`).textContent = showProblem && side.currentProblem ? side.currentProblem.text : '？ ＋ ？';
          $(`${prefix}-answer`).textContent = side.input;
          $(`${prefix}-answer`).classList.toggle('empty', !side.input);
          const remainderMode=Boolean(side.currentProblem?.requiresRemainder);
          $(`${prefix}-answer-card`).classList.toggle('remainder-mode',remainderMode);
          $(`${prefix}-remainder`).textContent=side.remainderInput;
          $(`${prefix}-remainder`).classList.toggle('empty',!side.remainderInput);
          $(`${prefix}-answer`).classList.toggle('input-part-active',remainderMode&&side.inputPart==='answer');
          $(`${prefix}-remainder`).classList.toggle('input-part-active',remainderMode&&side.inputPart==='remainder');
          $(`${prefix}-feedback`).textContent = side.feedback;
          $(`${prefix}-feedback`).className = `duo-feedback ${side.feedbackKind}`;
          const locked = d.phase !== 'playing' || d.paused || side.lockRemaining > 0;
          $(`duo-${sideKey}-keypad`).classList.toggle('locked', locked);
          this.setDustEffect($(`duo-${sideKey}-keypad`),side.effects.dustRemaining);
          $(`duo-${sideKey}-keypad`).classList.toggle('shuffled',side.effects.shuffleActive);
          $(`duo-${sideKey}-keypad`).querySelectorAll('[data-action="submit"]').forEach(btn=>btn.disabled=locked || !hasCompleteAnswer(side,side.currentProblem));
        }
        const seconds = Math.max(0,Math.ceil(d.remaining));
        for (const id of ['duo-white-timer','duo-red-timer']) {
          $(id).innerHTML = `<small>のこり</small><strong>${seconds}</strong>`;
          $(id).classList.toggle('warning', d.remaining <= 10 && d.phase === 'playing');
        }
        if (force) {
          $('duo-rope-marker').style.top = '50%';
          $('duo-rope-marker').style.left = '';
          $('duo-rope-marker').style.setProperty('--rope-offset','0%');
        }
      },
      setDuoFeedback(sideKey,text,kind='',seconds=.5) {
        const side=state.duo.sides[sideKey];
        side.feedback=text; side.feedbackKind=kind; side.feedbackRemaining=seconds;
      },
      resetDuoFeedback(sideKey) {
        const side=state.duo.sides[sideKey];
        side.feedback='こたえを いれよう！'; side.feedbackKind='';
      },
      animateDuo(sideKey,cls) {
        const el=$(`duo-${sideKey}-person`);
        el.classList.remove('strain','mistake'); void el.offsetWidth; el.classList.add(cls);
        window.setTimeout(()=>el.classList.remove(cls),CONFIG.REDUCED_MOTION?20:430);
      },
      clearDuoFx() {
        Object.values(this.duoFxTimers).forEach(timer=>clearTimeout(timer));
        this.duoFxTimers={};
        for(const sideKey of ['white','red']) {
          const combo=$(`duo-${sideKey}-combo-fx`), power=$(`duo-${sideKey}-power-fx`);
          combo.className=`duo-combo-fx ${sideKey}`;
          power.className=`duo-power-fx ${sideKey}`;
          combo.querySelector('.duo-pixels').replaceChildren();
          power.querySelector('.duo-pixels').replaceChildren();
        }
        $('duo-arena').classList.remove('power-impact','white-power','red-power');
      },
      spawnDuoPixels(container,sideKey,count=14,strong=false) {
        const layer=container.querySelector('.duo-pixels');
        layer.replaceChildren();
        const colors=sideKey==='white' ? ['#ffffff','#5eb4ff','#ffe34c','#245d8e'] : ['#ffffff','#ff4b55','#ffb128','#ffe34c'];
        for(let i=0;i<count;i++) {
          const pixel=document.createElement('i');
          const angle=(Math.PI*2*i/count)+rand(-.16,.16);
          const distance=rand(strong?95:65,strong?235:160);
          pixel.style.setProperty('--dx',`${Math.cos(angle)*distance}px`);
          pixel.style.setProperty('--dy',`${Math.sin(angle)*distance*.64}px`);
          pixel.style.setProperty('--rot',`${randInt(-180,180)}deg`);
          pixel.style.left=`${rand(38,62)}%`;
          pixel.style.top=`${rand(38,62)}%`;
          pixel.style.background=colors[i%colors.length];
          pixel.style.animationDelay=`${rand(0,.09).toFixed(2)}s`;
          layer.appendChild(pixel);
        }
      },
      showDuoComboFx(sideKey,combo) {
        if(combo<2 || combo>=10) return;
        const fx=$(`duo-${sideKey}-combo-fx`);
        const tier=combo>=8?'tier3':combo>=5?'tier2':'tier1';
        $(`duo-${sideKey}-combo-fx-number`).textContent=combo;
        fx.className=`duo-combo-fx ${sideKey} ${tier}`;
        void fx.offsetWidth;
        fx.classList.add('show');
        this.spawnDuoPixels(fx,sideKey,combo>=8?22:combo>=5?17:12,combo>=8);
        clearTimeout(this.duoFxTimers[`combo-${sideKey}`]);
        this.duoFxTimers[`combo-${sideKey}`]=setTimeout(()=>fx.className=`duo-combo-fx ${sideKey}`,CONFIG.REDUCED_MOTION?20:700);
      },
      showDuoPowerFx(sideKey,type=duoCharacterType(sideKey)) {
        const fx=$(`duo-${sideKey}-power-fx`), arena=$('duo-arena');
        const move=CHARACTER_DEFS[type];
        $(`duo-${sideKey}-power-title`).textContent=move.moveName;
        $(`duo-${sideKey}-power-subtitle`).textContent=move.effectLabel;
        fx.className=`duo-power-fx ${sideKey} move-${type}`;
        void fx.offsetWidth;
        fx.classList.add('show');
        this.spawnDuoPixels(fx,sideKey,32,true);
        arena.classList.remove('power-impact');
        void arena.offsetWidth;
        arena.classList.add('power-impact');
        clearTimeout(this.duoFxTimers[`power-${sideKey}`]);
        clearTimeout(this.duoFxTimers.impact);
        this.duoFxTimers[`power-${sideKey}`]=setTimeout(()=>fx.className=`duo-power-fx ${sideKey}`,CONFIG.REDUCED_MOTION?20:1050);
        this.duoFxTimers.impact=setTimeout(()=>arena.classList.remove('power-impact'),CONFIG.REDUCED_MOTION?20:780);
      },
      renderDuoReady() {
        const red=state.duo.sides.red, white=state.duo.sides.white;
        $('duo-screen').classList.toggle('red-left',red.hand==='left');
        $('duo-screen').classList.toggle('white-left',white.hand==='left');
        document.querySelectorAll('.duo-hand-button').forEach(button=>{
          const side=state.duo.sides[button.dataset.handSide];
          button.classList.toggle('selected',side.hand===button.dataset.hand);
          button.disabled=side.ready;
          button.setAttribute('aria-pressed',String(side.hand===button.dataset.hand));
        });
        const label=(side,key)=>{
          const other=key==='red'?white:red;
          if(side.ready) return other.ready ? `${side.name}　スタート！` : `${side.name}　あと ひとり！`;
          return `${side.name}　じゅんびOK！`;
        };
        $('duo-red-ready').textContent=label(red,'red');
        $('duo-white-ready').textContent=label(white,'white');
        $('duo-red-ready').classList.toggle('ready',red.ready);
        $('duo-white-ready').classList.toggle('ready',white.ready);
        $('duo-change-level').disabled=red.ready||white.ready;
      },
      renderDuoResult() {
        const d=state.duo;
        const statsHtml=side=>{
          const total=side.correct+side.wrong,accuracy=total?Math.round(side.correct/total*100):0;
          return [
            ['せいかい',side.correct],['まちがい',side.wrong],['せいかくさ',`${accuracy}%`],
            ['さいだい',side.maxCombo],['ひっさつ',`${side.burst.count}回`]
          ].map(([label,value])=>`<div class="duo-result-stat">${label}<strong>${value}</strong></div>`).join('');
        };
        $('duo-white-result-stats').innerHTML=statsHtml(d.sides.white);
        $('duo-red-result-stats').innerHTML=statsHtml(d.sides.red);
        $('duo-result-winner').textContent=d.winner==='red'?'赤ぐみの かち！':d.winner==='white'?'白ぐみの かち！':'ひきわけ！';
        const resultMessage=(sideKey)=>{
          const won=d.winner===sideKey, lost=d.winner!=='draw'&&!won;
          const base=won
            ? `<span class="result-callout">やったね！</span><span class="result-summary">${sideKey==='red'?'赤':'白'}ぐみの かち！</span>`
            : lost
              ? '<span class="result-callout">おしかった！</span><span class="result-summary">さいごまで がんばったね！</span>'
              : '<span class="result-summary">いい しょうぶ！</span>';
          return `${base}<small>${COURSE_DEFS[state.selectedLevels[sideKey]].name} ／ ${CHARACTER_DEFS[state.selectedCharacters[sideKey]].moveName}</small>`;
        };
        $('duo-red-result-message').innerHTML=resultMessage('red');
        $('duo-white-result-message').innerHTML=resultMessage('white');
        const compressed=Math.sign(d.finalRope)*Math.pow(Math.abs(d.finalRope)/100,.78)*32;
        $('duo-result-marker').style.top=`${50+compressed}%`;
        for(const key of ['red','white']) {
          d.sides[key].retryReady=false;
          $(`duo-${key}-retry`).textContent='もういちど！';
          $(`duo-${key}-retry`).classList.remove('ready');
        }
      },
      renderResult() {
        const p = state.sides.player, ghostMode=state.playType==='ghost', officialMode=state.playType==='official';
        const cpu = ghostMode
          ? {name:'王者ゴースト',remark:'王者の記録に 何度でも ちょうせんしてね！'}
          : officialMode
            ? {
                name:'王者ライオン',
                remark:state.winner==='player'
                  ? 'みごとだ！きみは ほんものの つわものだ！'
                  : 'まだまだ！でも きろくは しっかり のこったぞ！'
              }
            : CPU_DEFS[state.selectedCpu];
        const total = p.correct + p.wrong, accuracy = total ? Math.round(p.correct / total * 100) : 0;
        const heading = officialMode&&state.winner==='player'
          ? '王者ライオンを たおした！'
          : state.winner === 'player'
            ? 'かったよ！'
            : state.winner === 'opponent'
              ? 'ナイスしょうぶ！'
              : 'ひきわけ！';
        $('result-heading').textContent = heading;
        $('result-cpu-picture').innerHTML = officialMode
          ? Art.lion(state.winner==='player'?'defeated':'normal')
          : ghostMode
          ? Art.character('white',soloCharacterType('opponent'))
          : Art.cpu(state.selectedCpu);
        $('cpu-remark').textContent = cpu.remark;
        const officialMark=state.playType==='official'?' ／ 公式戦':'';
        $('result-meta').textContent = `${cpu.name} ／ ${COURSE_DEFS[state.selectedLevels.red].name} ／ ${CHARACTER_DEFS[state.selectedCharacters.red].moveName}${officialMark}`;
        $('stat-correct').textContent = p.correct; $('stat-wrong').textContent = p.wrong;
        $('stat-accuracy').textContent = `${accuracy}%`; $('stat-combo').textContent = p.maxCombo;
        $('stat-burst').textContent = `${p.burst.count}回`;
        $('stat-rope').textContent = Math.abs(state.finalRope) <= CONFIG.DRAW_RANGE ? 'まんなか' : state.finalRope > 0 ? `赤へ ${Math.round(state.finalRope)}` : `白へ ${Math.abs(Math.round(state.finalRope))}`;
        $('change-cpu-button').textContent=state.playType==='free'?'あいてをかえる':'もんだいをかえる';
      }
    };

    /* ---------- 問題生成 ---------- */
    const ProblemGenerator = {
      generate(level,history=state.history) {
        let problem;
        for (let tries=0; tries<40; tries++) {
          problem = this.make(level);
          if (!history.includes(problem.key)) break;
        }
        history.push(problem.key); if (history.length > 5) history.shift();
        return problem;
      },
      make(level, desiredType=null) {
        if(level==='add_mix') return this.make(desiredType||(['add_no_carry','add_carry'][randInt(0,1)]));
        if(level==='sub_mix') return this.make(desiredType||(['sub_no_borrow','sub_borrow'][randInt(0,1)]));
        if(level==='div_mix') return this.make(desiredType||(['div_exact','div_remainder'][randInt(0,1)]));
        if(level==='all_mix') {
          const options=['add_no_carry','add_carry','sub_no_borrow','sub_borrow','mul_mix','div_exact'];
          return this.make(desiredType||options[randInt(0,options.length-1)]);
        }
        if(level==='all_challenge') {
          const options=['add_no_carry','add_carry','sub_no_borrow','sub_borrow','mul_mix','div_exact','div_remainder'];
          return this.make(desiredType||options[randInt(0,options.length-1)]);
        }

        let a=0,b=0,answer=0,remainder=null,op='＋';
        if(level==='add_no_carry') {
          a=randInt(0,10); b=randInt(0,10-a); answer=a+b;
        } else if(level==='add_carry') {
          do { a=randInt(2,9); b=randInt(2,9); } while(a+b<10||a+b>20);
          answer=a+b;
        } else if(level==='sub_no_borrow') {
          a=randInt(0,10); b=randInt(0,a); answer=a-b; op='−';
        } else if(level==='sub_borrow') {
          do { a=randInt(10,19); b=randInt(1,9); } while(a%10>=b);
          answer=a-b; op='−';
        } else if(level.startsWith('mul_')) {
          const fixed=level==='mul_mix'?(desiredType||randInt(1,9)):Number(level.slice(4));
          a=fixed; b=randInt(1,9); answer=a*b; op='×';
        } else if(level==='div_exact') {
          b=randInt(1,9); answer=randInt(1,9); a=b*answer; op='÷';
        } else if(level==='div_remainder') {
          b=randInt(2,9); answer=randInt(1,9); remainder=randInt(1,b-1); a=b*answer+remainder;
          if(a>99) { answer=randInt(1,8); a=b*answer+remainder; }
          op='÷';
        } else {
          return this.make('add_no_carry');
        }
        const requiresRemainder=remainder!==null;
        return {
          a,b,answer,remainder,requiresRemainder,op,course:level,
          key:`${a}${op}${b}${requiresRemainder?`r${remainder}`:''}`,
          text:`${a} ${op} ${b}`
        };
      },
      makeFairBlock(level) {
        const block=[], used=new Set();
        let types=Array(10).fill(null);
        if(level==='add_mix') types=['add_no_carry','add_carry','add_no_carry','add_carry','add_no_carry','add_carry','add_no_carry','add_carry','add_no_carry','add_carry'];
        if(level==='sub_mix') types=['sub_no_borrow','sub_borrow','sub_no_borrow','sub_borrow','sub_no_borrow','sub_borrow','sub_no_borrow','sub_borrow','sub_no_borrow','sub_borrow'];
        if(level==='div_mix') types=['div_exact','div_remainder','div_exact','div_remainder','div_exact','div_remainder','div_exact','div_remainder','div_exact','div_remainder'];
        if(level==='mul_mix') types=[1,2,3,4,5,6,7,8,9,randInt(1,9)];
        if(level==='all_mix') types=['add_no_carry','add_carry','sub_no_borrow','sub_borrow','mul_mix','mul_mix','div_exact','div_exact','add_mix','sub_mix'];
        if(level==='all_challenge') types=['add_no_carry','add_carry','sub_no_borrow','sub_borrow','mul_mix','mul_mix','div_exact','div_remainder','add_mix','sub_mix'];
        for(const desired of types) {
          let problem;
          for(let tries=0;tries<60;tries++) {
            problem=this.make(level,desired);
            if(!used.has(problem.key)) break;
          }
          used.add(problem.key); block.push(problem);
        }
        return block;
      }
    };

    function hasCompleteAnswer(holder,problem) {
      if(!problem||!holder.input) return false;
      return !problem.requiresRemainder||holder.remainderInput!=='';
    }

    function answerIsCorrect(holder,problem) {
      if(!hasCompleteAnswer(holder,problem)) return false;
      if(Number(holder.input)!==problem.answer) return false;
      return !problem.requiresRemainder||Number(holder.remainderInput)===problem.remainder;
    }

    function resetAnswer(holder) {
      holder.input=''; holder.remainderInput=''; holder.inputPart='answer';
    }

    function nextProblem() {
      state.currentProblem = ProblemGenerator.generate(state.selectedLevels.red);
      resetAnswer(state); state.pendingProblem = false;
      state.officialAttempt.questionStartedAtMs=Math.max(0,Math.round(state.elapsed*1000));
      SpecialMoveEngine.onSoloProblem('player');
      $('problem-display').textContent = state.currentProblem.text;
      UI.updateInput();
    }

    function randomKeyOrder(gentle=false) {
      const values=standardKeyOrder();
      if(gentle) {
        const first=randInt(0,8);
        let second=randInt(0,8);
        if(second===first) second=(second+1)%9;
        [values[first],values[second]]=[values[second],values[first]];
        return values;
      }
      for(let i=values.length-1;i>0;i--) {
        const j=randInt(0,i); [values[i],values[j]]=[values[j],values[i]];
      }
      if(values.every((value,index)=>value===standardKeyOrder()[index])) [values[0],values[1]]=[values[1],values[0]];
      return values;
    }

    function setSoloKeyOrder(order=standardKeyOrder()) {
      const buttons=[...$('keypad').querySelectorAll('.key[data-key]')];
      buttons.forEach((button,index)=>{
        const value=order[index]; button.dataset.key=value; button.textContent=value;
      });
    }

    const SpecialMoveEngine = {
      multiplier(type) {
        if(type==='lion') return CONFIG.SPECIAL.lionPower;
        return type==='boy'?1.5:1.3;
      },
      activateSolo(sideKey) {
        const side=state.sides[sideKey],type=soloCharacterType(sideKey),move=CHARACTER_DEFS[type];
        const targetKey=sideKey==='player'?'opponent':'player',target=state.sides[targetKey];
        side.burst.active=true; side.burst.remaining=move.duration; side.burst.duration=move.duration;
        side.burst.count++; side.burst.moveId=type; side.powerMultiplier=this.multiplier(type);
        if(type==='girl') side.effects.guardCharges=1;
        if(type==='mole') {
          const dustSeconds=state.gentleEffects?1.3:CONFIG.SPECIAL.dustSeconds;
          target.effects.dustRemaining=dustSeconds;
          if(targetKey==='opponent') {
            if(state.playType==='ghost') state.ghostRuntime.delay+=dustSeconds;
            else state.cpuRuntime.nextEvent+=dustSeconds;
          }
        }
        if(type==='rabbit') {
          if(targetKey==='player') target.effects.shufflePending=true;
          else if(state.playType==='ghost') state.ghostRuntime.delay+=1.8;
          else state.cpuRuntime.nextEvent+=1.8;
        }
        if(type==='turtle') {
          side.effects.shieldRemaining=CONFIG.SPECIAL.turtleSeconds;
          side.effects.shieldBlocks=CONFIG.SPECIAL.turtleBlocks;
        }
        if(type==='lion'&&sideKey==='opponent') UI.showLionSpecial();
        if(sideKey==='player') {
          $('solo-special-title').textContent=move.moveName;
          $('solo-special-effect').textContent=move.effectLabel;
          UI.feedback(move.moveName,'good',.95);
        } else {
          UI.setCpuStatus(`${move.moveName}！`);
        }
        AudioManager.play(type==='lion'?'roar':'burst');
      },
      activateDuo(sideKey) {
        const side=state.duo.sides[sideKey],type=duoCharacterType(sideKey),move=CHARACTER_DEFS[type];
        const target=state.duo.sides[opponentSide(sideKey)];
        side.burst.active=true; side.burst.remaining=move.duration; side.burst.duration=move.duration;
        side.burst.count++; side.burst.moveId=type; side.powerMultiplier=this.multiplier(type);
        if(type==='girl') side.effects.guardCharges=1;
        if(type==='mole') target.effects.dustRemaining=state.gentleEffects?1.3:CONFIG.SPECIAL.dustSeconds;
        if(type==='rabbit') target.effects.shufflePending=true;
        if(type==='turtle') {
          side.effects.shieldRemaining=CONFIG.SPECIAL.turtleSeconds;
          side.effects.shieldBlocks=CONFIG.SPECIAL.turtleBlocks;
        }
        AudioManager.play('burst');
        if(type==='mole') {
          /* 砂煙そのものを見せ、画面中央の「すなけむり」文字は出さない。 */
          UI.setDuoFeedback(sideKey,'ひっさつ！','good',.95);
        } else {
          UI.setDuoFeedback(sideKey,move.moveName,'good',.95);
          UI.showDuoPowerFx(sideKey,type);
        }
      },
      endSolo(sideKey) {
        const side=state.sides[sideKey];
        side.burst.active=false; side.burst.remaining=0; side.combo=0; side.powerMultiplier=1;
        side.effects.guardCharges=0;
        if(sideKey==='opponent'&&side.burst.moveId==='lion') UI.setCpuStatus('がおー！まだまだ ひくぞ！');
      },
      endDuo(sideKey) {
        const side=state.duo.sides[sideKey];
        side.burst.active=false; side.burst.remaining=0; side.combo=0; side.powerMultiplier=1;
        side.effects.guardCharges=0;
      },
      guardWrongSolo(sideKey) {
        const side=state.sides[sideKey];
        if(side.burst.active&&side.burst.moveId==='girl'&&side.effects.guardCharges>0) {
          side.effects.guardCharges--;
          if(sideKey==='player') UI.feedback('コンボを まもった！','good',.75);
          return true;
        }
        return false;
      },
      guardWrongDuo(sideKey) {
        const side=state.duo.sides[sideKey];
        if(side.burst.active&&side.burst.moveId==='girl'&&side.effects.guardCharges>0) {
          side.effects.guardCharges--; UI.setDuoFeedback(sideKey,'コンボを まもった！','good',.75); return true;
        }
        return false;
      },
      absorbSolo(defenderKey) {
        const side=state.sides[defenderKey];
        if(side.effects.shieldRemaining<=0||side.effects.shieldBlocks<=0) return false;
        side.effects.shieldBlocks--;
        if(side.effects.shieldBlocks<=0) side.effects.shieldRemaining=0;
        if(defenderKey==='player') UI.feedback('こうらガード！','good',.55);
        else UI.setCpuStatus('こうらで ガード！');
        return true;
      },
      absorbDuo(defenderKey) {
        const side=state.duo.sides[defenderKey];
        if(side.effects.shieldRemaining<=0||side.effects.shieldBlocks<=0) return false;
        side.effects.shieldBlocks--;
        if(side.effects.shieldBlocks<=0) side.effects.shieldRemaining=0;
        UI.setDuoFeedback(defenderKey,'こうらで ガード！','good',.55);
        return true;
      },
      tickEffects(side,dt) {
        side.effects.dustRemaining=Math.max(0,side.effects.dustRemaining-dt);
        side.effects.shieldRemaining=Math.max(0,side.effects.shieldRemaining-dt);
        if(side.effects.shieldRemaining<=0) side.effects.shieldBlocks=0;
      },
      tickSolo(dt) {
        for(const key of ['player','opponent']) this.tickEffects(state.sides[key],dt);
      },
      tickDuo(dt) {
        for(const key of ['red','white']) this.tickEffects(state.duo.sides[key],dt);
      },
      onSoloProblem(sideKey) {
        if(sideKey!=='player') return;
        const effects=state.sides.player.effects;
        if(effects.shuffleActive) {
          effects.shuffleActive=false; effects.keyOrder=standardKeyOrder();
        }
        if(effects.shufflePending) {
          effects.shufflePending=false; effects.shuffleActive=true; effects.keyOrder=randomKeyOrder(state.gentleEffects);
          UI.feedback('すうじキーが かわった！','try',.75);
        }
        setSoloKeyOrder(effects.keyOrder);
      },
      onDuoProblem(sideKey) {
        const effects=state.duo.sides[sideKey].effects;
        if(effects.shuffleActive) {
          effects.shuffleActive=false; effects.keyOrder=standardKeyOrder();
        }
        if(effects.shufflePending) {
          effects.shufflePending=false; effects.shuffleActive=true; effects.keyOrder=randomKeyOrder(state.gentleEffects);
          UI.setDuoFeedback(sideKey,'すうじキーが かわった！','try',.75);
        }
        renderDuoKeypad(sideKey);
      }
    };

    /* ---------- コンボ・綱処理 ---------- */
    const ComboEngine = {
      normalMultiplier(combo) {
        if (combo >= 8) return 1.3; if (combo >= 5) return 1.2; if (combo >= 3) return 1.1; return 1;
      },
      correct(sideKey) {
        const side = state.sides[sideKey]; side.correct++;
        if (!side.burst.active) {
          side.combo++; side.maxCombo = Math.max(side.maxCombo, side.combo);
          if (side.combo >= 10) this.startBurst(sideKey);
        }
        side.powerMultiplier = side.burst.active ? SpecialMoveEngine.multiplier(soloCharacterType(sideKey)) : this.normalMultiplier(side.combo);
        return side.powerMultiplier;
      },
      wrong(sideKey) {
        const side = state.sides[sideKey]; side.wrong++;
        if(SpecialMoveEngine.guardWrongSolo(sideKey)) return true;
        side.combo = 0; side.powerMultiplier = 1;
        if (side.burst.active) this.endBurst(sideKey);
        return false;
      },
      startBurst(sideKey) {
        SpecialMoveEngine.activateSolo(sideKey);
      },
      endBurst(sideKey) {
        SpecialMoveEngine.endSolo(sideKey);
      },
      tick(dt) {
        for (const key of ['player','opponent']) {
          const side = state.sides[key];
          if (side.burst.active) { side.burst.remaining -= dt; if (side.burst.remaining <= 0) this.endBurst(key); }
        }
        SpecialMoveEngine.tickSolo(dt);
      }
    };

    const RopeEngine = {
      pull(sideKey, multiplier) {
        let amount = CONFIG.BASE_PULL_POWER * multiplier;
        if(
          sideKey==='player'
          && state.sides.opponent.burst.active
          && state.sides.opponent.burst.moveId==='lion'
        ) {
          amount*=CONFIG.SPECIAL.lionDefenseFactor;
        }
        const defender=sideKey==='player'?'opponent':'player';
        const blocked=SpecialMoveEngine.absorbSolo(defender);
        if(!blocked) state.ropeTarget = clamp(state.ropeTarget + (sideKey === 'player' ? amount : -amount), -100, 100);
        AudioManager.play('pull');
        return !blocked;
      },
      tick(dt) {
        const follow = CONFIG.REDUCED_MOTION ? 1 : 1 - Math.pow(.001, dt);
        state.ropeDisplay += (state.ropeTarget - state.ropeDisplay) * follow;
        const compressed = Math.sign(state.ropeDisplay) * Math.pow(Math.abs(state.ropeDisplay)/100, .78) * 32;
        $('rope-marker').style.left = `${50 - compressed}%`;
      }
    };

    /* ---------- 入力・正誤判定 ---------- */
    function recordOfficialEvent(correct) {
      if(state.playType!=='official'||state.phase!=='playing') return;
      const t=clamp(Math.round(state.elapsed*1000),0,CONFIG.MATCH_SECONDS*1000);
      const r=clamp(t-state.officialAttempt.questionStartedAtMs,0,CONFIG.MATCH_SECONDS*1000);
      state.officialAttempt.events.push({t,r,ok:Boolean(correct)});
    }

    const InputController = {
      canUse() { return state.screen==='battle' && state.phase==='playing' && !state.paused && state.inputLockRemaining<=0; },
      digit(d) {
        if (!this.canUse()) return;
        if(state.currentProblem?.requiresRemainder) {
          if(state.inputPart==='answer') {
            if(state.input.length>=1) return;
            state.input=String(d); state.inputPart='remainder';
          } else {
            if(state.remainderInput.length>=1) return;
            state.remainderInput=String(d);
          }
        } else {
          if(state.input.length>=CONFIG.MAX_ANSWER_DIGITS) return;
          state.input+=String(d);
        }
        AudioManager.play('tap'); UI.updateInput();
      },
      deleteOne() {
        if (!this.canUse()) return;
        if(state.currentProblem?.requiresRemainder) {
          if(state.remainderInput) state.remainderInput=state.remainderInput.slice(0,-1);
          else { state.inputPart='answer'; state.input=state.input.slice(0,-1); }
        } else state.input=state.input.slice(0,-1);
        AudioManager.play('tap'); UI.updateInput();
      },
      clear() { if (!this.canUse()) return; resetAnswer(state); AudioManager.play('tap'); UI.updateInput(); },
      submit() {
        if (!this.canUse() || !hasCompleteAnswer(state,state.currentProblem)) return;
        const correct=answerIsCorrect(state,state.currentProblem); resetAnswer(state); UI.updateInput();
        recordOfficialEvent(correct);
        if (correct) {
          const multiplier = ComboEngine.correct('player'); RopeEngine.pull('player',multiplier);
          UI.animateCharacter('player','strain'); $('answer-card').classList.remove('correct-flash'); void $('answer-card').offsetWidth; $('answer-card').classList.add('correct-flash');
          AudioManager.play('correct'); if (state.sides.player.combo===3 || state.sides.player.combo===5 || state.sides.player.combo===8) AudioManager.play('combo');
          UI.feedback('せいかい！','good',.52); nextProblem();
        } else {
          const guarded=ComboEngine.wrong('player'); UI.animateCharacter('player','mistake');
          $('answer-card').classList.remove('wrong-shake'); void $('answer-card').offsetWidth; $('answer-card').classList.add('wrong-shake');
          AudioManager.play('wrong'); UI.feedback(guarded?'コンボを まもった！':'おしい！つぎいこう！',guarded?'good':'try',CONFIG.WRONG_LOCK_SECONDS);
          state.inputLockRemaining=CONFIG.WRONG_LOCK_SECONDS; state.pendingProblem=true;
        }
        UI.updateBattle();
      }
    };

    /* ---------- 1台2人対戦：問題・コンボ・綱・入力 ---------- */
    const shuffle = values => {
      const a=[...values];
      for(let i=a.length-1;i>0;i--) { const j=randInt(0,i); [a[i],a[j]]=[a[j],a[i]]; }
      return a;
    };

    const DuoProblemEngine = {
      reset() {
        state.duo.blocks={red:[],white:[],shared:[]};
        for(const side of Object.values(state.duo.sides)) {
          side.problemNo=0; side.problemId=0; side.currentProblem=null; resetAnswer(side); side.judged=false; side.pendingProblem=false;
        }
        this.next('red'); this.next('white');
      },
      ensureBlock(sideKey,index) {
        if(state.duo.blocks[sideKey][index]) return state.duo.blocks[sideKey][index];
        const sameCourse=state.selectedLevels.red===state.selectedLevels.white;
        if(sameCourse) {
          if(!state.duo.blocks.shared[index]) {
            const base=ProblemGenerator.makeFairBlock(state.selectedLevels.red);
            const red=shuffle(base);
            let white=shuffle(base);
            for(let attempt=0;attempt<12 && white.some((p,i)=>p.key===red[i].key);attempt++) {
              white=[...white.slice(1),white[0]];
            }
            state.duo.blocks.shared[index]=true;
            state.duo.blocks.red[index]=red; state.duo.blocks.white[index]=white;
          }
        } else {
          state.duo.blocks[sideKey][index]=shuffle(ProblemGenerator.makeFairBlock(state.selectedLevels[sideKey]));
        }
        return state.duo.blocks[sideKey][index];
      },
      next(sideKey) {
        const side=state.duo.sides[sideKey], index=side.problemNo;
        const block=this.ensureBlock(sideKey,Math.floor(index/10));
        side.currentProblem={...block[index%10]};
        side.problemNo++; side.problemId++; resetAnswer(side); side.judged=false; side.pendingProblem=false;
        SpecialMoveEngine.onDuoProblem(sideKey);
      }
    };

    const DuoComboEngine = {
      correct(sideKey) {
        const side=state.duo.sides[sideKey]; side.correct++;
        if(!side.burst.active) {
          side.combo++; side.maxCombo=Math.max(side.maxCombo,side.combo);
          if(side.combo>=10) this.startBurst(sideKey);
        }
        side.powerMultiplier=side.burst.active?SpecialMoveEngine.multiplier(duoCharacterType(sideKey)):ComboEngine.normalMultiplier(side.combo);
        return side.powerMultiplier;
      },
      wrong(sideKey) {
        const side=state.duo.sides[sideKey]; side.wrong++;
        if(SpecialMoveEngine.guardWrongDuo(sideKey)) return true;
        side.combo=0; side.powerMultiplier=1;
        if(side.burst.active) this.endBurst(sideKey);
        return false;
      },
      startBurst(sideKey) {
        SpecialMoveEngine.activateDuo(sideKey);
      },
      endBurst(sideKey) {
        SpecialMoveEngine.endDuo(sideKey);
      },
      tick(dt) {
        for(const key of ['red','white']) {
          const side=state.duo.sides[key];
          if(side.burst.active) {
            side.burst.remaining-=dt;
            if(side.burst.remaining<=0) this.endBurst(key);
          }
        }
        SpecialMoveEngine.tickDuo(dt);
      }
    };

    const DuoRopeEngine = {
      applyNet(amount) {
        state.duo.ropeTarget=clamp(state.duo.ropeTarget+amount,-100,100);
        AudioManager.play('pull');
      },
      tick(dt) {
        const d=state.duo, follow=CONFIG.REDUCED_MOTION?1:1-Math.pow(.001,dt);
        d.ropeDisplay+=(d.ropeTarget-d.ropeDisplay)*follow;
        const compressed=Math.sign(d.ropeDisplay)*Math.pow(Math.abs(d.ropeDisplay)/100,.78)*32;
        $('duo-rope-marker').style.top=`${50+compressed}%`;
        $('duo-rope-marker').style.setProperty('--rope-offset',`${compressed}%`);
      }
    };

    const DuoPullQueue = {
      appliedBatches: [],
      reset() {
        clearTimeout(state.duo.pullTimer); state.duo.pullTimer=0; state.duo.pendingPulls=[]; this.appliedBatches=[];
      },
      enqueue(sideKey,amount,acceptedAt=performance.now()) {
        state.duo.pendingPulls.push({sideKey,amount,acceptedAt});
        state.duo.pendingPulls.sort((a,b)=>a.acceptedAt-b.acceptedAt);
        this.schedule();
      },
      schedule() {
        if(state.duo.pullTimer || !state.duo.pendingPulls.length) return;
        const due=state.duo.pendingPulls[0].acceptedAt+CONFIG.SIMULTANEOUS_WINDOW_MS;
        state.duo.pullTimer=setTimeout(()=>{
          state.duo.pullTimer=0; this.flushOne();
        },Math.max(0,due-performance.now()));
      },
      flushOne() {
        if(!state.duo.pendingPulls.length) {
          if(state.duo.phase==='settling') DuoGameController.finish();
          return;
        }
        state.duo.pendingPulls.sort((a,b)=>a.acceptedAt-b.acceptedAt);
        const first=state.duo.pendingPulls[0], cutoff=first.acceptedAt+CONFIG.SIMULTANEOUS_WINDOW_MS;
        const group=[], later=[];
        for(const event of state.duo.pendingPulls) (event.acceptedAt<=cutoff?group:later).push(event);
        state.duo.pendingPulls=later;
        const effectiveGroup=group.map(event=>{
          const defender=opponentSide(event.sideKey);
          const blocked=SpecialMoveEngine.absorbDuo(defender);
          return {...event,blocked,effectiveAmount:blocked?0:event.amount};
        });
        const red=effectiveGroup.filter(e=>e.sideKey==='red').reduce((n,e)=>n+e.effectiveAmount,0);
        const white=effectiveGroup.filter(e=>e.sideKey==='white').reduce((n,e)=>n+e.effectiveAmount,0);
        const net=red-white;
        this.appliedBatches.push({events:effectiveGroup,red,white,net});
        DuoRopeEngine.applyNet(net);
        if(state.duo.pendingPulls.length) this.schedule();
        else if(state.duo.phase==='settling') DuoGameController.finish();
      },
      flushAll() {
        clearTimeout(state.duo.pullTimer); state.duo.pullTimer=0;
        while(state.duo.pendingPulls.length) this.flushOne();
      }
    };

    const DuoInputController = {
      canUse(sideKey,acceptedAt=performance.now()) {
        const d=state.duo,side=d.sides[sideKey];
        const effectiveElapsed=d.elapsed+Math.max(0,(acceptedAt-d.lastFrame)/1000);
        return state.screen==='duo' && d.phase==='playing' && !d.paused &&
          effectiveElapsed<=CONFIG.MATCH_SECONDS && side.lockRemaining<=0 && !side.judged && acceptedAt>=0;
      },
      digit(sideKey,digit) {
        const side=state.duo.sides[sideKey];
        if(!this.canUse(sideKey)) return;
        if(side.currentProblem?.requiresRemainder) {
          if(side.inputPart==='answer') {
            if(side.input.length>=1) return;
            side.input=String(digit); side.inputPart='remainder';
          } else {
            if(side.remainderInput.length>=1) return;
            side.remainderInput=String(digit);
          }
        } else {
          if(side.input.length>=CONFIG.MAX_ANSWER_DIGITS) return;
          side.input+=String(digit);
        }
        AudioManager.play('tap'); UI.updateDuo();
      },
      deleteOne(sideKey) {
        const side=state.duo.sides[sideKey];
        if(!this.canUse(sideKey)) return;
        if(side.currentProblem?.requiresRemainder) {
          if(side.remainderInput) side.remainderInput=side.remainderInput.slice(0,-1);
          else { side.inputPart='answer'; side.input=side.input.slice(0,-1); }
        } else side.input=side.input.slice(0,-1);
        AudioManager.play('tap'); UI.updateDuo();
      },
      submit(sideKey,acceptedAt=performance.now()) {
        const side=state.duo.sides[sideKey];
        if(!this.canUse(sideKey,acceptedAt)||!hasCompleteAnswer(side,side.currentProblem)) return false;
        const problemId=side.problemId, correct=answerIsCorrect(side,side.currentProblem);
        resetAnswer(side); side.judged=true;
        if(correct) {
          const edge=(sideKey==='red'&&state.duo.ropeTarget>=100)||(sideKey==='white'&&state.duo.ropeTarget<=-100);
          const multiplier=DuoComboEngine.correct(sideKey);
          DuoPullQueue.enqueue(sideKey,CONFIG.BASE_PULL_POWER*multiplier,acceptedAt);
          UI.animateDuo(sideKey,'strain');
          const card=$(`duo-${sideKey}-answer-card`); card.classList.remove('correct-flash'); void card.offsetWidth; card.classList.add('correct-flash');
          AudioManager.play('correct');
          if([3,5,8].includes(side.combo)) AudioManager.play('combo');
          if(side.combo>=2 && side.combo<10) UI.showDuoComboFx(sideKey,side.combo);
          UI.setDuoFeedback(sideKey,edge?'おしきってる！':'せいかい！','good',.52);
          if(side.problemId===problemId) DuoProblemEngine.next(sideKey);
        } else {
          const guarded=DuoComboEngine.wrong(sideKey); UI.animateDuo(sideKey,'mistake');
          const card=$(`duo-${sideKey}-answer-card`); card.classList.remove('wrong-shake'); void card.offsetWidth; card.classList.add('wrong-shake');
          AudioManager.play('wrong'); UI.setDuoFeedback(sideKey,guarded?'コンボを まもった！':'おしい！つぎいこう！',guarded?'good':'try',CONFIG.WRONG_LOCK_SECONDS);
          side.lockRemaining=CONFIG.WRONG_LOCK_SECONDS; side.pendingProblem=true;
        }
        UI.updateDuo();
        return true;
      }
    };

    /* ---------- 1台2人対戦：試合制御 ---------- */
    const DuoGameController = {
      resetMatch() {
        const d=state.duo;
        clearTimeout(d.finishTimer);
        d.sides={red:createDuoSide('赤ぐみ'),white:createDuoSide('白ぐみ')};
        d.phase='ready'; d.paused=false; d.pendingStart=false; d.blocks=[];
        d.ropeTarget=0; d.ropeDisplay=0; d.finalRope=0; d.winner='draw';
        d.elapsed=0; d.remaining=CONFIG.MATCH_SECONDS; d.lastFrame=performance.now();
        d.countdownStart=0; d.resumeCountdown=false; d.warningPlayed=false;
        DuoPullQueue.reset(); DuoProblemEngine.reset(); UI.prepareDuo(); UI.renderDuoReady();
      },
      showReady() {
        state.mode='duo'; this.resetMatch(); UI.showScreen('duo');
      },
      setHand(sideKey,hand) {
        const d=state.duo,side=d.sides[sideKey];
        if(d.phase!=='ready'||!side||side.ready||!['left','right'].includes(hand)) return;
        side.hand=hand; AudioManager.play('tap'); UI.renderDuoReady();
      },
      toggleReady(sideKey) {
        const d=state.duo;
        if(d.phase!=='ready') return;
        d.sides[sideKey].ready=!d.sides[sideKey].ready; AudioManager.play('tap'); UI.renderDuoReady();
        if(d.sides.red.ready&&d.sides.white.ready) {
          this.beginCountdown(false);
        }
      },
      beginCountdown(resume=false) {
        const d=state.duo;
        if(!resume) void GameBGM.stop({fadeSeconds:.18});
        d.pendingStart=false; d.resumeCountdown=resume; d.phase=resume?'resume-countdown':'countdown';
        d.countdownStart=performance.now(); d.lastFrame=d.countdownStart;
        $('duo-ready-overlay').style.display='none'; $('duo-pause-overlay').classList.remove('active');
        $('duo-countdown').classList.add('active'); $('duo-countdown-text').textContent=CONFIG.COUNTDOWN_SECONDS;
        UI.updateDuo();
      },
      beginPlaying(now) {
        const d=state.duo,wasResume=d.resumeCountdown;
        d.phase='playing'; d.paused=false; d.lastFrame=now;
        if(!wasResume) { d.elapsed=0; d.remaining=CONFIG.MATCH_SECONDS; }
        d.resumeCountdown=false; $('duo-countdown').classList.remove('active');
        UI.setDuoFeedback('red','ひっぱれ！','good',.6); UI.setDuoFeedback('white','ひっぱれ！','good',.6);
        UI.updateDuo();
        if(wasResume) void GameBGM.resume();
        else void GameBGM.startBattle(state,d.remaining);
      },
      pause() {
        const d=state.duo;
        if(d.phase!=='playing') return;
        d.phase='paused'; d.paused=true; $('duo-pause-overlay').classList.add('active'); UI.updateDuo();
        void GameBGM.pause();
      },
      resume() {
        const d=state.duo;
        if(d.phase!=='paused') return;
        d.paused=false; this.beginCountdown(true);
      },
      finish() {
        const d=state.duo;
        if(d.phase==='ending'||d.phase==='ended') return;
        if(d.pendingPulls.length) { d.phase='settling'; DuoPullQueue.schedule(); return; }
        d.phase='ending'; d.remaining=0; d.finalRope=d.ropeTarget;
        GameBGM.updateRemaining(0);
        void GameBGM.stop({fadeSeconds:.30,preserveRemaining:true});
        d.winner=d.finalRope>CONFIG.TWO_PLAYER_DRAW_RANGE?'red':d.finalRope<-CONFIG.TWO_PLAYER_DRAW_RANGE?'white':'draw';
        AudioManager.play('finish'); $('duo-arena').classList.add('end-shake');
        const winner=d.winner==='red'?$('duo-red-person'):d.winner==='white'?$('duo-white-person'):null;
        const other=d.winner==='red'?$('duo-white-person'):d.winner==='white'?$('duo-red-person'):null;
        if(winner) winner.classList.add('celebrate');
        if(other) other.classList.add('applaud');
        if(d.winner==='draw') { $('duo-red-person').classList.add('applaud'); $('duo-white-person').classList.add('applaud'); }
        $('duo-countdown-text').textContent=d.winner==='red'?'赤ぐみの かち！':d.winner==='white'?'白ぐみの かち！':'ひきわけ！';
        $('duo-countdown').classList.add('active');
        d.finishTimer=setTimeout(()=>{
          d.phase='ended'; UI.renderDuoResult(); UI.showScreen('duo-result');
          $('duo-countdown').classList.remove('active');
          AudioManager.play(d.winner==='draw'?'draw':'victory');
        },CONFIG.REDUCED_MOTION?80:1900);
      },
      frame(now) {
        const d=state.duo;
        if(!d.lastFrame) d.lastFrame=now;
        const rawDt=Math.max(0,(now-d.lastFrame)/1000); d.lastFrame=now;
        const animationDt=clamp(rawDt,0,.12);
        if(d.phase==='countdown'||d.phase==='resume-countdown') {
          const elapsed=(now-d.countdownStart)/1000,n=Math.ceil(CONFIG.COUNTDOWN_SECONDS-elapsed);
          $('duo-countdown-text').textContent=Math.max(1,n);
          if(elapsed>=CONFIG.COUNTDOWN_SECONDS) this.beginPlaying(now);
        } else if(d.phase==='playing') {
          d.elapsed+=rawDt; d.remaining=Math.max(0,CONFIG.MATCH_SECONDS-d.elapsed);
          GameBGM.updateRemaining(d.remaining);
          DuoComboEngine.tick(rawDt); DuoRopeEngine.tick(animationDt);
          for(const key of ['red','white']) {
            const side=d.sides[key];
            if(side.lockRemaining>0) {
              side.lockRemaining=Math.max(0,side.lockRemaining-rawDt);
              if(!side.lockRemaining&&side.pendingProblem) DuoProblemEngine.next(key);
            }
            if(side.feedbackRemaining>0) {
              side.feedbackRemaining-=rawDt;
              if(side.feedbackRemaining<=0) UI.resetDuoFeedback(key);
            }
          }
          if(d.remaining<=10&&!d.warningPlayed) { d.warningPlayed=true; AudioManager.play('warning'); }
          if(d.remaining<=10&&Math.ceil(d.remaining)!==Math.ceil(d.remaining+rawDt)) AudioManager.play('warning');
          UI.updateDuo();
          if(d.remaining<=0) {
            d.phase='settling'; UI.updateDuo();
            if(d.pendingPulls.length) DuoPullQueue.schedule(); else this.finish();
          }
        } else if(d.phase==='settling'||d.phase==='ending') DuoRopeEngine.tick(animationDt);
      }
    };

    /* ---------- CPU制御（経過時間ベース） ---------- */
    const CPUController = {
      reset() { state.cpuRuntime={nextEvent:.7,rabbitBurst:0,resting:false}; },
      scheduleNext() {
        const id=state.selectedCpu, cfg=CONFIG.CPU[id], rt=state.cpuRuntime;
        let interval=3;
        if (id==='mole') interval=cfg.averageSeconds+rand(-cfg.jitterSeconds,cfg.jitterSeconds);
        if (id==='rabbit') {
          if (rt.rabbitBurst<=0) rt.rabbitBurst=randInt(cfg.burstMin,cfg.burstMax);
          rt.rabbitBurst--;
          if (rt.rabbitBurst>0) { interval=rand(.72,1.05); rt.resting=false; UI.setCpuStatus(CPU_DEFS.rabbit.status[0]); }
          else { interval=rand(cfg.restMin,cfg.restMax); rt.resting=true; UI.setCpuStatus(CPU_DEFS.rabbit.status[1]); }
        }
        if (id==='turtle') {
          const progress=clamp(state.elapsed/(CONFIG.MATCH_SECONDS-20),0,1);
          const avg=cfg.startSeconds+(cfg.last20Seconds-cfg.startSeconds)*progress;
          interval=avg+rand(-cfg.jitterSeconds,cfg.jitterSeconds);
          UI.setCpuStatus(state.remaining<=20?CPU_DEFS.turtle.status[1]:CPU_DEFS.turtle.status[0]);
        }
        if(id==='lion') {
          const course=state.selectedLevels.red;
          interval=(cfg.courseSeconds[course]||1.25)+rand(-cfg.jitterSeconds,cfg.jitterSeconds);
          if(!state.sides.opponent.burst.active) UI.setCpuStatus(CPU_DEFS.lion.status[0]);
        } else {
          interval*=COURSE_DEFS[state.selectedLevels.red]?.cpuFactor||1;
        }
        rt.nextEvent=state.elapsed+Math.max(id==='lion'?cfg.minSeconds:.55,interval);
      },
      tick() {
        if (state.elapsed < state.cpuRuntime.nextEvent) return;
        const id=state.selectedCpu, cfg=CONFIG.CPU[id];
        if (state.cpuRuntime.resting) { state.cpuRuntime.resting=false; this.scheduleNext(); return; }
        if (Math.random()<cfg.accuracy) {
          const multiplier=ComboEngine.correct('opponent'); RopeEngine.pull('opponent',multiplier); UI.animateCharacter('opponent','strain');
          if (id==='mole') UI.setCpuStatus(CPU_DEFS.mole.status[0]);
          if (id==='lion'&&!state.sides.opponent.burst.active) UI.setCpuStatus(CPU_DEFS.lion.status[0]);
        } else {
          ComboEngine.wrong('opponent'); UI.animateCharacter('opponent','mistake');
          if (id==='rabbit') UI.setCpuStatus('あっ！お手つき！');
          else if(id==='lion') UI.setCpuStatus('王者も いきを ととのえた…');
          else UI.setCpuStatus('もういちど けいさん…');
        }
        this.scheduleNext();
      }
    };

    const GhostController = {
      reset() {
        state.ghostRuntime={index:0,delay:0};
      },
      tick() {
        const events=state.ghost?.ghost?.events||[];
        while(state.ghostRuntime.index<events.length) {
          const event=events[state.ghostRuntime.index];
          const due=Number(event.t)/1000+state.ghostRuntime.delay;
          if(state.elapsed<due) break;
          state.ghostRuntime.index++;
          if(event.ok) {
            const multiplier=ComboEngine.correct('opponent');
            RopeEngine.pull('opponent',multiplier);
            UI.animateCharacter('opponent','strain');
            UI.setCpuStatus('王者ゴーストが せいかい！');
          } else {
            ComboEngine.wrong('opponent');
            UI.animateCharacter('opponent','mistake');
            UI.setCpuStatus('王者ゴーストも つぎのもんだい！');
          }
        }
      }
    };

    /* ---------- ゲーム全体制御 ---------- */
    const GameController = {
      resetMatch() {
        clearOfficialVisibilityTimer();
        if(state.playType==='official') {
          state.gentleEffects=false;
          updateEffectModeButtons();
        }
        state.sides.player=createSideState('human','赤ぐみ');
        state.sides.opponent=createSideState(
          state.playType==='ghost'?'ghost':'cpu',
          state.playType==='ghost'?'王者ゴースト':state.playType==='official'?'王者ライオン':CPU_DEFS[state.selectedCpu].name
        );
        state.phase='countdown'; state.paused=false; resetAnswer(state); state.currentProblem=null;
        state.ropeTarget=0; state.ropeDisplay=0; state.finalRope=0; state.winner='draw';
        state.elapsed=0; state.remaining=CONFIG.MATCH_SECONDS; state.lastFrame=performance.now();
        state.countdownStart=performance.now(); state.inputLockRemaining=0; state.feedbackRemaining=0;
        state.pendingProblem=false; state.warningPlayed=false; state.history=[];
        state.officialAttempt=createOfficialAttempt();
        if(state.playType==='official') {
          state.officialAttempt.playId=createClientId();
          recordOfficialDiagnostic('match_start',{phase:'countdown'});
        }
        CPUController.reset(); GhostController.reset(); nextProblem(); UI.prepareBattle(); UI.resetFeedback();
        $('arena').classList.remove('end-shake'); $('player-character').className='character player';
        $('cpu-character').className=`character cpu${state.playType==='official'?' lion':''}`;
        $('official-result-status').className='';
      },
      startMatch() {
        this.resetMatch(); UI.showScreen('battle');
        $('countdown-overlay').classList.add('active'); $('countdown-text').textContent=CONFIG.COUNTDOWN_SECONDS;
      },
      beginPlaying(now) {
        state.phase='playing'; state.matchStart=now; state.elapsed=0; state.remaining=CONFIG.MATCH_SECONDS; state.lastFrame=now;
        state.officialAttempt.questionStartedAtMs=0;
        $('countdown-overlay').classList.remove('active'); UI.feedback('ひっぱれ！','good',.6);
        if(state.playType!=='ghost') CPUController.scheduleNext();
        void GameBGM.startBattle(state,state.remaining);
      },
      togglePause(force) {
        if (state.phase!=='playing') return;
        state.paused=typeof force==='boolean'?force:!state.paused;
        if(state.playType==='official'&&state.paused) {
          state.officialAttempt.pausedUsed=true;
          recordOfficialDiagnostic('pause',{used:true});
        }
        $('pause-overlay').classList.toggle('active',state.paused); $('pause-button').textContent=state.paused?'▶':'Ⅱ';
        if (!state.paused) state.lastFrame=performance.now();
        void (state.paused ? GameBGM.pause() : GameBGM.resume());
      },
      finish() {
        if (state.phase==='ending'||state.phase==='ended') return;
        if(state.playType==='official') recordOfficialDiagnostic('match_finish',{
          pausedUsed:state.officialAttempt.pausedUsed,
          interrupted:state.officialAttempt.interrupted
        });
        clearOfficialVisibilityTimer();
        state.phase='ending'; state.remaining=0; state.finalRope=state.ropeTarget;
        GameBGM.updateRemaining(0);
        void GameBGM.stop({fadeSeconds:.30,preserveRemaining:true});
        state.winner=state.finalRope>CONFIG.DRAW_RANGE?'player':state.finalRope<-CONFIG.DRAW_RANGE?'opponent':'draw';
        UI.clearLionSpecial();
        if(state.playType==='official') {
          const finalLionPose=state.winner==='player'?'defeated':'tug';
          $('cpu-character').innerHTML=Art.lion(finalLionPose);
          $('cpu-character').classList.add('lion');
          BattlePositioning.setLionPose(finalLionPose);
        }
        AudioManager.play('finish'); $('arena').classList.add('end-shake');
        const finalNudge=state.winner==='player'?3:state.winner==='opponent'?-3:0;
        state.ropeTarget=clamp(state.ropeTarget+finalNudge,-100,100);
        const winnerEl=state.winner==='player'?$('player-character'):state.winner==='opponent'?$('cpu-character'):null;
        if (winnerEl) winnerEl.classList.add('celebrate');
        const otherEl=state.winner==='player'?$('cpu-character'):state.winner==='opponent'?$('player-character'):null;
        if (otherEl) otherEl.classList.add('applaud');
        if (state.winner==='draw') { $('player-character').classList.add('applaud'); $('cpu-character').classList.add('applaud'); }
        setTimeout(()=>{
          state.phase='ended'; UI.renderResult(); UI.showScreen('result');
          CompetitionService.handleFinishedMatch();
          AudioManager.play(state.winner==='player'?'victory':'draw');
        }, CONFIG.REDUCED_MOTION?80:1500);
      },
      frame(now) {
        DuoGameController.frame(now);
        const rawDt=Math.max(0,(now-state.lastFrame)/1000); state.lastFrame=now;
        const animationDt=clamp(rawDt,0,.12);
        if (state.phase==='countdown') {
          const elapsed=(now-state.countdownStart)/1000; const n=Math.ceil(CONFIG.COUNTDOWN_SECONDS-elapsed);
          $('countdown-text').textContent=Math.max(1,n);
          if (elapsed>=CONFIG.COUNTDOWN_SECONDS) this.beginPlaying(now);
        } else if (state.phase==='playing'&&!state.paused) {
          state.elapsed+=rawDt; state.remaining=Math.max(0,CONFIG.MATCH_SECONDS-state.elapsed);
          GameBGM.updateRemaining(state.remaining);
          ComboEngine.tick(rawDt);
          if(state.playType==='ghost') GhostController.tick(); else CPUController.tick();
          RopeEngine.tick(animationDt);
          if (state.inputLockRemaining>0) { state.inputLockRemaining=Math.max(0,state.inputLockRemaining-rawDt); if (!state.inputLockRemaining&&state.pendingProblem) nextProblem(); }
          if (state.feedbackRemaining>0) { state.feedbackRemaining-=rawDt; if (state.feedbackRemaining<=0) UI.resetFeedback(); }
          if (state.remaining<=10&&!state.warningPlayed) { state.warningPlayed=true; AudioManager.play('warning'); }
          if (state.remaining<=10&&Math.ceil(state.remaining)!==Math.ceil(state.remaining+rawDt)) AudioManager.play('warning');
          UI.updateBattle(); if (state.remaining<=0) this.finish();
        } else if (state.phase==='ending') RopeEngine.tick(animationDt);
        requestAnimationFrame(t=>this.frame(t));
      }
    };

    /* ---------- 実表示領域・端末向けレイアウト ---------- */
    const FullscreenManager = (() => {
      const selector='#fullscreen-button,#duo-ready-fullscreen,#duo-result-fullscreen';
      let sessionAvailable=true;

      const requestMethod=()=>{
        const root=document.documentElement;
        return root.requestFullscreen||root.webkitRequestFullscreen||null;
      };

      function isSupported() {
        if(!sessionAvailable||!requestMethod()) return false;
        if(document.fullscreenEnabled===false||document.webkitFullscreenEnabled===false) return false;
        return true;
      }

      function refresh() {
        const supported=isSupported();
        document.body.classList.toggle('fullscreen-unavailable',!supported);
        document.querySelectorAll(selector).forEach(button=>{
          button.hidden=!supported;
          button.setAttribute('aria-hidden',String(!supported));
          button.tabIndex=supported?0:-1;
        });
        return supported;
      }

      async function request() {
        const method=requestMethod();
        if(!isSupported()||!method) {
          sessionAvailable=false;
          refresh();
          return false;
        }
        try {
          await method.call(document.documentElement);
          return true;
        } catch (_) {
          /* 子どもには技術エラーを見せず、このセッションでは入口を隠す。 */
          sessionAvailable=false;
          refresh();
          return false;
        }
      }

      return {
        request,refresh,
        getState:()=>({supported:isSupported(),sessionAvailable,active:Boolean(document.fullscreenElement||document.webkitFullscreenElement)})
      };
    })();

    const ViewportManager = (() => {
      const modeClasses=[
        'viewport-phone','viewport-phone-portrait','viewport-phone-landscape',
        'viewport-phone-landscape-compact','viewport-phone-landscape-ultra'
      ];
      let frame=0;
      let duoEntryPending=false;
      let snapshot=null;

      function resolveMode(width,height) {
        const portrait=height>=width;
        const phonePortrait=portrait&&width<=600;
        const phoneLandscape=!portrait&&height<=500&&width<=1024;
        let mode='desktop';
        if(phonePortrait) mode='phone-portrait';
        else if(phoneLandscape&&height<=360) mode='phone-landscape-ultra';
        else if(phoneLandscape&&height<=430) mode='phone-landscape-compact';
        else if(phoneLandscape) mode='phone-landscape';
        return {
          mode,width,height,portrait,
          phone:phonePortrait||phoneLandscape,
          phonePortrait,phoneLandscape,
          compactLandscape:phoneLandscape&&height<=430,
          ultraCompactLandscape:phoneLandscape&&height<=360
        };
      }

      function measure() {
        const viewport=window.visualViewport;
        const width=Math.max(1,Math.round(viewport?.width||window.innerWidth||document.documentElement.clientWidth||1));
        const height=Math.max(1,Math.round(viewport?.height||window.innerHeight||document.documentElement.clientHeight||1));
        return {
          ...resolveMode(width,height),
          offsetLeft:Math.max(0,Math.round(viewport?.offsetLeft||0)),
          offsetTop:Math.max(0,Math.round(viewport?.offsetTop||0))
        };
      }

      function updateDuoOrientationGate(metrics=snapshot||measure()) {
        const duoScreen=['character','level','duo','duo-result'].includes(state.screen);
        const required=Boolean(metrics.phoneLandscape&&(duoEntryPending||(state.mode==='duo'&&duoScreen)));
        document.body.classList.toggle('duo-rotation-required',required);
        const blocker=$('orientation-blocker');
        blocker?.setAttribute('aria-hidden',String(!required));
        return required;
      }

      function apply() {
        frame=0;
        const metrics=measure();
        snapshot=metrics;
        const root=document.documentElement;
        root.style.setProperty('--visual-width',`${metrics.width}px`);
        root.style.setProperty('--visual-height',`${metrics.height}px`);
        root.style.setProperty('--visual-offset-left',`${metrics.offsetLeft}px`);
        root.style.setProperty('--visual-offset-top',`${metrics.offsetTop}px`);
        modeClasses.forEach(className=>document.body.classList.remove(className));
        document.body.classList.toggle('viewport-phone',metrics.phone);
        document.body.classList.toggle('viewport-phone-portrait',metrics.phonePortrait);
        document.body.classList.toggle('viewport-phone-landscape',metrics.phoneLandscape);
        document.body.classList.toggle('viewport-phone-landscape-compact',metrics.compactLandscape);
        document.body.classList.toggle('viewport-phone-landscape-ultra',metrics.ultraCompactLandscape);
        document.body.classList.toggle('portrait-layout',metrics.portrait);
        document.body.dataset.viewportMode=metrics.mode;
        FullscreenManager.refresh();

        if(duoEntryPending&&!metrics.phoneLandscape) {
          duoEntryPending=false;
          state.mode='duo';
          UI.showScreen('character');
          UI.renderCharacterCards();
          return metrics;
        }
        updateDuoOrientationGate(metrics);
        /* 既存の2人対戦Ready遷移は、表示領域の再同期後も維持する。 */
        if(state.duo.pendingStart&&state.duo.sides.red.ready&&state.duo.sides.white.ready) {
          state.duo.pendingStart=false;
          DuoGameController.beginCountdown(false);
        }
        BattlePositioning.syncToCurrentState();
        return metrics;
      }

      function schedule() {
        if(frame) return frame;
        frame=requestAnimationFrame(apply);
        return frame;
      }

      function requestDuoEntry() {
        const metrics=snapshot||measure();
        state.mode='duo';
        if(metrics.phoneLandscape) {
          duoEntryPending=true;
          updateDuoOrientationGate(metrics);
          return false;
        }
        duoEntryPending=false;
        updateDuoOrientationGate(metrics);
        return true;
      }

      return {
        schedule,apply,resolveMode,requestDuoEntry,updateDuoOrientationGate,
        isPhoneLandscape:()=>Boolean((snapshot||measure()).phoneLandscape),
        getSnapshot:()=>({...((snapshot||measure())),duoEntryPending})
      };
    })();

    function renderDuoKeypad(sideKey) {
      const side=state.duo.sides[sideKey],order=side?.effects?.keyOrder||standardKeyOrder();
      const keys=[
        ...order.slice(0,9).map(value=>({key:value,label:value})),
        {action:'delete',label:'けす',cls:'delete'},
        {key:order[9],label:order[9]},
        {action:'submit',label:'こたえる',cls:'submit'}
      ];
      $(`duo-${sideKey}-keypad`).innerHTML=
        keys.map(item=>`<button type="button" class="duo-key ${item.cls||''}" data-side="${sideKey}" ${item.key!==undefined?`data-key="${item.key}"`:`data-action="${item.action}"`}>${item.label}</button>`).join('')+
        '<div class="mole-dust-layer" aria-hidden="true"></div>';
    }

    function renderDuoKeypads() {
      for(const sideKey of ['white','red']) renderDuoKeypad(sideKey);
    }

    function updateSoundButtons() {
      document.querySelectorAll('.sound-toggle').forEach(button=>{
        const full=button.dataset.labelStyle!=='icon';
        button.textContent=full?(state.soundOn?'おと ON':'おと OFF'):(state.soundOn?'音':'消音');
        button.setAttribute('aria-pressed',String(state.soundOn));
      });
    }

    function updateEffectModeButtons() {
      document.body.classList.toggle('gentle-effects',state.gentleEffects);
      document.querySelectorAll('.effect-mode-toggle').forEach(button=>{
        button.textContent=state.gentleEffects?'ひっさつ やさしい':'ひっさつ ふつう';
        button.setAttribute('aria-pressed',String(state.gentleEffects));
      });
    }

    function bindHold(button,canStart,onComplete) {
      let start=0,timer=0,raf=0,pointerId=null,completed=false;
      const reset=()=>{
        clearTimeout(timer); cancelAnimationFrame(raf); timer=0; raf=0; start=0; pointerId=null;
        button.style.setProperty('--hold','0deg');
      };
      const paint=()=>{
        if(!start)return;
        const progress=clamp((performance.now()-start)/(CONFIG.HOLD_SECONDS*1000),0,1);
        button.style.setProperty('--hold',`${progress*360}deg`);
        if(progress<1) raf=requestAnimationFrame(paint);
      };
      button.addEventListener('pointerdown',event=>{
        if(!canStart()||pointerId!==null)return;
        event.preventDefault(); pointerId=event.pointerId; completed=false; start=performance.now();
        button.setPointerCapture?.(event.pointerId); paint();
        timer=setTimeout(()=>{
          completed=true; reset(); AudioManager.play('tap'); onComplete();
        },CONFIG.HOLD_SECONDS*1000);
      });
      const end=event=>{
        if(pointerId!==null&&(event.pointerId===pointerId||event.type==='pointercancel')) {
          if(!completed) reset();
        }
      };
      button.addEventListener('pointerup',end); button.addEventListener('pointercancel',end);
      button.addEventListener('lostpointercapture',event=>{ if(!completed&&event.pointerId===pointerId) reset(); });
      button.addEventListener('contextmenu',event=>event.preventDefault());
    }

    function openDuoConfirm(action,text) {
      state.duo.confirmAction=action; $('duo-confirm-text').textContent=text; $('duo-confirm-modal').classList.add('active');
    }

    function toggleDuoRetry(sideKey) {
      if(state.screen!=='duo-result')return;
      const side=state.duo.sides[sideKey]; side.retryReady=!side.retryReady; AudioManager.play('tap');
      const button=$(`duo-${sideKey}-retry`);
      button.classList.toggle('ready',side.retryReady);
      button.textContent=side.retryReady?'あと ひとり！':'もういちど！';
      if(state.duo.sides.red.retryReady&&state.duo.sides.white.retryReady) DuoGameController.showReady();
    }

    /* ---------- イベント設定 ---------- */
    $('start-button').addEventListener('click',()=>{ AudioManager.play('tap'); UI.showScreen('mode'); });
    $('howto-button').addEventListener('click',()=>{ AudioManager.play('tap'); $('howto-modal').classList.add('active'); });
    $('howto-close').addEventListener('click',()=>{ AudioManager.play('tap'); $('howto-modal').classList.remove('active'); });
    $('howto-modal').addEventListener('click',e=>{ if(e.target===$('howto-modal')) $('howto-modal').classList.remove('active'); });
    $('solo-mode-button').addEventListener('click',()=>{ state.mode='solo'; AudioManager.play('tap'); UI.showScreen('solo-type'); });
    $('duo-mode-button').addEventListener('click',()=>{
      AudioManager.play('tap');
      if(!ViewportManager.requestDuoEntry()) return;
      UI.showScreen('character');
      UI.renderCharacterCards();
    });

    document.addEventListener('click',e=>{
      const character=e.target.closest('.character-card');
      if(character){ state.selectedCharacters[character.dataset.characterTeam]=character.dataset.character; AudioManager.play('tap'); UI.renderCharacterCards(); }
      const card=e.target.closest('.cpu-card');
      if(card){ state.selectedCpu=card.dataset.cpu; AudioManager.play('tap'); UI.renderCpuCards(); }
      const soloType=e.target.closest('[data-solo-type]');
      if(soloType&&!soloType.disabled){
        state.mode='solo';
        state.playType=soloType.dataset.soloType;
        state.selectedCpu=state.playType==='official'?'lion':state.playType==='ghost'?'ghost':null;
        if(state.playType==='official') {
          state.gentleEffects=false;
          updateEffectModeButtons();
        }
        AudioManager.play('tap');
        UI.showScreen('character');
        UI.renderCharacterCards();
      }
      const category=e.target.closest('.course-category-button');
      if(category){
        CompetitionService.cancelBattlePreparation();
        const team=category.dataset.courseTeam;
        state.selectedCategories[team]=category.dataset.category;
        const first=Object.keys(COURSE_DEFS).find(id=>COURSE_DEFS[id].category===category.dataset.category);
        if(COURSE_DEFS[state.selectedLevels[team]]?.category!==category.dataset.category) state.selectedLevels[team]=first;
        state.selectedLevel=state.selectedLevels.red; AudioManager.play('tap'); UI.renderLevelCards();
      }
      const level=e.target.closest('.course-option');
      if(level){
        CompetitionService.cancelBattlePreparation();
        const team=level.dataset.courseTeam;
        state.selectedLevels[team]=level.dataset.level; state.selectedLevel=state.selectedLevels.red;
        AudioManager.play('tap'); UI.renderLevelCards();
      }
      const go=e.target.closest('[data-go]');
      if(go){ AudioManager.play('tap'); UI.showScreen(go.dataset.go); }
      const key=e.target.closest('.key');
      if(key&&key.dataset.key!==undefined) InputController.digit(key.dataset.key);
      if(key&&key.dataset.action==='submit') InputController.submit();
    });

    $('character-next').addEventListener('click',()=>{
      AudioManager.play('tap');
      if(state.mode==='duo'||state.playType!=='free') {
        UI.showScreen('level'); UI.renderLevelCards();
      } else {
        UI.showScreen('cpu'); UI.renderCpuCards();
      }
    });
    $('cpu-next').addEventListener('click',()=>{ if(!state.selectedCpu)return; AudioManager.play('tap'); UI.showScreen('level'); UI.renderLevelCards(); });
    $('level-back-button').addEventListener('click',()=>{
      AudioManager.play('tap');
      const destination=state.mode==='duo'||state.playType!=='free'?'character':'cpu';
      UI.showScreen(destination);
      if(destination==='character') UI.renderCharacterCards();
    });
    $('battle-start').addEventListener('click',async()=>{
      if(!state.selectedLevels.red||(state.mode==='duo'&&!state.selectedLevels.white))return;
      if(state.mode==='duo') {
        AudioManager.play('tap');
        DuoGameController.showReady();
        return;
      }
      const button=$('battle-start');
      if(state.playType==='official'||state.playType==='ghost') {
        const request=CompetitionService.beginBattlePreparation();
        if(!request) return;
        AudioManager.play('tap');
        button.disabled=true;
        button.textContent='王者データ よみこみ中…';
        try {
          await CompetitionService.refresh();
          if(!CompetitionService.isBattlePreparationCurrent(request)) return;
          let ghost=null;
          if(request.playType==='ghost') ghost=await CompetitionService.loadGhost(request.courseId);
          if(!CompetitionService.isBattlePreparationCurrent(request)) return;
          if(ghost) state.ghost=ghost;
        } catch (error) {
          if(!CompetitionService.isBattlePreparationCurrent(request)) return;
          CompetitionService.finishBattlePreparation(request);
          UI.toast('つうしんできませんでした。じゆうたいせんは あそべるよ！');
          UI.renderLevelCards();
          return;
        }
        if(!CompetitionService.finishBattlePreparation(request)) return;
      } else {
        AudioManager.play('tap');
      }
      GameController.startMatch();
    });
    $('pause-button').addEventListener('click',()=>{ AudioManager.play('tap'); GameController.togglePause(); });
    $('resume-button').addEventListener('click',()=>{ AudioManager.play('tap'); GameController.togglePause(false); });
    $('fullscreen-button').addEventListener('click',()=>{ void FullscreenManager.request(); AudioManager.play('tap'); });
    $('retry-button').addEventListener('click',()=>{ AudioManager.play('tap'); GameController.startMatch(); });
    $('change-cpu-button').addEventListener('click',()=>{
      AudioManager.play('tap');
      if(state.playType==='free') {
        UI.showScreen('cpu'); UI.renderCpuCards();
      } else {
        UI.showScreen('level'); UI.renderLevelCards();
      }
    });
    $('title-button').addEventListener('click',()=>{ AudioManager.play('tap'); state.phase='menu'; UI.showScreen('title'); });
    $('achievement-close').addEventListener('click',()=>{ AudioManager.play('tap'); CompetitionService.closeAchievement(); });

    document.querySelectorAll('.sound-toggle').forEach(btn=>btn.addEventListener('click',()=>{
      state.soundOn=!state.soundOn; if(state.soundOn) AudioManager.play('tap');
      updateSoundButtons();
      void GameBGM.setEnabled(state.soundOn);
    }));
    document.querySelectorAll('.effect-mode-toggle').forEach(btn=>btn.addEventListener('click',()=>{
      state.gentleEffects=!state.gentleEffects; AudioManager.play('tap'); updateEffectModeButtons();
    }));

    $('duo-red-ready').addEventListener('click',()=>DuoGameController.toggleReady('red'));
    $('duo-white-ready').addEventListener('click',()=>DuoGameController.toggleReady('white'));
    document.querySelectorAll('.duo-hand-button').forEach(button=>button.addEventListener('click',()=>{
      DuoGameController.setHand(button.dataset.handSide,button.dataset.hand);
    }));
    $('duo-change-level').addEventListener('click',()=>{
      if(state.duo.sides.red.ready||state.duo.sides.white.ready)return;
      AudioManager.play('tap'); state.duo.phase='idle'; UI.showScreen('level'); UI.renderLevelCards();
    });
    $('duo-ready-fullscreen').addEventListener('click',()=>{ void FullscreenManager.request(); AudioManager.play('tap'); });
    $('duo-result-fullscreen').addEventListener('click',()=>{ void FullscreenManager.request(); AudioManager.play('tap'); });
    $('duo-red-retry').addEventListener('click',()=>toggleDuoRetry('red'));
    $('duo-white-retry').addEventListener('click',()=>toggleDuoRetry('white'));
    $('duo-result-level').addEventListener('click',()=>openDuoConfirm('level','もんだいを かえても いい？'));
    $('duo-result-title').addEventListener('click',()=>openDuoConfirm('title','タイトルへ もどっても いい？'));
    $('duo-confirm-cancel').addEventListener('click',()=>{ AudioManager.play('tap'); $('duo-confirm-modal').classList.remove('active'); state.duo.confirmAction=null; });
    $('duo-confirm-ok').addEventListener('click',()=>{
      const action=state.duo.confirmAction; AudioManager.play('tap'); $('duo-confirm-modal').classList.remove('active'); state.duo.confirmAction=null; state.duo.phase='idle';
      if(action==='level') { state.mode='duo'; UI.showScreen('level'); UI.renderLevelCards(); }
      if(action==='title') UI.showScreen('title');
    });

    document.addEventListener('pointerdown',event=>{
      const key=event.target.closest('.duo-key');
      if(!key)return;
      event.preventDefault();
      const sideKey=key.dataset.side,side=state.duo.sides[sideKey];
      if(!side)return;
      side.pointerIds.push(event.pointerId); key.setPointerCapture?.(event.pointerId); key.classList.add('pressed');
      if(key.dataset.key!==undefined) DuoInputController.digit(sideKey,key.dataset.key);
      if(key.dataset.action==='delete') DuoInputController.deleteOne(sideKey);
      if(key.dataset.action==='submit') {
        const now=performance.now(),stamp=Number(event.timeStamp);
        DuoInputController.submit(sideKey,Number.isFinite(stamp)&&Math.abs(stamp-now)<60000?stamp:now);
      }
    },{capture:true});
    const endDuoPointer=event=>{
      const key=event.target.closest?.('.duo-key');
      if(key) key.classList.remove('pressed');
      for(const side of Object.values(state.duo.sides)) side.pointerIds=side.pointerIds.filter(id=>id!==event.pointerId);
    };
    document.addEventListener('pointerup',endDuoPointer,{capture:true});
    document.addEventListener('pointercancel',endDuoPointer,{capture:true});

    bindHold($('duo-pause-button'),()=>state.duo.phase==='playing',()=>DuoGameController.pause());
    bindHold($('duo-resume-button'),()=>state.duo.phase==='paused',()=>DuoGameController.resume());

    let deleteTimer=null, longDeleted=false;
    $('delete-key').addEventListener('pointerdown',e=>{ if(!InputController.canUse())return; longDeleted=false; deleteTimer=setTimeout(()=>{longDeleted=true;InputController.clear();},550); e.currentTarget.setPointerCapture?.(e.pointerId); });
    const endDelete=()=>{ clearTimeout(deleteTimer); if(!longDeleted) InputController.deleteOne(); };
    $('delete-key').addEventListener('pointerup',endDelete); $('delete-key').addEventListener('pointercancel',()=>clearTimeout(deleteTimer));
    $('delete-key').addEventListener('contextmenu',e=>e.preventDefault());

    window.addEventListener('keydown',e=>{
      if(e.key==='Backspace'){ e.preventDefault(); InputController.deleteOne(); return; }
      if(e.key==='Enter'){ e.preventDefault(); InputController.submit(); return; }
      if(/^[0-9]$/.test(e.key)){ e.preventDefault(); InputController.digit(e.key); }
      if(e.key===' '&&state.screen==='battle'&&state.phase==='playing'){ e.preventDefault(); GameController.togglePause(); }
    },{capture:true});

    const matchInProgress=()=>state.phase==='playing'||state.phase==='countdown'||['playing','countdown','resume-countdown','paused','settling','ending'].includes(state.duo.phase);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden) beginOfficialHidden('visibilitychange');
      else {
        restoreOfficialVisibility('visibilitychange');
        BattlePositioning.syncToCurrentState();
      }
    });
    window.addEventListener('pagehide',event=>{
      if(!officialMatchIsActive()) return;
      if(event.persisted) beginOfficialHidden('pagehide',true);
      else {
        recordOfficialDiagnostic('pagehide',{persisted:false});
        markOfficialInterrupted('pagehide',0);
      }
    });
    window.addEventListener('pageshow',event=>{
      if(event.persisted) restoreOfficialVisibility('pageshow');
    });
    window.addEventListener('beforeunload',e=>{ if(matchInProgress()){ e.preventDefault(); e.returnValue=''; } });
    window.addEventListener('popstate',()=>{ if(matchInProgress()){ history.pushState({battle:true},''); UI.toast('たいせん中だよ。タイトルへは けっか画面から もどれるよ。'); } });
    const scheduleViewportSync=()=>ViewportManager.schedule();
    window.addEventListener('orientationchange',scheduleViewportSync);
    window.addEventListener('resize',scheduleViewportSync);
    window.visualViewport?.addEventListener('resize',scheduleViewportSync);
    window.visualViewport?.addEventListener('scroll',scheduleViewportSync);
    document.addEventListener('fullscreenchange',scheduleViewportSync);
    document.addEventListener('webkitfullscreenchange',scheduleViewportSync);
    try { history.replaceState({app:true},''); history.pushState({app:true},''); } catch (_) {}

    document.addEventListener('dragstart',e=>e.preventDefault());
    document.addEventListener('selectstart',e=>e.preventDefault());

    /* 自動テスト用（画面には表示されません） */
    window.__HKB_TEST__ = {
      versions:()=>({appVersion:CONFIG.APP_VERSION,rulesVersion:CONFIG.RULES_VERSION}),
      viewport:()=>ViewportManager.getSnapshot(),
      classifyViewport:(width,height)=>ViewportManager.resolveMode(Number(width),Number(height)),
      fullscreen:()=>FullscreenManager.getState(),
      snapshot:()=>JSON.parse(JSON.stringify({
        screen:state.screen,phase:state.phase,selectedCpu:state.selectedCpu,selectedLevel:state.selectedLevel,
        selectedLevels:state.selectedLevels,selectedCharacters:state.selectedCharacters,remaining:state.remaining,
        input:state.input,remainderInput:state.remainderInput,inputPart:state.inputPart,problem:state.currentProblem,
        ropeTarget:state.ropeTarget,player:state.sides.player,opponent:state.sides.opponent,paused:state.paused,
        gentleEffects:state.gentleEffects,playType:state.playType,competition:state.competition,
        officialAttempt:{
          playId:state.officialAttempt.playId,pausedUsed:state.officialAttempt.pausedUsed,
          interrupted:state.officialAttempt.interrupted,events:state.officialAttempt.events,
          diagnostics:state.officialAttempt.diagnostics,
          eligibilityDecision:state.officialAttempt.eligibilityDecision,
          savePayload:state.officialAttempt.savePayload
            ? (({deviceId,...safePayload})=>safePayload)(state.officialAttempt.savePayload)
            : null
        }
      })),
      officialVisibilityGraceMs:()=>OFFICIAL_VISIBILITY_GRACE_MS,
      forceFinish:(rope=state.ropeTarget)=>{state.ropeTarget=clamp(Number(rope)||0,-100,100);GameController.finish();},
      setProblem:(a,b,op,answer,remainder=null)=>{
        state.currentProblem={a,b,op,answer,remainder,requiresRemainder:remainder!==null,text:`${a} ${op} ${b}`,key:`test`};
        resetAnswer(state); $('problem-display').textContent=state.currentProblem.text; UI.updateInput();
      },
      start:(course='add_no_carry',cpu='mole')=>{
        state.mode='solo'; state.playType='free'; state.selectedLevels.red=course; state.selectedLevel=course; state.selectedCpu=cpu;
        state.selectedCategories.red=COURSE_DEFS[course].category; GameController.startMatch();
      },
      startOfficial:(course='add_no_carry')=>{
        state.mode='solo'; state.playType='official'; state.selectedLevels.red=course; state.selectedLevel=course; state.selectedCpu='lion';
        state.selectedCategories.red=COURSE_DEFS[course].category; GameController.startMatch();
      },
      beginNow:()=>GameController.beginPlaying(performance.now()),
      digit:value=>InputController.digit(value),
      submit:()=>InputController.submit(),
      setCombo:(n)=>{state.sides.player.combo=clamp(Number(n)||0,0,9);state.sides.player.maxCombo=Math.max(state.sides.player.maxCombo,state.sides.player.combo);UI.updateBattle();},
      cpuAttempt:()=>{state.cpuRuntime.nextEvent=0;CPUController.tick();},
      setCharacter:type=>{state.selectedCharacters.red=type;},
      setCpu:type=>{state.selectedCpu=type;},
      lionAssets:()=>Object.fromEntries(Object.entries(LION_ASSETS).map(([key,value])=>[key,value.slice(0,32)])),
      lionCourseSeconds:course=>CONFIG.CPU.lion.courseSeconds[course],
      setGentle:value=>{state.gentleEffects=Boolean(value);updateEffectModeButtons();},
      triggerSpecial:sideKey=>{ComboEngine.startBurst(sideKey);UI.updateBattle();},
      tickSpecial:seconds=>{ComboEngine.tick(Number(seconds)||0);UI.updateBattle();},
      pull:(sideKey,multiplier=1)=>{RopeEngine.pull(sideKey,Number(multiplier)||1);UI.updateBattle();},
      nextProblem:()=>nextProblem(),
      makeProblem:(course,desired=null)=>JSON.parse(JSON.stringify(ProblemGenerator.make(course,desired))),
      makeBlock:course=>JSON.parse(JSON.stringify(ProblemGenerator.makeFairBlock(course))),
      endNow:()=>{state.elapsed=CONFIG.MATCH_SECONDS;state.remaining=0;GameController.finish();},
      duo: {
        snapshot:()=>JSON.parse(JSON.stringify({
          screen:state.screen,phase:state.duo.phase,remaining:state.duo.remaining,ropeTarget:state.duo.ropeTarget,
          finalRope:state.duo.finalRope,winner:state.duo.winner,sides:state.duo.sides,
          batches:DuoPullQueue.appliedBatches,blocks:state.duo.blocks
        })),
        start:(redLevel='add_no_carry',whiteLevel=redLevel)=>{
          state.mode='duo'; state.selectedLevels.red=redLevel; state.selectedLevels.white=whiteLevel; state.selectedLevel=redLevel;
          state.selectedCategories.red=COURSE_DEFS[redLevel].category; state.selectedCategories.white=COURSE_DEFS[whiteLevel].category;
          DuoGameController.showReady(); DuoGameController.beginCountdown(false);
        },
        beginNow:()=>DuoGameController.beginPlaying(performance.now()),
        setProblem:(sideKey,a,b,op,answer,remainder=null)=>{
          const side=state.duo.sides[sideKey];
          side.currentProblem={a,b,op,answer,remainder,requiresRemainder:remainder!==null,text:`${a} ${op} ${b}`,key:'test'};
          side.problemId++;resetAnswer(side);side.judged=false;UI.updateDuo();
        },
        setCombo:(sideKey,n)=>{const side=state.duo.sides[sideKey];side.combo=clamp(Number(n)||0,0,10);side.maxCombo=Math.max(side.maxCombo,side.combo);UI.updateDuo();},
        answer:(sideKey,value,acceptedAt=performance.now(),remainder=null)=>{
          const side=state.duo.sides[sideKey];side.input=String(value);
          if(remainder!==null) { side.remainderInput=String(remainder); side.inputPart='remainder'; }
          return DuoInputController.submit(sideKey,acceptedAt);
        },
        digit:(sideKey,value)=>DuoInputController.digit(sideKey,value),
        setRope:value=>{state.duo.ropeTarget=clamp(Number(value)||0,-100,100);state.duo.ropeDisplay=state.duo.ropeTarget;DuoRopeEngine.tick(1);},
        tickBurst:seconds=>{DuoComboEngine.tick(Number(seconds)||0);UI.updateDuo();},
        setCharacter:(sideKey,type)=>{state.selectedCharacters[sideKey]=type;},
        triggerSpecial:sideKey=>{DuoComboEngine.startBurst(sideKey);UI.updateDuo();},
        nextProblem:sideKey=>{DuoProblemEngine.next(sideKey);UI.updateDuo();},
        keyOrder:sideKey=>[...state.duo.sides[sideKey].effects.keyOrder],
        flush:()=>DuoPullQueue.flushAll(),
        setHand:(sideKey,hand)=>DuoGameController.setHand(sideKey,hand),
        pause:()=>DuoGameController.pause(),
        resumeNow:()=>DuoGameController.beginPlaying(performance.now()),
        finish:(rope=state.duo.ropeTarget)=>{state.duo.ropeTarget=clamp(Number(rope)||0,-100,100);DuoPullQueue.flushAll();state.duo.phase='settling';DuoGameController.finish();}
      }
    };

    /* 読み取り専用の配置検査API。ゲーム状態や記録送信は変更しません。 */
    window.__HKB_POSITION_TEST__ = Object.freeze({
      schemaVersion:BATTLE_POSITION_CONFIG.schemaVersion,
      sourceSha256:BATTLE_POSITION_CONFIG.sourceSha256,
      sourceZipSha256:BATTLE_POSITION_CONFIG.sourceZipSha256,
      sourceIndexSha256:BATTLE_POSITION_CONFIG.sourceIndexSha256,
      profileCount:Object.keys(BATTLE_POSITION_CONFIG.profiles).length,
      characterCount:Object.keys(BATTLE_POSITION_CONFIG.characters).length,
      resolveProfile:(mode,portrait)=>BattlePositioning.resolveProfile(mode,portrait),
      resolveCharacterAdjustment:(profile,role,character,asset,pose='normal')=>
        BattlePositioning.resolveCharacterAdjustment(profile,role,character,asset,pose),
      calculatePixels:(adjustment,width,height)=>BattlePositioning.calculatePixels(adjustment,width,height),
      getState:()=>BattlePositioning.getState()
    });

    GameBGM.setStateReader(()=>state);
    document.addEventListener('click',()=>queueMicrotask(()=>GameBGM.syncToGameState()));
    document.addEventListener('keyup',()=>queueMicrotask(()=>GameBGM.syncToGameState()));
    void GameBGM.syncToGameState();

    $('title-version').textContent=`v${CONFIG.APP_VERSION}`;
    ViewportManager.apply();
    renderDuoKeypads(); updateSoundButtons(); updateEffectModeButtons(); UI.renderCharacterCards(); UI.renderCpuCards(); UI.renderLevelCards();
    CompetitionService.initialize();
    requestAnimationFrame(t=>{ state.lastFrame=t; GameController.frame(t); });
