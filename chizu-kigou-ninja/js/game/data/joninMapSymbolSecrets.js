(function () {
  "use strict";
  const app = MapSymbolNinja;
  const additions = [
  {
      "symbolId": "dam",
      "type": "meaning",
      "title": "記号の 意味",
      "text": "コンクリートや 石でできた 大きなダムの 記号だよ。土でできたダムには 別の形の 記号を使うよ。",
      "description": "川の水を せき止める 大きな ダムを 表すよ。",
      "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-damu.htm",
      "sourceTitle": "国土地理院「ダム」",
      "sourceSection": "上側の記号（コンクリート製・堅固な石積み）と説明本文",
      "checkedAt": "2026-10-25",
      "verificationStatus": "verified"
  },
  {
    "symbolId": "disaster_memorial",
    "type": "origin",
    "title": "形の 由来",
    "text": "記念碑の記号に、石に書かれた 文章を表す 縦線を 足した形だよ。",
    "description": "昔の 自然災害のことを 後の世代へ 伝える 石碑などを 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-shizensaigaidenshouhi.htm",
    "sourceTitle": "国土地理院「自然災害伝承碑」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "triangulation_point",
    "type": "origin",
    "title": "形の 由来",
    "text": "三角形をつないで 位置をはかる「三角測量」の 網の一部から できたよ。",
    "description": "正確な 位置をはかる 測量の 基準となる 点を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022sankakuten.htm",
    "sourceTitle": "国土地理院「三角点」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "benchmark",
    "type": "origin",
    "title": "形の 由来",
    "text": "水準点の 目じるしになる 石を、真上から見た形だよ。",
    "description": "正確な 高さをはかる 測量の 基準となる 点を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022suijunten.htm",
    "sourceTitle": "国土地理院「水準点」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "electronic_control_point",
    "type": "origin",
    "title": "形の 由来",
    "text": "三角点と 電波塔の記号を 組み合わせて できた形だよ。",
    "description": "人工衛星の 電波を受けて、正確な 測量に使う 基準点。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022densikijunten.htm",
    "sourceTitle": "国土地理院「電子基準点」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "oil_gas_well",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "石油や ガスを 取り出していて、目じるしになる 施設がある 場所を表すよ。",
    "description": "石油や 天然ガスを 取り出す 井戸を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-yusei-gasusei.htm",
    "sourceTitle": "国土地理院「油井・ガス井」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "mine_entrance",
    "type": "origin",
    "title": "形の 由来",
    "text": "トンネルの 出入口の形から できたよ。地下へ出入りする 場所を表すんだ。",
    "description": "トンネルや 地下の鉱山、自然の穴などの 入口を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-kouguti.htm",
    "sourceTitle": "国土地理院「坑口」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "water_gate",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "水の量を 調節する 大きな水門などを 表すよ。船をつくる ドックの入口にも 使うよ。",
    "description": "水を 取り入れたり 流したり、水の量を 調節する しせつ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-suimon.htm",
    "sourceTitle": "国土地理院「水門」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "groyne",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "海や川の中に 設けて、岸が けずられるのを 防ぐよ。この一列の例は 幅20m未満を 表すよ。",
    "description": "水の勢いを 弱めたり 流れを整えて、岸を まもる しせつ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-suisei.htm",
    "sourceTitle": "国土地理院「水制」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "volcanic_fumarole",
    "type": "origin",
    "title": "形の 由来",
    "text": "火口の形と、火口から出る 煙の形を 組み合わせた 記号だよ。",
    "description": "火山で 噴火したり 蒸気などが 出たりする 場所を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-hunkakou-hunkikou.htm",
    "sourceTitle": "国土地理院「噴火口・噴気口」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "palm_forest",
    "type": "origin",
    "title": "形の 由来",
    "text": "ヤシの木を 横から見た 様子から できた形だよ。",
    "description": "ヤシの木や 大型のシダなどが 生えている 場所を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-yasikajurin.htm",
    "sourceTitle": "国土地理院「ヤシ科樹林」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "creeping_pine",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "ハイマツは、背が低い マツの仲間だよ。高い山で すきまなく 生える場所を 表すよ。",
    "description": "高い山に ハイマツが すきまなく 生えている ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-haimatuti.htm",
    "sourceTitle": "国土地理院「ハイマツ地」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "sasa_grass",
    "type": "observation",
    "title": "見分ける ヒント",
    "text": "竹林の記号と よく似ているよ。線の本数や 向きを、竹林のページと くらべてみよう。",
    "description": "笹や 篠竹が すきまなく 生えている ところ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-sasati.htm",
    "sourceTitle": "国土地理院「笹地」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "observation_origin_unconfirmed"
  },
  {
    "symbolId": "sand_gravel",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "「れき」は 小さな石や 岩のかけらのこと。砂や れきで おおわれた 場所を表すよ。",
    "description": "砂や 小さな石などで おおわれた 土地を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-sarekiti.htm",
    "sourceTitle": "国土地理院「砂れき地」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "wetland",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "水をふくんだ やわらかい土地で、湿地に育つ 植物が 生えている 場所を表すよ。",
    "description": "いつも 水をふくみ、やわらかく 湿った 土地を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-sitti.htm",
    "sourceTitle": "国土地理院「湿地」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "rock_cliff",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "岩でできた 急な斜面だよ。原則として 高さ5m以上などの 条件で 地図に表すよ。",
    "description": "岩でできた 急な斜面を 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-gangai.htm",
    "sourceTitle": "国土地理院「岩崖」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "rock_large",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "地表の 岩や岩石を 表すよ。なるべく 岩の形や 全体の様子が 分かるように 描くんだ。",
    "description": "地表に出ている 岩の形や 全体の様子を 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-iwadai.htm",
    "sourceTitle": "国土地理院「岩（大）」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "rock_small",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "小さな岩などが あるところを 表すよ。「岩（大）」の描き方と くらべてみよう。",
    "description": "地表に出ていたり 散らばっていたりする 岩を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-iwashou.htm",
    "sourceTitle": "国土地理院「岩（小）」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "depression_large",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "へこんだ土地だよ。等高線の 短いほうの幅が、地図で3mm以上のとき この描き方を 使うよ。",
    "description": "まわりより へこんだ地形を 等高線とともに 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-rikujounooutidai.htm",
    "sourceTitle": "国土地理院「凹地（大）」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "depression_small",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "へこんだ土地だよ。等高線の 短いほうの幅が、地図で3mm未満のとき この描き方を 使うよ。",
    "description": "まわりより へこんだ 小さな地形を 表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-rikujounooutishou.htm",
    "sourceTitle": "国土地理院「凹地（小）」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-11",
    "verificationStatus": "verified"
  }
];
  const entries = Object.freeze(app.MapSymbolSecrets.entries.concat(additions.map(entry => Object.freeze(entry))));
  const byId = new Map(entries.map(entry => [entry.symbolId, entry]));
  app.MapSymbolSecrets = Object.freeze({ entries, get: id => byId.get(id) || null });
})();
