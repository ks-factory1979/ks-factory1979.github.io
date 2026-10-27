(function () {
  "use strict";
  // Editorial data only. No network request is made by the game.
  const entries = [
  {
    "symbolId": "police_station",
    "type": "origin",
    "title": "形の 由来",
    "text": "警棒を 交差させた形だよ。交番とちがい、丸で かこまれているよ。",
    "description": "まちの安全を守る 警察署を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022keisatusho.htm",
    "sourceTitle": "国土地理院「警察署」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "fire_station",
    "type": "origin",
    "title": "形の 由来",
    "text": "昔、火を消すときに使った「さすまた」という道具の形だよ。",
    "description": "消防本部や 消防署を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-shoubousho.htm",
    "sourceTitle": "国土地理院「消防署」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "hospital",
    "type": "origin",
    "title": "形の 由来",
    "text": "昔の陸軍で、健康や手当てを受け持った「衛生隊」の印が もとだよ。",
    "description": "救急病院や 救急診療所を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-byouin.htm",
    "sourceTitle": "国土地理院「病院」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "post_office",
    "type": "origin",
    "title": "形の 由来",
    "text": "昔の「逓信省（ていしんしょう）」の「テ」を、丸で かこんだ形だよ。",
    "description": "郵便局や 簡易郵便局などを表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/common/000189126.pdf",
    "sourceTitle": "国土地理院「地図記号の由来」",
    "sourceSection": "PDF 1ページ 左の表「郵便局」",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "elementary_junior_high_school",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "漢字の「文」を表した形だよ。小学校と中学校で 同じ記号を使うよ。",
    "description": "小学校や 中学校、小中一貫校を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022shouchuugakkou.htm",
    "sourceTitle": "国土地理院「小・中学校」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "police_box",
    "type": "origin",
    "title": "形の 由来",
    "text": "警棒を 交差させた形だよ。警察署と見分けるため、丸で かこまないよ。",
    "description": "まちの 交番や 駐在所を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-kouban.htm",
    "sourceTitle": "国土地理院「交番」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "city_ward_office",
    "type": "observation",
    "title": "見分ける ヒント",
    "text": "丸の中に もう一つ丸があるね。町村役場の記号と、まん中を見くらべよう。",
    "description": "市役所や 東京都の区役所を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022siyakusho.htm",
    "sourceTitle": "国土地理院「市役所、特別区の区役所」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "observation_origin_unconfirmed"
  },
  {
    "symbolId": "town_village_ward_office",
    "type": "observation",
    "title": "見分ける ヒント",
    "text": "丸が 一つだけだね。市役所の二重丸と、線の数を 見くらべよう。",
    "description": "町村役場や 政令指定都市の区役所を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022machiyakuba.htm",
    "sourceTitle": "国土地理院「町村役場、政令指定都市群、市の区役所」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "observation_origin_unconfirmed"
  },
  {
    "symbolId": "library",
    "type": "origin",
    "title": "形の 由来",
    "text": "本を開いた様子を 表しているよ。まん中の折り目にも 注目しよう。",
    "description": "公立の図書館を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-toshokan.htm",
    "sourceTitle": "国土地理院「図書館」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "museum",
    "type": "origin",
    "title": "形の 由来",
    "text": "博物館や美術館の 建物をイメージした形だよ。",
    "description": "博物館や 美術館などを表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-hakubutukan.htm",
    "sourceTitle": "国土地理院「博物館」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "shrine",
    "type": "origin",
    "title": "形の 由来",
    "text": "神社の入口などに立つ「鳥居」の形だよ。",
    "description": "神社を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022jinjya.htm",
    "sourceTitle": "国土地理院「神社」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "temple",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "「卍」は「まんじ」と読む形だよ。お寺を表す記号なんだ。",
    "description": "お寺を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-jiin.htm",
    "sourceTitle": "国土地理院「寺院」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "elderly_home",
    "type": "origin",
    "title": "形の 由来",
    "text": "建物と つえの形だよ。小・中学生が考えたデザインを もとに作られたよ。",
    "description": "お年よりの生活を支える しせつを表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-roujinhoume.htm",
    "sourceTitle": "国土地理院「老人ホーム」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "high_school",
    "type": "meaning",
    "title": "記号の 意味",
    "text": "小・中学校と 見分けやすいように、学校の記号を 丸でかこんでいるよ。",
    "description": "高等学校や 中高一貫校を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-koutougakkou.htm",
    "sourceTitle": "国土地理院「高等学校」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "hot_spring",
    "type": "origin",
    "title": "形の 由来",
    "text": "お湯がわく場所の「湯つぼ」と、湯けむりを 組み合わせた形だよ。",
    "description": "温泉や 鉱泉のある場所を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-onsen.htm",
    "sourceTitle": "国土地理院「温泉」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "rice_field",
    "type": "origin",
    "title": "形の 由来",
    "text": "いねを かり取ったあとの形が もとだよ。",
    "description": "米や はすなどを育てる 土地を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-ta.htm",
    "sourceTitle": "国土地理院「田」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "field",
    "type": "origin",
    "title": "形の 由来",
    "text": "植物の「ふたば」の形が もとだよ。",
    "description": "野菜や 牧草などを育てる 土地を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-hatake.htm",
    "sourceTitle": "国土地理院「畑」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "tea_field",
    "type": "origin",
    "title": "形の 由来",
    "text": "お茶の実を 半分に切ったときに見える形が もとだよ。",
    "description": "お茶を育てる 土地を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-tyabatake.htm",
    "sourceTitle": "国土地理院「茶畑」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "orchard",
    "type": "origin",
    "title": "形の 由来",
    "text": "りんごや なしなどの実を、横から見た形が もとだよ。",
    "description": "くだものの木を育てる 土地を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-kajuen.htm",
    "sourceTitle": "国土地理院「果樹園」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  },
  {
    "symbolId": "castle_ruins",
    "type": "origin",
    "title": "形の 由来",
    "text": "お城を作るときに、建物などの位置を決める「縄ばり」の形が もとだよ。",
    "description": "昔の城の 建物や石垣などが残る場所を表すよ。",
    "sourceUrl": "https://www.gsi.go.jp/KIDS/map-sign-tizukigou-2022-siroato.htm",
    "sourceTitle": "国土地理院「城跡」",
    "sourceSection": "記号の説明本文・掲載記号図",
    "checkedAt": "2026-10-10",
    "verificationStatus": "verified"
  }
].map(entry => Object.freeze(entry));
  const byId = new Map(entries.map(entry => [entry.symbolId, entry]));
  MapSymbolNinja.MapSymbolSecrets = Object.freeze({ entries: Object.freeze(entries), get: id => byId.get(id) || null });
})();
