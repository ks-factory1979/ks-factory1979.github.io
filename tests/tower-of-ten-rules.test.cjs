const test = require('node:test');
const assert = require('node:assert/strict');
const {findTenGroups: find, ruleModes} = require('../tower-of-ten/rules.js');
const board = columns => columns.map(col => col.map(val => val === null ? null : {kind:'number',val}));
const keys = result => [...result.unionCells].sort();

for (const direction of ['horizontal','vertical']) {
  for (const [rule, values] of [['two',[4,6]],['three',[2,3,5]]]) {
    test(`${rule}: contiguous ${direction}`, () => {
      const b=board(direction==='vertical'?[values]:values.map(v=>[v]));
      const result=find(b,{ruleMode:rule});
      assert.equal(result.groupCount,1);
      assert.equal(result.groups[0].direction,direction);
      assert.equal(result.unionCells.size,values.length);
    });
  }
}
test('two and three select their own lengths; either selects both',()=>{
  const b=board([[4],[6],[],[2],[3],[5]]);
  assert.equal(find(b,{ruleMode:'two'}).groupCount,1);
  assert.equal(find(b,{ruleMode:'three'}).groupCount,1);
  assert.equal(find(b,{ruleMode:'either'}).groupCount,2);
});
test('either counts overlapping two and three before any removal',()=>{
  const x=find(board([[4],[6],[1],[3]]),{ruleMode:'either'});
  assert.equal(x.groupCount,2);
  assert.deepEqual(x.groups.map(g=>g.length).sort(),[2,3]);
  assert.equal(x.unionCells.size,4);
});
test('overlapping triples count twice but erase four cells once',()=>{
  const x=find(board([[2,3,5,2]]),{ruleMode:'three'});
  assert.equal(x.groupCount,2);
  assert.deepEqual(keys(x),['0,0','0,1','0,2','0,3']);
});
test('horizontal and vertical triples cross at one cell',()=>{
  const x=find(board([[1,2,1],[1,5,4],[1,3,1]]),{ruleMode:'three'});
  assert.equal(x.groupCount,2);
  assert.equal(x.unionCells.size,5);
});
test('all disjoint matches are returned in the same wave',()=>{
  const x=find(board([[4,6],[],[1,2,7],[],[5,5]]),{ruleMode:'either'});
  assert.equal(x.groupCount,3);
  assert.equal(x.unionCells.size,7);
});
for (const [name, b] of [
  ['L shape',[[2,3],[5]]],
  ['diagonal',[[2],[1,3],[1,1,5]]],
  ['horizontal gap',[[2],[],[3],[5]]],
  ['vertical gap',[[2,null,3,5]]]
]) test(`three rejects ${name}`,()=>assert.equal(find(board(b),{ruleMode:'three'}).groupCount,0));
test('stars, missing cells, strings and out-of-range values are not numbers',()=>{
  for(const cell of [{kind:'star',val:6},{kind:'pair',val:6},{val:'6'},{val:10},{val:0},null]) {
    assert.equal(find([[{val:4},cell]],{ruleMode:'either'}).groupCount,0);
  }
});
test('anchor includes a triple with the placed cell in the middle',()=>{
  const x=find(board([[2],[3],[5]]),{ruleMode:'three',scope:'anchor',anchor:{col:1,row:0}});
  assert.equal(x.groupCount,1);
});
test('anchor excludes unrelated existing matches',()=>{
  const b=board([[4,6],[2],[3],[5]]);
  assert.equal(find(b,{ruleMode:'either',scope:'anchor',anchor:{col:3,row:0}}).groupCount,1);
  assert.equal(find(b,{ruleMode:'either'}).groupCount,2);
});
test('empty board and uneven columns do not connect across a missing cell',()=>{
  assert.equal(find([]).groupCount,0);
  assert.equal(find(board([[1,2],[3],[1,5]]),{ruleMode:'three'}).groupCount,0);
});
test('does not mutate frozen board cells or columns',()=>{
  const b=board([[4],[6],[1],[3]]).map(col=>Object.freeze(col.map(Object.freeze)));
  Object.freeze(b);
  const before=JSON.stringify(b);
  find(b,{ruleMode:'either'});
  assert.equal(JSON.stringify(b),before);
});
test('invalid rules, scopes, anchors and boards fail explicitly',()=>{
  assert.throws(()=>find([],{ruleMode:'unknown'}),RangeError);
  assert.throws(()=>find([],{scope:'unknown'}),RangeError);
  assert.throws(()=>find([[]],{scope:'anchor'}),RangeError);
  assert.throws(()=>find([[]],{scope:'anchor',anchor:{col:-1,row:0}}),RangeError);
  assert.throws(()=>find([null]),TypeError);
  assert.deepEqual(ruleModes,['two','three','either']);
});
test('two preserves the old adjacent-edge result on 1000 deterministic boards',()=>{
  let seed=527;
  const random=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
  for(let sample=0;sample<1000;sample++) {
    const b=board(Array.from({length:3+random(5)},()=>Array.from({length:random(9)},()=>1+random(9))));
    let count=0; const cells=new Set();
    for(let c=0;c<b.length;c++)for(let r=0;r<b[c].length;r++) {
      for(const [x,y] of [[c,r-1],[c-1,r]])if(b[x]?.[y]&&b[c][r].val+b[x][y].val===10) {
        count++; cells.add(`${c},${r}`); cells.add(`${x},${y}`);
      }
    }
    const actual=find(b);
    assert.equal(actual.groupCount,count,`board ${sample}`);
    assert.deepEqual(keys(actual),[...cells].sort(),`board ${sample}`);
  }
});
