window.HKB_CONFIG = Object.freeze({
  appVersion: '1.3.0',
  gasWebAppUrl: 'https://script.google.com/a/macros/oskedu.jp/s/AKfycbwrbwJTPlTbYlmHro4WWW7GQGZB1y3Sat6gM-p7kIiKKmbR5oe-sddqJIsJxpbLt2YT/exec'
});

    /* ================================================================
       せんせい用 かんたん設定（数値を変えると調整できます）
       ================================================================ */
    window.APP_CONFIG = Object.freeze({
      APP_VERSION: '1.3.0',
      RULES_VERSION: 'lion-rules-3',
      MATCH_SECONDS: 60,
      COUNTDOWN_SECONDS: 3,
      WRONG_LOCK_SECONDS: 1,
      BURST_SECONDS: 5,
      BASE_PULL_POWER: 4.2,
      DRAW_RANGE: 2.5,
      TWO_PLAYER_DRAW_RANGE: 5,
      SIMULTANEOUS_WINDOW_MS: 80,
      HOLD_SECONDS: 1,
      MAX_ANSWER_DIGITS: 3,
      REDUCED_MOTION: false,
      SPECIAL: {
        boySeconds: 4,
        girlSeconds: 6,
        dustSeconds: 2.5,
        rabbitSeconds: 2.2,
        turtleSeconds: 3,
        turtleBlocks: 2,
        lionSeconds: 3,
        lionPower: 1.6,
        lionDefenseFactor: 0.65
      },
      CPU: {
        mole:   { averageSeconds: 3.0, accuracy: 0.95, jitterSeconds: 0.35 },
        rabbit: { averageSeconds: 1.8, accuracy: 0.80, burstMin: 2, burstMax: 4, restMin: 1.0, restMax: 3.0 },
        turtle: { startSeconds: 4.0, last20Seconds: 2.0, accuracy: 0.92, jitterSeconds: 0.35 },
        lion: {
          accuracy: 0.985,
          jitterSeconds: 0.12,
          minSeconds: 0.68,
          courseSeconds: {
            add_no_carry:1.35, add_carry:1.45, add_mix:1.40,
            sub_no_borrow:1.40, sub_borrow:1.55, sub_mix:1.50,
            mul_1:1.12, mul_2:1.30, mul_3:1.35, mul_4:1.40, mul_5:1.35,
            mul_6:1.42, mul_7:1.44, mul_8:1.44, mul_9:1.42, mul_mix:1.44,
            div_exact:1.55, div_remainder:1.80, div_mix:1.70,
            all_mix:1.60, all_challenge:1.72
          }
        }
      }
    });
