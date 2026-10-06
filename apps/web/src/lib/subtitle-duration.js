import { countMoras } from './mora-counter.js';

export const DEFAULT_POST_SPEECH_DELAY = 800;

export function getPostSpeechDelay(character) {
  const delay = character.postSpeechDelay;
  return Number.isFinite(delay) && delay >= 0 ? delay : DEFAULT_POST_SPEECH_DELAY;
}

/** 話速を反映した発話時間にディレイを加え、秒単位のアイテム長を返す。 */
export function calculateSubtitleDuration(text, character) {
  const moraLengthMs = countMoras(text) * (character.moraRate || 150);
  const speechRate = character.speechRate || 1.0;
  return Math.max(0.2, (moraLengthMs / speechRate + getPostSpeechDelay(character)) / 1000);
}
