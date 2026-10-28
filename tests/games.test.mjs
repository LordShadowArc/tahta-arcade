import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../dist/extra-games.js',import.meta.url),'utf8');

function setup() {
  const window = {};
  runInNewContext(source,{window,Math});
  let result = null;
  const make = window.TahtaExtra({W:960,H:540,ctx:{fillStyle:'',strokeStyle:'',lineWidth:0,strokeRect(){}},fill(){},text(){},circle(){},rr(){},held:new Set(),rand:(a,b)=>a+Math.random()*(b-a),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),hit:()=>false,sound(){},finish(won){result=won},moving:()=>null,getLastDir:()=>'right'});
  return {make,get result(){return result}};
}

test('Snake and Minesweeper are built-in touch-compatible engines', () => {
  const setupResult = setup();
  assert.equal(typeof setupResult.make.factories.snake,'function');
  assert.equal(typeof setupResult.make.factories.mines,'function');
  const snake=setupResult.make.factories.snake();
  assert.equal(typeof snake.update,'function');
  assert.equal(typeof snake.draw,'function');
  const mines=setupResult.make.factories.mines();
  assert.equal(typeof mines.tap,'function');
  assert.equal(typeof mines.combo,'function');
  assert.equal(typeof mines.action,'function');
  mines.draw();
});

test('Minesweeper first touch is always safe across the board', () => {
  for(let y=0;y<8;y++)for(let x=0;x<12;x++) {
    const game=setup();
    const mines=game.make.create({base:'mines',difficulty:'hard'});
    mines.tap(156+x*54+27,54+y*54+27);
    assert.equal(game.result,null,`first click lost at ${x},${y}`);
    assert.ok(mines.score>=10);
  }
});

test('Flag mode never reveals a mine and direction controls can select a square', () => {
  const game=setup();
  const mines=game.make.factories.mines();
  mines.combo();
  mines.tap(183,81);
  assert.equal(mines.score,0);
  assert.match(mines.extraValue,/⚑1/);
  mines.combo();
  mines.tap(183,81);
  assert.equal(mines.score,0);
  mines.combo();
  mines.tap(183,81);
  assert.match(mines.extraValue,/⚑0/);
  mines.combo();
  mines.tap(183,81);
  assert.ok(mines.score>0);
});
