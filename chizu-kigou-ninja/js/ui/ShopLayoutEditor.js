(function () {
  "use strict";
  const app=MapSymbolNinja;
  class ShopLayoutEditor {
    constructor(scene) { this.scene=scene;this.controller=scene.layoutController;this.model=scene.layoutModel;this.selected="sword";this.dock=0;this.drag=null; }
    start() {
      if (!NINJA_CONFIG.DEV_PANEL_ENABLED || !this.scene.layoutEditingAllowed) return false;
      this.abort=new AbortController();this.scene.panel.classList.add("shop-editing");
      this.canvas=document.createElement("canvas");this.canvas.className="shop-layout-guides";this.canvas.width=1366;this.canvas.height=768;this.canvas.setAttribute("aria-hidden","true");document.body.append(this.canvas);
      this.panel=document.createElement("aside");this.panel.id="shop-layout-editor";this.panel.setAttribute("aria-label","ショップのレイアウト調整");
      this.panel.innerHTML=`<header><strong>ショップ配置</strong><button data-editor="collapse">たたむ</button><button data-editor="dock">位置</button><button data-editor="finish">終了</button></header>
        <div class="shop-editor-content"><p>1366×768の論理px。X/Yは標準位置からの差分。刀を動かすとVFXも追従。</p>
        <label>刀 <select data-editor-sword>${app.SwordCatalog.items.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select></label>
        <label>調整対象 <select data-editor-target>${this.controller.targets().map(e=>`<option value="${e[0]}">${e[1]}</option>`).join("")}</select></label>
        <div data-editor-fields></div><div class="shop-editor-nudges">${["x","y"].map(axis=>`<span>${axis.toUpperCase()}</span>${[-10,-1,1,10].map(step=>`<button aria-label="${axis.toUpperCase()} ${step>0?"+":""}${step}" data-nudge="${axis}:${step}">${step>0?"+":""}${step}</button>`).join("")}`).join("")}</div>
        <label><input type="checkbox" data-grid="visible">グリッド</label><label>間隔 <select data-grid="size"><option>10</option><option>20</option><option>50</option></select>px</label>
        <label><input type="checkbox" data-grid="snap">ドラッグをスナップ</label><label><input type="checkbox" data-guide="visible">安全範囲・領域</label><label>安全余白 <input type="number" min="0" max="100" data-guide="margin"></label>
        <div class="shop-editor-actions"><button data-editor="undo">元に戻す</button><button data-editor="reset">選択を標準へ</button><button data-editor="resetAll">全体を標準へ</button><button data-editor="save">配置保存</button><button data-editor="load">保存を再読込</button>
        <button data-editor="export">JSON表示</button><button data-editor="copy">設定をコピー</button><button data-editor="download">JSONを書き出す</button><button data-editor="import">JSONを読み込む</button></div>
        <label>JSONファイル <input type="file" data-editor-file accept="application/json,.json"></label>
        <textarea aria-label="ショップ配置JSON" data-editor-json spellcheck="false" placeholder="JSONを表示・貼り付け"></textarea><p role="status" data-editor-status></p><p data-editor-warnings></p></div>`;
      document.body.append(this.panel);
      const listen=(node,type,fn,capture=false)=>node.addEventListener(type,fn,{capture,signal:this.abort.signal});
      listen(this.panel,"click",e=>{e.stopPropagation();this.click(e);});
      listen(this.panel,"change",e=>this.change(e));listen(this.panel,"input",e=>{if(e.target.dataset.field && e.target.value.trim()!=="")this.editField(e.target);});
      listen(this.panel,"keydown",e=>e.stopPropagation());
      listen(this.scene.panel,"pointerdown",e=>this.down(e),true);
      listen(window,"pointermove",e=>this.move(e),true);listen(window,"pointerup",e=>this.up(e),true);listen(window,"pointercancel",e=>this.up(e),true);
      listen(window,"blur",()=>this.releaseDrag());
      // Capturing phase isolates editing from purchase, practice, keyboard and pointer handlers.
      ["click","keydown","pointerup"].forEach(type=>listen(this.scene.panel,type,e=>{e.preventDefault();e.stopImmediatePropagation();},true));
      listen(window,"resize",()=>this.refresh());this.select("sword");
    }
    status(message) { if(this.panel)this.panel.querySelector('[data-editor-status]').textContent=message; }
    select(id) {
      this.selected=id;this.panel.querySelector('[data-editor-target]').value=id;
      const fields=this.panel.querySelector('[data-editor-fields]');fields.replaceChildren();
      for(const [key,value]of Object.entries(this.controller.fields(id))) {
        const label=document.createElement("label"),input=document.createElement("input");
        label.textContent={x:"X ",y:"Y ",scale:"倍率 ",fontSize:"文字サイズ "}[key];input.type="number";input.dataset.field=key;input.setAttribute("aria-label",key);input.step=key==="scale"?"0.01":"1";input.value=value;label.append(input);fields.append(label);
      }
      this.refresh();
    }
    apply(fn) { try { fn();this.controller.apply(); }catch(e){this.status(e.message);this.refresh();} }
    editField(input) { const n=Number(input.value);if(input.value.trim()!=="" && Number.isFinite(n))this.apply(()=>this.controller.edit(this.selected,{[input.dataset.field]:n})); }
    async change(e) {
      const t=e.target;
      if(t.dataset.field)this.editField(t);
      if(t.hasAttribute("data-editor-target"))this.select(t.value);
      if(t.hasAttribute("data-editor-sword")){this.scene.choose(t.value);this.refresh();}
      if(t.dataset.grid)this.apply(()=>this.model.change("grid",null,{[t.dataset.grid]:t.type==="checkbox"?t.checked:Number(t.value)}));
      if(t.dataset.guide)this.apply(()=>this.model.change("guides",null,{[t.dataset.guide]:t.type==="checkbox"?t.checked:Number(t.value)}));
      if(t.hasAttribute("data-editor-file") && t.files[0]) {
        try {if(t.files[0].size>100000)throw Error("JSONが大きすぎます。");const text=await t.files[0].text();this.model.import(text);this.controller.apply();this.status("JSONファイルを読み込みました。");}catch(error){this.status(error.message);}t.value="";
      }
    }
    async click(e) {
      const button=e.target.closest("button");if(!button)return;
      if(button.dataset.nudge){const [axis,step]=button.dataset.nudge.split(":");this.apply(()=>this.controller.edit(this.selected,{[axis]:this.controller.fields(this.selected)[axis]+Number(step)}));return;}
      const action=button.dataset.editor;
      if(action==="finish"){this.destroy();return;}
      if(action==="collapse"){this.panel.classList.toggle("collapsed");button.textContent=this.panel.classList.contains("collapsed")?"ひらく":"たたむ";return;}
      if(action==="dock"){this.dock=(this.dock+1)%4;this.panel.dataset.dock=this.dock;return;}
      if(action==="undo")this.apply(()=>this.model.undo());
      if(action==="reset")this.apply(()=>this.controller.reset(this.selected));
      if(action==="resetAll")this.apply(()=>this.model.reset());
      if(action==="save")this.status(this.model.save()?"配置を保存しました。小判や学習記録は変わりません。":"保存できません。JSONを書き出してください。");
      if(action==="load"){this.apply(()=>this.model.load());this.status("保存があれば再読込しました。無効な保存値は使いません。");}
      if(action==="import")this.apply(()=>{this.model.import(this.panel.querySelector('[data-editor-json]').value);this.status("JSONを読み込みました。");});
      if(["export","copy","download"].includes(action)) {
        const text=this.model.export();this.panel.querySelector('[data-editor-json]').value=text;this.status("JSONを表示しました。");
        if(action==="copy")try{await navigator.clipboard.writeText(text);this.status("設定をコピーしました。");}catch(_){if(!this.panel)return;this.panel.querySelector('[data-editor-json]').select();this.status("コピーできません。JSONを手動でコピーするか書き出してください。");}
        if(action==="download"){const url=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="shop-layout-v0.3.17.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
      }
    }
    point(e) { return {x:e.clientX*1366/window.innerWidth,y:e.clientY*768/window.innerHeight}; }
    down(e) {
      if(e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();
      const chosen=this.controller.bounds(this.selected),inside=r=>r&&e.clientX>=r.x&&e.clientX<=r.x+r.width&&e.clientY>=r.y&&e.clientY<=r.y+r.height;
      if(!inside(chosen)) {
        const candidates=this.controller.targets().map(([id])=>({id,b:this.controller.bounds(id)})).filter(entry=>inside(entry.b)).sort((a,b)=>a.b.width*a.b.height-b.b.width*b.b.height);
        if(!candidates.length)return;this.select(candidates[0].id);
      }
      const c=this.controller.fields(this.selected),b=this.controller.bounds(this.selected);this.model.checkpoint();this.drag={pointerId:e.pointerId,point:this.point(e),x:c.x,y:c.y,factors:this.controller.dragFactors(this.selected),anchor:{x:b.x*1366/window.innerWidth,y:b.y*768/window.innerHeight}};
      try{this.scene.panel.setPointerCapture(e.pointerId);}catch(_){}
    }
    move(e) {
      if(!this.drag||e.pointerId!==this.drag.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
      const p=this.point(e),d=this.drag,g=this.model.value.grid;
      let dx=p.x-d.point.x,dy=p.y-d.point.y;
      if(g.snap){dx=Math.round((d.anchor.x+dx)/g.size)*g.size-d.anchor.x;dy=Math.round((d.anchor.y+dy)/g.size)*g.size-d.anchor.y;}
      const x=Math.round((d.x+dx/d.factors.x)*100)/100,y=Math.round((d.y+dy/d.factors.y)*100)/100;
      this.apply(()=>this.controller.edit(this.selected,{x,y},false));
    }
    up(e) { if(!this.drag||e.pointerId!==this.drag.pointerId)return;e.preventDefault();e.stopImmediatePropagation();try{this.scene.panel.releasePointerCapture(e.pointerId);}catch(_){}this.drag=null;this.refresh(); }
    refresh() {
      if(!this.panel)return;const c=this.controller.fields(this.selected),value=this.model.value;
      this.panel.querySelector('[data-editor-sword]').value=this.scene.selected;
      this.panel.querySelectorAll('[data-field]').forEach(input=>{if(document.activeElement!==input || this.drag)input.value=c[input.dataset.field];});
      this.panel.querySelectorAll('[data-grid],[data-guide]').forEach(input=>{const n=input.dataset.grid?value.grid[input.dataset.grid]:value.guides[input.dataset.guide];if(input.type==="checkbox")input.checked=n;else input.value=n;});
      const warnings=this.controller.warnings();this.panel.querySelector('[data-editor-warnings]').textContent=warnings.length?"はみ出し: "+[...new Set(warnings.map(w=>w.id))].join("・"):"表示要素は安全範囲内です。";
      const ctx=this.canvas.getContext("2d"),sx=1366/window.innerWidth,sy=768/window.innerHeight;ctx.clearRect(0,0,1366,768);
      if(value.grid.visible){for(let x=0;x<=1366;x+=value.grid.size){ctx.strokeStyle=x%(value.grid.size*5)?"#56beea42":"#56beea90";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,768);ctx.stroke();}for(let y=0;y<=768;y+=value.grid.size){ctx.strokeStyle=y%(value.grid.size*5)?"#56beea42":"#56beea90";ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1366,y);ctx.stroke();}}
      const draw=(r,color,dash=[])=>{if(!r)return;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash);ctx.strokeRect(r.x*sx,r.y*sy,r.width*sx,r.height*sy);};
      if(value.guides.visible){const m=value.guides.margin;ctx.strokeStyle="#4eeda2";ctx.setLineDash([7,5]);ctx.strokeRect(m,m,1366-2*m,768-2*m);["list","preview","title","actions"].forEach(id=>draw(this.controller.bounds(id),"#4eeda2",[7,5]));}
      warnings.forEach(w=>draw(w.rect,"#ff4969"));draw(this.controller.bounds(this.selected),"#ff9c3f");ctx.setLineDash([]);
      window.__NINJA_QA.shopLayout={editing:true,selected:this.selected,fields:c,grid:value.grid,warnings:warnings.map(w=>w.id)};
    }
    releaseDrag() { if(this.drag){try{this.scene.panel.releasePointerCapture(this.drag.pointerId);}catch(_){}this.drag=null;} }
    destroy() { if(!this.panel)return;this.abort.abort();this.releaseDrag();this.panel.remove();this.canvas.remove();this.panel=null;this.scene.panel.classList.remove("shop-editing");this.scene.editor=null;window.__NINJA_QA.shopLayout={editing:false}; }
  }
  app.ShopLayoutEditor=ShopLayoutEditor;
})();
