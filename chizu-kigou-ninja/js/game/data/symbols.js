(function () {
  "use strict";

  window.MapSymbolNinja = window.MapSymbolNinja || {};

  function define(symbol) {
    return Object.freeze(Object.assign({ rank: "genin", stage: 1, implemented: true,
      renderScale: 1, current: true }, symbol, {
      officialName: symbol.name, displayName: symbol.kana, rendererId: symbol.id
    }));
  }

  window.MapSymbolNinja.SYMBOLS = Object.freeze([
    define({
      id: "police",
      name: "警察署",
      kana: "けいさつしょ",
      category: "facility",
      effect: "policeFlash",
      difficulty: 1,
      current: true,
      asset: "./assets/symbols/police.svg",
      fallbackAsset: "./assets/symbols/police.png"
    }),
    define({
      id: "fire_station",
      name: "消防署",
      kana: "しょうぼうしょ",
      category: "facility",
      effect: "waterSplash",
      difficulty: 1,
      current: true,
      asset: "./assets/symbols/fire-station.svg",
      fallbackAsset: "./assets/symbols/fire-station.png"
    }),
    define({
      id: "hospital",
      name: "病院",
      kana: "びょういん",
      category: "facility",
      effect: "hospitalGlow",
      difficulty: 1,
      current: true,
      asset: "./assets/symbols/hospital.svg",
      fallbackAsset: "./assets/symbols/hospital.png"
    }),
    define({
      id: "post_office",
      name: "郵便局",
      kana: "ゆうびんきょく",
      category: "facility",
      effect: "postalPaper",
      difficulty: 1,
      current: true,
      asset: "./assets/symbols/post-office.svg",
      fallbackAsset: "./assets/symbols/post-office.png"
    }),
    define({
      id: "school",
      name: "小・中学校",
      kana: "しょう・ちゅうがっこう",
      category: "facility",
      effect: "schoolSakura",
      difficulty: 1,
      current: true,
      asset: "./assets/symbols/school.svg",
      fallbackAsset: "./assets/symbols/school.png"
    }),
    define({"id": "police_box", "name": "交番", "kana": "こうばん", "stage": 2, "category": "facility", "difficulty": 1, "learningDescription": "まちの あんぜんを まもる ところ", "promptName": "交番", "promptKana": "こうばん"}),
    define({"id": "city_ward_office", "name": "市役所・特別区の区役所", "kana": "しやくしょ・とくべつくのくやくしょ", "stage": 2, "category": "facility", "difficulty": 1, "learningDescription": "市や 特別区の しごとを する ところ", "feedbackKana": "しやくしょなど", "promptName": "市役所・特別区役所", "promptKana": "しやくしょ・とくべつくやくしょ"}),
    define({"id": "town_village_ward_office", "name": "町村役場・政令指定都市の区役所", "kana": "ちょうそんやくば・せいれいしていとしのくやくしょ", "stage": 2, "category": "facility", "difficulty": 1, "learningDescription": "町や 村、政令指定都市の 区の しごとを する ところ", "feedbackKana": "ちょうそんやくばなど", "promptName": "町村役場・指定都市区役所", "promptKana": "ちょうそんやくば・していとしくやくしょ"}),
    define({"id": "library", "name": "図書館", "kana": "としょかん", "stage": 2, "category": "facility", "difficulty": 1, "learningDescription": "本を よんだり かりたり する ところ", "promptName": "図書館", "promptKana": "としょかん"}),
    define({"id": "museum", "name": "博物館", "kana": "はくぶつかん", "stage": 2, "category": "facility", "difficulty": 1, "learningDescription": "歴史や 自然などの 資料を あつめて つたえる ところ", "promptName": "博物館", "promptKana": "はくぶつかん"}),
    define({"id": "shrine", "name": "神社", "kana": "じんじゃ", "stage": 3, "category": "facility", "difficulty": 1, "learningDescription": "神さまを まつる ところ", "promptName": "神社", "promptKana": "じんじゃ"}),
    define({"id": "temple", "name": "寺院", "kana": "じいん", "stage": 3, "category": "facility", "difficulty": 1, "learningDescription": "仏さまを まつる お寺", "promptName": "寺院", "promptKana": "じいん"}),
    define({"id": "elderly_home", "name": "老人ホーム", "kana": "ろうじんホーム", "stage": 3, "category": "facility", "difficulty": 1, "learningDescription": "お年よりが 生活の 支えを うける しせつ", "promptName": "老人ホーム", "promptKana": "ろうじんホーム"}),
    define({"id": "high_school", "name": "高等学校", "kana": "こうとうがっこう", "stage": 3, "category": "facility", "difficulty": 1, "learningDescription": "中学校の あとに 学ぶ 学校。記号は 丸で かこむ", "promptName": "高等学校", "promptKana": "こうとうがっこう"}),
    define({"id": "hot_spring", "name": "温泉", "kana": "おんせん", "stage": 3, "category": "facility", "difficulty": 1, "learningDescription": "地面から わき出る 温泉の ある ところ", "promptName": "温泉", "promptKana": "おんせん"}),
    define({"id": "rice_field", "name": "田", "kana": "た", "stage": 4, "category": "land_use", "difficulty": 1, "learningDescription": "水を はって 米などを そだてる 土地", "promptName": "田", "promptKana": "た"}),
    define({"id": "field", "name": "畑", "kana": "はたけ", "stage": 4, "category": "land_use", "difficulty": 1, "learningDescription": "野菜などの 作物を そだてる 土地", "promptName": "畑", "promptKana": "はたけ"}),
    define({"id": "tea_field", "name": "茶畑", "kana": "ちゃばたけ", "stage": 4, "category": "land_use", "difficulty": 1, "learningDescription": "お茶の 木を そだてる 土地", "promptName": "茶畑", "promptKana": "ちゃばたけ"}),
    define({"id": "orchard", "name": "果樹園", "kana": "かじゅえん", "stage": 4, "category": "land_use", "difficulty": 1, "learningDescription": "くだものの 木を そだてる 土地", "promptName": "果樹園", "promptKana": "かじゅえん"}),
    define({"id": "castle_ruins", "name": "城跡", "kana": "しろあと", "stage": 4, "category": "facility", "difficulty": 1, "learningDescription": "昔 お城が あった ところ", "promptName": "城跡", "promptKana": "しろあと"})
  ]);
})();
