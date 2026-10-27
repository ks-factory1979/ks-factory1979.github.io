(function () {
  "use strict";

  window.MapSymbolNinja = window.MapSymbolNinja || {};

  const CARD_SIZE = 180;
  const SYMBOL_SIZE = 128;
  const SYMBOL_X = 26;
  const SYMBOL_Y = 24;
  const PIXEL_REGION = Object.freeze({ x: 24, y: 22, width: 132, height: 132 });
  const MIN_DARK_PIXELS = 180;

  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function drawCardBase(context, color) {
    context.clearRect(0, 0, CARD_SIZE, CARD_SIZE);
    context.save();
    context.shadowColor = "rgba(0,0,0,0.38)";
    context.shadowBlur = 10;
    context.shadowOffsetY = 5;
    roundedRectPath(context, 10, 8, 160, 160, 22);
    context.fillStyle = "#fffaf0";
    context.fill();
    context.restore();

    if (color) {
      context.save();
      roundedRectPath(context, 13, 11, 154, 154, 19);
      context.clip();
      context.fillStyle = color.pale;
      context.fillRect(13, 11, 154, 154);
      // 記号の背面は明るいまま。縁と細い帯で札の色を読み取れるようにする。
      context.fillStyle = color.hex;
      context.globalAlpha = 0.72;
      context.fillRect(14, 11, 152, 9);
      context.fillRect(14, 148, 152, 17);
      context.globalAlpha = 0.46;
      context.fillRect(13, 21, 7, 126);
      context.fillRect(160, 21, 7, 126);
      context.restore();
    }

    roundedRectPath(context, 10, 8, 160, 160, 22);
    context.strokeStyle = color ? color.hex : "#6d4b27";
    context.lineWidth = 5;
    context.stroke();
    roundedRectPath(context, 18, 16, 144, 144, 16);
    context.strokeStyle = color ? color.hex : "rgba(177,123,59,0.52)";
    context.globalAlpha = color ? 0.44 : 1;
    context.lineWidth = 2;
    context.stroke();
    context.globalAlpha = 1;
  }

  function countDarkPixels(context) {
    const pixels = context.getImageData(
      PIXEL_REGION.x,
      PIXEL_REGION.y,
      PIXEL_REGION.width,
      PIXEL_REGION.height
    ).data;
    let darkPixelCount = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (alpha >= 128 && pixels[index] <= 90 && pixels[index + 1] <= 90 && pixels[index + 2] <= 90) {
        darkPixelCount += 1;
      }
    }
    return darkPixelCount;
  }

  function inspectExistingCard(scene, key) {
    if (!scene.textures.exists(key)) return null;
    const source = scene.textures.get(key).getSourceImage();
    if (!source || typeof source.getContext !== "function") return null;
    const context = source.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    const darkPixelCount = countDarkPixels(context);
    return {
      cardCreated: true,
      darkPixelCount,
      visiblePixels: darkPixelCount >= MIN_DARK_PIXELS
    };
  }

  function drawSymbol(context, symbol) {
    const scale = Number.isFinite(symbol.renderScale) ? Math.max(0.75, Math.min(1.1, symbol.renderScale)) : 1;
    const size = SYMBOL_SIZE * scale;
    MapSymbolNinja.SymbolRenderers[symbol.id](context,
      SYMBOL_X + (SYMBOL_SIZE - size) / 2, SYMBOL_Y + (SYMBOL_SIZE - size) / 2, size);
  }

  function buildCard(scene, symbol) {
    const cardKey = "card_" + symbol.id;
    const renderer = MapSymbolNinja.SymbolRenderers && MapSymbolNinja.SymbolRenderers[symbol.id];
    if (typeof renderer !== "function") {
      throw new Error(symbol.id + ": 内蔵Canvasベクターが見つかりません");
    }

    const existing = inspectExistingCard(scene, cardKey);
    if (existing && existing.visiblePixels) {
      return Object.assign({
        loaded: true,
        source: "embedded-vector",
        sourceWidth: MapSymbolNinja.SYMBOL_RENDER_VIEWBOX_SIZE,
        sourceHeight: MapSymbolNinja.SYMBOL_RENDER_VIEWBOX_SIZE,
        reusedCard: true
      }, existing);
    }

    if (scene.textures.exists(cardKey)) scene.textures.remove(cardKey);
    const texture = scene.textures.createCanvas(cardKey, CARD_SIZE, CARD_SIZE);
    if (!texture) throw new Error(symbol.id + ": card textureを作成できませんでした");
    const canvas = texture.getSourceImage();
    const context = canvas && canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error(symbol.id + ": card canvasの2D Contextを取得できませんでした");
    drawCardBase(context);
    drawSymbol(context, symbol);
    const cardDarkPixelCount = countDarkPixels(context);
    if (cardDarkPixelCount < MIN_DARK_PIXELS) {
      scene.textures.remove(cardKey);
      throw new Error(symbol.id + ": card texture中央の濃色画素が不足しています (" + cardDarkPixelCount + ")");
    }

    if (typeof texture.update === "function") texture.update();
    texture.refresh();
    return {
      loaded: true,
      source: "embedded-vector",
      sourceWidth: MapSymbolNinja.SYMBOL_RENDER_VIEWBOX_SIZE,
      sourceHeight: MapSymbolNinja.SYMBOL_RENDER_VIEWBOX_SIZE,
      reusedCard: false,
      cardCreated: scene.textures.exists(cardKey),
      darkPixelCount: cardDarkPixelCount,
      visiblePixels: cardDarkPixelCount >= MIN_DARK_PIXELS
    };
  }

  function buildColorCard(scene, symbol, color) {
    const key = "card_" + symbol.id + "_" + color.id;
    const existing = inspectExistingCard(scene, key);
    if (existing && existing.visiblePixels) return existing;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const texture = scene.textures.createCanvas(key, CARD_SIZE, CARD_SIZE);
    if (!texture) throw new Error(key + ": textureを作成できませんでした");
    const context = texture.getSourceImage().getContext("2d", { willReadFrequently: true });
    drawCardBase(context, color);
    drawSymbol(context, symbol);
    const darkPixelCount = countDarkPixels(context);
    if (darkPixelCount < MIN_DARK_PIXELS) throw new Error(key + ": 黒い記号画素が不足 " + darkPixelCount);
    if (typeof texture.update === "function") texture.update();
    texture.refresh();
    return { cardCreated: true, darkPixelCount, visiblePixels: true };
  }

  function publishQa(report) {
    const qa = window.__NINJA_QA;
    if (!qa) return;
    for (const [id, result] of Object.entries(report)) {
      qa.symbolTexturesLoaded[id] = {
        loaded: result.loaded,
        embedded: true,
        selectedSource: result.source,
        sourceWidth: result.sourceWidth,
        sourceHeight: result.sourceHeight
      };
      qa.cardTexturesCreated[id] = result.cardCreated;
      qa.symbolRenderCheck[id] = {
        source: result.source,
        cardCreated: result.cardCreated,
        visiblePixels: result.visiblePixels,
        darkPixelCount: result.darkPixelCount,
        minimumRequired: MIN_DARK_PIXELS,
        error: result.error || null
      };
    }
  }

  class CardTextureFactory {
    static createAll(scene, symbols) {
      const report = {};
      const failures = [];
      for (const symbol of symbols) {
        try {
          report[symbol.id] = buildCard(scene, symbol);
          if (typeof NINJA_CONFIG !== "undefined" && NINJA_CONFIG.CARD_COLOR_ENABLED) {
            for (const color of MapSymbolNinja.CardPalette.COLORS) buildColorCard(scene, symbol, color);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          report[symbol.id] = {
            loaded: false,
            source: "embedded-vector",
            sourceWidth: MapSymbolNinja.SYMBOL_RENDER_VIEWBOX_SIZE,
            sourceHeight: MapSymbolNinja.SYMBOL_RENDER_VIEWBOX_SIZE,
            cardCreated: false,
            darkPixelCount: 0,
            visiblePixels: false,
            error: message
          };
          failures.push(symbol.name + "：NG（" + message + "）");
        }
      }
      publishQa(report);
      if (failures.length) throw new Error(failures.join("\n"));
      return report;
    }
  }

  CardTextureFactory.CARD_SIZE = CARD_SIZE;
  CardTextureFactory.MIN_DARK_PIXELS = MIN_DARK_PIXELS;
  window.MapSymbolNinja.CardTextureFactory = CardTextureFactory;
})();
