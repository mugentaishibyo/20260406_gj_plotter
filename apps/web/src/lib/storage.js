import { isTauri } from './env.js';

// Tauri API のダイナミックインポート（Web環境でのエラー防止）
let tauriFs, tauriPath;
if (isTauri()) {
  try {
    tauriFs = await import('@tauri-apps/plugin-fs');
    tauriPath = await import('@tauri-apps/api/path');
  } catch (e) {
    console.error('Tauri API の読み込みに失敗しました:', e);
  }
}

const STORAGE_KEY = 'ymm_characters';
const SETTINGS_FILENAME = 'character_settings.json';

/**
 * キャラクター設定の読み込み
 * @returns {Promise<Array|null>}
 */
export async function loadCharacterSettings() {
  if (isTauri() && tauriFs && tauriPath) {
    try {
      const configDir = await tauriPath.appConfigDir();
      const filePath = await tauriPath.join(configDir, SETTINGS_FILENAME);
      
      const fileExists = await tauriFs.exists(filePath);
      if (fileExists) {
        const content = await tauriFs.readTextFile(filePath);
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('Tauriでの設定読み込みに失敗:', e);
    }
  }

  // Web環境またはTauri失敗時のフォールバック
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error('LocalStorageのパースに失敗:', e);
    }
  }
  return null;
}

/**
 * キャラクター設定の保存
 * @param {Array} data 
 */
export async function saveCharacterSettings(data) {
  if (!data) return;

  // 常にLocalStorageにも保存（冗長性のため）
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  if (isTauri() && tauriFs && tauriPath) {
    try {
      const configDir = await tauriPath.appConfigDir();
      
      // ディレクトリが存在しない場合は作成
      const dirExists = await tauriFs.exists(configDir);
      if (!dirExists) {
        await tauriFs.mkdir(configDir, { recursive: true });
      }

      const filePath = await tauriPath.join(configDir, SETTINGS_FILENAME);
      await tauriFs.writeTextFile(filePath, JSON.stringify(data, null, 2));
      console.log('Tauri環境での保存完了:', filePath);
    } catch (e) {
      console.error('Tauriでの設定保存に失敗:', e);
    }
  }
}

/**
 * 設定データのインポート（ファイル選択用）
 * @param {File} file 
 * @returns {Promise<Array>}
 */
export async function importSettingsFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error('JSONの形式が正しくありません'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
}

/**
 * 設定データのエクスポート（ファイルダウンロード用）
 * @param {Array} data 
 */
export function exportSettingsToFile(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = SETTINGS_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
