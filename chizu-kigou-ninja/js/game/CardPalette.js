(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};

  // 色は札ごとの見た目だけ。記号・お題・正誤判定とは結び付けない。
  const colors = Object.freeze([
    Object.freeze({ id: "blue", name: "青", value: 0x398aca, hex: "#398aca", pale: "#e8f4fc" }),
    Object.freeze({ id: "teal", name: "水色", value: 0x319f9d, hex: "#319f9d", pale: "#e5f7f4" }),
    Object.freeze({ id: "yellow", name: "黄", value: 0xd99d24, hex: "#d99d24", pale: "#fff6dd" }),
    Object.freeze({ id: "orange", name: "橙", value: 0xd77742, hex: "#d77742", pale: "#fff0e4" }),
    Object.freeze({ id: "green", name: "緑", value: 0x509c62, hex: "#509c62", pale: "#ecf7e9" }),
    Object.freeze({ id: "violet", name: "紫", value: 0x956ac5, hex: "#956ac5", pale: "#f3ebfa" }),
    Object.freeze({ id: "pink", name: "桃", value: 0xc66b9d, hex: "#c66b9d", pale: "#fcebf5" })
  ]);

  class CardPalette {
    constructor(random) {
      this.random = random || Math.random;
      this.bag = [];
    }
    next() {
      if (!this.bag.length) {
        this.bag = colors.slice();
        for (let i = this.bag.length - 1; i > 0; i -= 1) {
          const j = Math.floor(this.random() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      return this.bag.pop();
    }
    static find(id) { return colors.find((color) => color.id === id) || colors[0]; }
  }
  CardPalette.COLORS = colors;
  window.MapSymbolNinja.CardPalette = CardPalette;
})();
