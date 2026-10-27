(function () {
  "use strict";
  const app = MapSymbolNinja;
  const additions = [
  {
    "symbolId": "government_office",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "国の機関や 外国の大使館を 表すよ。裁判所や 税務署には 別の記号があるよ。",
    "description": "国の しごとをする 役所などを 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022kannkousho.htm",
    "sourceTitle": "国土地理院「官公署」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "court",
    "type": "origin",
    "title": "形の 由来",
    "text": "昔、裁判の内容を 知らせた「高札」という 立て札の形から できたよ。",
    "description": "法律に もとづいて 裁判をする ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022saibansho.htm",
    "sourceTitle": "国土地理院「裁判所」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "tax_office",
    "type": "origin",
    "title": "形の 由来",
    "text": "昔、お金の計算に 使った「そろばん」の 珠と軸の形から できたよ。",
    "description": "税金についての 相談や 手続きをする ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022zeimusho.htm",
    "sourceTitle": "国土地理院「税務署」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "public_health_center",
    "type": "observation",
    "title": "見分ける ヒント",
    "text": "丸の中に 十字があるよ。病院の記号の 外側の形と くらべてみよう。",
    "description": "地域の人たちの 健康を まもる ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022hokensho.htm",
    "sourceTitle": "国土地理院「保健所」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "observation_origin_unconfirmed"
  },
  {
    "symbolId": "monument",
    "type": "origin",
    "title": "形の 由来",
    "text": "石でできた 記念碑を 前から見た形と、その影から できたよ。",
    "description": "人や 出来事などを 記念して 建てた 碑を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-00001.htm",
    "sourceTitle": "国土地理院「記念碑」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "lighthouse",
    "type": "origin",
    "title": "形の 由来",
    "text": "灯台の 光のもとを 上から見た形と、まわりへ 光が出る様子から できたよ。",
    "description": "光で 船の安全を 助ける しせつなどを 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-toudai.htm",
    "sourceTitle": "国土地理院「灯台」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "wind_turbine",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "発電のための 目立つ風車を 表すよ。2006年から 地形図で 使われているよ。",
    "description": "風の力で 発電する、目じるしになる 風車を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-fusya.htm",
    "sourceTitle": "国土地理院「風車」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "high_tower",
    "type": "origin",
    "title": "形の 由来",
    "text": "東京タワーなどの 4本脚の塔を 上から見た形から できたよ。",
    "description": "展望台などの 高い塔を 表すよ。送電線の鉄塔は ふくまないよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-koutou.htm",
    "sourceTitle": "国土地理院「高塔」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "radio_tower",
    "type": "origin",
    "title": "形の 由来",
    "text": "アンテナの形と 電波の波の形を 組み合わせた 記号だよ。",
    "description": "テレビや ラジオなどの 電波を 送ったり 受けたりする 塔。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-denpatou.htm",
    "sourceTitle": "国土地理院「電波塔」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "chimney",
    "type": "origin",
    "title": "形の 由来",
    "text": "煙突と その影、けむりを 組み合わせた 記号だよ。",
    "description": "とくに 大きな煙突を 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-entotu.htm",
    "sourceTitle": "国土地理院「煙突」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "broadleaf_forest",
    "type": "origin",
    "title": "形の 由来",
    "text": "広葉樹を 横から見た形から できたよ。丸い部分と 横へのびた線を 見てみよう。",
    "description": "ブナや ナラなどの 広葉樹が すきまなく 生えている ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-kouyoujurin.htm",
    "sourceTitle": "国土地理院「広葉樹林」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "coniferous_forest",
    "type": "origin",
    "title": "形の 由来",
    "text": "スギの木を 横から見た形から できたよ。とがった形に 注目してみよう。",
    "description": "マツや スギなどの 針葉樹が すきまなく 生えている ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-sinyoujurin.htm",
    "sourceTitle": "国土地理院「針葉樹林」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "bamboo_forest",
    "type": "origin",
    "title": "形の 由来",
    "text": "竹が 生えている様子と その影から できた 記号だよ。",
    "description": "竹が すきまなく 生えている ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-tikurin.htm",
    "sourceTitle": "国土地理院「竹林」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "rough_land",
    "type": "origin",
    "title": "形の 由来",
    "text": "雑草が 生えている様子から できたよ。中央の線が 長い形だよ。",
    "description": "雑草などが 生えている 土地を 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-areti.htm",
    "sourceTitle": "国土地理院「荒地」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "cemetery",
    "type": "origin",
    "title": "形の 由来",
    "text": "お墓を 横から見た形から できたよ。下の 横線と 上へのびる線に 注目しよう。",
    "description": "亡くなった人を 葬った お墓のある ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-boti.htm",
    "sourceTitle": "国土地理院「墓地」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "port",
    "type": "origin",
    "title": "形の 由来",
    "text": "大型船の 錨（いかり）の形から できたよ。漁港とちがい、上の丸が 白ぬきだよ。",
    "description": "法律で 定められた 港を 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-kouwan.htm",
    "sourceTitle": "国土地理院「港湾」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "fishing_port",
    "type": "origin",
    "title": "形の 由来",
    "text": "小型船の 錨（いかり）の形から できたよ。港湾とちがい、上の丸が 黒くぬられているよ。",
    "description": "漁業で 使う港のうち、法律で 決められたものを 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-gyokou.htm",
    "sourceTitle": "国土地理院「漁港」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "power_plant",
    "type": "origin",
    "title": "形の 由来",
    "text": "発電機を 歯車と 電気回路の形で 表したものと いわれているよ。",
    "description": "電気をつくる 発電所や 電圧を変える 変電所を 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-hatudensyotou.htm",
    "sourceTitle": "国土地理院「発電所等・送電線」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "mine",
    "type": "origin",
    "title": "形の 由来",
    "text": "土や 岩をほる「つるはし」を 交差させた形の 記号だよ。",
    "description": "地中の 鉱物を ほり出している ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-saikouti.htm",
    "sourceTitle": "国土地理院「採鉱地」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "historic_site",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "大切な 文化財の場所を 表すよ。地図では その名前も いっしょに 書かれるよ。",
    "description": "法律で 決められた 史跡や 景色、自然などの 文化財を 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-siseki-meisyou.htm",
    "sourceTitle": "国土地理院「史跡・名勝・天然記念物」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  }
];
  const entries = Object.freeze(app.MapSymbolSecrets.entries.concat(additions.map(entry => Object.freeze(entry))));
  const byId = new Map(entries.map(entry => [entry.symbolId, entry]));
  app.MapSymbolSecrets = Object.freeze({ entries, get: id => byId.get(id) || null });
})();
