/**
 * 実行環境の判定ユーティリティ
 */

/**
 * Tauri環境（デスクトップアプリ）かどうかを判定
 * @returns {boolean}
 */
export function isTauri() {
  return !!(window && window.__TAURI_INTERNALS__);
}

/**
 * Webブラウザ環境かどうかを判定
 * @returns {boolean}
 */
export function isWeb() {
  return !isTauri();
}
