import { state } from './config.js';
import { renderSubtitles } from './timeline.js';
import { initCharSelector, persistCharacters, updateSelectionUI } from './main.js';

export function setupProjectEvents() {
  const saveBtn = document.getElementById('save-project');
  const loadInput = document.getElementById('load-project');

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
