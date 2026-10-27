(function () {
  "use strict";

  window.MapSymbolNinja = window.MapSymbolNinja || {};

  class MapSymbolGame {
    constructor(symbols) {
      this.symbols = symbols.slice();
      this.byId = new Map(this.symbols.map((symbol) => [symbol.id, symbol]));
    }

    nextQuestion(previousId) {
      const candidates = this.symbols.filter((symbol) => symbol.id !== previousId);
      return this._pick(candidates.length ? candidates : this.symbols);
    }

    pickSpawnSymbol(questionId, forceCorrect, correctRate) {
      if (forceCorrect || Math.random() < correctRate) return this.byId.get(questionId);
      const distractors = this.symbols.filter((symbol) => symbol.id !== questionId);
      return this._pick(distractors);
    }

    isCorrect(symbolId, questionId) {
      return symbolId === questionId;
    }

    _pick(values) {
      return values[Math.floor(Math.random() * values.length)];
    }
  }

  const UI = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',

    announce(message) {
      const region = document.getElementById("live-region");
      if (region) region.textContent = message;
    },

    drawBackground(scene, options) {
      if (MapSymbolNinja.AssetKeys && scene.textures.exists(MapSymbolNinja.AssetKeys.GAME_BACKGROUND)) {
        return UI.coverBackground(scene, MapSymbolNinja.AssetKeys.GAME_BACKGROUND, options && options.dim);
      }
      const width = NINJA_CONFIG.WIDTH;
      const height = NINJA_CONFIG.HEIGHT;
      const dim = options && options.dim;
      const graphics = scene.add.graphics().setDepth(-100);

      graphics.fillStyle(0x071426, 1);
      graphics.fillRect(0, 0, width, height);
      graphics.fillStyle(0x0d2340, 1);
      graphics.fillRect(0, 0, width, 430);

      graphics.fillStyle(0xffefbd, 0.92);
      graphics.fillCircle(1118, 138, 70);
      graphics.fillStyle(0x0d2340, 0.30);
      graphics.fillCircle(1092, 118, 13);
      graphics.fillCircle(1140, 160, 9);

      graphics.fillStyle(0x102d42, 1);
      graphics.fillTriangle(0, 520, 330, 242, 650, 520);
      graphics.fillTriangle(330, 520, 720, 210, 1030, 520);
      graphics.fillTriangle(720, 520, 1110, 286, 1366, 520);
      graphics.fillStyle(0x173a4b, 1);
      graphics.fillTriangle(-80, 560, 270, 350, 560, 560);
      graphics.fillTriangle(470, 560, 850, 330, 1200, 560);
      graphics.fillTriangle(990, 560, 1260, 365, 1450, 560);

      graphics.fillStyle(0x07101d, 1);
      graphics.fillRect(0, 560, width, 208);
      for (let x = 0; x < width; x += 84) {
        const buildingHeight = 32 + ((x / 84) % 3) * 13;
        graphics.fillRect(x, 560 - buildingHeight, 64, buildingHeight);
        graphics.fillTriangle(x - 7, 560 - buildingHeight, x + 32, 530 - buildingHeight, x + 71, 560 - buildingHeight);
      }

      graphics.fillStyle(0xbfe8ff, 0.035);
      graphics.fillEllipse(350, 420, 650, 105);
      graphics.fillEllipse(930, 490, 780, 90);

      if (dim) {
        graphics.fillStyle(0x02060c, dim);
        graphics.fillRect(0, 0, width, height);
      }
      return graphics;
    },

    createButton(scene, x, y, width, height, label, onClick, options) {
      const settings = Object.assign({
        fill: 0xb7372e,
        hoverFill: 0xd64b3f,
        border: 0xf3d78d,
        textColor: "#fff8df",
        fontSize: 30,
        depth: 100
      }, options || {});
      const container = scene.add.container(x, y).setDepth(settings.depth);
      const plate = scene.add.graphics();
      const text = scene.add.text(0, 0, label, {
        fontFamily: UI.fontFamily,
        fontSize: settings.fontSize + "px",
        fontStyle: "bold",
        color: settings.textColor,
        align: "center"
      }).setOrigin(0.5);

      const draw = (fill, pressed) => {
        plate.clear();
        plate.fillStyle(0x000000, 0.30);
        plate.fillRoundedRect(-width / 2 + 4, -height / 2 + 7, width, height, 18);
        plate.fillStyle(fill, 1);
        plate.fillRoundedRect(-width / 2, -height / 2 + (pressed ? 3 : 0), width, height - (pressed ? 3 : 0), 18);
        plate.lineStyle(3, settings.border, 0.95);
        plate.strokeRoundedRect(-width / 2, -height / 2 + (pressed ? 3 : 0), width, height - (pressed ? 3 : 0), 18);
        plate.lineStyle(1, 0xffffff, 0.22);
        plate.strokeRoundedRect(-width / 2 + 7, -height / 2 + 7 + (pressed ? 3 : 0), width - 14, height - 14 - (pressed ? 3 : 0), 13);
      };

      draw(settings.fill, false);
      container.add([plate, text]);
      container.setSize(width, height);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerover", () => draw(settings.hoverFill, false));
      container.on("pointerout", () => draw(settings.fill, false));
      container.on("pointerdown", () => {
        draw(settings.hoverFill, true);
        text.y = 3;
      });
      container.on("pointerup", () => {
        draw(settings.hoverFill, false);
        text.y = 0;
        onClick();
      });
      return { container, plate, text, setLabel: (value) => text.setText(value) };
    },

    createUtilityButtons(scene) {
      const audio = window.ninjaAudio;
      const sound = UI.createButton(
        scene,
        1230,
        48,
        170,
        56,
        audio.isMuted() ? "🔇 音OFF" : "🔊 音ON",
        () => {
          const unlockResult = audio.unlock();
          const muted = audio.toggle();
          sound.setLabel(muted ? "🔇 音OFF" : "🔊 音ON");
          if (!muted) Promise.resolve(unlockResult).then(() => audio.play("ui"));
        },
        { fill: 0x173e5c, hoverFill: 0x225a80, fontSize: 21, depth: 950 }
      );

      const fullscreen = UI.createButton(
        scene,
        1033,
        48,
        190,
        56,
        "⛶ 全画面",
        () => {
          audio.unlock();
          audio.play("ui");
          const element = document.documentElement;
          const request = element.requestFullscreen || element.webkitRequestFullscreen;
          if (request) {
            try {
              const result = request.call(element);
              if (result && typeof result.catch === "function") result.catch(() => {});
            } catch (_error) {
              // 全画面にできない環境でもゲームは続行します。
            }
          }
        },
        { fill: 0x173e5c, hoverFill: 0x225a80, fontSize: 21, depth: 950 }
      );

      return { sound, fullscreen };
    }
  };

  window.MapSymbolNinja.MapSymbolGame = MapSymbolGame;
  window.MapSymbolNinja.UI = UI;
})();
