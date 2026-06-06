/**
 * アプリケーション設定（定数）
 */
export const CONFIG = {
  APP_NAME: 'GJ-Voiplotter',
  VERSION: 'a.00',
  LAYER_COUNT: 5,           // タイムラインのレイヤー階層数
  LAYER_HEIGHT: 44,         // 1レイヤーあたりの高さ(px)
  LONG_TAP_DURATION_MS: 500, // ロングタップを判定する時間(ミリ秒)
  FRAME_RATE: 30            // プレビューの基本フレームレート
};

/**
 * 状態管理
 */
export const state = {
  characters: [],
  selectedCharId: '',
  PIN_CHAR_ID: 'pin-item', // ピンアイテム用の特別なID
  selectedLayerIndex: 0, // 現在選択されているレイヤー
  selectedSubtitleId: null, // 現在選択されている字幕のID
  subtitles: [],
  currentTime: 0,
  pixelsPerSecond: 100, // 1秒 = 100px
  isVideoLoaded: false
};
