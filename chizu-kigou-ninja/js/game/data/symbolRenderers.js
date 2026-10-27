(function () {
  "use strict";

  window.MapSymbolNinja = window.MapSymbolNinja || {};

  const VIEWBOX_SIZE = 100;
  const STROKE_COLOR = "#111111";
  const STROKE_WIDTH = 7;

  function withSymbolContext(context, x, y, size, lineCap, lineJoin, draw) {
    context.save();
    context.translate(x, y);
    context.scale(size / VIEWBOX_SIZE, size / VIEWBOX_SIZE);
    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.strokeStyle = STROKE_COLOR;
    context.lineWidth = STROKE_WIDTH;
    context.lineCap = lineCap;
    context.lineJoin = lineJoin;
    context.miterLimit = 10;
    try {
      draw(context);
    } finally {
      context.restore();
    }
  }

  // 100×100の正規化座標。assets/symbols/*.svg と同じ線形をCanvasへ移植しています。
  const renderers = {
    police(context, x, y, size) {
      withSymbolContext(context, x, y, size, "round", "round", (ctx) => {
        ctx.beginPath();
        ctx.arc(50, 50, 40, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(29, 25);
        ctx.lineTo(71, 75);
        ctx.moveTo(71, 25);
        ctx.lineTo(29, 75);
        ctx.stroke();
      });
    },

    fire_station(context, x, y, size) {
      withSymbolContext(context, x, y, size, "square", "round", (ctx) => {
        ctx.beginPath();
        ctx.moveTo(27, 16);
        ctx.lineTo(27, 34);
        ctx.bezierCurveTo(27, 49, 37, 59, 50, 59);
        ctx.bezierCurveTo(63, 59, 73, 49, 73, 34);
        ctx.lineTo(73, 16);
        ctx.moveTo(50, 59);
        ctx.lineTo(50, 88);
        ctx.stroke();
      });
    },

    hospital(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.beginPath();
        ctx.moveTo(18, 15);
        ctx.lineTo(82, 15);
        ctx.lineTo(82, 65);
        ctx.lineTo(50, 88);
        ctx.lineTo(18, 65);
        ctx.closePath();
        ctx.stroke();

        ctx.lineCap = "square";
        ctx.beginPath();
        ctx.moveTo(50, 30);
        ctx.lineTo(50, 67);
        ctx.moveTo(32, 48.5);
        ctx.lineTo(68, 48.5);
        ctx.stroke();
      });
    },

    post_office(context, x, y, size) {
      withSymbolContext(context, x, y, size, "square", "miter", (ctx) => {
        ctx.beginPath();
        ctx.arc(50, 50, 40, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(27, 31);
        ctx.lineTo(73, 31);
        ctx.moveTo(34, 44);
        ctx.lineTo(66, 44);
        ctx.moveTo(50, 44);
        ctx.lineTo(50, 72);
        ctx.stroke();
      });
    },

    school(context, x, y, size) {
      withSymbolContext(context, x, y, size, "square", "round", (ctx) => {
        ctx.beginPath();
        ctx.moveTo(43, 14);
        ctx.lineTo(57, 25);
        ctx.moveTo(17, 34);
        ctx.lineTo(83, 34);
        ctx.moveTo(36, 43);
        ctx.bezierCurveTo(42, 59, 56, 75, 82, 86);
        ctx.moveTo(67, 42);
        ctx.bezierCurveTo(59, 62, 44, 77, 18, 87);
        ctx.stroke();
      });
    },

    // 追加15種: 国土地理院 000236865.pdf の図形パスを100×100へ正規化。
    // subpathの向きも保持し、nonzero塗りで白抜きに札の背景を透過させる。
    police_box(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(78.9573, 14.3161);
        ctx.lineTo(72.6242, 10);
        ctx.lineTo(50.0013, 43.1958);
        ctx.lineTo(27.3767, 10);
        ctx.lineTo(21.0427, 14.3161);
        ctx.lineTo(45.3626, 49.9998);
        ctx.lineTo(21.0427, 85.6839);
        ctx.lineTo(27.3767, 90);
        ctx.lineTo(50.0013, 56.8042);
        ctx.lineTo(72.6242, 90);
        ctx.lineTo(78.9573, 85.6839);
        ctx.lineTo(54.6379, 49.9998);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    city_ward_office(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(49.9993, 16.0994);
        ctx.bezierCurveTo(31.307, 16.0994, 16.1001, 31.3072, 16.1001, 50);
        ctx.bezierCurveTo(16.1001, 68.6928, 31.307, 83.9003, 49.9993, 83.9003);
        ctx.bezierCurveTo(68.6922, 83.9003, 83.8999, 68.6928, 83.8999, 50);
        ctx.bezierCurveTo(83.8999, 31.3072, 68.6922, 16.0994, 49.9993, 16.0994);
        ctx.closePath();
        ctx.moveTo(49.9993, 90);
        ctx.bezierCurveTo(27.9437, 90, 10.0007, 72.0562, 10.0007, 50);
        ctx.bezierCurveTo(10.0007, 27.9436, 27.9437, 10, 49.9993, 10);
        ctx.bezierCurveTo(72.0558, 10, 89.9993, 27.9436, 89.9993, 50);
        ctx.bezierCurveTo(89.9993, 72.0562, 72.0558, 90, 49.9993, 90);
        ctx.closePath();
        ctx.moveTo(49.9993, 26.2704);
        ctx.bezierCurveTo(36.9155, 26.2704, 26.2712, 36.9155, 26.2712, 49.9999);
        ctx.bezierCurveTo(26.2712, 63.0843, 36.9155, 73.7293, 49.9993, 73.7293);
        ctx.bezierCurveTo(63.084, 73.7293, 73.7288, 63.0843, 73.7288, 49.9999);
        ctx.bezierCurveTo(73.7288, 36.9155, 63.084, 26.2704, 49.9993, 26.2704);
        ctx.closePath();
        ctx.moveTo(49.9993, 77.1178);
        ctx.bezierCurveTo(35.0472, 77.1178, 22.8825, 64.9526, 22.8825, 49.9999);
        ctx.bezierCurveTo(22.8825, 35.0469, 35.0472, 22.8819, 49.9993, 22.8819);
        ctx.bezierCurveTo(64.952, 22.8819, 77.1173, 35.0469, 77.1173, 49.9999);
        ctx.bezierCurveTo(77.1173, 64.9526, 64.952, 77.1178, 49.9993, 77.1178);
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    town_village_ward_office(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(49.9994, 16.0994);
        ctx.bezierCurveTo(31.3069, 16.0994, 16.1, 31.3072, 16.1, 50);
        ctx.bezierCurveTo(16.1, 68.6931, 31.3069, 83.9006, 49.9994, 83.9006);
        ctx.bezierCurveTo(68.6921, 83.9006, 83.9, 68.6931, 83.9, 50);
        ctx.bezierCurveTo(83.9, 31.3072, 68.6921, 16.0994, 49.9994, 16.0994);
        ctx.closePath();
        ctx.moveTo(49.9994, 90);
        ctx.bezierCurveTo(27.9435, 90, 10.0006, 72.0565, 10.0006, 50);
        ctx.bezierCurveTo(10.0006, 27.9435, 27.9435, 10, 49.9994, 10);
        ctx.bezierCurveTo(72.0556, 10, 89.9994, 27.9435, 89.9994, 50);
        ctx.bezierCurveTo(89.9994, 72.0565, 72.0556, 90, 49.9994, 90);
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    library(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(77.736, 59.8807);
        ctx.bezierCurveTo(69.1349, 59.8807, 63.8568, 63.5616, 60.9472, 66.6217);
        ctx.lineTo(49.0366, 27.4163);
        ctx.bezierCurveTo(50.3102, 25.4416, 54.7009, 19.9598, 64.216, 19.9598);
        ctx.bezierCurveTo(66.7353, 19.9598, 69.4599, 20.3463, 72.3327, 21.1089);
        ctx.lineTo(84.3162, 60.5556);
        ctx.bezierCurveTo(82.0341, 60.1074, 79.8327, 59.8807, 77.736, 59.8807);
        ctx.closePath();
        ctx.moveTo(26.5637, 77.2609);
        ctx.lineTo(14.6727, 38.1163);
        ctx.bezierCurveTo(16.1954, 35.7382, 22.1058, 28.2394, 36.0478, 28.2394);
        ctx.bezierCurveTo(38.7829, 28.2394, 41.7149, 28.5481, 44.7651, 29.1237);
        ctx.lineTo(56.7951, 68.721);
        ctx.bezierCurveTo(54.2953, 68.3525, 51.8732, 68.1616, 49.5662, 68.1616);
        ctx.bezierCurveTo(37.1363, 68.1616, 30.0852, 73.3863, 26.5637, 77.2609);
        ctx.closePath();
        ctx.moveTo(89.7672, 62.7369);
        ctx.lineTo(76.352, 18.578);
        ctx.bezierCurveTo(76.1282, 17.842, 75.5493, 17.267, 74.8129, 17.0477);
        ctx.bezierCurveTo(71.0844, 15.9396, 67.5197, 15.378, 64.216, 15.378);
        ctx.bezierCurveTo(53.0633, 15.378, 47.4765, 21.5763, 45.4288, 24.5704);
        ctx.bezierCurveTo(42.1609, 23.965, 39.0128, 23.6577, 36.0478, 23.6577);
        ctx.bezierCurveTo(16.7189, 23.6577, 10.3893, 36.2985, 10.1297, 36.8367);
        ctx.bezierCurveTo(9.8793, 37.355, 9.8332, 37.9476, 10, 38.4989);
        ctx.lineTo(23.52, 83.0029);
        ctx.bezierCurveTo(23.7928, 83.9007, 24.5893, 84.5362, 25.5242, 84.6136);
        ctx.bezierCurveTo(25.5885, 84.6188, 25.651, 84.622, 25.7137, 84.622);
        ctx.bezierCurveTo(26.5788, 84.622, 27.3795, 84.1283, 27.7688, 83.3445);
        ctx.bezierCurveTo(27.9849, 82.912, 33.2272, 72.7434, 49.5662, 72.7434);
        ctx.bezierCurveTo(52.6935, 72.7434, 56.0686, 73.1238, 59.5974, 73.8752);
        ctx.bezierCurveTo(59.6688, 73.8902, 59.7373, 73.8752, 59.809, 73.8835);
        ctx.bezierCurveTo(59.8987, 73.8941, 59.9819, 73.9261, 60.0732, 73.9261);
        ctx.bezierCurveTo(60.1295, 73.9261, 60.1865, 73.9043, 60.2444, 73.9008);
        ctx.bezierCurveTo(60.337, 73.8935, 60.425, 73.8778, 60.5159, 73.8598);
        ctx.bezierCurveTo(60.5905, 73.8448, 60.6651, 73.8493, 60.7397, 73.8262);
        ctx.bezierCurveTo(60.8425, 73.7948, 60.9366, 73.7481, 61.032, 73.7039);
        ctx.bezierCurveTo(61.0557, 73.6934, 61.0797, 73.686, 61.1034, 73.6748);
        ctx.bezierCurveTo(61.3077, 73.572, 61.4883, 73.4391, 61.648, 73.2864);
        ctx.bezierCurveTo(61.6762, 73.2586, 61.7031, 73.232, 61.73, 73.2029);
        ctx.bezierCurveTo(61.8853, 73.038, 62.0194, 72.8561, 62.1193, 72.6548);
        ctx.bezierCurveTo(62.1254, 72.6436, 62.134, 72.6368, 62.1404, 72.6256);
        ctx.bezierCurveTo(62.1788, 72.5443, 66.1908, 64.4625, 77.736, 64.4625);
        ctx.bezierCurveTo(80.5979, 64.4625, 83.7226, 64.9604, 87.026, 65.9426);
        ctx.bezierCurveTo(87.2406, 66.006, 87.4615, 66.0371, 87.6792, 66.0371);
        ctx.bezierCurveTo(87.6897, 66.0358, 87.7003, 66.0364, 87.7089, 66.0371);
        ctx.bezierCurveTo(88.9752, 66.0371, 90, 65.0119, 90, 63.7463);
        ctx.bezierCurveTo(90, 63.3839, 89.9164, 63.0417, 89.7672, 62.7369);
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    museum(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(49.5086, 23.0737);
        ctx.lineTo(69.8887, 37.6491);
        ctx.lineTo(29.241, 37.6491);
        ctx.closePath();
        ctx.closePath();
        ctx.moveTo(90, 43.8038);
        ctx.lineTo(90, 37.6491);
        ctx.lineTo(80.4688, 37.6491);
        ctx.lineTo(49.4996, 15.5003);
        ctx.lineTo(18.7244, 37.6319);
        ctx.lineTo(18.7362, 37.6491);
        ctx.lineTo(10, 37.6491);
        ctx.lineTo(10, 43.8038);
        ctx.lineTo(14.0692, 43.8038);
        ctx.lineTo(14.0692, 78.3449);
        ctx.lineTo(10, 78.3449);
        ctx.lineTo(10, 84.4997);
        ctx.lineTo(90, 84.4997);
        ctx.lineTo(90, 78.3449);
        ctx.lineTo(85.9308, 78.3449);
        ctx.lineTo(85.9308, 43.8038);
        ctx.closePath();
        ctx.closePath();
        ctx.moveTo(79.776, 78.3449);
        ctx.lineTo(63.6978, 78.3449);
        ctx.lineTo(63.6978, 43.8038);
        ctx.lineTo(79.776, 43.8038);
        ctx.closePath();
        ctx.closePath();
        ctx.moveTo(20.224, 43.8038);
        ctx.lineTo(36.3022, 43.8038);
        ctx.lineTo(36.3022, 78.3449);
        ctx.lineTo(20.224, 78.3449);
        ctx.closePath();
        ctx.closePath();
        ctx.moveTo(57.543, 78.3449);
        ctx.lineTo(42.4566, 78.3449);
        ctx.lineTo(42.4566, 43.8038);
        ctx.lineTo(57.543, 43.8038);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    shrine(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(90, 15.1561);
        ctx.lineTo(10, 15.1561);
        ctx.lineTo(10, 23.5455);
        ctx.lineTo(18.9627, 23.5455);
        ctx.lineTo(18.9627, 84.8439);
        ctx.lineTo(27.3521, 84.8439);
        ctx.lineTo(27.3521, 45.9463);
        ctx.lineTo(72.6492, 45.9463);
        ctx.lineTo(72.6492, 84.8439);
        ctx.lineTo(81.0387, 84.8439);
        ctx.lineTo(81.0387, 23.5455);
        ctx.lineTo(90, 23.5455);
        ctx.closePath();
        ctx.closePath();
        ctx.moveTo(72.6492, 37.5569);
        ctx.lineTo(27.3521, 37.5569);
        ctx.lineTo(27.3521, 23.5455);
        ctx.lineTo(72.6492, 23.5455);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    temple(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(56.6744, 81.3093);
        ctx.lineTo(56.6744, 51.967);
        ctx.lineTo(89.9513, 51.967);
        ctx.lineTo(89.9513, 10.0023);
        ctx.lineTo(81.3093, 10.0023);
        ctx.lineTo(81.3093, 43.3256);
        ctx.lineTo(56.6744, 43.3256);
        ctx.lineTo(56.6744, 10.0487);
        ctx.lineTo(10, 10.0487);
        ctx.lineTo(10, 18.6907);
        ctx.lineTo(48.033, 18.6907);
        ctx.lineTo(48.033, 43.3256);
        ctx.lineTo(10.0493, 43.3256);
        ctx.lineTo(10.0493, 89.9977);
        ctx.lineTo(18.6907, 89.9977);
        ctx.lineTo(18.6907, 51.967);
        ctx.lineTo(48.033, 51.967);
        ctx.lineTo(48.033, 89.9513);
        ctx.lineTo(90, 89.9513);
        ctx.lineTo(90, 81.3093);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    elderly_home(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(26.8696, 39.0879);
        ctx.lineTo(50.3457, 19.2052);
        ctx.lineTo(74.2749, 40.1436);
        ctx.lineTo(74.2749, 82.6118);
        ctx.lineTo(61.0857, 82.6118);
        ctx.lineTo(61.0857, 50.4115);
        ctx.bezierCurveTo(61.0184, 46.0067, 58.616, 37.6144, 50.0048, 37.3761);
        ctx.bezierCurveTo(49.9327, 37.3735, 49.8591, 37.3747, 49.787, 37.3784);
        ctx.bezierCurveTo(46.4609, 37.5423, 40.1715, 40.4313, 40.1715, 50.1925);
        ctx.lineTo(40.1715, 55.6319);
        ctx.bezierCurveTo(40.1715, 57.202, 41.4446, 58.4751, 43.0147, 58.4751);
        ctx.bezierCurveTo(44.5848, 58.4751, 45.8576, 57.202, 45.8576, 55.6319);
        ctx.lineTo(45.8576, 50.1925);
        ctx.bezierCurveTo(45.8576, 43.9767, 49.1804, 43.1671, 49.9926, 43.066);
        ctx.bezierCurveTo(55.081, 43.327, 55.3821, 49.7688, 55.3995, 50.4546);
        ctx.lineTo(55.3995, 82.6118);
        ctx.lineTo(26.8696, 82.6118);
        ctx.closePath();
        ctx.closePath();
        ctx.moveTo(79.9611, 45.1197);
        ctx.lineTo(86.2561, 50.6275);
        ctx.lineTo(90, 46.3475);
        ctx.lineTo(50.4067, 11.7021);
        ctx.lineTo(10, 45.9241);
        ctx.lineTo(13.6744, 50.2635);
        ctx.lineTo(21.1835, 43.9042);
        ctx.lineTo(21.1835, 82.6118);
        ctx.lineTo(10.6583, 82.6118);
        ctx.lineTo(10.6583, 88.2979);
        ctx.lineTo(89.7023, 88.2979);
        ctx.lineTo(89.7023, 82.6118);
        ctx.lineTo(79.9611, 82.6118);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    high_school(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(10, 49.9998);
        ctx.lineTo(10.494, 46.0494);
        ctx.lineTo(10.9875, 42.0985);
        ctx.lineTo(11.9754, 38.1476);
        ctx.lineTo(13.4569, 34.6912);
        ctx.lineTo(14.9383, 31.2343);
        ctx.lineTo(16.9138, 27.7779);
        ctx.lineTo(19.3827, 24.8146);
        ctx.lineTo(21.8516, 21.8516);
        ctx.lineTo(24.815, 19.3827);
        ctx.lineTo(27.7779, 16.9133);
        ctx.lineTo(30.7408, 14.9383);
        ctx.lineTo(34.1977, 13.4564);
        ctx.lineTo(38.1481, 11.975);
        ctx.lineTo(42.0985, 10.9875);
        ctx.lineTo(46.0494, 10.494);
        ctx.lineTo(49.9998, 10);
        ctx.lineTo(53.9506, 10);
        ctx.lineTo(57.901, 10.9875);
        ctx.lineTo(61.8519, 11.975);
        ctx.lineTo(65.3088, 12.9629);
        ctx.lineTo(68.7652, 14.9383);
        ctx.lineTo(72.2221, 16.9133);
        ctx.lineTo(75.185, 18.8887);
        ctx.lineTo(78.1479, 21.3581);
        ctx.lineTo(80.6173, 24.321);
        ctx.lineTo(83.0862, 27.284);
        ctx.lineTo(85.0617, 30.7404);
        ctx.lineTo(87.0366, 34.1973);
        ctx.lineTo(88.0246, 37.6541);
        ctx.lineTo(89.012, 41.605);
        ctx.lineTo(90, 45.5554);
        ctx.lineTo(90, 49.5058);
        ctx.lineTo(90, 53.9506);
        ctx.lineTo(89.506, 57.901);
        ctx.lineTo(88.5185, 61.8514);
        ctx.lineTo(87.0366, 65.3083);
        ctx.lineTo(85.5556, 68.7652);
        ctx.lineTo(83.5802, 72.2221);
        ctx.lineTo(81.1113, 75.185);
        ctx.lineTo(78.6419, 78.1479);
        ctx.lineTo(75.679, 80.6168);
        ctx.lineTo(72.716, 83.0862);
        ctx.lineTo(69.2592, 85.0617);
        ctx.lineTo(65.8023, 86.5426);
        ctx.lineTo(62.3454, 88.0246);
        ctx.lineTo(58.395, 89.012);
        ctx.lineTo(54.4446, 89.506);
        ctx.lineTo(50.4937, 90);
        ctx.lineTo(46.5429, 89.506);
        ctx.lineTo(42.5925, 89.012);
        ctx.lineTo(38.6421, 88.0246);
        ctx.lineTo(34.6912, 87.0366);
        ctx.lineTo(31.2343, 85.0617);
        ctx.lineTo(28.2714, 83.0862);
        ctx.lineTo(24.815, 81.1108);
        ctx.lineTo(22.3456, 78.1479);
        ctx.lineTo(19.3827, 75.6785);
        ctx.lineTo(17.4073, 72.716);
        ctx.lineTo(14.9383, 69.2592);
        ctx.lineTo(13.4569, 65.8023);
        ctx.lineTo(11.9754, 61.8514);
        ctx.lineTo(10.9875, 58.395);
        ctx.lineTo(10.494, 54.4441);
        ctx.closePath();
        ctx.closePath();
        ctx.moveTo(20.3702, 52.9627);
        ctx.lineTo(20.8642, 55.9256);
        ctx.lineTo(21.3581, 58.889);
        ctx.lineTo(22.3456, 61.3579);
        ctx.lineTo(23.8271, 64.3208);
        ctx.lineTo(25.3085, 66.7897);
        ctx.lineTo(26.79, 68.7652);
        ctx.lineTo(28.7654, 71.2346);
        ctx.lineTo(30.7408, 73.2095);
        ctx.lineTo(33.2098, 74.691);
        ctx.lineTo(35.6787, 76.1725);
        ctx.lineTo(38.1481, 77.6544);
        ctx.lineTo(41.111, 78.6419);
        ctx.lineTo(44.0739, 79.1354);
        ctx.lineTo(47.0369, 79.6293);
        ctx.lineTo(49.9998, 80.1233);
        ctx.lineTo(52.9627, 80.1233);
        ctx.lineTo(55.9261, 79.6293);
        ctx.lineTo(58.889, 78.6419);
        ctx.lineTo(61.8519, 77.6544);
        ctx.lineTo(64.3208, 76.6664);
        ctx.lineTo(66.7897, 75.185);
        ctx.lineTo(69.2592, 73.2095);
        ctx.lineTo(71.2346, 71.2346);
        ctx.lineTo(73.2095, 69.2592);
        ctx.lineTo(75.185, 66.7897);
        ctx.lineTo(76.6664, 64.3208);
        ctx.lineTo(77.6539, 61.8514);
        ctx.lineTo(78.6419, 59.3825);
        ctx.lineTo(79.6293, 56.4196);
        ctx.lineTo(80.1233, 53.4566);
        ctx.lineTo(80.1233, 49.9998);
        ctx.lineTo(80.1233, 47.0369);
        ctx.lineTo(79.6293, 44.0739);
        ctx.lineTo(79.1358, 41.111);
        ctx.lineTo(78.1479, 38.6416);
        ctx.lineTo(76.6664, 35.6787);
        ctx.lineTo(75.185, 33.2098);
        ctx.lineTo(73.7035, 31.2343);
        ctx.lineTo(71.7281, 28.7654);
        ctx.lineTo(69.2592, 26.79);
        ctx.lineTo(67.2837, 25.3085);
        ctx.lineTo(64.8148, 23.8271);
        ctx.lineTo(61.8519, 22.3456);
        ctx.lineTo(59.3825, 21.3581);
        ctx.lineTo(56.4196, 20.3702);
        ctx.lineTo(53.4566, 19.8762);
        ctx.lineTo(50.4937, 19.8762);
        ctx.lineTo(47.5308, 19.8762);
        ctx.lineTo(44.5679, 20.3702);
        ctx.lineTo(41.605, 21.3581);
        ctx.lineTo(38.6421, 22.3456);
        ctx.lineTo(36.1727, 23.3331);
        ctx.lineTo(33.7038, 24.8146);
        ctx.lineTo(31.2343, 26.79);
        ctx.lineTo(29.2594, 28.7654);
        ctx.lineTo(27.284, 30.7404);
        ctx.lineTo(25.3085, 33.2098);
        ctx.lineTo(23.8271, 35.6787);
        ctx.lineTo(22.3456, 38.1476);
        ctx.lineTo(21.3581, 40.6171);
        ctx.lineTo(20.8642, 43.58);
        ctx.lineTo(20.3702, 46.5434);
        ctx.lineTo(19.8767, 49.5058);
        ctx.closePath();
        ctx.fill("nonzero");
        ctx.beginPath();
        ctx.moveTo(36.1729, 32.2219);
        ctx.lineTo(75.1852, 70.2467);
        ctx.lineTo(68.2714, 77.654);
        ctx.lineTo(29.2591, 39.1357);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
        ctx.beginPath();
        ctx.moveTo(65.3085, 32.2219);
        ctx.lineTo(26.2962, 70.7407);
        ctx.lineTo(33.21, 77.654);
        ctx.lineTo(72.2223, 39.1357);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
        ctx.beginPath();
        ctx.moveTo(16.9134, 40.6172);
        ctx.lineTo(82.5924, 40.6172);
        ctx.lineTo(82.5924, 30.7406);
        ctx.lineTo(16.9134, 30.7406);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
        ctx.beginPath();
        ctx.moveTo(45.5555, 32.222);
        ctx.lineTo(55.4322, 32.222);
        ctx.lineTo(55.4322, 19.8764);
        ctx.lineTo(45.5555, 19.8764);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    hot_spring(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(55.5192, 16.4468);
        ctx.lineTo(55.5192, 17.3739);
        ctx.lineTo(55.0558, 18.3011);
        ctx.lineTo(54.1287, 20.6187);
        ctx.lineTo(52.7382, 22.9364);
        ctx.lineTo(51.811, 25.7174);
        ctx.lineTo(50.4205, 28.4988);
        ctx.lineTo(49.4934, 31.2798);
        ctx.lineTo(49.0296, 33.5971);
        ctx.lineTo(48.5662, 35.4514);
        ctx.lineTo(48.5662, 34.988);
        ctx.lineTo(49.0296, 36.8419);
        ctx.lineTo(48.5662, 36.3785);
        ctx.lineTo(49.4934, 37.769);
        ctx.lineTo(49.0296, 37.3057);
        ctx.lineTo(49.9567, 38.6962);
        ctx.lineTo(50.8839, 40.0867);
        ctx.lineTo(51.811, 41.0138);
        ctx.lineTo(52.7382, 42.4043);
        ctx.bezierCurveTo(53.2015, 42.4043, 53.2015, 42.8681, 53.2015, 42.8681);
        ctx.lineTo(53.6649, 44.2586);
        ctx.bezierCurveTo(54.1287, 44.2586, 54.1287, 44.722, 54.1287, 44.722);
        ctx.lineTo(54.1287, 46.1129);
        ctx.lineTo(54.1287, 46.5763);
        ctx.lineTo(54.1287, 48.4301);
        ctx.lineTo(53.6649, 50.7478);
        ctx.lineTo(53.2015, 53.0654);
        ctx.lineTo(52.2744, 55.3831);
        ctx.lineTo(51.811, 57.237);
        ctx.lineTo(50.8839, 59.0913);
        ctx.lineTo(50.4205, 60.9456);
        ctx.lineTo(49.9567, 62.3361);
        ctx.lineTo(45.7848, 60.9456);
        ctx.lineTo(46.2486, 59.5551);
        ctx.lineTo(46.7119, 57.7008);
        ctx.lineTo(47.6391, 55.8465);
        ctx.lineTo(48.1024, 53.9926);
        ctx.lineTo(49.0296, 51.6749);
        ctx.lineTo(49.4934, 49.8206);
        ctx.lineTo(49.9567, 48.4301);
        ctx.lineTo(49.9567, 46.5763);
        ctx.lineTo(49.9567, 47.0396);
        ctx.lineTo(49.4934, 45.6491);
        ctx.lineTo(49.9567, 46.1129);
        ctx.lineTo(49.0296, 44.722);
        ctx.lineTo(49.4934, 45.1853);
        ctx.lineTo(48.5662, 43.7948);
        ctx.lineTo(47.6391, 42.8681);
        ctx.lineTo(46.2486, 41.0138);
        ctx.lineTo(45.3214, 39.6233);
        ctx.lineTo(44.3943, 37.769);
        ctx.lineTo(44.3943, 37.3057);
        ctx.lineTo(44.3943, 35.4514);
        ctx.lineTo(44.3943, 34.988);
        ctx.lineTo(44.8581, 32.6704);
        ctx.lineTo(45.3214, 29.8893);
        ctx.lineTo(46.2486, 27.1079);
        ctx.lineTo(47.6391, 24.3269);
        ctx.lineTo(49.0296, 21.0821);
        ctx.lineTo(49.9567, 18.7644);
        ctx.lineTo(50.8839, 16.4468);
        ctx.lineTo(51.3472, 15.9834);
        ctx.lineTo(51.3472, 15.0563);
        ctx.closePath();
        ctx.moveTo(35.5873, 29.4257);
        ctx.lineTo(35.124, 30.3529);
        ctx.lineTo(34.1968, 31.7434);
        ctx.lineTo(33.2697, 33.1339);
        ctx.lineTo(32.343, 34.5244);
        ctx.lineTo(31.4158, 35.9149);
        ctx.lineTo(30.952, 37.7692);
        ctx.lineTo(30.4887, 39.1597);
        ctx.lineTo(30.4887, 38.6963);
        ctx.lineTo(30.4887, 40.0868);
        ctx.lineTo(30.0253, 39.1597);
        ctx.lineTo(30.4887, 40.5502);
        ctx.lineTo(30.4887, 40.0868);
        ctx.lineTo(30.952, 41.4773);
        ctx.lineTo(30.4887, 41.014);
        ctx.lineTo(31.4158, 42.4045);
        ctx.lineTo(32.343, 43.3317);
        ctx.lineTo(33.7335, 44.7222);
        ctx.lineTo(34.6602, 46.1127);
        ctx.lineTo(35.5873, 47.5032);
        ctx.lineTo(35.5873, 48.4303);
        ctx.lineTo(36.0507, 49.3575);
        ctx.lineTo(36.0507, 50.2842);
        ctx.lineTo(35.5873, 51.6751);
        ctx.lineTo(35.5873, 52.1385);
        ctx.lineTo(35.5873, 53.529);
        ctx.lineTo(34.6602, 55.3833);
        ctx.lineTo(34.1968, 57.2371);
        ctx.lineTo(32.343, 60.0186);
        ctx.lineTo(31.8792, 61.4091);
        ctx.lineTo(31.4158, 62.3362);
        ctx.lineTo(27.2438, 60.4819);
        ctx.lineTo(28.171, 59.5548);
        ctx.lineTo(28.6344, 58.1643);
        ctx.lineTo(30.0253, 55.3833);
        ctx.lineTo(30.4887, 53.9928);
        ctx.lineTo(30.952, 52.6023);
        ctx.lineTo(31.4158, 50.748);
        ctx.lineTo(31.4158, 51.2113);
        ctx.lineTo(31.4158, 49.8208);
        ctx.lineTo(31.4158, 50.748);
        ctx.lineTo(31.4158, 49.3575);
        ctx.lineTo(31.4158, 49.8208);
        ctx.lineTo(30.952, 48.8937);
        ctx.lineTo(30.0253, 47.5032);
        ctx.lineTo(29.0982, 46.1127);
        ctx.lineTo(28.171, 44.7222);
        ctx.lineTo(27.2438, 43.795);
        ctx.bezierCurveTo(27.2438, 43.3317, 26.7805, 43.3317, 26.7805, 43.3317);
        ctx.lineTo(26.3167, 41.9411);
        ctx.lineTo(26.3167, 41.4773);
        ctx.lineTo(25.8533, 40.0868);
        ctx.lineTo(25.8533, 39.623);
        ctx.lineTo(26.3167, 37.7692);
        ctx.lineTo(26.7805, 35.9149);
        ctx.lineTo(27.7072, 34.0606);
        ctx.lineTo(28.6344, 32.2067);
        ctx.lineTo(29.5615, 30.8162);
        ctx.lineTo(30.4887, 28.9624);
        ctx.lineTo(31.4158, 28.0348);
        ctx.lineTo(31.8792, 27.1081);
        ctx.closePath();
        ctx.moveTo(70.8156, 28.035);
        ctx.lineTo(70.3522, 28.9621);
        ctx.lineTo(69.4251, 30.3526);
        ctx.lineTo(68.9613, 31.7431);
        ctx.lineTo(68.0346, 33.1336);
        ctx.lineTo(67.1074, 34.5246);
        ctx.lineTo(66.6436, 35.9151);
        ctx.lineTo(66.6436, 37.3056);
        ctx.lineTo(66.6436, 38.6961);
        ctx.lineTo(66.6436, 37.7689);
        ctx.lineTo(66.6436, 39.6232);
        ctx.lineTo(66.6436, 39.1594);
        ctx.lineTo(67.1074, 40.5504);
        ctx.lineTo(68.0346, 41.4775);
        ctx.lineTo(68.9613, 42.868);
        ctx.lineTo(69.8884, 44.2585);
        ctx.lineTo(70.8156, 45.649);
        ctx.lineTo(71.7423, 47.5033);
        ctx.lineTo(71.7423, 47.9667);
        ctx.lineTo(72.2061, 49.3572);
        ctx.lineTo(72.2061, 49.821);
        ctx.lineTo(72.2061, 51.6749);
        ctx.lineTo(71.7423, 53.5292);
        ctx.lineTo(71.2789, 55.383);
        ctx.lineTo(70.3522, 57.2373);
        ctx.lineTo(69.4251, 59.0916);
        ctx.lineTo(68.9613, 60.9455);
        ctx.lineTo(68.0346, 61.8726);
        ctx.lineTo(67.5708, 63.2631);
        ctx.lineTo(63.8626, 61.4088);
        ctx.lineTo(64.326, 60.4821);
        ctx.lineTo(64.7898, 59.0916);
        ctx.lineTo(65.7169, 57.2373);
        ctx.lineTo(66.1803, 55.8468);
        ctx.lineTo(66.6436, 53.9925);
        ctx.lineTo(67.5708, 52.602);
        ctx.lineTo(67.5708, 50.7477);
        ctx.lineTo(67.5708, 51.2115);
        ctx.lineTo(67.5708, 49.821);
        ctx.lineTo(68.0346, 50.2843);
        ctx.lineTo(67.5708, 48.8938);
        ctx.lineTo(67.5708, 49.3572);
        ctx.lineTo(67.1074, 47.9667);
        ctx.lineTo(66.6436, 46.5762);
        ctx.lineTo(65.2531, 45.1852);
        ctx.lineTo(64.326, 43.7947);
        ctx.lineTo(63.3988, 42.4042);
        ctx.lineTo(62.4721, 41.0137);
        ctx.lineTo(62.4721, 40.5504);
        ctx.lineTo(62.0083, 39.1594);
        ctx.lineTo(62.0083, 38.2327);
        ctx.lineTo(62.0083, 36.8422);
        ctx.lineTo(62.0083, 36.3784);
        ctx.lineTo(62.4721, 34.5246);
        ctx.lineTo(63.3988, 32.6703);
        ctx.lineTo(64.326, 31.2798);
        ctx.lineTo(64.7898, 29.4259);
        ctx.lineTo(65.7169, 28.035);
        ctx.lineTo(66.1803, 27.1078);
        ctx.lineTo(66.6436, 26.1811);
        ctx.closePath();
        ctx.moveTo(78.7199, 48.3371);
        ctx.lineTo(77.0025, 52.9608);
        ctx.bezierCurveTo(82.0474, 54.7644, 85.1535, 58.8457, 85.1535, 63.9105);
        ctx.bezierCurveTo(85.1535, 71.6724, 70.5298, 80.0985, 49.5402, 80.0985);
        ctx.bezierCurveTo(28.5501, 80.0985, 13.5285, 71.5581, 13.9238, 63.9105);
        ctx.bezierCurveTo(14.2191, 58.1991, 16.028, 54.0427, 24.6806, 51.573);
        ctx.lineTo(23.3336, 47.244);
        ctx.bezierCurveTo(14.0434, 50.5742, 10, 56.0793, 10, 63.9105);
        ctx.bezierCurveTo(10, 75.7038, 27.3691, 84.9437, 49.5402, 84.9437);
        ctx.bezierCurveTo(71.7113, 84.9437, 90.048, 75.4988, 90, 63.9105);
        ctx.bezierCurveTo(89.9684, 56.2141, 85.6013, 50.8206, 78.7199, 48.3371);
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    rice_field(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(31.1891, 90);
        ctx.lineTo(17.4956, 90);
        ctx.lineTo(17.4956, 10);
        ctx.lineTo(31.1891, 10);
        ctx.closePath();
        ctx.closePath();
        ctx.moveTo(82.5044, 90);
        ctx.lineTo(68.8156, 90);
        ctx.lineTo(68.8156, 10);
        ctx.lineTo(82.5044, 10);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    field(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(49.9955, 73.5902);
        ctx.lineTo(10, 33.5947);
        ctx.lineTo(17.1768, 26.4098);
        ctx.lineTo(49.9955, 59.2231);
        ctx.lineTo(82.8142, 26.4098);
        ctx.lineTo(90, 33.5947);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    tea_field(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(61.3016, 26.9434);
        ctx.bezierCurveTo(61.3016, 33.1857, 56.2418, 38.2456, 49.9995, 38.2456);
        ctx.bezierCurveTo(43.7621, 38.2456, 38.7022, 33.1857, 38.7022, 26.9434);
        ctx.bezierCurveTo(38.7022, 20.7019, 43.7621, 15.6511, 49.9995, 15.6511);
        ctx.bezierCurveTo(56.2418, 15.6511, 61.3016, 20.7019, 61.3016, 26.9434);
        ctx.closePath();
        ctx.moveTo(32.5944, 73.0467);
        ctx.bezierCurveTo(32.5944, 79.2882, 27.5437, 84.3489, 21.3022, 84.3489);
        ctx.bezierCurveTo(15.0599, 84.3489, 10, 79.2882, 10, 73.0467);
        ctx.bezierCurveTo(10, 66.8093, 15.0599, 61.7536, 21.3022, 61.7536);
        ctx.bezierCurveTo(27.5437, 61.7536, 32.5944, 66.8093, 32.5944, 73.0467);
        ctx.closePath();
        ctx.moveTo(90, 73.0467);
        ctx.bezierCurveTo(90, 79.2882, 84.9393, 84.3489, 78.702, 84.3489);
        ctx.bezierCurveTo(72.4654, 84.3489, 67.4047, 79.2882, 67.4047, 73.0467);
        ctx.bezierCurveTo(67.4047, 66.8093, 72.4654, 61.7536, 78.702, 61.7536);
        ctx.bezierCurveTo(84.9393, 61.7536, 90, 66.8093, 90, 73.0467);
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    orchard(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(49.9982, 80.4252);
        ctx.bezierCurveTo(38.7471, 80.4252, 29.5913, 71.2694, 29.5913, 60.0183);
        ctx.bezierCurveTo(29.5913, 48.768, 38.7471, 39.6115, 49.9982, 39.6115);
        ctx.bezierCurveTo(61.2522, 39.6115, 70.4087, 48.768, 70.4087, 60.0183);
        ctx.bezierCurveTo(70.4087, 71.2694, 61.2522, 80.4252, 49.9982, 80.4252);
        ctx.closePath();
        ctx.moveTo(54.786, 30.455);
        ctx.lineTo(54.786, 10);
        ctx.lineTo(45.2104, 10);
        ctx.lineTo(45.2104, 30.455);
        ctx.bezierCurveTo(30.9529, 32.7591, 20.0158, 45.1206, 20.0158, 60.0183);
        ctx.bezierCurveTo(20.0158, 76.5507, 33.4658, 90, 49.9982, 90);
        ctx.bezierCurveTo(66.5335, 90, 79.9842, 76.5507, 79.9842, 60.0183);
        ctx.bezierCurveTo(79.9842, 45.1206, 69.0471, 32.7591, 54.786, 30.455);
        ctx.closePath();
        ctx.fill("nonzero");
      });
    },

    castle_ruins(context, x, y, size) {
      withSymbolContext(context, x, y, size, "butt", "miter", (ctx) => {
        ctx.fillStyle = STROKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(90, 87.8477);
        ctx.lineTo(83.0367, 87.8477);
        ctx.lineTo(83.0367, 44.4306);
        ctx.lineTo(64.7781, 44.4306);
        ctx.lineTo(64.7781, 19.1155);
        ctx.lineTo(35.225, 19.1155);
        ctx.lineTo(35.225, 44.4306);
        ctx.lineTo(16.9633, 44.4306);
        ctx.lineTo(16.9633, 87.8477);
        ctx.lineTo(10, 87.8477);
        ctx.lineTo(10, 37.4674);
        ctx.lineTo(28.2617, 37.4674);
        ctx.lineTo(28.2617, 12.1523);
        ctx.lineTo(71.7414, 12.1523);
        ctx.lineTo(71.7414, 37.4674);
        ctx.lineTo(90, 37.4674);
        ctx.closePath();
        ctx.closePath();
        ctx.fill("nonzero");
      });
    }
  };

  window.MapSymbolNinja.SymbolRenderers = Object.freeze(renderers);
  window.MapSymbolNinja.SYMBOL_RENDER_VIEWBOX_SIZE = VIEWBOX_SIZE;
})();
