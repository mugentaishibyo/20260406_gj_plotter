/**
 * 日本語テキストのモーラ数（拍数）を計算する簡易ユーティリティ
 */
export function countMoras(text) {
  if (!text) return 0;

  // カタカナをひらがなに変換（正規化）
  let normalized = text.replace(/[\u30a1-\u30f6]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });

  // 不要な文字（記号、空白、読点など）を除去
  // ※句読点にはポーズが入る場合があるが、ここでは「発話時間」のための純粋なモーラ数を数える
  normalized = normalized.replace(/[、。！？\s\t\n!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');

  if (!normalized) return 0;

  // モーラ計算のメインロジック
  // 1. 拗音（ゃ、ゅ、ょ、ゎ）をカウントから除外する（前の文字とセットで1モーラ）
  // 2. その他の文字はすべて1モーラとしてカウント
  const youonRegex = /[ゃゅょゎャュョヮ]/g;
  const totalChars = normalized.length;
  const youonCount = (normalized.match(youonRegex) || []).length;

  return totalChars - youonCount;
}
