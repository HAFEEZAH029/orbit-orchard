import test from 'node:test';
import assert from 'node:assert/strict';
import {harvestStats} from '../src/scoring.js';
import {readFile} from 'node:fs/promises';

test('partial harvests earn only seed points, complete harvests earn a speed bonus',()=>{
  assert.deepEqual(harvestStats({collected:12,elapsed:20.1}),{score:1200,seeds:12,time:21});
  assert.deepEqual(harvestStats({collected:18,elapsed:20.1}),{score:2340,seeds:18,time:21});
  assert.deepEqual(harvestStats({collected:18,elapsed:75}),{score:1800,seeds:18,time:75});
});
test('more seeds always beat fewer, and faster full harvests beat slower ones',()=>{
  assert.ok(harvestStats({collected:18,elapsed:75}).score>harvestStats({collected:17,elapsed:1}).score);
  assert.ok(harvestStats({collected:18,elapsed:20}).score>harvestStats({collected:18,elapsed:30}).score);
});
test('submitted stats are whole numbers matching the published leaderboard schema',async()=>{
  const schema=JSON.parse(await readFile(new URL('../startng.json',import.meta.url),'utf8'));
  const stats=harvestStats({collected:18,elapsed:12.345});
  assert.deepEqual(Object.keys(stats),schema.leaderboard.stats.map(s=>s.key));
  for(const value of Object.values(stats))assert.ok(Number.isInteger(value)&&value>=0&&value<=1_000_000_000);
  assert.equal(schema.leaderboard.stats[0].order,'highest');
  assert.equal(schema.leaderboard.stats[2].order,'lowest');
});
