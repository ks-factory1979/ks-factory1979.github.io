(function () {
  "use strict";
  const app = MapSymbolNinja;
  class KobanPresentation {
    constructor(scene, result) {
      this.scene = scene; this.objects = []; this.coins = []; this.tweens = [];
      const receipt = app.economy.getReceipt(result.runId), wallet = app.economy.getState().wallet;
      const text = (x,y,value,size,color) => {
        const o = scene.add.text(x,y,value,{fontFamily:app.UI.fontFamily,fontSize:size+"px",fontStyle:"bold",color}).setOrigin(.5).setDepth(111);
        this.objects.push(o); return o;
      };
      this.objects.push(scene.add.image(490,500,"ninja_koban_front").setDisplaySize(40,40).setDepth(111));
      text(695,500,receipt ? "今回の忍小判  ＋" + receipt.amount + "枚" :
        result.koban && result.koban.pendingReward ? "未保存の忍小判 " + result.koban.pendingReward + "枚" : "この結果の小判  ＋0枚",27,"#85570a");
      if (receipt) text(683,532,"完走 5枚 ＋ スコア " + (receipt.amount-5) + "枚",17,"#645b40");
      const walletY = result.koban && result.koban.pendingReward ? 540 : 565;
      this.objects.push(scene.add.image(555,walletY,"ninja_koban_front").setDisplaySize(30,30).setDepth(111));
      this.walletText = text(710,walletY,"所持 " + wallet.toLocaleString("ja-JP") + "枚",24,"#3e4d45");
      if (result.koban && result.koban.pendingReward) {
        let busy = false;
        this.retry = new app.UIButton(scene,683,607,330,"小判の保存を ためす",async()=>{
          if (busy || app.economy.getState().problem || app.economy.getState().checking) return;
          busy = true;
          this.retry.setEnabled(false);
          const r=await app.economy.retryReward(result.koban.claimId);
          if (!scene.scene.isActive()) return;
          if (r.amount>0) scene.scene.restart(Object.assign({},result,{koban:r}));
          else { busy = false; refreshRetry(); }
        },{fontSize:19});
        const refreshRetry = () => {
          const blocked = Boolean(app.economy.getState().problem || app.economy.getState().checking);
          this.retry.setEnabled(!blocked && !busy);
          this.retry.setLabel(blocked ? "保存環境を確認してね" : "小判の保存を ためす");
        };
        this.unsubscribe = app.economy.subscribe(refreshRetry); refreshRetry();
      } else text(683,604,"しゅぎょう おつかれさま！",21,"#35475a");
      this.duration = receipt && !result.returnedFromBook ? (window.__NINJA_REDUCED_MOTION ? 180 : 820) : 0;
      if (this.duration && !window.__NINJA_REDUCED_MOTION) this.animate(receipt.amount);
      window.__NINJA_QA.kobanResult = { runId:result.runId, amount:receipt ? receipt.amount : 0, wallet, duration:this.duration, coins:this.coins.length, activeCoins:this.coins.length };
      scene.events.once("shutdown",()=>this.destroy());
    }
    animate(amount) {
      const s=this.scene;
      for(let i=0;i<Math.min(4,amount);i++){
        const coin=s.add.image(635+(i-1.5)*27,482,"ninja_koban_tilt").setDisplaySize(38,38).setAngle(-14+i*6).setDepth(180);
        this.coins.push(coin);
        this.tweens.push(s.tweens.add({targets:coin,y:440-i*7,scaleX:coin.scaleX*1.15,scaleY:coin.scaleY*1.15,
          angle:14+i*4,duration:220,delay:i*35,ease:"Quad.easeOut",onComplete:()=>{
            this.tweens.push(s.tweens.add({targets:coin,x:555,y:565,alpha:0,angle:-10,duration:370,delay:70,ease:"Cubic.easeIn",
              onComplete:()=>{coin.destroy();if(window.__NINJA_QA.kobanResult)window.__NINJA_QA.kobanResult.activeCoins=this.coins.filter(c=>c.active).length;}}));
          }}));
      }
      this.tweens.push(s.tweens.add({targets:this.walletText,alpha:.6,duration:180,yoyo:true,repeat:1,delay:330}));
    }
    destroy() {
      if (this.unsubscribe) this.unsubscribe();
      this.tweens.forEach(t=>t.stop());this.coins.forEach(o=>{if(o.active)o.destroy();});this.objects.forEach(o=>{if(o.active)o.destroy();});
      if(this.retry)this.retry.destroy();this.coins.length=0;
      if(window.__NINJA_QA.kobanResult)window.__NINJA_QA.kobanResult.activeCoins=0;
    }
  }
  app.KobanPresentation=KobanPresentation;
})();

