// Development layout drafts are loaded only by the explicit ?layout=edit route.
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('layout') !== 'edit') return;
  const KEY = 'towerLayoutDraftV1';
  const PRESETS = [[320,568],[360,640],[375,667],[390,844],[412,915],[430,932],[600,1024],[768,1024],[844,390]];
  const LABELS = {board:'盤面',tower:'ミニ塔',status:'タイマー / 状態',preview:'上部プレビュー',power:'れんさパワー',controls:'操作ボタン'};
  const IDS = Object.keys(LABELS);
  const childPreview = new URLSearchParams(location.search).get('layoutPreview') === '1';
  const host = !childPreview && innerWidth > 600;
  const defaults = () => Object.fromEntries(IDS.map(id => [id,{x:0,y:0,scale:1}]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const profileKey = () => `${innerWidth}x${innerHeight}`;

  function makePanel(container, isHost) {
    container.className = 'layout-panel';
    container.innerHTML = `<header><h1>スマホ配置の調整</h1><p>確定配置を基準に調整できます。変更した場合は設定JSONを書き出してください。</p></header>
      <fieldset disabled><label>画面サイズ<select data-action="preset">${isHost?PRESETS.map(([w,h])=>`<option value="${w}x${h}" ${w===390?'selected':''}>${w} × ${h}</option>`).join(''):'<option value="device">この端末</option>'}</select></label>
      <label>ゲーム<select data-action="mode"><option value="pairFalling">ペアおち3分</option><option value="falling">おちてくる3分</option><option value="free">じゆう</option><option value="timed">3分チャレンジ</option></select></label>
      <button type="button" data-action="play" class="layout-primary">あそんで確認</button>
      <label>調整するまとまり<select data-action="group">${IDS.map(id=>`<option value="${id}">${LABELS[id]}</option>`).join('')}</select></label>
      <output data-value="geometry">準備中…</output>
      <div class="layout-scale"><button type="button" data-action="smaller" aria-label="1パーセント縮小">−</button><input data-action="scale" type="range" min="0.5" max="1.6" step="0.01" aria-label="選択グループの拡大率"><button type="button" data-action="larger" aria-label="1パーセント拡大">＋</button><output data-value="scale"></output></div>
      <div class="layout-position"><label>X <input data-action="x" type="number" min="-500" max="500" step="1"></label><label>Y <input data-action="y" type="number" min="-500" max="500" step="1"></label></div>
      <div class="layout-nudge"><button type="button" data-action="up" aria-label="上へ1px">↑</button><button type="button" data-action="left" aria-label="左へ1px">←</button><span>1pxずつ</span><button type="button" data-action="right" aria-label="右へ1px">→</button><button type="button" data-action="down" aria-label="下へ1px">↓</button></div>
      <label class="layout-check"><input data-action="guides" type="checkbox" checked>中央線・境界ガイド</label>
      <div class="layout-actions"><button type="button" data-action="reset">選択を初期位置へ</button><button type="button" data-action="reset-all">この画面サイズを初期化</button></div>
      <button type="button" data-action="export" class="layout-primary">設定を書き出す</button>
      <div class="layout-export" hidden><label>設定JSON<textarea data-value="json" readonly rows="8"></textarea></label><div class="layout-actions"><button type="button" data-action="download">JSONを保存</button><button type="button" data-action="copy">コピー</button></div></div>
      <label class="layout-import">設定JSONを読み込む<input data-action="import" type="file" accept="application/json,.json"></label>
      </fieldset><p class="layout-note">ドラッグ・拡大縮小は「調整中」で使えます。下書きは編集画面だけに保存されます。通常画面には反映されません。</p><p role="status" data-value="message">準備中…</p>`;
    return container;
  }

  function connectPanel(panel, getApi, onPreset) {
    const action = id => panel.querySelector(`[data-action="${id}"]`);
    const value = id => panel.querySelector(`[data-value="${id}"]`);
    function update() {
      const api = getApi(); if (!api) return;
      panel.querySelector('fieldset').disabled = false;
      const state = api.getState(), item = state.groups[state.selected];
      action('group').value = state.selected; action('mode').value = state.mode;
      action('play').textContent = state.editing ? 'あそんで確認' : '配置の調整に戻る';
      action('scale').value = item.scale; value('scale').textContent = `${Math.round(item.scale*100)}%`;
      action('x').value = item.x; action('y').value = item.y;
      action('guides').checked = state.guides;
      const box = state.boxes[state.selected];
      value('geometry').textContent = `${state.viewport.width} × ${state.viewport.height} ｜ ${LABELS[state.selected]} ${Math.round(box.width)} × ${Math.round(box.height)}px`;
      value('message').textContent = state.message || (state.editing ? '調整中：まとまりをドラッグできます。' : 'あそんで確認中：ゲームを操作できます。');
    }
    panel.addEventListener('click', async event => {
      const id = event.target.closest('button[data-action]')?.dataset.action;
      if (!id) return;
      const api = getApi(); if (!api) return;
      const state = api.getState(), item = state.groups[state.selected];
      const nudges = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
      if (nudges[id]) api.setGroup(state.selected,{x:item.x+nudges[id][0],y:item.y+nudges[id][1]});
      else if (id === 'smaller' || id === 'larger') api.setGroup(state.selected,{scale:item.scale+(id==='larger'?.01:-.01)});
      else if (id === 'reset') api.reset(false);
      else if (id === 'reset-all') api.reset(true);
      else if (id === 'play') api.setEditing(!state.editing);
      else if (id === 'export') {
        value('json').value = api.exportJSON(); panel.querySelector('.layout-export').hidden = false;
        value('message').textContent = '設定を書き出しました。このJSONを配置確認に使ってください。';
      } else if (id === 'download') {
        const blob = new Blob([value('json').value],{type:'application/json'});
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href=url; link.download='tower-layout-draft.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      } else if (id === 'copy') {
        try { await navigator.clipboard.writeText(value('json').value); value('message').textContent='JSONをコピーしました。'; }
        catch { value('json').focus(); value('json').select(); value('message').textContent='JSON欄を選択しました。コピーしてください。'; }
      }
      if (!['export','copy','download'].includes(id)) update();
    });
    panel.addEventListener('input', event => {
      const api = getApi(); if (!api) return;
      const id = event.target.dataset.action;
      if (['scale','x','y'].includes(id)) {
        const number = Number(event.target.value); if (!Number.isFinite(number) || event.target.value === '') return;
        api.setGroup(api.getState().selected,{[id==='scale'?'scale':id]:number}); update();
      }
    });
    panel.addEventListener('change', async event => {
      const api = getApi(); if (!api) return;
      const id = event.target.dataset.action;
      if (id==='group') api.select(event.target.value);
      if (id==='mode') api.startMode(event.target.value);
      if (id==='guides') api.setGuides(event.target.checked);
      if (id==='preset') onPreset(event.target.value);
      if (id==='import' && event.target.files[0]) {
        try { api.importJSON(await event.target.files[0].text()); update(); }
        catch (error) { value('message').textContent=`読み込めませんでした：${error.message}`; }
        event.target.value='';
      } else update();
    });
    return update;
  }

  if (host) {
    stopCurrentGame(); document.documentElement.classList.add('layout-host');
    const workspace = document.createElement('div'); workspace.className='layout-workspace';
    const panel = makePanel(document.createElement('aside'),true);
    const area = document.createElement('div'); area.className='layout-preview-area';
    const mount = document.createElement('div'); mount.className='layout-preview-mount';
    const frame = document.createElement('iframe'); frame.title='ゲーム画面の配置プレビュー';
    const url = new URL(location.href); url.searchParams.set('layoutPreview','1'); frame.src=url.href;
    frame.style.width='390px'; frame.style.height='844px'; mount.append(frame); area.append(mount); workspace.append(panel,area); document.body.append(workspace);
    let width=390,height=844,innerApi=null;
    function fit() {
      const scale = Math.min(1,(area.clientWidth-28)/width,(area.clientHeight-28)/height);
      mount.style.width=`${width*Math.max(.1,scale)}px`; mount.style.height=`${height*Math.max(.1,scale)}px`;
      frame.style.transform=`scale(${Math.max(.1,scale)})`;
    }
    const update = connectPanel(panel,()=>innerApi,preset=>{
      [width,height]=preset.split('x').map(Number); frame.style.width=`${width}px`; frame.style.height=`${height}px`; fit();
    });
    function attach() {
      if (!frame.contentWindow?.TowerLayoutEditor) return;
      if (innerApi===frame.contentWindow.TowerLayoutEditor) {update();fit();return;}
      innerApi=frame.contentWindow.TowerLayoutEditor;
      frame.contentWindow.addEventListener('tower-layout-update',update); update(); fit();
    }
    frame.addEventListener('load',attach); window.addEventListener('tower-layout-ready',attach);
    new ResizeObserver(fit).observe(area); fit();
    window.TowerLayoutEditorHost = Object.freeze({getState:()=>innerApi?.getState(),frame});
    return;
  }

  document.documentElement.classList.add('layout-client');
  let profiles={},selected='board',editing=true,guides=true,message='',drag=null;
  let currentProfile=profileKey();
  function validateGroups(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('配置データがありません。');
    const result=defaults();
    for (const id of IDS) {
      if (!Object.hasOwn(input,id)) continue;
      const item=input[id];
      if (!item || !['x','y','scale'].every(key=>typeof item[key]==='number'&&Number.isFinite(item[key]))) throw new Error(`${LABELS[id]}の数値が正しくありません。`);
      if (Math.abs(item.x)>500 || Math.abs(item.y)>500 || item.scale<.5 || item.scale>1.6) throw new Error(`${LABELS[id]}の値が調整範囲外です。`);
      result[id]={x:Math.round(item.x),y:Math.round(item.y),scale:Math.round(item.scale*100)/100};
    }
    return result;
  }
  function parseDraft(raw) {
    const input=JSON.parse(raw),result={};
    if (input.version !== undefined && input.version !== 1) throw new Error('対応していない設定バージョンです。');
    if (input.profiles && typeof input.profiles==='object') {
      for (const [key,groups] of Object.entries(input.profiles)) {
        if (!/^\d{2,4}x\d{2,4}$/.test(key)) throw new Error('画面サイズが正しくありません。');
        result[key]=validateGroups(groups);
      }
    }
    if (input.portrait) result[currentProfile]=validateGroups(input.portrait);
    if (!Object.keys(result).length) throw new Error('portrait または profiles が必要です。');
    return result;
  }
  try { const raw=localStorage.getItem(KEY); if(raw) profiles=parseDraft(raw); }
  catch { message='保存された下書きを読めなかったため、初期配置で開きました。'; }
  function groups() { return profiles[currentProfile] ||= defaults(); }
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify({version:1,profiles})); }
    catch { message='このブラウザでは下書きを保存できません。JSONを書き出してください。'; }
  }
  const nodes=TowerMobileLayout.groups;
  const guide=document.createElement('div'); guide.className='layout-guide'; guide.setAttribute('aria-hidden','true'); document.getElementById('game-screen').append(guide);
  for (const [id,node] of Object.entries(nodes)) {
    node.classList.add('layout-group');
    const hit=document.createElement('div'); hit.className='layout-hit'; hit.dataset.group=id; hit.setAttribute('aria-label',`${LABELS[id]}をドラッグ`);
    const label=document.createElement('span'); label.className='layout-group-label'; label.textContent=LABELS[id]; hit.append(label); node.append(hit);
    hit.addEventListener('pointerdown',event=>{
      if (!editing || !TowerMobileLayout.isCompact() || event.button>0) return;
      event.preventDefault(); event.stopPropagation(); selected=id;
      drag={id,startX:event.clientX,startY:event.clientY,item:clone(groups()[id]),pointerId:event.pointerId};
      hit.setPointerCapture(event.pointerId); apply(); emit();
    });
    hit.addEventListener('pointermove',event=>{
      if (!drag || drag.pointerId!==event.pointerId || drag.id!==id) return;
      event.preventDefault(); event.stopPropagation();
      setGroup(id,{x:drag.item.x+event.clientX-drag.startX,y:drag.item.y+event.clientY-drag.startY},false);
    });
    const finish=event=>{if(drag?.pointerId===event.pointerId){drag=null;save();}};
    hit.addEventListener('pointerup',finish); hit.addEventListener('pointercancel',finish); hit.addEventListener('lostpointercapture',finish);
    hit.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
  }
  function apply() {
    const active=TowerMobileLayout.isCompact();
    document.documentElement.classList.toggle('layout-adjusting',editing&&active);
    document.documentElement.classList.toggle('layout-guides',guides&&editing&&active);
    for (const [id,node] of Object.entries(nodes)) {
      const item=groups()[id]; node.classList.toggle('layout-selected',id===selected);
      node.style.transform=active?`translate(${item.x}px, ${item.y}px) scale(${item.scale})`:'';
    }
  }
  function boxes() {
    return Object.fromEntries(IDS.map(id=>{const box=nodes[id].getBoundingClientRect();return [id,{x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height)}];}));
  }
  function getState() { return {selected,editing,guides,message,mode:currentMode,groups:clone(groups()),viewport:{width:innerWidth,height:innerHeight},boxes:boxes()}; }
  function emit() { window.dispatchEvent(new CustomEvent('tower-layout-update')); }
  function setGroup(id,patch,persist=true) {
    if (!IDS.includes(id)) return;
    const item=groups()[id];
    for (const key of ['x','y','scale']) if (Number.isFinite(patch[key])) item[key]=key==='scale'?Math.round(Math.max(.5,Math.min(1.6,patch[key]))*100)/100:Math.round(Math.max(-500,Math.min(500,patch[key])));
    apply(); if(persist)save(); emit();
  }
  function setEditing(next) {
    editing=!!next;
    if (gameRunning && isGameScreenActive()) {
      if (editing) {
        if (fallingPiece?.phase==='locking' && !paused) accrueLockTime();
        paused=true; clearFallingTimers(); hidePauseLayers(); setPauseButton(true);
        window.BGMController?.pauseForGame('layout');
      } else {
        paused=false; hidePauseLayers(); setPauseButton(false);
        window.BGMController?.resumeForGame();
        if (isFallingMode()) {
          if (fallingPiece?.phase==='locking') beginLockDelay();
          else if (fallingPiece) scheduleFallingStep(); else scheduleSpawn(180);
        }
      }
      updateFallingControls(); updateHoldAvailability(); updateHints();
    }
    apply(); emit();
  }
  function startMode(mode) {
    if (!['free','timed','falling','pairFalling'].includes(mode)) return;
    startGame(mode);
    if(isFallingMode())spawnFallingPiece();
    setEditing(editing);
  }
  function exportJSON() {
    return JSON.stringify({version:1,portrait:clone(groups()),profiles:clone(profiles),viewport:{width:innerWidth,height:innerHeight},mode:currentMode,boxes:boxes()},null,2);
  }
  window.TowerLayoutEditor=Object.freeze({
    getState,setGroup,setEditing,startMode,exportJSON,
    select(id){if(IDS.includes(id)){selected=id;apply();emit();}},
    setGuides(next){guides=!!next;apply();emit();},
    reset(all){if(all)profiles[currentProfile]=defaults();else groups()[selected]={x:0,y:0,scale:1};message='初期配置へ戻しました。';save();apply();emit();},
    importJSON(raw){const imported=parseDraft(raw);profiles={...profiles,...imported};message='設定JSONを読み込みました。';save();apply();emit();}
  });
  startMode('pairFalling');
  window.addEventListener('resize',()=>{
    currentProfile=profileKey(); apply(); requestAnimationFrame(emit);
  });
  window.addEventListener('tower-portrait-change',()=>{apply();requestAnimationFrame(emit);});
  window.addEventListener('tower-screen-change',event=>{
    if(event.detail.name==='game'&&editing)requestAnimationFrame(()=>setEditing(true));
  });
  document.addEventListener('keydown',event=>{
    if(!editing || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
    event.preventDefault();event.stopImmediatePropagation();
    const item=groups()[selected],step=event.shiftKey?5:1;
    setGroup(selected,{x:item.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),y:item.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0)});
  },true);
  if(!childPreview) {
    const drawer=document.createElement('div'); drawer.className='layout-phone-drawer';
    const toolbar=document.createElement('div'); toolbar.className='layout-phone-toolbar';
    toolbar.innerHTML='<button type="button" data-toggle="panel">調整パネル</button><button type="button" data-toggle="play">あそんで確認</button>';
    const panel=makePanel(document.createElement('aside'),false);panel.hidden=true; drawer.append(toolbar,panel);document.body.append(drawer);
    const update=connectPanel(panel,()=>TowerLayoutEditor,()=>{});
    toolbar.addEventListener('click',event=>{
      const id=event.target.dataset.toggle;
      if(id==='panel')panel.hidden=!panel.hidden;
      if(id==='play'){setEditing(!editing);panel.hidden=true;}
      update();
    });
    window.addEventListener('tower-layout-update',()=>{update();toolbar.querySelector('[data-toggle="play"]').textContent=editing?'あそんで確認':'配置の調整に戻る';});update();
    panel.querySelector('.layout-note').append(' 画面サイズの比較はPCで確認できます。');
  }
  requestAnimationFrame(()=>{apply();emit();if(childPreview&&parent!==window)parent.dispatchEvent(new CustomEvent('tower-layout-ready'));});
})();
