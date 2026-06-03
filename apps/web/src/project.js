import { state } from './config.js';
import { renderSubtitles } from './timeline.js';
import { initCharSelector, persistCharacters, updateSelectionUI } from './main.js';
import { saveHistory } from './history.js';
import { isTauri } from './lib/env.js';

let tauriFs = null;
let tauriPath = null;

async function ensureTauri() {
  if (isTauri() && !tauriFs) {
    try {
      tauriFs = await import('@tauri-apps/plugin-fs');
      tauriPath = await import('@tauri-apps/api/path');
    } catch (e) {
      console.error('Tauri API の読み込みに失敗しました:', e);
    }
  }
}

const AUTOSAVE_KEY = 'gj_autosave_project';
const AUTOSAVE_FILENAME = 'autosave_project.json';
let lastSavedJson = '';

/**
 * プロジェクトを自動保存する
 */
export async function autoSaveProject() {
  const projectData = {
    version: "1.0",
    characters: state.characters,
    subtitles: state.subtitles
  };
  const jsonStr = JSON.stringify(projectData);
  
  if (jsonStr === lastSavedJson) return; // 変更がない場合はスキップ
  lastSavedJson = jsonStr;
  
  // LocalStorageに保存
  localStorage.setItem(AUTOSAVE_KEY, jsonStr);

  // Tauriの場合は設定ディレクトリに保存
  await ensureTauri();
  if (isTauri() && tauriFs && tauriPath) {
    try {
      const configDir = await tauriPath.appConfigDir();
      const dirExists = await tauriFs.exists(configDir);
      if (!dirExists) {
        await tauriFs.mkdir(configDir, { recursive: true });
      }
      const filePath = await tauriPath.join(configDir, AUTOSAVE_FILENAME);
      await tauriFs.writeTextFile(filePath, jsonStr);
    } catch (e) {
      console.error('Tauriでの自動保存に失敗:', e);
    }
  }
}

/**
 * 自動保存されたプロジェクトを読み込む
 */
export async function loadAutoSavedProject() {
  await ensureTauri();
  if (isTauri() && tauriFs && tauriPath) {
    try {
      const configDir = await tauriPath.appConfigDir();
      const filePath = await tauriPath.join(configDir, AUTOSAVE_FILENAME);
      if (await tauriFs.exists(filePath)) {
        const content = await tauriFs.readTextFile(filePath);
        lastSavedJson = content;
        return JSON.parse(content);
      }
    } catch (e) {
      // 無視
    }
  }
  
  const cached = localStorage.getItem(AUTOSAVE_KEY);
  if (cached) {
    try {
      lastSavedJson = cached;
      return JSON.parse(cached);
    } catch (e) {
      // パースエラー
    }
  }
  return null;
}

/**
 * 自動保存データを削除する
 */
export async function clearAutoSavedProject() {
  localStorage.removeItem(AUTOSAVE_KEY);
  lastSavedJson = '';
  
  await ensureTauri();
  if (isTauri() && tauriFs && tauriPath) {
    try {
      const configDir = await tauriPath.appConfigDir();
      const filePath = await tauriPath.join(configDir, AUTOSAVE_FILENAME);
      if (await tauriFs.exists(filePath)) {
        await tauriFs.remove(filePath);
      }
    } catch (e) {
      // 無視
    }
  }
}

export function setupProjectEvents() {
  const saveBtn = document.getElementById('save-project');
  const loadInput = document.getElementById('load-project');
  const clearBtn = document.getElementById('clear-project');

  saveBtn.onclick = () => {
    const projectData = {
      version: "1.0",
      characters: state.characters,
      subtitles: state.subtitles
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    downloadJson(jsonStr, 'project.json');
  };

  loadInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.characters && data.subtitles) {
          saveHistory(); // 読み込み前に履歴保存
          state.characters = data.characters;
          state.subtitles = data.subtitles;
          
          // UI state reset
          state.selectedSubtitleId = null;
          if (state.characters.length > 0) {
            state.selectedCharId = state.characters[0].id;
          }
          
          // Update UI
          initCharSelector();
          renderSubtitles();
          updateSelectionUI();
          persistCharacters(); // persist to localStorage
          
          alert('プロジェクトを読み込みました。\n※必要に応じて参照動画を再度選択してください。');
        } else {
          alert('無効なプロジェクトファイルです。');
        }
      } catch (err) {
        console.error(err);
        alert('プロジェクトファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    // Reset input value to allow reloading the same file
    e.target.value = '';
  };

  if (clearBtn) {
    clearBtn.onclick = async () => {
      if (confirm('プロジェクトをクリアしますか？\n（字幕データなどがすべて削除されます）')) {
        saveHistory(); // クリア前に履歴保存
        state.subtitles = [];
        state.selectedSubtitleId = null;
        
        await clearAutoSavedProject();
        
        renderSubtitles();
        updateSelectionUI();
      }
    };
  }
  
  // 定期的な自動保存の開始 (5秒ごと)
  setInterval(autoSaveProject, 5000);
}

function downloadJson(jsonContent, filename) {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

