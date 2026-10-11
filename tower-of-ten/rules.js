// Column-major board; row 0 is the bottom. This module never changes the board.
(function (root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.TenTowerRules = rules;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const ruleModes = Object.freeze(['two', 'three', 'either']);

  function numberAt(board, col, row) {
    const cell = board[col]?.[row];
    if (!cell || (cell.kind !== undefined && cell.kind !== 'number')) return null;
    return Number.isInteger(cell.val) && cell.val >= 1 && cell.val <= 9 ? cell.val : null;
  }

  // scope=anchor finds only groups containing the specified placed cell.
  // groups count separately even when their cells overlap; unionCells erases once.
  function findTenGroups(board, { ruleMode = 'two', scope = 'all', anchor = null } = {}) {
    if (!Array.isArray(board) || board.some(col => !Array.isArray(col))) throw new TypeError('Invalid board');
    if (!ruleModes.includes(ruleMode)) throw new RangeError('Invalid ruleMode');
    if (!['all', 'anchor'].includes(scope)) throw new RangeError('Invalid scope');
    if (scope === 'anchor' && (!anchor || !Number.isInteger(anchor.col) || !Number.isInteger(anchor.row) ||
        anchor.col < 0 || anchor.col >= board.length || anchor.row < 0)) throw new RangeError('Invalid anchor');
    const lengths = ruleMode === 'either' ? [2, 3] : [ruleMode === 'three' ? 3 : 2];
    const groups = [], unionCells = new Set();
    for (let col = 0; col < board.length; col++) {
      for (let row = 0; row < board[col].length; row++) {
        for (const [dc, dr, direction] of [[1, 0, 'horizontal'], [0, 1, 'vertical']]) {
          for (const length of lengths) {
            if (scope === 'anchor' && !(dc ? row === anchor.row && anchor.col >= col && anchor.col < col + length
              : col === anchor.col && anchor.row >= row && anchor.row < row + length)) continue;
            const cells = [];
            let sum = 0;
            for (let offset = 0; offset < length; offset++) {
              const c = col + dc * offset, r = row + dr * offset;
              const value = numberAt(board, c, r);
              if (value === null) break;
              sum += value;
              cells.push(`${c},${r}`);
            }
            if (cells.length !== length || sum !== 10) continue;
            groups.push({ direction, length, cells });
            cells.forEach(cell => unionCells.add(cell));
          }
        }
      }
    }
    return { groups, unionCells, groupCount: groups.length };
  }
  // Simulate a legal single-number placement without changing the live board.
  function findPlacementHints(board, { ruleMode = 'two', value, maxRows = Infinity } = {}) {
    if (!Array.isArray(board) || board.some(col => !Array.isArray(col))) throw new TypeError('Invalid board');
    if (!ruleModes.includes(ruleMode)) throw new RangeError('Invalid ruleMode');
    if (maxRows !== Infinity && (!Number.isInteger(maxRows) || maxRows < 1)) throw new RangeError('Invalid maxRows');
    if (!Number.isInteger(value) || value < 1 || value > 9) return [];
    const hints = [];
    for (let col = 0; col < board.length; col++) {
      const row = board[col].length;
      if (row >= maxRows) continue;
      const trial = board.slice();
      trial[col] = [...board[col], { kind: 'number', val: value }];
      const found = findTenGroups(trial, { ruleMode, scope: 'anchor', anchor: { col, row } });
      if (found.groupCount) hints.push({ col, row, ...found });
    }
    return hints;
  }
  return Object.freeze({ ruleModes, findTenGroups, findPlacementHints });
});
