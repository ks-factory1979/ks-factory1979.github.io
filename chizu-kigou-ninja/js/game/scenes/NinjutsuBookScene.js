(function () {
  "use strict";
  const app = MapSymbolNinja;
  class NinjutsuBookScene extends Phaser.Scene {
    constructor() { super({ key: "NinjutsuBookScene" }); }
    init(data) {
      this.origin = app.CollectionBookModel.origin(data);
      const requestedRank = data && (data.rank || data.result && data.result.rank);
      this.rank = app.StageData.availableRanks.includes(requestedRank) ? requestedRank : "genin";
      this.stage = Number.isInteger(data && data.stage) && data.stage >= 1 && data.stage <= 4 ? data.stage : 1;
      this.transitionLock = false; this.navigation = null; this.editor = null; this.previewState = "saved";
      this.mode = "explanation"; this.registry = []; this.detail = null;
      this.layoutEditingAllowed = Boolean(NINJA_CONFIG.DEV_PANEL_ENABLED &&
        (app.UI.devVisible() || data && data.openLayoutEditor === true));
      this.autoOpenLayoutEditor = this.layoutEditingAllowed && Boolean(data && data.openLayoutEditor === true);
      this.editButton = undefined;
      this.reader = null; this.readerPreference = "auto";
    }
    register(id, configId, object, area, extra) {
      this.registry.push(Object.assign({ id, configId, object, area, bounds: () => object.getBounds(), visible: () => object.visible }, extra)); return object;
    }
    text(id, configId, value, area, parent, extra) {
      const o = this.add.text(0, 0, value, { fontFamily: app.UI.fontFamily, fontStyle: "bold", color: "#243c4b" }).setDepth(110);
      if (parent) parent.add(o); return this.register(id, configId, o, area, extra);
    }
    glyph(id, configId, area, parent, extra) {
      const holder = this.add.container(0, 0).setDepth(110), image = this.add.image(0, 0, "card_police");
      const unknown = this.add.text(0, 0, "？", { fontFamily: app.UI.fontFamily, fontStyle: "bold", color: "#243c4b" });
      holder.add([image, unknown]); if (parent) parent.add(holder); holder.glyphImage = image; holder.unknownText = unknown;
      return this.register(id, configId, holder, area, Object.assign({ glyph: true, bounds: () => (image.visible ? image : unknown).getBounds() }, extra));
    }
    setGlyph(holder, item) {
      holder.glyphImage.setVisible(!item.concealed); holder.unknownText.setVisible(item.concealed);
      if (!item.concealed) holder.glyphImage.setTexture(item.textureKey);
    }
    button(id, configId, label, callback, area, labelId, labelConfig) {
      const b = new app.BookItemButton(this, 0, 0, 1, 1, () => { if (!this.editor) callback(); });
      this.register(id, configId, b.back, area, { button: b }); b.label = this.text(labelId, labelConfig, label, area, b.container); return b;
    }
    create() {
      const UI = app.UI; window.__NINJA_QA.currentScene = "ninjutsu-book"; UI.enterScene(this);
      UI.coverBackground(this, app.AssetKeys.GAME_BACKGROUND, .52);
      let storage; try { storage = window.localStorage; } catch (_) { storage = null; }
      this.layoutModel = new app.BookLayoutModel(storage); if (this.layoutEditingAllowed) this.layoutModel.load(false);
      this.register("spread", "spread", UI.asset(this, app.AssetKeys.NINJUTSU_BOOK_SPREAD, 683, 429, 1220, 100), "common");
      this.text("title", "title", "忍術帖", "common").setColor("#fff1b6").setStroke("#07182c", 4);
      this.book = app.CollectionBookModel.snapshot(app.TrainingSelection.progress(), this.rank);
      this.totalsText = this.text("totals", "totals", this.totalsLabel(), "common").setColor("#fff4ce").setStroke("#07182c", 4);
      this.tabs = [1,2,3,4].map(n => this.button("tab"+n, "tab"+n, app.StageData.getStage(this.rank, n).displayName, () => this.showStage(n), "common", "tab"+n+".label", "tabLabel"));
      this.rows = [0,1,2,3,4].map(i => {
        const row = new app.BookItemButton(this, 0, 0, 1, 1, () => { if (!this.editor) this.selectItem(i); }), extra = { rowIndex: i };
        this.register("row."+i+".frame", "list", row.back, "left", Object.assign({ button: row }, extra));
        row.glyph = this.glyph("row."+i+".glyph", "rowGlyph", "left", row.container, extra);
        row.name = this.text("row."+i+".name", "rowName", "", "left", row.container, extra);
        row.stateText = this.text("row."+i+".state", "rowState", "", "left", row.container, extra);
        row.seal = this.register("row."+i+".seal", "rowSeal", this.add.image(0,0,app.AssetKeys.SEAL_DISCOVERED), "left", extra); row.container.add(row.seal); return row;
      });
      this.text("hint", "hint", "記号をタップして くわしく見よう", "left");
      const returnLabel = this.origin.scene === "ResultScene" ? "けっかへ もどる" : this.origin.scene === "TrainingSelectScene" ? "修行選択へ もどる" : "タイトルへ もどる";
      this.back = new app.UIButton(this, 683,720,310,returnLabel, () => { if (!this.editor) UI.transition(this,this.origin.scene,this.origin.data); }, { fontSize:25 });
      this.register("back", "back", this.back.container,"common",{backButton:this.back}); this.register("back.label","backLabel",this.back.text,"common");
      this.detail = this.add.container(0,0).setDepth(110);
      this.detailTitle = this.text("detailTitle","detailTitle","","right",this.detail);
      this.detailGlyph = this.glyph("detailGlyph","detailGlyph","right",this.detail);
      this.detailSeal = this.register("detailSeal","detailSeal",this.add.image(0,0,app.AssetKeys.SEAL_DISCOVERED),"right"); this.detail.add(this.detailSeal);
      this.detailState = this.text("detailState","detailState","","right",this.detail);
      this.success = this.text("success","success","","right",this.detail); this.progressText = this.text("progress","progress","","right",this.detail);
      this.explanation = this.button("explanationButton","explanationButton","きごうの せつめい",()=>this.setMode("explanation"),"right","explanation.label","toggleLabel");
      this.secret = this.button("secretButton","secretButton","ひみつを知る",()=>this.setMode("secret"),"right","secret.label","toggleLabel");
      this.body = this.text("body","body","","right",this.detail,{description:true});
      this.secretTitle = this.text("secretTitle","secretTitle","","right",this.detail,{description:true}); this.secretBody = this.text("secretBody","secretBody","","right",this.detail,{description:true});
      this.navigation = new app.BookButtonNavigation(this,[...this.tabs,...this.rows,this.explanation,this.secret,this.back]); UI.createUtilityButtons(this);
      this.rankButton = new app.UIButton(this, 430, 40, 240, "", () => {
        if (!this.editor) this.showRank(this.nextRank(), 1);
      }, { fontSize: 23, depth: 150 });
      this.rankButton.text.setText(app.StageData.getRank(this.nextRank()).name + "へ");
      this.navigation.buttons.push(this.rankButton); UI.keepMenuTouchTargets(this, [this.rankButton]);
      if (this.layoutEditingAllowed) this.editButton = this.add.text(18,20,"レイアウト調整",{fontFamily:UI.fontFamily,fontSize:"22px",color:"#fff4ce",backgroundColor:"#183c54",padding:{x:10,y:8}}).setDepth(150).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openEditor());
      if (!this.layoutEditingAllowed) {
        this.readButton = new app.UIButton(this, 156, 40, 260, "大きく読む", () => this.openReader(false), { fontSize: 24, depth: 150 });
        this.navigation.buttons.push(this.readButton); UI.keepMenuTouchTargets(this, [this.readButton]);
      } else this.readButton = null;
      this.readerResize = () => this.updateReaderViewport(); window.addEventListener("resize", this.readerResize, { passive: true });
      this.events.once("shutdown",()=>{
        window.removeEventListener("resize",this.readerResize);
        if(this.reader)this.reader.destroy();this.reader=null;
        if(this.editor)this.editor.destroy();this.editor=null;this.registry=[];this.detail=null;
        window.__NINJA_QA.bookLayoutEditing=false;window.__NINJA_QA.bookReaderOpen=false;
      });
      this.showStage(this.stage); UI.announce("忍術帖。記号を選んで、せつめいやひみつを見てみよう。");
      if (this.autoOpenLayoutEditor) this.openEditor();
      else this.updateReaderViewport();
    }
    viewItem(item) {
      if(this.previewState==="saved")return item;
      const state=this.previewState,n={unknown:0,discovered:1,acquired:3,master:10}[state];
      return Object.assign({},item,{state,stateLabel:app.ProgressConfig.MASTERY_LABELS[state],concealed:state==="unknown",textureKey:state==="unknown"?null:"card_"+item.rendererId,sealKey:state==="unknown"?null:app.AssetKeys["SEAL_"+state.toUpperCase()],successfulEncounters:n});
    }
    totalsLabel() {
      const t = this.book.totals;
      return this.book.rankName + "　 発見 " + t.discovered + "/" + t.total + "　 会得 " + t.acquired + "/" + t.total + "　 極意 " + t.master + "/" + t.total;
    }
    nextRank() {
      const ranks = app.StageData.availableRanks;
      return ranks[(ranks.indexOf(this.rank) + 1) % ranks.length];
    }
    showRank(rank, stage, selectedId) {
      if (this.transitionLock || !app.StageData.availableRanks.includes(rank)) return;
      this.rank = rank; this.book = app.CollectionBookModel.snapshot(app.TrainingSelection.progress(), rank);
      this.totalsText.setText(this.totalsLabel()); this.rankButton.text.setText(app.StageData.getRank(this.nextRank()).name + "へ");
      this.showStage(Number.isInteger(stage) && stage >= 1 && stage <= 4 ? stage : 1, selectedId);
    }
    showStage(stage, selectedId) {
      if(this.transitionLock)return; this.stage=stage;this.items=this.book.items.filter(item=>item.stage===stage).map(item=>this.viewItem(item));
      this.tabs.forEach((tab,i)=>tab.setSelected(i+1===stage));
      this.rows.forEach((row,i)=>{const item=this.items[i];this.setGlyph(row.glyph,item);
        app.JapaneseTextLayout.setSource(row.name,item.id==="city_ward_office"?"市役所など":item.id==="town_village_ward_office"?"町村役場など":item.listName);
        row.stateText.setText(item.stateLabel);row.seal.setVisible(Boolean(item.sealKey));if(item.sealKey)row.seal.setTexture(item.sealKey);});
      const i=this.items.findIndex(item=>item.id===selectedId);this.selectItem(i<0?0:i);
    }
    selectItem(index) {
      const item=this.items[index];this.selectedId=item.id;this.rows.forEach((row,i)=>row.setSelected(i===index));
      app.JapaneseTextLayout.setSource(this.detailTitle,item.officialName);
      this.setGlyph(this.detailGlyph,item);this.detailSeal.setVisible(Boolean(item.sealKey));if(item.sealKey)this.detailSeal.setTexture(item.sealKey);
      this.detailState.setText(item.concealed?"未発見　修行で 見つけよう！":item.stateLabel+"！");const n=item.successfulEncounters;
      this.success.setText("見分け成功 "+n+" 回");this.progressText.setText("会得 "+Math.min(n,app.ProgressConfig.ACQUIRE_THRESHOLD)+"/3　 極意 "+Math.min(n,app.ProgressConfig.MASTER_THRESHOLD)+"/10");
      this.secret.setEnabled(!item.concealed);this.secret.container.setAlpha(item.concealed ? .4 : 1);
      if(item.concealed)this.mode="explanation";this.updateDescription();this.applyLayout();this.publishQA();app.UI.announce(item.officialName+"。"+item.stateLabel+"。見分け成功"+n+"回。");
    }
    setMode(mode) {const item=this.items.find(i=>i.id===this.selectedId);if(mode==="secret"&&item.concealed)return;this.mode=mode;this.updateDescription();this.applyLayout();this.publishQA();}
    updateDescription() {
      const item=this.items.find(i=>i.id===this.selectedId),data=app.MapSymbolSecrets.get(item.id),secret=this.mode==="secret"&&!item.concealed;
      app.JapaneseTextLayout.setSource(this.body,item.concealed?"修行で この記号を見つけると、\nせつめいや ひみつが読めるよ。":item.learningDescription||data.description);
      app.JapaneseTextLayout.setSource(this.secretTitle,secret?data.title:"");app.JapaneseTextLayout.setSource(this.secretBody,secret?data.text:"");this.body.setVisible(!secret);this.secretTitle.setVisible(secret);this.secretBody.setVisible(secret);this.explanation.setSelected(!secret);this.secret.setSelected(secret);
    }
    applyLayout() {
      const e=this.layoutModel.value.elements;
      this.registry.forEach(entry=>{
        const c=e[entry.configId],o=entry.object;
        if(entry.button){const b=entry.button,y=c.y+(entry.configId==="list"?entry.rowIndex*c.gap:0);b.container.setPosition(c.x,y).setSize(c.width,c.height);b.back.setSize(c.width,c.height);if(b.container.input)b.container.input.hitArea.setTo(0,0,c.width,c.height);b.container.setVisible(c.visible);return;}
        if(entry.backButton){const b=entry.backButton;b.width=c.width;b.height=c.height;b.container.setPosition(c.x,c.y).setSize(c.width,c.height);b.container.input.hitArea.setTo(-6,-4,c.width+12,c.height+8);b._draw();b.container.setVisible(c.visible);return;}
        o.setPosition(c.x,c.y);
        if(entry.glyph){o.glyphImage.setDisplaySize(c.size*c.scale,c.size*c.scale).setOrigin(c.originX,c.originY);o.unknownText.setFontSize(c.size*c.scale*.7).setOrigin(c.originX,c.originY);}
        else if(o.type==="Text"){
          o.setOrigin(c.originX,c.originY).setAlign(c.align);
          if(entry.description||entry.configId==="detailTitle"||entry.configId==="rowName"){
            const box=e.descriptionBox;
            const height=entry.configId==="secretTitle"?Math.max(26,e.secretBody.y-c.y):entry.description?Math.max(26,box.y+box.height-c.y-3):entry.configId==="detailTitle"?70:39;
            app.JapaneseTextLayout.fit(o,o.__ninjaSourceText===undefined?o.text:o.__ninjaSourceText,{width:Math.min(c.width,entry.description?box.width-8:c.width),height,fontSize:c.fontSize,minFontSize:20,lineSpacing:c.lineSpacing,maxLines:entry.configId==="rowName"?1:entry.configId==="detailTitle"?2:4});
          }else{o.setFontSize(c.fontSize).setLineSpacing(c.lineSpacing).setWordWrapWidth(c.width,true);}
        }
        else if(o.type==="Image")o.setScale(c.size*c.scale/o.width).setOrigin(c.originX,c.originY);
        let visible=c.visible;
        if(entry.configId==="rowSeal")visible=visible&&Boolean(this.items&&this.items[entry.rowIndex].sealKey);
        if(entry.configId==="detailSeal")visible=visible&&Boolean(this.items&&this.items.find(i=>i.id===this.selectedId).sealKey);
        if(entry.configId==="body")visible=visible&&this.mode!=="secret";
        if(entry.configId==="secretTitle"||entry.configId==="secretBody")visible=visible&&this.mode==="secret";
        o.setVisible(visible);
      }); if(this.editor)this.editor.refresh();
    }
    layoutWarnings() {
      const e=this.layoutModel.value.elements,warnings=[],contains=(r,b)=>b.x>=r.x-.5&&b.y>=r.y-.5&&b.right<=r.x+r.width+.5&&b.bottom<=r.y+r.height+.5;
      this.registry.forEach(entry=>{if(!entry.visible()||(entry.object.parentContainer&&!entry.object.parentContainer.visible))return;const b=entry.bounds();
        if(entry.area!=="common"&&!contains(e[entry.area+"Safe"],b))warnings.push({id:entry.id,reason:entry.area==="left"?"左ページの安全範囲外":"右ページの安全範囲外"});
        // The spread/back artwork includes deliberate transparent margins; all other UI is checked against the canvas and binding too.
        if(!["spread","back"].includes(entry.id)){
          if(!contains({x:0,y:0,width:1366,height:768},b))warnings.push({id:entry.id,reason:"画面の範囲外"});
          const spine=e.spine;if(b.right>spine.x&&b.x<spine.x+spine.width&&b.bottom>spine.y&&b.y<spine.y+spine.height)warnings.push({id:entry.id,reason:"背表紙の禁止範囲"});
        }
        if(entry.description&&!contains(e.descriptionBox,b))warnings.push({id:entry.id,reason:"説明枠の範囲外"});});return warnings;
    }
    publishQA() {const item=this.items.find(i=>i.id===this.selectedId);window.__NINJA_QA.bookState={rank:this.rank,stage:this.stage,selectedId:item.id,state:item.state,mode:this.mode,visibleIds:this.items.map(i=>i.id),concealedIds:this.items.filter(i=>i.concealed).map(i=>i.id),totals:this.book.totals,origin:this.origin.scene};if(this.reader)this.reader.refresh();}
    updateReaderViewport(){
      if(this.transitionLock||this.editor||this.layoutEditingAllowed||this.readerPreference!=="auto"||window.innerHeight>window.innerWidth)return;
      const small=window.innerWidth<=900||window.innerHeight<=500;
      if(small&&!this.reader)this.openReader(true);
      else if(!small&&this.reader){this.reader.destroy();this.reader=null;}
    }
    openReader(automatic){
      if(this.transitionLock||this.editor||this.reader)return;
      if(!automatic)this.readerPreference="reader";
      this.reader=new app.NinjutsuBookReader(this);this.reader.start();
    }
    closeReader(){if(!this.reader)return;this.readerPreference="spread";this.reader.destroy();this.reader=null;}
    openEditor(){if(this.editor||!NINJA_CONFIG.DEV_PANEL_ENABLED||!this.layoutEditingAllowed)return;this.editor=new app.BookLayoutEditor(this);this.editor.start();}
  }
  app.NinjutsuBookScene=NinjutsuBookScene;
})();
