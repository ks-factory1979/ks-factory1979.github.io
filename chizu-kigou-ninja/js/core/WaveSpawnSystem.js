(function () {
  "use strict";

  window.NinjaCore = window.NinjaCore || {};

  // 出現の時刻・配置だけを扱う。札の意味、生成、飛翔は呼び出し元が担当する。
  class WaveSpawnSystem {
    constructor(options) {
      this.durationMs = options.durationMs;
      this.cutoffMs = options.cutoffMs;
      this.waves = options.waves;
      this.maxActive = options.maxActive;
      this.correctRate = options.correctRate;
      this.issenChance = options.issenChance;
      this.getActiveCount = options.getActiveCount;
      this.onSpawn = options.onSpawn;
      this.onWaveChange = options.onWaveChange || function () {};
      this.random = options.random || Math.random;
      this.lastPattern = null;
      this.cancel();
    }

    start() {
      this.cancel();
      this.cancelled = false;
      this.cutoffAtMs = this.durationMs - this.cutoffMs;
      this.waves.forEach((wave, index) => this._scheduleWave(wave, index));
      this.queue.sort((a, b) => a.atMs - b.atMs);
    }

    update(elapsedMs) {
      if (this.cancelled) return;
      const wave = Math.min(this.waves.length, 1 + this.waves.findIndex(
        (entry) => elapsedMs < entry.end * this.durationMs
      ));
      const current = wave < 1 ? this.waves.length : wave;
      if (current !== this.currentWave) {
        this.currentWave = current;
        this.onWaveChange(current);
      }

      // 期限を過ぎた予約は出さず、同時表示数が一杯なら次のフレームで再試行する。
      if (elapsedMs >= this.cutoffAtMs) {
        this.queue.length = 0;
        return;
      }
      let launched = 0;
      while (this.queue.length && this.queue[0].atMs <= elapsedMs && launched < 3) {
        const next = this.queue[0];
        if (elapsedMs > next.latestMs) {
          this.queue.shift();
          continue;
        }
        if (this.getActiveCount() >= this.maxActive) break;
        if (this.onSpawn(next) === false) break;
        this.queue.shift();
        this.spawnCount += 1;
        if (next.correct) this.deliveredCorrectCount += 1;
        this.lastPattern = next.pattern;
        launched += 1;
      }
    }

    // ラスト数秒は新しいお題を出さず、同じ記号で短い締めを遊べるようにする。
    extendFinalStretch(elapsedMs, remainingMs) {
      if (this.cancelled) return;
      this.queue.length = 0;
      this.finalStretch = true;
      this.cutoffAtMs = elapsedMs + remainingMs - this.cutoffMs;
      const count = remainingMs > 1700 ? 2 : 1;
      const pattern = count === 2 ? "pair_staggered" : "single_center";
      const entries = this._enqueueSet(elapsedMs + 70, count, pattern, this.waves.length - 1, false,
        this.cutoffAtMs);
      if (remainingMs > 2400) {
        entries.push(...this._enqueueSet(elapsedMs + 1150, 1, "single_side", this.waves.length - 1, false,
          this.cutoffAtMs));
      }
      if (remainingMs > 3300) {
        entries.push(...this._enqueueSet(elapsedMs + 2250, 1, "single_center", this.waves.length - 1, false,
          this.cutoffAtMs));
      }
      // 同じお題で既に正解を出していれば、最後の1枚も独立した抽選にする。
      // 容量不足等でまだ正解を出せていない場合だけ、正解ゼロの救済を行う。
      if (this.deliveredCorrectCount === 0) this._ensureCorrect(entries);
      this._shuffleAnswers(entries);
      this.queue.sort((a, b) => a.atMs - b.atMs);
    }

    cancel() {
      this.queue = [];
      this.cancelled = true;
      this.currentWave = 0;
      this.spawnCount = 0;
      this.deliveredCorrectCount = 0;
      this.cutoffAtMs = 0;
      this.finalStretch = false;
    }

    getPendingCount() {
      return this.queue.length;
    }

    destroy() {
      this.cancel();
      this.onSpawn = null;
      this.getActiveCount = null;
      this.onWaveChange = null;
    }

    _scheduleWave(wave, index) {
      const startMs = this.durationMs * wave.start;
      const endMs = this.durationMs * wave.end;
      const count = this._between(wave.minCards, wave.maxCards);
      let pattern;
      let climax = false;
      if (index === 0) {
        pattern = count === 1 ? this._pick(["single_center", "single_side"])
          : "pair_staggered";
      } else if (index === 1) {
        pattern = this._pick(["pair_left_right", "pair_staggered", "pair_height_difference"]);
      } else if (index === 2) {
        pattern = this._pick(["triple_fan", "triple_staggered", "triple_cross"]);
      } else {
        climax = this.random() < this.issenChance;
        pattern = climax ? "climax_issen" : "climax_arc";
      }

      // まとまりの間に短い呼吸を作る。最後のまとまりも締切より前に置く。
      const entries = this._enqueueSet(startMs + 60, count, pattern, index, climax, endMs + 100);
      const supportAt = startMs + (endMs - startMs) * 0.47;
      const supportPattern = index === 0 ? "single_side"
        : this._pick(["single_center", "single_side"]);
      entries.push(...this._enqueueSet(supportAt, 1, supportPattern, index, false, endMs + 100, true));
      // 補助札も独立に抽選する。正解がゼロのまとまりだけ、無作為な位置で救済。
      // 正解は複数でもよく、1枚見つけた後の残りを「すべて不正解」にしない。
      this._ensureCorrect(entries);
      this._shuffleAnswers(entries);
    }

    _enqueueSet(startMs, count, pattern, waveIndex, climax, latestMs, support) {
      const slots = this._slots(pattern, count);
      const entries = [];
      slots.forEach((slot) => {
        // 一閃向けのまとまりは従来の平均枚数を目安にするが、枚数そのものは固定しない。
        const rate = climax && !support ? Math.max(this.correctRate, (count - 1) / count) : this.correctRate;
        const correct = this.random() < rate;
        const atMs = startMs + slot.delay;
        const deadline = Math.min(latestMs, this.cutoffAtMs - 1);
        if (atMs > deadline) return;
        const entry = {
          atMs,
          latestMs: deadline,
          wave: waveIndex + 1,
          pattern,
          correct,
          launch: { laneRatio: slot.lane, vx: slot.vx, vy: slot.vy }
        };
        this.queue.push(entry);
        entries.push(entry);
      });
      return entries;
    }

    _ensureCorrect(entries) {
      if (entries.length && !entries.some(entry => entry.correct)) {
        entries[Math.floor(this.random() * entries.length)].correct = true;
      }
    }

    _shuffleAnswers(entries) {
      const answers = entries.map(entry => entry.correct);
      for (let i = answers.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
      }
      entries.forEach((entry, index) => { entry.correct = answers[index]; });
    }

    _slots(pattern, count) {
      const left = this.random() < 0.5;
      const side = left ? 0.23 : 0.77;
      const basic = [
        { lane: 0.23, vx: 165, vy: -860, delay: 0 },
        { lane: 0.50, vx: 0, vy: -905, delay: 45 },
        { lane: 0.77, vx: -165, vy: -835, delay: 90 },
        { lane: 0.89, vx: -120, vy: -795, delay: 280 }
      ];
      let slots;
      switch (pattern) {
        case "single_center":
          slots = [{ lane: 0.50, vx: undefined, vy: undefined, delay: 0 }];
          break;
        case "single_side":
          slots = [{ lane: side, vx: undefined, vy: undefined, delay: 0 }];
          break;
        case "pair_staggered":
          slots = [
            { lane: left ? 0.28 : 0.72, vx: undefined, vy: undefined, delay: 0 },
            { lane: left ? 0.72 : 0.28, vx: undefined, vy: undefined, delay: 190 }
          ];
          break;
        case "pair_left_right":
          slots = [{ lane: 0.24, vx: 150, vy: -860, delay: 0 },
            { lane: 0.76, vx: -150, vy: -895, delay: 65 }];
          break;
        case "pair_height_difference":
          slots = [{ lane: 0.27, vx: 155, vy: -800, delay: 0 },
            { lane: 0.73, vx: -155, vy: -950, delay: 65 }];
          break;
        case "triple_staggered":
          slots = basic.map((slot, index) => Object.assign({}, slot, { delay: index * 165 }));
          break;
        case "triple_cross":
          slots = [{ lane: 0.20, vx: 225, vy: -810, delay: 0 },
            { lane: 0.50, vx: 0, vy: -945, delay: 160 },
            { lane: 0.80, vx: -225, vy: -825, delay: 320 }, basic[3]];
          break;
        case "climax_issen":
          // 正解札はほぼ同じ高さで並ぶ。誤答札は離れた端から遅れて飛ばす。
          slots = [{ lane: 0.25, vx: 95, vy: -885, delay: 0 },
            { lane: 0.50, vx: 0, vy: -885, delay: 40 },
            { lane: 0.75, vx: -95, vy: -885, delay: 75 },
            { lane: 0.88, vx: -155, vy: -800, delay: 560 }];
          if (count === 3) slots = [slots[0], slots[1], slots[3]];
          break;
        default:
          slots = basic;
          break;
      }
      if (count > slots.length) {
        slots.push({ lane: 0.50, vx: 0, vy: -895, delay: 330 });
      }
      return slots.slice(0, count);
    }

    _between(min, max) {
      return min + Math.floor(this.random() * (max - min + 1));
    }

    _pick(values) {
      const candidates = values.length > 1 ? values.filter((item) => item !== this.lastPattern) : values;
      const pool = candidates.length ? candidates : values;
      return pool[Math.floor(this.random() * pool.length)];
    }
  }

  window.NinjaCore.WaveSpawnSystem = WaveSpawnSystem;
})();
