(function () {
  "use strict";
  class TargetDeck {
    constructor(symbolIds, random) {
      this.ids = Array.from(new Set(symbolIds));
      if (!this.ids.length) throw new Error("TargetDeck needs playable symbols");
      this.random = random || Math.random;
      this.deck = []; this.last = null;
    }
    draw() {
      if (!this.deck.length) {
        this.deck = this.ids.slice();
        for (let i = this.deck.length - 1; i > 0; i--) {
          const sample = Math.max(0, Math.min(.999999999, Number(this.random()) || 0));
          const j = Math.floor(sample * (i + 1));
          [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        if (this.deck.length > 1 && this.deck[0] === this.last) {
          [this.deck[0], this.deck[1]] = [this.deck[1], this.deck[0]];
        }
      }
      this.last = this.deck.shift();
      return this.last;
    }
    destroy() { this.deck.length = 0; this.ids.length = 0; this.last = null; this.random = null; }
  }
  MapSymbolNinja.TargetDeck = TargetDeck;
})();
