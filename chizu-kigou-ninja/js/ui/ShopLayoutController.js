(function () {
  "use strict";
  const app=MapSymbolNinja;
  const entries=[
    ["list","商品一覧全体",".sword-choices"],["cardImage","一覧の刀画像",".shop-choice-thumb"],
    ["cardName","一覧の刀名",".shop-choice-copy strong"],["cardPrice","一覧の価格",".shop-choice-price"],
    ["cardState","一覧の購入状態",".sword-choice-state"],["preview","プレビュー全体",".shop-product"],
    ["sword","刀画像（VFX追従）",".shop-art"],["vfx","VFX補正だけ",".shop-preview-surface"],
    ["title","商品名","[data-shop-name]"],["description","属性説明","[data-sword-description]"],
    ["price","価格","[data-price-copy]"],["owned","購入状態","[data-shop-owned]"],
    ["guidance","案内・不足枚数","[data-shop-guidance]"],["actions","操作ボタン群",".shop-actions"],
    ["header","上部情報全体",".sword-header"],["wallet","所持小判",".shop-wallet"],
    ["coin","小判アイコン",".shop-price>img, .shop-wallet>img, .shop-choice-price>img"],["footer","下部情報帯",".sword-footer"]
  ];
  class ShopLayoutController {
    constructor(scene) { this.scene=scene;this.panel=scene.panel;this.model=scene.layoutModel; }
    targets() { return entries; }
    nodes(id) { const entry=entries.find(e=>e[0]===id);return entry ? [...this.panel.querySelectorAll(entry[2])].filter(n=>!n.hidden && n.getBoundingClientRect().width>0) : []; }
    address(id) { return id==="sword"||id==="vfx" ? {section:"swords",id:this.scene.selected} : {section:"elements",id}; }
    fields(id) { const a=this.address(id),c=this.model.value[a.section][a.id];return id==="vfx" ? {x:c.vfxX,y:c.vfxY,scale:c.vfxScale} : id==="sword" ? {x:c.x,y:c.y,scale:c.scale} : c; }
    edit(id,values,record=true) { const a=this.address(id),v=id==="vfx" ? Object.fromEntries(Object.entries(values).map(([k,n])=>[{x:"vfxX",y:"vfxY",scale:"vfxScale"}[k],n])) : values;this.model.change(a.section,a.id,v,record);this.apply(); }
    reset(id) {
      if(id==="vfx"||id==="sword") {const a=this.address(id),base=app.ShopLayoutConfig.swords[a.id];this.model.change(a.section,a.id,id==="vfx"?{vfxX:base.vfxX,vfxY:base.vfxY,vfxScale:base.vfxScale}:{x:base.x,y:base.y,scale:base.scale});}
      else this.model.reset("elements",id);this.apply();
    }
    dragFactors(id) {
      if(id==="preview"||id==="sword")return {x:1,y:1};
      const node=this.nodes(id)[0],parent=node && node.parentElement;
      if(!parent)return {x:1,y:1};const r=parent.getBoundingClientRect();
      return {x:parent.offsetWidth ? r.width/parent.offsetWidth : 1,y:parent.offsetHeight ? r.height/parent.offsetHeight : 1};
    }
    apply() {
      const sx=window.innerWidth/1366,sy=window.innerHeight/768,value=this.model.value;
      for(const [id]of entries) {
        if(["sword","vfx","preview"].includes(id))continue;
        const c=value.elements[id],base=app.ShopLayoutConfig.elements[id];
        for(const node of this.nodes(id)) {
          node.style.translate=(c.x*sx)+"px "+(c.y*sy)+"px";
          if(c.scale!==undefined)node.style.scale=String(c.scale);
          if(c.fontSize!==undefined){node.style.fontSize="";const size=parseFloat(getComputedStyle(node).fontSize);node.style.fontSize=(size*c.fontSize/base.fontSize)+"px";}
        }
      }
      const group=this.panel.querySelector(".shop-product"),p=value.elements.preview,s=value.swords[this.scene.selected];
      group.style.transform=this.scene.practicing ? "none" : `translate(${(p.x+s.x)*sx}px,${(p.y+s.y)*sy}px) scale(${p.scale*s.scale})`;
      const surface=this.scene.previewSurface;
      if(surface)surface.mount.style.transform=this.scene.practicing ? "none" : `translate(${s.vfxX*sx}px,${s.vfxY*sy}px) scale(${s.vfxScale})`;
      if(this.scene.editor)this.scene.editor.refresh();
    }
    bounds(id,node) {
      node=node||this.nodes(id)[0];if(!node)return null;const r=node.getBoundingClientRect();
      if(id==="vfx")return {x:r.x+r.width/2-10,y:r.y+r.height/2-10,width:20,height:20};
      if(id!=="sword")return {x:r.x,y:r.y,width:r.width,height:r.height};
      const f=app.ShopArtFrames[this.scene.selected],k=Math.min(r.width/768,r.height/512);
      return {x:r.x+(r.width-768*k)/2+f[0]*k,y:r.y+(r.height-512*k)/2+f[1]*k,width:(f[2]-f[0])*k,height:(f[3]-f[1])*k};
    }
    warnings() {
      const out=[],sx=window.innerWidth/1366,sy=window.innerHeight/768,m=this.model.value.guides.margin;
      for(const [id]of entries) {
        if(["preview","vfx","list","header"].includes(id))continue;
        for(const node of this.nodes(id)) {
          const r=this.bounds(id,node),parent=id==="sword" ? this.panel.querySelector(".shop-visual").getBoundingClientRect() : this.panel.getBoundingClientRect();
          if(r.x<Math.max(parent.left,m*sx)-1||r.y<Math.max(parent.top,m*sy)-1||r.x+r.width>Math.min(parent.right,window.innerWidth-m*sx)+1||r.y+r.height>Math.min(parent.bottom,window.innerHeight-m*sy)+1)out.push({id,rect:r});
        }
      }
      return out;
    }
  }
  app.ShopLayoutController=ShopLayoutController;
})();
