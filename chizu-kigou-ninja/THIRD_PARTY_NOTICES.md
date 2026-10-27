# 第三者コード・利用許諾

許諾本文の確認日：2026-10-26。ゲーム本体・資料v0.4.9。

| 対象 | 同梱物・条件 | 本文 |
|---|---|---|
| Phaser 4.2.1 | MIT。本体は公式同版の配布ファイルとSHA256一致 | [Phaser MIT](LICENSES/PHASER-4.2.1-MIT.txt) |
| EventEmitter3 | Phaserの同梱依存。MIT | [EventEmitter3 MIT](LICENSES/EVENTEMITTER3-MIT.txt) |
| Earcut / Simplify.js / Matter.js / noise等 | エンジン内部のISC・BSD・MIT等の表記を保持 | [同梱コードの表記](LICENSES/PHASER-BUNDLED-NOTICES.txt)、[Gavin Kistner](LICENSES/GAVIN-KISTNER-REUSE.txt) |
| 炎・雷・氷の参考コード | 以下の出典とMIT本文。参考サイトの画像・動画・テクスチャは取り込まない | この文書の各節 |

音源は[AUDIO_CREDITS](AUDIO_CREDITS.md)、記号・画像・BGMを含む全体は[CREDITS](CREDITS.md)へ。ここにあるコードの条件をゲーム全素材へ一律適用しません。

# Procedural fire reference

`js/core/ProceduralFireVFX.js` adapts the noise, displacement, and gradient-map setup from the Phaser official example **Fire with Simplex Noise**:

https://github.com/phaserjs/examples/blob/master/public/src/game%20objects/noise/fire%20with%20simplex%20noise.js

The Phaser examples repository states that its source code is MIT licensed:
https://github.com/phaserjs/examples/blob/master/README.md#license

Copyright (c) 2013-2026 Phaser Studio Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

The reference example's image assets are not included. All new fire surfaces
are generated at runtime with the already bundled Phaser 4.2.1 engine.
This notice supplements the notices already included with Phaser and the
game's existing assets.


# Procedural lightning reference

The moving-noise luminous-arc concept in `js/core/ProceduralLightningVFX.js` references **2D Lightning / Electric Arc / Plasma** by lumenfruit, published 26 November 2022:

https://godotshaders.com/shader/2d-lightning-electric-arc-plasma/

The author releases the shader code under the MIT license. The game implements its own Phaser-compatible fragment shader, procedural branches, bounds clipping and fixed object pool. No reference images, video, noise textures or gradient assets are included.

Copyright (c) 2022 lumenfruit

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


# Procedural ice reference

The coverage, cracks and highlights concept in `js/core/ProceduralIceVFX.js` references **Ice Covering** by Nathanael C. Fritz (fritzy):

https://godotshaders.com/shader/ice-covering/

Copyright Nathanael C. Fritz 2024

The shader source states License MIT. This game implements its own procedural cells, frost noise, growth, fade, field clipping and fixed object pool in a Phaser-compatible shader. No images, video, textures or GDScript assets from the reference are included. It does not sample or refract the background.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


