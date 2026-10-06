import test from 'node:test';
import assert from 'node:assert/strict';

import { extractBaseText, extractReading } from './mora-counter.js';

test('半角パイプのルビ記法から表示用の本文を抽出する', () => {
  assert.equal(extractBaseText('これは|難読《なんどく》です'), 'これは難読です');
});

test('全角パイプのルビ記法から表示用の本文を抽出する', () => {
  assert.equal(extractBaseText('これは｜難読《なんどく》です'), 'これは難読です');
});

test('半角・全角パイプのルビ記法から読みを抽出する', () => {
  assert.equal(extractReading('|今日《きょう》は｜晴天《せいてん》'), 'きょうはせいてん');
});

test('ルビ記法ではないパイプは表示用テキストに残す', () => {
  assert.equal(extractBaseText('A | B'), 'A | B');
});

test('ルビボタンで作った未入力のルビは本文を保持して記号を除去する', () => {
  assert.equal(extractBaseText('これは|漢字《》です'), 'これは漢字です');
  assert.equal(extractReading('これは|漢字《》です'), 'これは漢字です');
});
