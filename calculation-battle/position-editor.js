(() => {
  'use strict';

  const bridge=window.__HKB_POSITION_EDITOR_BRIDGE__;
  const positionTest=window.__HKB_POSITION_TEST__;
  if(!bridge||!positionTest) return;

  const STORAGE_KEY='hkb-position-editor-draft-v2';
  const PANEL_KEY='hkb-position-editor-panel-v1';
  const CHARACTERS=['boy','girl','mole','rabbit','turtle'];
  const LION_POSES=['tug','roar','defeated'];
  const GRIP_Y={boy:.488,girl:.488,mole:.434,rabbit:.584,turtle:.516,lion:.553};
  const LABELS={
    boy:'おとこのこ',girl:'おんなのこ',mole:'モグラ',rabbit:'ウサギ',turtle:'カメ',lion:'王者ライオン',
    tug:'tug（綱引き）',roar:'roar（咆哮）',defeated:'defeated（敗北）'
  };
  const records=new Map();
  const undoStack=[];
  const state={scene:'solo',target:'rope',left:'boy',right:'mole',pose:'tug',drag:null,collapsed:false};
  let lastJSON='';
  let refreshFrame=0;

  const $=id=>document.getElementById(id);
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const round=value=>Math.round(finite(value)*1e6)/1e6;
  const clone=value=>JSON.parse(JSON.stringify(value));

  function viewportMetrics() {
    const viewport=window.visualViewport;
    const width=Math.max(1,Math.round(viewport?.width||window.innerWidth||document.documentElement.clientWidth||1));
    const height=Math.max(1,Math.round(viewport?.height||window.innerHeight||document.documentElement.clientHeight||1));
    return {width,height,aspectRatio:round(width/height)};
  }

  function classifyProfile(width,height) {
    const w=Math.max(1,finite(width,1));
    const h=Math.max(1,finite(height,1));
    const ratio=w/h;
    if(h>=w) return 'portrait';
    if(w>=1100&&h>=600&&ratio>=1.55) return 'wide';
    return 'compact-landscape';
  }

  function currentProfile() {
    const {width,height}=viewportMetrics();
    return classifyProfile(width,height);
  }

  function currentArena() {
    return $(state.scene==='duo'?'duo-arena':'arena');
  }

  function currentStage() {
    return currentArena()?.querySelector(':scope > .position-stage')||currentArena();
  }

  function targetElement(target=state.target) {
    if(state.scene==='duo') {
      if(target==='rope') return currentArena()?.querySelector('.vertical-rope')||null;
      if(target==='left') return $('duo-white-person');
      return $('duo-red-person');
    }
    if(target==='rope') return currentArena()?.querySelector('.rope-track')||null;
    return $(target==='left'?'player-character':'cpu-character');
  }

  function identityFor(target=state.target) {
    const element=targetElement(target);
    if(!element) return null;
    const profile=currentProfile();
    if(target==='rope') {
      return {
        profile,scene:state.scene,role:'rope',character:'rope',
        asset:state.scene==='duo'?'rope-vertical':'rope-horizontal',pose:'normal',target,element
      };
    }
    const role=element.dataset.positionRole||(state.scene==='duo'?(target==='left'?'white':'red'):(target==='left'?'player':'cpu'));
    const character=element.dataset.positionCharacter||(target==='left'?state.left:state.right);
    const pose=element.dataset.positionPose||(character==='lion'?state.pose:'normal');
    const asset=element.dataset.positionAsset||(
      character==='lion'?`lion_${pose}`:
      ['boy','girl'].includes(character)?`player_${target==='left'?'red':'white'}_${character}`:`cpu_${character}`
    );
    return {profile,scene:state.scene,role,character,asset,pose,target,element};
  }

  function recordKey(identity) {
    return [identity.profile,identity.scene,identity.role,identity.character,identity.asset,identity.pose].join('|');
  }

  function baseAdjustment(identity) {
    if(identity.role==='rope') {
      const rope=bridge.getSnapshot()?.positioning?.rope||{};
      return {dx:finite(rope.offsetX),dy:finite(rope.offsetY),scale:1};
    }
    const runtimeProfile=identity.element.dataset.positionProfile||bridge.getSnapshot()?.positioning?.profile;
    const resolved=positionTest.resolveCharacterAdjustment(
      runtimeProfile,identity.role,identity.character,identity.asset,identity.pose
    );
    return {dx:finite(resolved.dx),dy:finite(resolved.dy),scale:finite(resolved.scale,1)};
  }

  function ensureRecord(identity) {
    const key=recordKey(identity);
    if(records.has(key)) return records.get(key);
    const base=baseAdjustment(identity);
    const viewport=viewportMetrics();
    const record={
      profile:identity.profile,scene:identity.scene,role:identity.role,character:identity.character,
      asset:identity.asset,pose:identity.pose,dx:round(base.dx),dy:round(base.dy),scale:round(base.scale),
      viewportWidth:viewport.width,viewportHeight:viewport.height,aspectRatio:viewport.aspectRatio,
      baseDx:round(base.dx),baseDy:round(base.dy),baseScale:round(base.scale)
    };
    records.set(key,record);
    return record;
  }

  function publicRecord(record) {
    return {
      profile:record.profile,scene:record.scene,role:record.role,character:record.character,
      asset:record.asset,pose:record.pose,dx:round(record.dx),dy:round(record.dy),scale:round(record.scale),
      viewportWidth:record.viewportWidth,viewportHeight:record.viewportHeight,aspectRatio:record.aspectRatio
    };
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify({
        schemaVersion:'hkb-position-editor/2',savedAt:new Date().toISOString(),
        appVersion:bridge.appVersion,records:[...records.values()]
      }));
    } catch (_) {}
  }

  function loadDraft() {
    try {
      const payload=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(payload?.schemaVersion!=='hkb-position-editor/2'||!Array.isArray(payload.records)) return;
      for(const candidate of payload.records) {
        if(!['wide','compact-landscape','portrait'].includes(candidate?.profile)) continue;
        if(!Number.isFinite(Number(candidate.dx))||!Number.isFinite(Number(candidate.dy))||!Number.isFinite(Number(candidate.scale))) continue;
        const record={...candidate,dx:round(candidate.dx),dy:round(candidate.dy),scale:round(candidate.scale)};
        records.set([record.profile,record.scene,record.role,record.character,record.asset,record.pose].join('|'),record);
      }
    } catch (_) {}
  }

  function snapshotAll() {
    return [...records.entries()].map(([key,value])=>[key,clone(value)]);
  }

  function pushUndo(kind='one',key=null) {
    if(kind==='all') undoStack.push({kind:'all',records:snapshotAll()});
    else undoStack.push({kind:'one',key,record:records.has(key)?clone(records.get(key)):null});
    if(undoStack.length>80) undoStack.shift();
    updateUndoButton();
  }

  function undo() {
    const entry=undoStack.pop();
    if(!entry) return;
    if(entry.kind==='all') {
      records.clear();
      entry.records.forEach(([key,value])=>records.set(key,value));
    } else if(entry.record) records.set(entry.key,entry.record);
    else records.delete(entry.key);
    saveDraft();
    refreshAll();
  }

  function updateUndoButton() {
    const button=$('position-editor-undo');
    if(button) button.disabled=undoStack.length===0;
  }

  function touchRecord(record) {
    const viewport=viewportMetrics();
    record.viewportWidth=viewport.width;
    record.viewportHeight=viewport.height;
    record.aspectRatio=viewport.aspectRatio;
  }

  function applyRecord(identity,record) {
    const stage=currentStage();
    if(!stage||!identity?.element||!record) return;
    if(!(stage.offsetWidth>0&&stage.offsetHeight>0)) return;
    const x=record.dx*stage.offsetWidth;
    const y=record.dy*stage.offsetHeight;
    identity.element.style.translate=`${Math.abs(x)<.0005?0:x.toFixed(3)}px ${Math.abs(y)<.0005?0:y.toFixed(3)}px`;
    if(Math.abs(record.scale-1)>.000001) identity.element.style.scale=String(record.scale);
    else identity.element.style.removeProperty('scale');
    identity.element.dataset.positionEditorKey=recordKey(identity);
  }

  function visibleIdentities() {
    return ['rope','left','right'].map(identityFor).filter(Boolean);
  }

  function applyVisibleRecords() {
    for(const identity of visibleIdentities()) applyRecord(identity,ensureRecord(identity));
  }

  function selectedRecord() {
    const identity=identityFor();
    return identity?{identity,key:recordKey(identity),record:ensureRecord(identity)}:null;
  }

  function openPreview() {
    bridge.openPreview({
      scene:state.scene,left:state.left,
      right:state.scene==='solo'&&state.right==='lion'?`lion_${state.pose}`:state.right,
      pose:state.pose
    });
    scheduleRefresh();
  }

  function targetLabel() {
    if(state.target==='rope') return '綱';
    if(state.scene==='duo') return state.target==='left'?'左／上（白）':'右／下（赤）';
    return state.target==='left'?'左キャラクター':'右キャラクター／CPU';
  }

  function setSelectedTarget(target) {
    state.target=['rope','left','right'].includes(target)?target:'rope';
    refreshAll();
  }

  function renderPanel() {
    const profile=currentProfile();
    const viewport=viewportMetrics();
    const selected=selectedRecord();
    $('position-editor-profile').textContent=profile;
    $('position-editor-viewport').textContent=`${viewport.width} × ${viewport.height}（${viewport.aspectRatio}）`;
    $('position-editor-current-target').textContent=targetLabel();
    $('position-editor-scene').value=state.scene;
    $('position-editor-target').value=state.target;

    const characterSelect=$('position-editor-character');
    const chosen=state.target==='left'?state.left:state.right;
    [...characterSelect.options].forEach(option=>{ option.hidden=option.value==='lion'&&state.scene==='duo'; });
    characterSelect.disabled=state.target==='rope';
    characterSelect.value=state.target==='rope'?'boy':chosen;
    $('position-editor-character-row').hidden=state.target==='rope';
    $('position-editor-pose-row').hidden=!(state.scene==='solo'&&state.target==='right'&&state.right==='lion');
    $('position-editor-pose').value=state.pose;

    if(selected) {
      $('position-editor-dx').value=selected.record.dx.toFixed(6);
      $('position-editor-dy').value=selected.record.dy.toFixed(6);
      $('position-editor-scale').value=selected.record.scale.toFixed(3);
      $('position-editor-scale-range').value=String(Math.min(1.6,Math.max(.5,selected.record.scale)));
      $('position-editor-identity').textContent=`${selected.record.role} / ${selected.record.character} / ${selected.record.pose}`;
    }
    updateUndoButton();
  }

  function ensureGuides() {
    const arena=currentArena();
    if(!arena) return null;
    let guides=arena.querySelector(':scope > .position-editor-guides');
    if(!guides) {
      guides=document.createElement('div');
      guides.className='position-editor-guides';
      guides.innerHTML='<div class="position-editor-rope-guide"></div><i class="position-editor-grip" data-target="left"></i><i class="position-editor-grip" data-target="right"></i>';
      arena.appendChild(guides);
    }
    return guides;
  }

  function updateGuides() {
    document.querySelectorAll('.position-editor-guides').forEach(item=>{
      if(item.parentElement!==currentArena()) item.remove();
    });
    const arena=currentArena();
    const guides=ensureGuides();
    const rope=targetElement('rope');
    if(!arena||!guides||!rope) return;
    const arenaRect=arena.getBoundingClientRect();
    const ropeRect=rope.getBoundingClientRect();
    const vertical=ropeRect.height>ropeRect.width;
    const line=guides.querySelector('.position-editor-rope-guide');
    line.className=`position-editor-rope-guide ${vertical?'vertical':'horizontal'}`;
    line.style.left=vertical?`${ropeRect.left-arenaRect.left+ropeRect.width/2}px`:'';
    line.style.top=vertical?'':`${ropeRect.top-arenaRect.top+ropeRect.height/2}px`;

    ['left','right'].forEach(target=>{
      const element=targetElement(target);
      const marker=guides.querySelector(`[data-target="${target}"]`);
      if(!element||!marker) return;
      const image=element.querySelector('img')||element;
      const rect=image.getBoundingClientRect();
      const identity=identityFor(target);
      const grip=GRIP_Y[identity?.character]??.5;
      let x=rect.left-arenaRect.left+rect.width*(target==='left'?.76:.24);
      let y=rect.top-arenaRect.top+rect.height*grip;
      if(vertical) {
        x=rect.left-arenaRect.left+rect.width*.5;
        y=rect.top-arenaRect.top+rect.height*.5;
      }
      marker.style.left=`${x}px`;
      marker.style.top=`${y}px`;
      marker.dataset.side=target==='left'?'左手目安':'右手目安';
    });
  }

  function markSelectedElement() {
    document.querySelectorAll('.position-editor-target').forEach(element=>element.classList.remove('position-editor-target'));
    targetElement()?.classList.add('position-editor-target');
  }

  function refreshAll() {
    refreshFrame=0;
    applyVisibleRecords();
    markSelectedElement();
    updateGuides();
    renderPanel();
    saveDraft();
  }

  function scheduleRefresh() {
    if(refreshFrame) cancelAnimationFrame(refreshFrame);
    refreshFrame=requestAnimationFrame(()=>requestAnimationFrame(refreshAll));
  }

  function mutateCurrent(mutator,{recordUndo=true,save=true}={}) {
    const selected=selectedRecord();
    if(!selected) return;
    if(recordUndo) pushUndo('one',selected.key);
    mutator(selected.record,selected.identity);
    selected.record.dx=round(selected.record.dx);
    selected.record.dy=round(selected.record.dy);
    selected.record.scale=round(Math.min(2,Math.max(.25,selected.record.scale)));
    touchRecord(selected.record);
    applyRecord(selected.identity,selected.record);
    updateGuides();
    renderPanel();
    if(save) saveDraft();
  }

  function resetCurrent() {
    const selected=selectedRecord();
    if(!selected) return;
    pushUndo('one',selected.key);
    selected.record.dx=selected.record.baseDx;
    selected.record.dy=selected.record.baseDy;
    selected.record.scale=selected.record.baseScale;
    touchRecord(selected.record);
    saveDraft();
    refreshAll();
  }

  function resetAll() {
    pushUndo('all');
    records.clear();
    saveDraft();
    bridge.sync();
    refreshAll();
  }

  function exportPayload() {
    applyVisibleRecords();
    const adjustments=[...records.values()]
      .map(publicRecord)
      .sort((a,b)=>[a.profile,a.scene,a.role,a.character,a.asset,a.pose].join('|').localeCompare([b.profile,b.scene,b.role,b.character,b.asset,b.pose].join('|')));
    return {
      schemaVersion:'hkb-position-editor/2',editorVersion:'2.0.0',gameAppVersion:bridge.appVersion,
      generatedAt:new Date().toISOString(),
      profileRules:{
        portrait:'viewport height >= width',
        wide:'landscape, width >= 1100, height >= 600, aspect ratio >= 1.55',
        'compact-landscape':'all other landscape viewports'
      },
      adjustments
    };
  }

  function showOutput() {
    lastJSON=JSON.stringify(exportPayload(),null,2);
    $('position-editor-json').value=lastJSON;
    $('position-editor-output').hidden=false;
    $('position-editor-json').focus();
  }

  async function copyOutput() {
    const textarea=$('position-editor-json');
    textarea.select();
    try {
      await navigator.clipboard.writeText(textarea.value);
      $('position-editor-copy').textContent='コピーしました';
      setTimeout(()=>{$('position-editor-copy').textContent='JSONをコピー';},1600);
    } catch (_) {
      document.execCommand('copy');
    }
  }

  function downloadOutput() {
    const blob=new Blob([$('position-editor-json').value],{type:'application/json'});
    const link=document.createElement('a');
    link.href=URL.createObjectURL(blob);
    link.download=`hkb-position-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  function buildUI() {
    document.documentElement.classList.add('position-editor-enabled');
    document.body.classList.add('position-editor-active');
    const panel=document.createElement('aside');
    panel.id='position-editor-panel';
    panel.setAttribute('aria-label','配置調整パネル');
    panel.innerHTML=`
      <div class="position-editor-head" title="ドラッグでパネルを移動"><strong>配置調整モード</strong><button class="position-editor-collapse" type="button" title="折りたたむ">−</button></div>
      <div class="position-editor-body">
        <div class="position-editor-meta">
          <span>profile</span><b id="position-editor-profile"></b>
          <span>viewport</span><b id="position-editor-viewport"></b>
          <span>対象</span><b id="position-editor-current-target"></b>
          <span>識別</span><b id="position-editor-identity"></b>
        </div>
        <label class="position-editor-field"><span>画面</span><select id="position-editor-scene"><option value="solo">ひとり対戦</option><option value="duo">ふたり対戦</option></select></label>
        <label class="position-editor-field"><span>選択対象</span><select id="position-editor-target"><option value="rope">綱</option><option value="left">左キャラ</option><option value="right">右キャラ／CPU</option></select></label>
        <label id="position-editor-character-row" class="position-editor-field"><span>キャラ</span><select id="position-editor-character">${CHARACTERS.map(value=>`<option value="${value}">${LABELS[value]}</option>`).join('')}<option value="lion">王者ライオン</option></select></label>
        <label id="position-editor-pose-row" class="position-editor-field"><span>pose</span><select id="position-editor-pose">${LION_POSES.map(value=>`<option value="${value}">${LABELS[value]}</option>`).join('')}</select></label>
        <div class="position-editor-values">
          <label>dx<input id="position-editor-dx" type="number" step="0.001"></label>
          <label>dy<input id="position-editor-dy" type="number" step="0.001"></label>
          <label>scale<input id="position-editor-scale" type="number" min="0.25" max="2" step="0.01"></label>
        </div>
        <div class="position-editor-scale-row"><button id="position-editor-minus" type="button" aria-label="縮小">−</button><input id="position-editor-scale-range" type="range" min="0.5" max="1.6" step="0.01" value="1"><button id="position-editor-plus" type="button" aria-label="拡大">＋</button></div>
        <div class="position-editor-actions">
          <button id="position-editor-undo" type="button">ひとつ前に戻す</button>
          <button id="position-editor-reset" type="button">この対象をリセット</button>
          <button id="position-editor-reset-all" type="button">全部リセット</button>
          <button id="position-editor-reopen" type="button">画面を再表示</button>
          <button id="position-editor-finish" type="button">調整完了・JSON生成</button>
        </div>
        <p class="position-editor-hint">対象を直接ドラッグ。矢印キーは約1px、Shift＋矢印は約5px。＋／−で拡大縮小します。</p>
      </div>`;
    document.body.appendChild(panel);
    try {
      const saved=JSON.parse(localStorage.getItem(PANEL_KEY)||'null');
      if(saved&&Number.isFinite(saved.left)&&Number.isFinite(saved.top)&&window.innerWidth>560) {
        panel.style.left=`${saved.left}px`;
        panel.style.top=`${saved.top}px`;
        panel.style.right='auto';
        panel.style.bottom='auto';
      }
    } catch (_) {}

    const output=document.createElement('div');
    output.id='position-editor-output';
    output.hidden=true;
    output.innerHTML=`<div class="position-editor-output-box" role="dialog" aria-modal="true" aria-labelledby="position-editor-output-title">
      <h2 id="position-editor-output-title">正式反映用JSON</h2>
      <textarea id="position-editor-json" spellcheck="false" readonly></textarea>
      <div class="position-editor-output-actions"><button id="position-editor-copy" type="button">JSONをコピー</button><button id="position-editor-download" type="button">JSONを保存</button><button id="position-editor-close-output" type="button">調整へ戻る</button></div>
    </div>`;
    document.body.appendChild(output);
  }

  function bindUI() {
    $('position-editor-scene').addEventListener('change',event=>{
      state.scene=event.target.value==='duo'?'duo':'solo';
      if(state.scene==='duo'&&state.right==='lion') state.right='girl';
      openPreview();
    });
    $('position-editor-target').addEventListener('change',event=>setSelectedTarget(event.target.value));
    $('position-editor-character').addEventListener('change',event=>{
      const value=event.target.value;
      if(state.target==='left') state.left=CHARACTERS.includes(value)?value:'boy';
      if(state.target==='right') state.right=value==='lion'&&state.scene==='solo'?'lion':CHARACTERS.includes(value)?value:'mole';
      openPreview();
    });
    $('position-editor-pose').addEventListener('change',event=>{state.pose=LION_POSES.includes(event.target.value)?event.target.value:'tug';openPreview();});
    ['dx','dy','scale'].forEach(name=>{
      $(`position-editor-${name}`).addEventListener('change',event=>{
        const value=finite(event.target.value,name==='scale'?1:0);
        mutateCurrent(record=>{record[name]=value;});
      });
    });
    $('position-editor-minus').addEventListener('click',()=>mutateCurrent(record=>{record.scale-=.01;}));
    $('position-editor-plus').addEventListener('click',()=>mutateCurrent(record=>{record.scale+=.01;}));
    const range=$('position-editor-scale-range');
    let rangeUndo=false;
    range.addEventListener('pointerdown',()=>{const selected=selectedRecord();if(selected){pushUndo('one',selected.key);rangeUndo=true;}});
    range.addEventListener('input',event=>mutateCurrent(record=>{record.scale=finite(event.target.value,1);},{recordUndo:!rangeUndo,save:false}));
    range.addEventListener('change',()=>{rangeUndo=false;saveDraft();});
    $('position-editor-undo').addEventListener('click',undo);
    $('position-editor-reset').addEventListener('click',resetCurrent);
    $('position-editor-reset-all').addEventListener('click',resetAll);
    $('position-editor-reopen').addEventListener('click',openPreview);
    $('position-editor-finish').addEventListener('click',showOutput);
    $('position-editor-copy').addEventListener('click',copyOutput);
    $('position-editor-download').addEventListener('click',downloadOutput);
    $('position-editor-close-output').addEventListener('click',()=>{$('position-editor-output').hidden=true;});
    document.querySelector('.position-editor-collapse').addEventListener('click',event=>{
      state.collapsed=!state.collapsed;
      $('position-editor-panel').classList.toggle('is-collapsed',state.collapsed);
      event.currentTarget.textContent=state.collapsed?'＋':'−';
      event.currentTarget.title=state.collapsed?'開く':'折りたたむ';
    });
  }

  function clampPanel() {
    const panel=$('position-editor-panel');
    if(!panel||!panel.style.left) return;
    const rect=panel.getBoundingClientRect();
    const left=Math.min(Math.max(4,rect.left),Math.max(4,window.innerWidth-rect.width-4));
    const top=Math.min(Math.max(4,rect.top),Math.max(4,window.innerHeight-rect.height-4));
    panel.style.left=`${left}px`;
    panel.style.top=`${top}px`;
  }

  function bindPanelDragging() {
    const panel=$('position-editor-panel');
    const head=panel.querySelector('.position-editor-head');
    let drag=null;
    head.addEventListener('pointerdown',event=>{
      if(event.target.closest('button')) return;
      const rect=panel.getBoundingClientRect();
      drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top};
      head.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    head.addEventListener('pointermove',event=>{
      if(!drag||drag.pointerId!==event.pointerId) return;
      panel.style.left=`${drag.left+event.clientX-drag.startX}px`;
      panel.style.top=`${drag.top+event.clientY-drag.startY}px`;
      panel.style.right='auto';
      panel.style.bottom='auto';
      clampPanel();
      event.preventDefault();
    });
    const finish=event=>{
      if(!drag||drag.pointerId!==event.pointerId) return;
      drag=null;
      clampPanel();
      const rect=panel.getBoundingClientRect();
      try { localStorage.setItem(PANEL_KEY,JSON.stringify({left:Math.round(rect.left),top:Math.round(rect.top)})); } catch (_) {}
      event.preventDefault();
    };
    head.addEventListener('pointerup',finish);
    head.addEventListener('pointercancel',finish);
  }

  function targetFromPointer(node) {
    return ['rope','left','right'].find(target=>targetElement(target)?.contains(node))||null;
  }

  function bindDragging() {
    document.addEventListener('pointerdown',event=>{
      if(event.button!==undefined&&event.button!==0) return;
      if($('position-editor-panel').contains(event.target)||$('position-editor-output').contains(event.target)) return;
      const target=targetFromPointer(event.target);
      if(!target) return;
      state.target=target;
      const selected=selectedRecord();
      const stage=currentStage();
      if(!selected||!stage) return;
      pushUndo('one',selected.key);
      const rect=stage.getBoundingClientRect();
      state.drag={
        pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,width:rect.width,height:rect.height,
        dx:selected.record.dx,dy:selected.record.dy,key:selected.key
      };
      document.body.classList.add('position-editor-dragging');
      targetElement()?.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopImmediatePropagation();
      renderPanel();
    },true);
    document.addEventListener('pointermove',event=>{
      const drag=state.drag;
      if(!drag||drag.pointerId!==event.pointerId) return;
      mutateCurrent(record=>{
        record.dx=drag.dx+(event.clientX-drag.startX)/Math.max(1,drag.width);
        record.dy=drag.dy+(event.clientY-drag.startY)/Math.max(1,drag.height);
      },{recordUndo:false,save:false});
      event.preventDefault();
      event.stopImmediatePropagation();
    },true);
    const endDrag=event=>{
      if(!state.drag||state.drag.pointerId!==event.pointerId) return;
      state.drag=null;
      document.body.classList.remove('position-editor-dragging');
      saveDraft();
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener('pointerup',endDrag,true);
    document.addEventListener('pointercancel',endDrag,true);
  }

  function bindKeyboard() {
    document.addEventListener('keydown',event=>{
      if($('position-editor-output')&&!$('position-editor-output').hidden) return;
      if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(event.target?.tagName)) return;
      const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(arrows[event.key]) {
        const stage=currentStage()?.getBoundingClientRect();
        if(!stage) return;
        const pixels=event.shiftKey?5:1;
        const [x,y]=arrows[event.key];
        mutateCurrent(record=>{
          record.dx+=x*pixels/Math.max(1,stage.width);
          record.dy+=y*pixels/Math.max(1,stage.height);
        });
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if(event.key==='+'||event.key==='=') {
        mutateCurrent(record=>{record.scale+=.01;});event.preventDefault();event.stopImmediatePropagation();
      } else if(event.key==='-'||event.key==='_') {
        mutateCurrent(record=>{record.scale-=.01;});event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
  }

  function initialize() {
    loadDraft();
    buildUI();
    bindUI();
    bindPanelDragging();
    bindDragging();
    bindKeyboard();
    window.addEventListener('hkb-position-preview-change',scheduleRefresh);
    window.addEventListener('resize',()=>{clampPanel();scheduleRefresh();});
    window.visualViewport?.addEventListener('resize',scheduleRefresh);
    document.addEventListener('fullscreenchange',scheduleRefresh);
    bridge.openPreview({scene:'solo',left:state.left,right:state.right,pose:state.pose});
    scheduleRefresh();

    window.__HKB_POSITION_EDITOR__=Object.freeze({
      classifyProfile,
      getJSON:()=>JSON.stringify(exportPayload(),null,2),
      getRecords:()=>[...records.values()].map(publicRecord),
      getState:()=>clone({...state,drag:null,profile:currentProfile(),viewport:viewportMetrics()}),
      refresh:refreshAll
    });
  }

  initialize();
})();
