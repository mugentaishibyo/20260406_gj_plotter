import { state } from './config.js';

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;
let refreshCallback = () => {};

/**
 * 履歴管理の初期化
 * @param {Function} cb - 状態復元後に実行するUI更新用のコールバック
 */
export function initHistory(cb) {
  refreshCallback = cb;
}

/**
 * 現在の状態をスナップショットとして保存
 */
export function saveHistory() {
  const snapshot = {
    subtitles: JSON.parse(JSON.stringify(state.subtitles)),
    characters: JSON.parse(JSON.stringify(state.characters)),
    selectedSubtitleId: state.selectedSubtitleId
  };
  
  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  // 新しい操作が行われたらリドゥスタックをクリア
  redoStack.length = 0;
}

/**
 * アンドゥ実行
 */
export function undo() {
  if (undoStack.length === 0) return;
  
  // 現在の状態をリドゥスタックへ
  const currentSnapshot = {
    subtitles: JSON.parse(JSON.stringify(state.subtitles)),
    characters: JSON.parse(JSON.stringify(state.characters)),
    selectedSubtitleId: state.selectedSubtitleId
  };
  redoStack.push(currentSnapshot);
  
  // 履歴から復元
  const previousState = undoStack.pop();
  applyState(previousState);
}

/**
 * リドゥ実行
 */
export function redo() {
  if (redoStack.length === 0) return;
  
  // 現在の状態をアンドゥスタックへ
  const currentSnapshot = {
    subtitles: JSON.parse(JSON.stringify(state.subtitles)),
    characters: JSON.parse(JSON.stringify(state.characters)),
    selectedSubtitleId: state.selectedSubtitleId
  };
  undoStack.push(currentSnapshot);
  
  // 履歴から復元
  const nextState = redoStack.pop();
  applyState(nextState);
}

function applyState(snapshot) {
  state.subtitles = snapshot.subtitles;
  state.characters = snapshot.characters;
  state.selectedSubtitleId = snapshot.selectedSubtitleId;
  
  if (refreshCallback) {
    refreshCallback();
  }
}
