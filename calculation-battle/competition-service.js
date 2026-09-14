'use strict';
function createHkbCompetitionService() {
    return {
      deviceId: getDeviceId(),
      queueKey: 'hkb-official-queue-v2',
      shownPreviousKey: 'hkb-shown-previous-month-v1',
      lionDefeatKey: 'hkb-lion-defeated-courses-v1',
      achievementQueue: [],
      previousAchievementPending: new Set(),
      achievementSafeScreens: new Set(['title','mode','solo-type','result','duo-result']),
      bootstrapRequestSeq: 0,
      lastAppliedBootstrapSeq: 0,
      battlePreparationSeq: 0,
      battlePreparation: null,
      networkWaiters: [],
      waitForNetworkWindow() {
        if (!['battle','duo'].includes(state.screen)) return Promise.resolve();
        return new Promise(resolve => this.networkWaiters.push(resolve));
      },
      async call(name,payload={}) {
        await this.waitForNetworkWindow();
        if (!this.transport) this.transport = new HkbGasBridgeClient(HKB_CONFIG.gasWebAppUrl);
        await this.transport.connect();
        // A match may have started while the Bridge was loading.
        await this.waitForNetworkWindow();
        return this.transport.call(name,payload);
      },
      async initialize() {
        this.applyCrownImages();
        this.applyLionImages();
        state.competition.lionDefeatedCourses=this.localLionDefeats();
        try {
          await this.refresh();
          await this.flushQueue();
          this.showPreviousMonthAchievement();
        } catch (error) {
          state.competition.network='offline';
          this.renderStatus();
        }
      },
      async refresh() {
        const requestSeq=++this.bootstrapRequestSeq;
        const data=await this.call('getAppBootstrap',{deviceId:this.deviceId});
        if(requestSeq<this.lastAppliedBootstrapSeq) return data;
        this.lastAppliedBootstrapSeq=requestSeq;
        this.applyBootstrap(data);
        return data;
      },
      beginBattlePreparation() {
        if(this.isBattlePreparationCurrent(this.battlePreparation)) return null;
        const request={
          token:++this.battlePreparationSeq,
          screen:state.screen,
          mode:state.mode,
          playType:state.playType,
          courseId:state.selectedLevels.red,
          characterId:state.selectedCharacters.red
        };
        this.battlePreparation=request;
        return request;
      },
      cancelBattlePreparation() {
        this.battlePreparationSeq+=1;
        this.battlePreparation=null;
      },
      finishBattlePreparation(request) {
        if(!this.isBattlePreparationCurrent(request)) return false;
        this.battlePreparation=null;
        return true;
      },
      isBattlePreparationCurrent(request) {
        return Boolean(request)
          && this.battlePreparation===request
          && request.token===this.battlePreparationSeq
          && state.screen===request.screen
          && state.screen==='level'
          && state.mode===request.mode
          && state.playType===request.playType
          && state.selectedLevels.red===request.courseId
          && state.selectedCharacters.red===request.characterId;
      },
      isAchievementScreen(name=state.screen) {
        return this.achievementSafeScreens.has(name);
      },
      pruneAchievementQueue() {
        this.achievementQueue=this.achievementQueue.filter(item=>
          typeof item.options?.isStillValid!=='function'||item.options.isStillValid()
        );
      },
      onScreenChanged(name) {
        if (!['battle','duo'].includes(name)) {
          this.networkWaiters.splice(0).forEach(resolve => resolve());
        }
        this.pruneAchievementQueue();
        if(!this.isAchievementScreen(name)) return;
        setTimeout(()=>this.drainAchievementQueue(),0);
      },
      applyCrownImages() {
        document.querySelectorAll('[data-crown-image]').forEach(img=>img.src=MASTER_CROWN_SRC);
        $('achievement-image').src=MASTER_CROWN_SRC;
      },
      applyLionImages() {
        $('official-lion-icon').src=LION_ASSETS.normal;
        $('official-condition-lion').src=LION_ASSETS.defeatBadge;
        $('lion-special-aura').querySelector('img').src=LION_ASSETS.royalAura;
        $('lion-shockwave').querySelector('img').src=LION_ASSETS.crownShockwave;
      },
      localLionDefeats() {
        try {
          const values=JSON.parse(localStorage.getItem(this.lionDefeatKey)||'[]');
          return [...new Set(Array.isArray(values)?values:[])].filter(id=>COURSE_DEFS[id]);
        } catch (_) { return []; }
      },
      saveLionDefeats(courses) {
        const ordered=Object.keys(COURSE_DEFS).filter(id=>courses.includes(id));
        state.competition.lionDefeatedCourses=ordered;
        try { localStorage.setItem(this.lionDefeatKey,JSON.stringify(ordered)); } catch (_) {}
        return ordered;
      },
      mergeLionDefeats(courses=[]) {
        return this.saveLionDefeats([...new Set([...this.localLionDefeats(),...courses])]);
      },
      markLionDefeatLocally(courseId) {
        const before=this.localLionDefeats();
        const first=!before.includes(courseId);
        if(first) this.saveLionDefeats([...before,courseId]);
        return first;
      },
      applyBootstrap(data) {
        if(!data?.ok) throw new Error('王者データを読み込めませんでした。');
        state.competition.network='ready';
        state.competition.monthKey=data.monthKey;
        state.competition.monthLabel=data.monthLabel;
        state.competition.champions=Object.fromEntries((data.champions||[]).map(item=>[item.courseId,item]));
        state.competition.myChampionCourses=[...(data.myChampionCourses||[])];
        state.competition.previousChampionCourses=[...(data.previousChampionCourses||[])];
        this.mergeLionDefeats(data.lionDefeatedCourses||[]);
        state.competition.previousMonthKey=data.previousMonthKey||'';
        state.competition.previousMonthLabel=data.previousMonthLabel||'';
        this.renderStatus();
      },
      renderStatus() {
        const competition=state.competition;
        const ready=competition.network==='ready';
        const count=competition.myChampionCourses.length;
        const lionCount=competition.lionDefeatedCourses.length;
        const title=milestoneTitle(count);
        const status=$('title-crown-status');
        status.classList.toggle('loading',!ready);
        if(ready) {
          status.querySelector('strong').textContent=count?`今月の王冠 ${count}こ`:'今月の王冠 0こ';
          status.querySelector('small').textContent=`${title?`${title} ／ `:''}ライオン撃破 ${lionCount}/21`;
        } else {
          status.querySelector('strong').textContent=competition.network==='offline'?'王者データ つうしんできず':'王者データ よみこみ中';
          status.querySelector('small').textContent='CPU対戦と2人対戦は あそべます';
        }
        $('mode-crown-summary').innerHTML=ready
          ? `<span class="crown-icon"><img class="master-crown-img" alt="" src="${MASTER_CROWN_SRC}"></span><span>王冠 ${count} ／ 🦁 ${lionCount}</span>`
          : '';
        $('official-type-button').disabled=!ready;
        $('ghost-type-button').disabled=!ready;
        $('official-type-note').textContent=ready?`${competition.monthLabel}・王冠 ${count}こ・ライオン撃破 ${lionCount}/21`:'王者データ よみこみ中…';
        $('ghost-type-note').textContent=ready
          ? (Object.keys(competition.champions).length?`${Object.keys(competition.champions).length}コースに 王者あり`:'まだ 王者ぼしゅう中！')
          : '王者データ よみこみ中…';
        if(state.screen==='level') UI.renderLevelCards();
      },
      showAchievement(heading,message,options={}) {
        if(typeof options.isStillValid==='function'&&!options.isStillValid()) return false;
        if(!this.isAchievementScreen()||$('achievement-modal').classList.contains('active')) {
          this.achievementQueue.push({heading,message,options});
          return false;
        }
        $('achievement-heading').textContent=heading;
        $('achievement-message').innerHTML=message;
        $('achievement-image').src=options.imageSrc||MASTER_CROWN_SRC;
        $('achievement-image').alt=options.imageAlt||'金色の王冠';
        $('achievement-box').className=`modal-box panel achievement-box ${options.boxClass||''}`.trim();
        $('achievement-modal').classList.add('active');
        if(typeof options.onShown==='function') options.onShown();
        AudioManager.play('victory');
        return true;
      },
      drainAchievementQueue() {
        if(!this.isAchievementScreen()||$('achievement-modal').classList.contains('active')) return;
        while(this.achievementQueue.length) {
          const next=this.achievementQueue.shift();
          if(typeof next.options?.isStillValid==='function'&&!next.options.isStillValid()) continue;
          this.showAchievement(next.heading,next.message,next.options);
          break;
        }
      },
      closeAchievement() {
        $('achievement-modal').classList.remove('active');
        setTimeout(()=>this.drainAchievementQueue(),120);
      },
      showLionDefeatAchievement(completedAll=false,courseId=state.selectedLevels.red,options={}) {
        if(completedAll) {
          this.showAchievement(
            'ライオン完全制覇！',
            '<strong>全21コースで 王者ライオンを たおした！</strong><span class="achievement-title">さいきょうの けいさん王者！</span>',
            {...options,imageSrc:LION_ASSETS.conquestEmblem,imageAlt:'ライオン完全制覇エンブレム',boxClass:'conquest-achievement'}
          );
          return;
        }
        this.showAchievement(
          '王者ライオンを たおした！',
          `<strong>「${COURSE_MASTER_NAMES[courseId]}」で げきは！</strong><span class="achievement-title">ライオンキラー</span>`,
          {...options,imageSrc:LION_ASSETS.defeatBadge,imageAlt:'ライオン撃破バッジ',boxClass:'lion-achievement'}
        );
      },
      showPreviousMonthAchievement() {
        const courses=state.competition.previousChampionCourses;
        const monthKey=state.competition.previousMonthKey;
        if(!courses.length||!monthKey) return;
        let shown='';
        try { shown=localStorage.getItem(this.shownPreviousKey)||''; } catch (_) {}
        if(shown===monthKey||this.previousAchievementPending.has(monthKey)) return;
        this.previousAchievementPending.add(monthKey);
        const title=milestoneTitle(courses.length);
        this.showAchievement(
          '先月の月間王者に決定！',
          `${state.competition.previousMonthLabel}は <strong>${courses.length}コース</strong>で王者！${title?`<span class="achievement-title">${title}</span>`:''}`,
          {onShown:()=>{
            this.previousAchievementPending.delete(monthKey);
            try { localStorage.setItem(this.shownPreviousKey,monthKey); } catch (_) {}
          }}
        );
      },
      queue() {
        if(this.queueMemoryOnly) return this.queueMemory||[];
        try {
          const items=JSON.parse(localStorage.getItem(this.queueKey)||'[]');
          if(!Array.isArray(items)) throw new Error('invalid queue');
          this.queueMemory=items; return items;
        } catch (_) {
          this.queueMemoryOnly=true;
          console.warn('HKB queue storage unavailable; pending results are retained in this tab.');
          return this.queueMemory||[];
        }
      },
      saveQueue(items) {
        this.queueMemory=items;
        if(this.queueMemoryOnly) return false;
        try { localStorage.setItem(this.queueKey,JSON.stringify(items)); return true; }
        catch (_) {
          this.queueMemoryOnly=true;
          console.warn('HKB queue storage full or unavailable; keep this tab open to retry.');
          return false;
        }
      },
      enqueue(payload) {
        const items=this.queue();
        const existing=items.find(item=>item.playId===payload.playId);
        if(existing) {
          const original={...existing}; delete original._hkbPermanent;
          if(JSON.stringify(original)!==JSON.stringify(payload)) throw new Error('[HKB_PERMANENT:LOCAL_ID_CONFLICT]');
          return;
        }
        items.push(JSON.parse(JSON.stringify(payload))); this.saveQueue(items);
      },
      dequeue(playId) {
        this.saveQueue(this.queue().filter(item=>item.playId!==playId));
      },
      isPermanentSaveError(error) {
        return /\[HKB_PERMANENT:[A-Z_]+\]/.test(String(error?.message||error));
      },
      sendQueued(payload) {
        if(!this.saveInFlight) this.saveInFlight=new Map();
        if(this.saveInFlight.has(payload.playId)) return this.saveInFlight.get(payload.playId);
        const task=(this.saveTail||Promise.resolve()).catch(()=>{}).then(async()=>{
          const queued=this.queue().find(item=>item.playId===payload.playId);
          if(queued?._hkbPermanent) throw new Error(queued._hkbPermanent);
          try {
            const result=await this.call('submitOfficialResult',payload);
            if(result?.ok!==true||result.saved!==true||result.playId!==payload.playId) {
              throw new Error('[HKB_RETRY:UNCONFIRMED_SAVE]');
            }
            this.dequeue(payload.playId);
            // Serialized acknowledgements also keep bootstrap/ranking application in order.
            if(result.champions) this.applyResultState(result);
            return result;
          } catch(error) {
            if(this.isPermanentSaveError(error)) {
              const code=String(error.message).match(/\[HKB_PERMANENT:[A-Z_]+\]/)[0];
              this.saveQueue(this.queue().map(item=>item.playId===payload.playId?{...item,_hkbPermanent:code}:item));
            }
            throw error;
          }
        });
        this.saveTail=task;
        this.saveInFlight.set(payload.playId,task);
        task.then(()=>this.saveInFlight.delete(payload.playId),()=>this.saveInFlight.delete(payload.playId));
        return task;
      },
      async flushQueue() {
        if(this.queueFlush) return this.queueFlush;
        const run=async()=>{
          for(const payload of this.queue().slice()) {
            if(payload._hkbPermanent) continue;
            try { await this.sendQueued(payload); }
            catch(error) { if(!this.isPermanentSaveError(error)) break; }
          }
        };
        this.queueFlush=run();
        try { await this.queueFlush; } finally { this.queueFlush=null; }
      },
      applyResultState(result) {
        this.lastAppliedBootstrapSeq=++this.bootstrapRequestSeq;
        state.competition.monthKey=result.monthKey||state.competition.monthKey;
        state.competition.monthLabel=result.monthLabel||state.competition.monthLabel;
        state.competition.champions=Object.fromEntries((result.champions||[]).map(item=>[item.courseId,item]));
        state.competition.myChampionCourses=[...(result.myChampionCourses||[])];
        this.mergeLionDefeats(result.lionDefeatedCourses||[]);
        this.renderStatus();
      },
      buildOfficialPayload() {
        const p=state.sides.player;
        return {
          playId:state.officialAttempt.playId,
          deviceId:this.deviceId,
          monthKey:state.competition.monthKey,
          playType:'official',
          cpuId:'lion',
          courseId:state.selectedLevels.red,
          characterId:state.selectedCharacters.red,
          matchSeconds:CONFIG.MATCH_SECONDS,
          pausedUsed:state.officialAttempt.pausedUsed,
          interrupted:state.officialAttempt.interrupted,
          gentleEffects:state.gentleEffects,
          correct:p.correct,
          wrong:p.wrong,
          maxCombo:p.maxCombo,
          specialCount:p.burst.count,
          finalRope:Number(state.finalRope.toFixed(3)),
          result:state.winner,
          events:state.officialAttempt.events,
          appVersion:CONFIG.APP_VERSION,
          rulesVersion:CONFIG.RULES_VERSION
        };
      },
      setResultStatus(text,kind='') {
        const box=$('official-result-status');
        box.textContent=text;
        box.className=`show ${kind}`.trim();
      },
      isCurrentOfficialResult(attempt,payload) {
        return state.screen==='result'
          && state.phase==='ended'
          && state.playType==='official'
          && state.officialAttempt===attempt
          && state.officialAttempt.playId===payload.playId;
      },
      async submitFinishedOfficial() {
        const attempt=state.officialAttempt;
        if(attempt.submitted) return;
        attempt.submitted=true;
        const payload=attempt.savePayload||(attempt.savePayload=JSON.parse(JSON.stringify(this.buildOfficialPayload())));
        this.setResultStatus('公式記録を おくっているよ…');
        try {
          this.enqueue(payload);
          const result=await this.sendQueued(payload);
          if(!this.isCurrentOfficialResult(attempt,payload)) return;
          if(!result.eligible) {
            this.setResultStatus('今回は 公式記録の条件から はずれました。','try');
            return;
          }
          const lionWon=payload.result==='player';
          const achievementOptions={isStillValid:()=>this.isCurrentOfficialResult(attempt,payload)};
          if(!result.duplicate&&result.lionCompletedAll&&!attempt.lionFirstDefeatLocal) {
            this.showLionDefeatAchievement(true,payload.courseId,achievementOptions);
          } else if(!result.duplicate&&result.lionFirstDefeat&&!attempt.lionFirstDefeatLocal) {
            this.showLionDefeatAchievement(false,payload.courseId,achievementOptions);
          }
          if(result.becameChampion||result.playIsChampion) {
            const count=(result.myChampionCourses||[]).length;
            const title=milestoneTitle(count);
            this.setResultStatus(`${lionWon?'🦁 ライオン撃破！ ／ ':''}👑 ${COURSE_MASTER_NAMES[payload.courseId]}！`,'success');
            if(!result.duplicate&&!attempt.saveAchievementShown) this.showAchievement(
              result.becameChampion?'月間王者になったよ！':'王者記録になったよ！',
              `<strong>${count}つめの王冠！</strong><br>「${COURSE_MASTER_NAMES[payload.courseId]}」になったよ！${title?`<span class="achievement-title">${title}</span>`:''}`,
              achievementOptions
            );
            attempt.saveAchievementShown=true;
          } else if(lionWon) {
            this.setResultStatus('🦁 王者ライオンを げきは！ 公式記録を ほぞんしたよ！','success');
          } else {
            this.setResultStatus('公式記録を ほぞんしたよ！ また ちょうせんしてね。','success');
          }
        } catch (error) {
          attempt.submitted=this.isPermanentSaveError(error);
          if(this.isCurrentOfficialResult(attempt,payload)) {
            const message=this.isPermanentSaveError(error)
              ?'記録を ほぞんできませんでした。先生に つたえてね。'
              :this.queueMemoryOnly?'記録は まだ おくれていません。この画面を とじずに 先生に つたえてね。'
              :'つうしんできませんでした。つぎに ひらいたとき もういちど おくります。';
            this.setResultStatus(message,'try');
          }
        }
      },
      async loadGhost(courseId) {
        const result=await this.call('getMonthlyGhost',{
          deviceId:this.deviceId,
          courseId
        });
        if(!result?.ok) throw new Error(result?.message||'王者ゴーストが いません。');
        const ghost=result.ghost;
        const validGhost=ghost
          && result.courseId===courseId
          && ghost.courseId===courseId
          && Boolean(CHARACTER_DEFS[ghost.characterId])
          && Array.isArray(ghost.events)
          && ghost.events.every(event=>Number.isFinite(Number(event?.t))&&typeof event?.ok==='boolean');
        if(!validGhost) throw new Error('王者ゴーストのデータが こわれています。');
        return result;
      },
      handleFinishedMatch() {
        $('official-result-status').className='';
        $('official-result-status').textContent='';
        if(state.playType==='official') {
          const validLocalDefeat=state.winner==='player'
            && !state.officialAttempt.pausedUsed
            && !state.officialAttempt.interrupted
            && !state.gentleEffects;
          if(validLocalDefeat) {
            const attempt=state.officialAttempt;
            state.officialAttempt.lionFirstDefeatLocal=this.markLionDefeatLocally(state.selectedLevels.red);
            if(state.officialAttempt.lionFirstDefeatLocal) {
              this.renderStatus();
              this.showLionDefeatAchievement(
                state.competition.lionDefeatedCourses.length===Object.keys(COURSE_DEFS).length,
                state.selectedLevels.red,
                {isStillValid:()=>state.screen==='result'&&state.phase==='ended'&&state.playType==='official'&&state.officialAttempt===attempt}
              );
            }
          }
          this.submitFinishedOfficial();
        }
        if(state.playType==='ghost') {
          this.setResultStatus(
            state.winner==='player'?'王者ゴーストに かった！ すごい！':state.winner==='draw'?'王者ゴーストと ひきわけ！':'王者ゴーストに また ちょうせんしよう！',
            'try'
          );
        }
      }
    };
}
