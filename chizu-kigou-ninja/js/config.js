(function () {
  "use strict";

  // 教員・開発者が調整しやすいよう、ゲームバランス値をここへ集約しています。
  window.NINJA_CONFIG = Object.freeze({
    // 基準画面サイズ（横画面）
    WIDTH: 1366,
    HEIGHT: 768,

    // 1回の修行時間（秒）。30 / 45 / 60 などへ変更できます。
    GAME_TIME: 60,

    // 公開用。URLのdev指定でも開発画面・調整値を有効にしない。
    DEV_PANEL_ENABLED: false,

    // 会心は正解札の中心付近を一定以上の速度で斬った時の演出のみ。
    CRITICAL_ENABLED: true,
    CRITICAL_CENTER_RATIO: 0.23, // 札の短辺に対する中心からの許容距離
    CRITICAL_MIN_SPEED: 0.95, // ゲーム座標 px/ms、既存の平滑化速度
    // 文字を読む静止時間を確保。素材は文字の後ろで半透明に表示します。
    HIT_LABEL_CRITICAL: Object.freeze({ entryMs: 100, holdMs: 320, exitMs: 300,
      width: 244, height: 244, alpha: 0.51 }),
    HIT_LABEL_ISSEN: Object.freeze({ entryMs: 140, holdMs: 460, exitMs: 400,
      width: 438, height: 146, alpha: 0.56 }),
    // 特別な一撃の表示だけを制限。得点・当たり判定・時間には影響しません。
    SPECIAL_PRESENTATION: Object.freeze({ maxCritical: 2, maxIssen: 1,
      maxLabels: 3, maxRings: 4, entryDistance: 65, exitDistance: 32 }),
    CRITICAL_TEXT_DURATION_MS: 750,
    CRITICAL_GLOW_BONUS: 0.16,
    CRITICAL_SPARK_BONUS: 3,

    // ZONEは通常の得点と別管理。開発パネルで安全範囲内を調整できます。
    ZONE_REQUIRED_POINTS: 20,
    ZONE_DURATION_MS: 7000,
    ZONE_MAX_ACTIVE_CARDS: 9,
    ZONE_CARD_SPEED_SCALE: 0.88,
    ZONE_SPAWN_INTERVAL_SCALE: 0.65,
    ZONE_ISSEN_CHANCE: 0.70,
    ZONE_HIT_STOP_MS: 40,
    ZONE_ENTER_MS: 540,
    ZONE_RECOVERY_MS: 250,
    ZONE_SPAWN_CUTOFF_MS: 500,
    // 終了1.25秒前に中央へ締めの札を1枚。既存の同時表示上限を守る。
    ZONE_FINISHER_LEAD_MS: 1250,
    // 最後の1.5秒は、斬った回数に応じて背景と筆痕の余韻が少し育つ。
    ZONE_END_BUILDUP_START_MS: 1500,
    // ZONE一閃は世界の光だけを一拍沈めてから解放。ゲーム時計と音は止めない。
    ZONE_ISSEN_RELEASE_MS: 42,

    // ZONEの世界演出だけの設定。札・入力・得点・ZONE時間には影響しません。
    ZONE_WORLD: Object.freeze({
      auraAlpha: 0.28,        // 画面端の常時透明度
      auraPulseAlpha: 0.06,   // 呼吸で足す透明度
      auraPeriodMs: 1900,    // 呼吸の一周期
      auraScaleBonus: 0.015, // 呼吸で少し拡大
      linesAlpha: 0.16,      // 背景流線の透明度
      linesDriftPxPerSec: 23, // 流線の最大移動速度。端では滑らかに折り返す
      endAuraBonus: 0.08,   // 終盤の画面端だけの高まり
      endLinesBonus: 0.06   // 終盤の流線の高まり
    }),

    // お題を中央で読む時間。この間は残り60秒を減らしません。
    TARGET_NOTICE_MS: 650,
    // 1つのお題を実際にプレイする時間（通知時間を含まない）。
    TARGET_ACTIVE_MS: 10000,
    // お題終了時、まだ飛んでいる札を斬れるように待つ最大時間。
    TARGET_DRAIN_MAX_MS: 1200,
    // 残札処理後、次のお題までの短い余韻。
    TARGET_TRANSITION_GAP_MS: 200,
    // お題終了直前は新しい札を出さない（終了の850ms前）。
    TARGET_SPAWN_CUTOFF_MS: 850,

    // 各ウェーブの位置はお題時間に対する割合。札数は1セットあたり。
    WAVES: Object.freeze([
      Object.freeze({ start: 0.00, end: 0.25, minCards: 1, maxCards: 2 }), // 見る
      Object.freeze({ start: 0.25, end: 0.50, minCards: 2, maxCards: 3 }), // 見分ける
      Object.freeze({ start: 0.50, end: 0.75, minCards: 2, maxCards: 3 }), // 変化
      Object.freeze({ start: 0.75, end: 1.00, minCards: 3, maxCards: 4 })  // 一閃を狙う
    ]),
    // 最後のウェーブで、複数正解を一本で狙いやすくする割合。
    CLIMAX_ISSEN_CHANCE: 0.45,

    // v0.1.4の等間隔Spawn設定の記録値。v0.1.5のWaveでは使いません。
    SPAWN_INTERVAL_MIN: 390,
    SPAWN_INTERVAL_MAX: 650,

    // 同時に画面内へ出す地図記号の最大数
    MAX_ACTIVE_OBJECTS: 6,

    // 地図記号の札の基準サイズ（px）
    SYMBOL_BASE_SIZE: 138,

    // 正誤に無関係な札ごとの色。falseで従来の和紙札へ戻せます。
    CARD_COLOR_ENABLED: true,
    // 命中の光から飛沫が出るまでの間。筆跡はその直後の余韻として描く。
    COLOR_SPLASH_DELAY_MS: 58,
    COLOR_BRUSH_DELAY_MS: 82,
    // 色飛沫の運動だけを調整。push / travel はゲーム座標px、時間はms。
    // burstMs内で主飛沫を広げ、残り時間ですぐに消す。学習・切断判定には影響しません。
    SPLASH_BURST: Object.freeze({
      normal: Object.freeze({ push: 38, expand: 1.26, burstMs: 125, lifeMs: 220,
        drops: 5, travelMin: 80, travelMax: 108, fanDeg: 30, dropMs: 190 }),
      critical: Object.freeze({ push: 44, expand: 1.22, burstMs: 118, lifeMs: 210,
        drops: 5, travelMin: 90, travelMax: 120, fanDeg: 28, dropMs: 185 }),
      issen: Object.freeze({ push: 56, expand: 1.31, burstMs: 145, lifeMs: 260,
        drops: 8, travelMin: 110, travelMax: 145, fanDeg: 35, dropMs: 225 }),
      zone_normal: Object.freeze({ push: 52, expand: 1.31, burstMs: 140, lifeMs: 255,
        drops: 8, travelMin: 108, travelMax: 142, fanDeg: 36, dropMs: 220 }),
      zone_issen: Object.freeze({ push: 74, expand: 1.40, burstMs: 155, lifeMs: 295,
        drops: 13, travelMin: 135, travelMax: 178, fanDeg: 44, dropMs: 245 })
    }),
    // 爆散する二層飛沫。omniは全方位サブ粒で、それ以外は刀の方向を中心に飛びます。
    // 速度はゲーム座標px/秒、重力はpx/秒²。学習・正誤・得点には影響しません。
    SPLASH_LAYERS: Object.freeze({
      normal: Object.freeze({ heavyCount: 10, mistCount: 16, heavyOmni: 1, mistOmni: 0,
        heavySpeed: [300, 480], mistSpeed: [150, 320], heavyGravity: 620, mistGravity: 135,
        heavyFanDeg: 32, mistFanDeg: 57,
        heavyLifeMs: 305, mistLifeMs: 255 }),
      critical: Object.freeze({ heavyCount: 10, mistCount: 17, heavyOmni: 2, mistOmni: 1,
        heavySpeed: [350, 520], mistSpeed: [180, 350], heavyGravity: 650, mistGravity: 125,
        heavyFanDeg: 28, mistFanDeg: 48,
        heavyLifeMs: 290, mistLifeMs: 245 }),
      issen: Object.freeze({ heavyCount: 14, mistCount: 24, heavyOmni: 3, mistOmni: 1,
        heavySpeed: [400, 620], mistSpeed: [220, 430], heavyGravity: 675, mistGravity: 145,
        heavyFanDeg: 38, mistFanDeg: 62,
        heavyLifeMs: 340, mistLifeMs: 285 }),
      zone_normal: Object.freeze({ heavyCount: 16, mistCount: 28, heavyOmni: 4, mistOmni: 2,
        heavySpeed: [420, 650], mistSpeed: [240, 460], heavyGravity: 700, mistGravity: 150,
        heavyFanDeg: 40, mistFanDeg: 66,
        heavyLifeMs: 345, mistLifeMs: 300 }),
      zone_issen: Object.freeze({ heavyCount: 40, mistCount: 64, heavyOmni: 18, mistOmni: 28,
        heavySpeed: [550, 900], mistSpeed: [300, 720], heavyGravity: 760, mistGravity: 170,
        heavyFanDeg: 44, mistFanDeg: 72,
        heavyLifeMs: 610, mistLifeMs: 520 })
    }),
    // 演出確認専用。通常プレイは上の標準値を使う。前版と参考版級を同条件で比較できる。
    ZONE_ISSEN_PRESETS: Object.freeze({
      previous: Object.freeze({ heavyCount: 22, mistCount: 40, heavyOmni: 6, mistOmni: 3,
        heavySpeed: [480, 760], mistSpeed: [280, 560], heavyGravity: 760, mistGravity: 170,
        heavyFanDeg: 44, mistFanDeg: 72, heavyLifeMs: 380, mistLifeMs: 330 }),
      reference: Object.freeze({ heavyCount: 50, mistCount: 70, heavyOmni: 24, mistOmni: 34,
        heavySpeed: [550, 950], mistSpeed: [320, 800], heavyGravity: 760, mistGravity: 170,
        heavyFanDeg: 44, mistFanDeg: 72, heavyLifeMs: 610, mistLifeMs: 520 })
    }),
    // ZONE一閃は58ms後の飛沫開始を基準に、0・30・65msの三波で広げる。
    ZONE_ISSEN_WAVE_DELAYS_MS: Object.freeze([0, 30, 65]),
    ZONE_ISSEN_MULTI_SCALES: Object.freeze([1, 0.55, 0.40, 0.30]),
    ZONE_ISSEN_FINISHER_EXTRA: Object.freeze({ heavy: 3, mist: 4 }),
    // 一閃の2枚目以降は札色を残しつつ、粒数を抑えます。衝撃の付加演出は一本で一度だけ。
    MULTI_HIT_SPLASH_SCALE: 0.62,
    // Camera Shakeはスワイプ終了後、最後のHitの飛沫初動と重ねて一回だけ発動。
    IMPACT_SHAKE: Object.freeze({
      normal: Object.freeze({ duration: 42, intensity: 0.0008 }),
      critical: Object.freeze({ duration: 54, intensity: 0.0013 }),
      issen: Object.freeze({ duration: 68, intensity: 0.0020 }),
      zone_normal: Object.freeze({ duration: 58, intensity: 0.0016 }),
      zone_issen: Object.freeze({ duration: 96, intensity: 0.0034 }),
      finisher: Object.freeze({ duration: 108, intensity: 0.0038 })
    }),
    // 爆散の後に見せるリングと放射線。0は描かない。別Graphicsを無制限に作らない。
    IMPACT_STREAKS: Object.freeze({ normal: 1, critical: 3, issen: 5,
      zone_normal: 5, zone_issen: 11, finisher: 12 }),
    IMPACT_RINGS: Object.freeze({ normal: 0, critical: 1, issen: 1,
      zone_normal: 1, zone_issen: 2, finisher: 2 }),
    MAX_IMPACT_BURSTS: 9,
    // 多札一閃でも古い粒から破棄し、Chromebookの入力追従を守ります。
    MAX_SPLASH_DROPLETS: 76,
    MAX_COLOR_MIST_PARTICLES: 132,

    // 放物線運動の重力と初速（基準解像度上の px / 秒）
    GRAVITY: 820,
    LAUNCH_VELOCITY_X_MIN: 90,
    LAUNCH_VELOCITY_X_MAX: 330,
    LAUNCH_VELOCITY_Y_MIN: 790,
    LAUNCH_VELOCITY_Y_MAX: 960,

    // 刀筋が消えるまでの時間（ミリ秒）
    SLASH_FADE_TIME: 210,

    // スワイプ速度は演出専用。ゲーム座標px/msの直近55msを平滑化して使います。
    SPEED_SAMPLE_WINDOW_MS: 55,
    SPEED_SMOOTHING: 0.35,
    SPEED_VISUAL_MIN: 0.35,
    SPEED_VISUAL_MAX: 2.2,

    // 高速でも刀筋は最大20％増、残光は最大60ms追加（合計270ms）。
    SLASH_WIDTH_SPEED_BONUS: 0.20,
    SLASH_GLOW_SPEED_BONUS: 0.18,
    SLASH_TRAIL_SPEED_BONUS_MS: 60,

    // 次の正解までに空くとコンボが切れる時間（ミリ秒）
    COMBO_TIMEOUT: 3200,

    // 誤斬り時の記号名表示時間（ミリ秒）
    WRONG_FEEDBACK_TIME: 700,

    // v0.1.4の正解待機上限の記録値。現在は各Waveで正解を保証します。
    CORRECT_GUARANTEE_MS: 1550,

    // Wave内の追加札で正解を選ぶ確率（0〜1）。
    CORRECT_SPAWN_RATE: 0.38,

    // 1正解の基本点
    SCORE_PER_CORRECT: 100,

    // 正解命中時の共通エフェクト（短く、局所的に表示）
    HIT_FLASH_MS: 85,
    HIT_RING_MS: 210,
    HIT_SPARK_COUNT: 8,
    HIT_RING_RADIUS_STAGE_1: 41,
    HIT_RING_RADIUS_STAGE_2: 44,
    HIT_RING_RADIUS_STAGE_3: 47,
    HIT_RING_RADIUS_STAGE_4: 52,
    HIT_SPARK_MAX: 12,
    // 速度による追加火花はコンボ分に足して最大4本。最終本数は16本まで。
    HIT_SPARK_SPEED_BONUS_MAX: 4,
    MAX_HIT_SPARKS: 16,
    HIT_SPARK_VELOCITY_BONUS: 0.12,
    HIT_FLASH_SPEED_BONUS: 0.12,
    MAX_IMPACT_OBJECTS: 72,

    // 正解命中時のヒットストップ。同じ一閃では足し算せず最大50msまで。
    NORMAL_HIT_STOP_MS: 35,
    MULTI_HIT_STOP_STEP_MS: 5,
    MAX_HIT_STOP_MS: 50,

    // 実切断線と同じ位置・角度に重ねる青白い切断面発光
    CUT_GLOW_DURATION_MS: 110,
    CUT_GLOW_OUTER_WIDTH: 12,
    CUT_GLOW_MIDDLE_WIDTH: 6,
    CUT_GLOW_CORE_WIDTH: 2.5,
    // 描画した筆痕は各種205～465msで消し、同時12本まで。
    SLASH_TRACE_MAX_ACTIVE: 12,

    // 任意角度切断片の分離・回転
    CUT_SEPARATION_FORCE: 78,
    CUT_ROTATION_MIN: 10,
    CUT_ROTATION_MAX: 18,

    // 10コンボ・4枚以上の一閃だけに使う、ごく小さい画面振動
    SCREEN_SHAKE_DURATION: 65,
    SCREEN_SHAKE_INTENSITY: 0.0015,

    // 開発用表示。完成版では false のままにしてください。
    DEBUG_MODE: false
  });
})();
