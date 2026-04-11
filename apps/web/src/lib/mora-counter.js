/**
 * 日本語テキストのモーラ数（拍数）を計算する簡易ユーティリティ
 */
/**
 * 青空文庫記法から「読み仮名（よみ）」を抽出する関数
 */
export function extractReading(text) {
  if (!text) return '';
  return text
    .replace(/\|([^《]+)《([^》]+)》/g, "$2")
    .replace(/([一-龠々]+)《([^》]+)》/g, "$2");
}

/**
 * 青空文庫記法から「ベース文字（元の漢字など）」を抽出する関数
 */
export function extractBaseText(text) {
  if (!text) return '';
  return text
    .replace(/\|([^《]+)《([^》]+)》/g, "$1")
    .replace(/([一-龠々]+)《([^》]+)》/g, "$1");
}

export function countMoras(text) {
  if (!text) return 0;

  // 青空文庫記法のルビを処理（読み仮名を抽出）してモーラ計算の対象とする
  const processedText = extractReading(text);

  // カタカナをひらがなに変換（正規化）
  let normalized = processedText.replace(/[\u30a1-\u30f6]/g, (match) => {
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
