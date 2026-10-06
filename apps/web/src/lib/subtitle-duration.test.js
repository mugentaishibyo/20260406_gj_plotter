import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSubtitleDuration, getPostSpeechDelay } from './subtitle-duration.js';

test('旧設定ではモーラ長の合計にデフォルト800ミリ秒を加算する', () => {
  assert.equal(calculateSubtitleDuration('あいうえお', { moraRate: 150 }), 1.55);
});

test('話速倍率は発話時間だけに適用し、キャラクターのディレイを加算する', () => {
  assert.equal(calculateSubtitleDuration('|東京《とうきょう》', {
    moraRate: 150, speechRate: 2, postSpeechDelay: 1200,
  }), 1.5);
});

test('0ミリ秒のディレイはデフォルト値で上書きしない', () => {
  assert.equal(calculateSubtitleDuration('あいうえお', {
    moraRate: 150, postSpeechDelay: 0,
  }), 0.75);
});

test('短い発話にもモーラ長とディレイの合計を使用する', () => {
  assert.equal(calculateSubtitleDuration('あ', { moraRate: 150 }), 0.95);
  assert.equal(calculateSubtitleDuration('あ', { moraRate: 150, postSpeechDelay: 0 }), 0.2);
});

test('設定の保存と再読込でディレイを保持し、不正な旧データは800ミリ秒で補う', () => {
  const character = JSON.parse(JSON.stringify({ postSpeechDelay: 350 }));
  assert.equal(getPostSpeechDelay(character), 350);
  for (const value of [undefined, null, -1, NaN, Infinity, '']) {
    assert.equal(getPostSpeechDelay({ postSpeechDelay: value }), 800);
  }
});
