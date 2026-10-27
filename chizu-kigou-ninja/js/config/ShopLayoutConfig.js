(function () {
  "use strict";
  const app = MapSymbolNinja;
  // Adopted from the user export: shop-layout-v0.3.17 (2).json.
  app.ShopLayoutConfig = {
  "version": "0.3.17",
  "scene": "SwordSelectScene",
  "canvas": {
    "width": 1366,
    "height": 768
  },
  "grid": {
    "visible": true,
    "size": 20,
    "snap": false
  },
  "guides": {
    "visible": true,
    "margin": 16
  },
  "elements": {
    "list": {
      "x": 0,
      "y": 0,
      "scale": 1
    },
    "cardImage": {
      "x": 0,
      "y": 0,
      "scale": 1
    },
    "cardName": {
      "x": 0,
      "y": 0,
      "fontSize": 21
    },
    "cardPrice": {
      "x": 0,
      "y": 0,
      "fontSize": 16
    },
    "cardState": {
      "x": 0,
      "y": 0,
      "fontSize": 14
    },
    "preview": {
      "x": 0,
      "y": 0,
      "scale": 1
    },
    "title": {
      "x": 0,
      "y": 0,
      "fontSize": 30
    },
    "description": {
      "x": 0,
      "y": 0,
      "fontSize": 18
    },
    "price": {
      "x": 0,
      "y": 0,
      "fontSize": 24
    },
    "owned": {
      "x": 0,
      "y": 0,
      "fontSize": 17
    },
    "guidance": {
      "x": 0,
      "y": 0,
      "fontSize": 17
    },
    "actions": {
      "x": 0,
      "y": 0,
      "scale": 1
    },
    "header": {
      "x": 0,
      "y": 0,
      "scale": 1
    },
    "wallet": {
      "x": 0,
      "y": 0,
      "scale": 1
    },
    "coin": {
      "x": 0,
      "y": 0,
      "scale": 1
    },
    "footer": {
      "x": 0,
      "y": 0,
      "fontSize": 17
    }
  },
  "swords": {
    "none": {
      "x": 0,
      "y": 0,
      "scale": 1,
      "vfxX": 0,
      "vfxY": 0,
      "vfxScale": 1
    },
    "fire": {
      "x": 0,
      "y": 0,
      "scale": 1,
      "vfxX": 92,
      "vfxY": -13,
      "vfxScale": 1
    },
    "lightning": {
      "x": 0,
      "y": 0,
      "scale": 1,
      "vfxX": 92,
      "vfxY": -13,
      "vfxScale": 1
    },
    "ice": {
      "x": 0,
      "y": -6,
      "scale": 1.03,
      "vfxX": 92,
      "vfxY": -13,
      "vfxScale": 1
    },
    "wind": {
      "x": 0,
      "y": 0,
      "scale": 1.05,
      "vfxX": 92,
      "vfxY": -13,
      "vfxScale": 1
    }
  }
};
  // Visible alpha bounds of the existing 768x512 PNGs; used only by the development guides.
  app.ShopArtFrames = { none: [16,75,752,429], fire: [16,63,753,444], lightning: [16,13,768,486], ice: [16,62,754,490], wind: [10,69,755,486] };
})();
