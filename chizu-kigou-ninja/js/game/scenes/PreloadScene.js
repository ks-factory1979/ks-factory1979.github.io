(function () {
  "use strict";

  window.MapSymbolNinja = window.MapSymbolNinja || {};

  class PreloadScene extends Phaser.Scene {
    constructor() {
      super({ key: "PreloadScene" });
    }

    preload() {
      const width = NINJA_CONFIG.WIDTH;
      const height = NINJA_CONFIG.HEIGHT;
      this.cameras.main.setBackgroundColor("#071426");

      this.add.text(width / 2, height / 2 - 76, "地図記号忍者", {
        fontFamily: MapSymbolNinja.UI.fontFamily,
        fontSize: "54px",
        fontStyle: "bold",
        color: "#fff3c4"
      }).setOrigin(0.5);

      const barBack = this.add.graphics();
      barBack.fillStyle(0x05101f, 0.9);
      barBack.fillRoundedRect(width / 2 - 260, height / 2 + 12, 520, 34, 17);
      barBack.lineStyle(2, 0xd8b866, 0.8);
      barBack.strokeRoundedRect(width / 2 - 260, height / 2 + 12, 520, 34, 17);

      this.progressBar = this.add.graphics();
      this.loadingText = this.add.text(width / 2, height / 2 + 83, "よみこみ中…", {
        fontFamily: MapSymbolNinja.UI.fontFamily,
        fontSize: "22px",
        color: "#cfeaff"
      }).setOrigin(0.5);

      window.__NINJA_QA.currentScene = "preload";
      this.load.on("progress", (value) => {
        this.progressBar.clear().fillStyle(0x55c8ff, .95);
        this.progressBar.fillRoundedRect(width / 2 - 252, height / 2 + 20,
          Math.max(1, 504 * value), 18, 9);
        window.__NINJA_QA.loadProgress = value;
      });
      this.load.on("loaderror", (file) => {
        const spec = MapSymbolNinja.UIAssetSpecs.find((item) => item.key === file.key);
        const path = spec ? spec.path : "内蔵素材 " + file.key;
        window.__NINJA_QA.assetLoadErrors.push({ key: file.key, path });
        console.error("素材読込失敗:", file.key, path);
      });
      const uiData = MapSymbolNinja.UIAssetData || {};
      for (const spec of MapSymbolNinja.UIAssetSpecs) {
        if (this.textures.exists(spec.key)) continue;
        if (uiData[spec.key]) this.load.image(spec.key, uiData[spec.key]);
        else {
          window.__NINJA_QA.assetLoadErrors.push({ key: spec.key, path: spec.path });
          console.error("内蔵UI素材がありません:", spec.key, spec.path);
        }
      }

      // Shop textures share embedded optimized PNGs, including file:// startup.
      for (const [key, uri] of Object.entries(MapSymbolNinja.ShopAssetData || {})) this.load.image(key, uri);

      // 地図記号はJavaScript内蔵ベクターから同期生成します。
      // file:// 直開きでもSVG/PNG LoaderやCORSへ依存しません。
      // 墨の実PNGは同梱ファイルと同一バイトをData URIへ内蔵して読み込みます。
      // Phaser Loaderが4素材の復号を終えてからcreateへ進むので初撃に遅れません。
      const materials = window.NinjaCore && window.NinjaCore.InkMaterialData || {};
      if (this.load && Object.keys(materials).length) this.load.on("loaderror", (file) => {
        if (file.key && file.key.startsWith("ink_material_")) {
          window.__NINJA_QA.inkMaterialErrors.push(file.key);
          console.error("墨素材読込失敗:", file.key);
        }
      });
      for (const [name, uri] of Object.entries(materials)) this.load.image("ink_material_" + name, uri);
      const splashes = window.NinjaCore && window.NinjaCore.SplashMaterialData || {};
      if (this.load && Object.keys(splashes).length) this.load.on("loaderror", (file) => {
        if (file.key && file.key.startsWith("splash_material_")) {
          window.__NINJA_QA.splashMaterialErrors.push(file.key);
          console.error("飛沫素材読込失敗:", file.key);
        }
      });
      if (this.load) for (const [name, uri] of Object.entries(splashes)) this.load.image("splash_material_" + name, uri);
      const zoneWorld = window.NinjaCore && window.NinjaCore.ZoneWorldData || {};
      if (this.load && Object.keys(zoneWorld).length) this.load.on("loaderror", (file) => {
        if (file.key && file.key.startsWith("zone_world_")) {
          window.__NINJA_QA.zoneWorldErrors.push(file.key);
          console.error("ZONE素材読込失敗:", file.key);
        }
      });
      if (this.load) for (const [name, uri] of Object.entries(zoneWorld)) {
        this.load.image("zone_world_" + name, uri);
      }
      // 表示専用画像もData URIから一度だけ読み込み、file://と相対URL公開を両立する。
      const hitLabels = window.NinjaCore && window.NinjaCore.HitLabelData || {};
      if (this.load) this.load.on("loaderror", (file) => {
        if (file.key && file.key.startsWith("hit_label_")) {
          window.__NINJA_QA.hitLabelErrors.push(file.key);
          console.error("会心・一閃素材読込失敗:", file.key);
        }
      });
      if (this.load) for (const [name, uri] of Object.entries(hitLabels)) {
        this.load.image("hit_label_" + name, uri);
      }
    }

    create() {
      window.__NINJA_QA.currentScene = "preload";
      const missing = [];
      window.__NINJA_QA.uiAssetsLoaded = {};
      for (const spec of MapSymbolNinja.UIAssetSpecs) {
        const loaded = this.textures.exists(spec.key);
        window.__NINJA_QA.uiAssetsLoaded[spec.key] = loaded;
        if (!loaded) { missing.push(spec.path); continue; }
        const texture = this.textures.get(spec.key);
        // 同梱PNGはそのまま保持。描画用frameで透明余白だけを除く。
        if (spec.frame && !texture.has("content")) texture.add("content", 0, ...spec.frame);
      }
      if (missing.length) {
        this.loadingText.setText("素材のよみこみに失敗しました\nページをひらきなおしてね");
        console.error("正式UI素材:", missing);
        return;
      }
      let report;
      try {
        report = MapSymbolNinja.CardTextureFactory.createAll(this, MapSymbolNinja.SYMBOLS);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        window.__NINJA_QA.runtimeErrors.push(message);
        console.error("地図記号カード生成失敗:", error);
        const detail = NINJA_CONFIG.DEBUG_MODE ? "\n\n" + message : "";
        this.add.text(NINJA_CONFIG.WIDTH / 2, NINJA_CONFIG.HEIGHT / 2 + 145, "地図記号の準備に失敗しました。\nページを再読み込みしてください。" + detail, {
          fontFamily: MapSymbolNinja.UI.fontFamily,
          fontSize: "25px",
          color: "#ffd4b2",
          align: "center",
          lineSpacing: 10
        }).setOrigin(0.5);
        return;
      }

      window.__NINJA_QA.assetsLoaded = MapSymbolNinja.SYMBOLS.every((symbol) => {
        const result = report[symbol.id];
        return Boolean(result && result.loaded && result.cardCreated && result.visiblePixels);
      });

      const materials = window.NinjaCore && window.NinjaCore.InkMaterialData || {};
      for (const name of Object.keys(materials)) {
        const key = "ink_material_" + name;
        const source = this.textures.exists(key) ? this.textures.get(key).getSourceImage() : null;
        const loaded = Boolean(source && source.width > 0 && source.height > 0);
        window.__NINJA_QA.inkMaterialLoaded[name] = loaded;
        let visiblePixels = false;
        if (loaded && typeof document !== "undefined") {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = source.width; canvas.height = source.height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            context.drawImage(source, 0, 0);
            const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < rgba.length; i += 4) {
              if (rgba[i] > 100) { visiblePixels = true; break; }
            }
          } catch (error) { window.__NINJA_QA.inkMaterialErrors.push(key + ": " + error.message); }
        }
        window.__NINJA_QA.inkMaterialPixels[name] = visiblePixels;
        if (!loaded) window.__NINJA_QA.inkMaterialErrors.push(key + ": empty texture");
      }

      const splashes = window.NinjaCore && window.NinjaCore.SplashMaterialData || {};
      for (const name of Object.keys(splashes)) {
        const key = "splash_material_" + name;
        const source = this.textures.exists(key) ? this.textures.get(key).getSourceImage() : null;
        const loaded = Boolean(source && source.width > 0 && source.height > 0);
        window.__NINJA_QA.splashMaterialLoaded[name] = loaded;
        let visiblePixels = false;
        if (loaded) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = source.width; canvas.height = source.height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            context.drawImage(source, 0, 0);
            const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < rgba.length; i += 4) {
              if (rgba[i] > 100) { visiblePixels = true; break; }
            }
          } catch (error) { window.__NINJA_QA.splashMaterialErrors.push(key + ": " + error.message); }
        }
        window.__NINJA_QA.splashMaterialPixels[name] = visiblePixels;
        if (!loaded || !visiblePixels) window.__NINJA_QA.splashMaterialErrors.push(key + ": empty texture");
      }

      // キーの有無だけでなく、透過と描画できる画素を小さなCanvasで検査する。
      // 元画像全画素は読み戻さず、起動時の負担を抑える。
      const zoneWorld = window.NinjaCore && window.NinjaCore.ZoneWorldData || {};
      window.__NINJA_QA.zoneWorldLoaded = window.__NINJA_QA.zoneWorldLoaded || {};
      window.__NINJA_QA.zoneWorldPixels = window.__NINJA_QA.zoneWorldPixels || {};
      window.__NINJA_QA.zoneWorldErrors = window.__NINJA_QA.zoneWorldErrors || [];
      for (const name of ["zone_logo", "zone_ninjutsu_seal", "zone_edge_aura", "zone_speed_lines"]) {
        const key = "zone_world_" + name;
        const source = this.textures.exists(key) ? this.textures.get(key).getSourceImage() : null;
        const loaded = Boolean(source && source.width > 0 && source.height > 0 && zoneWorld[name]);
        window.__NINJA_QA.zoneWorldLoaded[name] = loaded;
        let pixels = false;
        if (loaded) try {
          const canvas = document.createElement("canvas");
          canvas.width = 64; canvas.height = 64;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(source, 0, 0, 64, 64);
          const rgba = context.getImageData(0, 0, 64, 64).data;
          let visible = 0, clear = 0;
          for (let i = 3; i < rgba.length; i += 4) {
            if (rgba[i] > 50) visible += 1;
            if (rgba[i] < 5) clear += 1;
          }
          pixels = visible > 20 && clear > 20;
        } catch (error) { window.__NINJA_QA.zoneWorldErrors.push(key + ": " + error.message); }
        window.__NINJA_QA.zoneWorldPixels[name] = pixels;
        if (!loaded || !pixels) window.__NINJA_QA.zoneWorldErrors.push(key + ": empty texture");
      }

      // キーだけではなく、実際に描ける画素と透明部があることを検査する。
      window.__NINJA_QA.hitLabelLoaded = window.__NINJA_QA.hitLabelLoaded || {};
      window.__NINJA_QA.hitLabelPixels = window.__NINJA_QA.hitLabelPixels || {};
      window.__NINJA_QA.hitLabelErrors = window.__NINJA_QA.hitLabelErrors || [];
      for (const name of ["critical", "issen"]) {
        const key = "hit_label_" + name;
        const source = this.textures.exists(key) ? this.textures.get(key).getSourceImage() : null;
        const loaded = Boolean(source && source.width > 0 && source.height > 0);
        window.__NINJA_QA.hitLabelLoaded[name] = loaded;
        let pixels = false;
        if (loaded) try {
          const canvas = document.createElement("canvas");
          canvas.width = 64; canvas.height = 64;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(source, 0, 0, 64, 64);
          const rgba = context.getImageData(0, 0, 64, 64).data;
          let visible = 0, clear = 0;
          for (let i = 3; i < rgba.length; i += 4) {
            if (rgba[i] > 50) visible++;
            if (rgba[i] < 5) clear++;
          }
          pixels = visible > 20 && clear > 20;
        } catch (error) { window.__NINJA_QA.hitLabelErrors.push(key + ": " + error.message); }
        window.__NINJA_QA.hitLabelPixels[name] = pixels;
        if (!loaded || !pixels) window.__NINJA_QA.hitLabelErrors.push(key + ": empty texture");
      }

      this.progressBar.clear();
      this.progressBar.fillStyle(0x55c8ff, 0.95);
      this.progressBar.fillRoundedRect(NINJA_CONFIG.WIDTH / 2 - 252, NINJA_CONFIG.HEIGHT / 2 + 20, 504, 18, 9);
      this.loadingText.setText("準備完了！");

      const params = new URLSearchParams(window.location.search);
      const progress = MapSymbolNinja.progress;
      Promise.resolve(progress && progress.whenReady()).then(() => {
        if (this.scene.isActive()) this.scene.start(NINJA_CONFIG.DEV_PANEL_ENABLED && params.get("symbol-check") === "1" ? "SymbolCheckScene" : "TitleScene");
      });
    }
  }

  window.MapSymbolNinja.PreloadScene = PreloadScene;
})();
