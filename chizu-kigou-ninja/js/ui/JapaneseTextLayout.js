(function () {
  "use strict";
  const app = window.MapSymbolNinja = window.MapSymbolNinja || {};
  const noStart = new Set(Array.from("、。，．！？!?)]｝）〕］〉》」』】〙〗〟’”ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶー々ゝゞヽヾ・：；:;"));
  const noEnd = new Set(Array.from("([｛（〔［〈《「『【〘〖〝‘“"));
  const words = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("ja", { granularity: "word" }) : null;
  const graphemes = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("ja", { granularity: "grapheme" }) : null;
  const units = text => graphemes ? Array.from(graphemes.segment(text), e => e.segment) : Array.from(text);
  const compact = text => String(text).replace(/\s/g, "");

  function wrap(value, maxWidth, measure, maxLines) {
    const paragraphs = String(value).replace(/\r\n?/g, "\n").split("\n"), output = [];
    for (const paragraph of paragraphs) {
      if (!paragraph) { output.push(""); continue; }
      const chars = units(paragraph), n = chars.length, offsets = [0], boundaries = new Set([0, paragraph.length]);
      for (const char of chars) offsets.push(offsets[offsets.length - 1] + char.length);
      if (words) for (const part of words.segment(paragraph)) { boundaries.add(part.index); boundaries.add(part.index + part.segment.length); }
      const protectedSpans = Array.from(paragraph.matchAll(/[0-9０-９]+(?:[.,．][0-9０-９]+)*(?:mm|cm|km|m|％|%|回|秒|枚|年|以上|未満)?|[A-Za-z]+/g), m => [m.index, m.index + m[0].length]);
      const legal = i => {
        const before=chars.slice(0,i).join("").trimEnd(),after=chars.slice(i).join("").trimStart();
        return !noEnd.has(Array.from(before).pop()) && !noStart.has(Array.from(after)[0]) &&
          !protectedSpans.some(([a,b]) => offsets[i] > a && offsets[i] < b);
      };
      const cache = new Map(), width = (i,j) => {
        const key = i + ":" + j; if (!cache.has(key)) cache.set(key, measure(chars.slice(i,j).join("").trim())); return cache.get(key);
      };
      const limit = Math.max(1, Math.min(n, maxLines || n)), memo = new Map();
      function solve(start, remaining) {
        while (start < n && /\s/.test(chars[start])) start += 1;
        if (start === n) return { cost: 0, lines: [] };
        if (!remaining) return null;
        const key = start + ":" + remaining; if (memo.has(key)) return memo.get(key);
        let best = null;
        for (let end = start + 1; end <= n; end += 1) {
          const w = width(start,end); if (w > maxWidth + .01) break;
          if (!legal(end) || !chars.slice(start,end).join("").trim()) continue;
          const tail = solve(end, remaining - 1); if (!tail) continue;
          const line = chars.slice(start,end).join("").trim(), last = end === n;
          const punctuation = /[、。！？!?・]$/.test(line), space = /\s/.test(chars[end - 1]) || /\s/.test(chars[end] || "");
          const breakCost = last ? 0 : punctuation ? -.20 : space ? 0 : boundaries.has(offsets[end]) ? .22 : 1.6;
          const shortLast = last && start > 0 && units(line).length < 3 ? 2 : 0;
          const cost = 1 + .3 * Math.pow(1 - w / maxWidth, 2) * (last ? .3 : 1) + breakCost + shortLast + tail.cost;
          if (!best || cost < best.cost) best = { cost, lines: [line].concat(tail.lines) };
        }
        memo.set(key,best); return best;
      }
      const result = solve(0,limit);
      if (!result) return null; // The caller can try a readable smaller size; no character is discarded.
      output.push(...result.lines);
    }
    return maxLines && output.length > maxLines ? null : output;
  }

  function setSource(object, value) {
    object.__ninjaSourceText = String(value); object.setText(object.__ninjaSourceText); return object;
  }

  // Use the exact Canvas Text font and Phaser's final dimensions, in unscaled local pixels.
  // FIT scales artwork and text together afterwards. This function is only called when content/layout changes.
  function fit(object, value, options) {
    const source = String(value), o = options || {}, max = Number(o.fontSize || object.style.fontSize), min = Math.min(max, Number(o.minFontSize || max));
    const width = Math.max(1, o.width - (o.margin === undefined ? 8 : o.margin)), height = o.height || Infinity;
    const spacings = Array.from(new Set([Math.max(0, o.lineSpacing || 0), 2, 0])).sort((a,b) => b-a).filter(n => n <= (o.lineSpacing || 0));
    let result = null;
    object.__ninjaSourceText = source; object.setWordWrapWidth(0);
    for (let size = max; size >= min; size -= 1) {
      object.setFontSize(size);
      object.style.syncFont(object.canvas, object.context);
      const measure = line => object.context.measureText(line).width + Math.max(0,units(line).length - 1) * (object.letterSpacing || 0);
      const lines = wrap(source, width, measure, o.maxLines); if (!lines) continue;
      for (const spacing of spacings) {
        object.setLineSpacing(spacing).setText(lines.join("\n"));
        if (object.width <= o.width && object.height <= height) {
          result = { fits: true, fontSize: size, lineSpacing: spacing, width: object.width, height: object.height, lines }; break;
        }
      }
      if (result) break;
    }
    if (!result) {
      object.setFontSize(min).setLineSpacing(0);object.style.syncFont(object.canvas,object.context);
      const measure = line => object.context.measureText(line).width + Math.max(0,units(line).length - 1) * (object.letterSpacing || 0);
      const lines = wrap(source,width,measure) || source.split("\n");object.setText(lines.join("\n"));
      result = { fits: false, fontSize: min, lineSpacing: 0, width: object.width, height: object.height, lines };
    }
    result.contentPreserved = compact(object.text) === compact(source);
    object.__ninjaTextLayout = result; return result;
  }
  app.JapaneseTextLayout = Object.freeze({ wrap, fit, setSource, noStart, noEnd });
})();
