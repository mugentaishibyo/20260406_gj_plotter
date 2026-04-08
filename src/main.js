import './style.css';
import { state } from './config.js';
import { setupVideoEvents, advanceVideoTime } from './video.js';
import { initLayers, renderSubtitles, setupTimelineEvents } from './timeline.js';
import { setupExportEvents } from './export.js';
import { countMoras } from './lib/mora-counter.js';
import { setupJogWheel } from './jog-wheel.js';

// 入力関連のDOM要素
const charSelector = document.getElementById('char-selector');
const textInput = document.getElementById('text-input');
const addBtn = document.getElementById('add-btn');

/**
 * 初期化: キャラクターセレクターの生成
 */
function initCharSelector() {
  charSelector.innerHTML = '';
  state.characters.forEach(char => {
    const btn = document.createElement('button');
    btn.className = `char-btn ${char.id === state.selectedCharId ? 'active' : ''}`;
    btn.textContent = char.name;
    btn.style.borderColor = char.color;
    btn.dataset.id = char.id;
    btn.onclick = () => {
      state.selectedCharId = char.id;
      document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    charSelector.appendChild(btn);
  });
}

/**
 * 選択状態のUI更新
 */
export function updateSelectionUI() {
  const selectedSub = state.subtitles.find(s => s.id === state.selectedSubtitleId);
  if (selectedSub) {
    textInput.value = selectedSub.text;
    addBtn.textContent = '編集';
    
    // キャラクターの選択状態も同期
    const char = state.characters.find(c => c.name === selectedSub.charName);
    if (char) {
      state.selectedCharId = char.id;
      document.querySelectorAll('.char-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.id === char.id);
      });
    }
    // レイヤーの選択状態も同期
    state.selectedLayerIndex = selectedSub.layer;
    document.querySelectorAll('.timeline-layer').forEach((el, index) => {
      el.classList.toggle('selected', index === selectedSub.layer);
    });
  } else {
    textInput.value = '';
    addBtn.textContent = '追加';
  }
}

/**
 * 字幕アイテムの追加または編集
 */
function addOrEditSubtitle() {
  const text = textInput.value.trim();
  if (!text) return;

  const char = state.characters.find(c => c.id === state.selectedCharId);
  const moras = countMoras(text);
  const moraLength = moras * (char.moraRate || 0.15);
  const speechRate = char.speechRate || 1.0;
  const duration = Math.max(0.2, moraLength / speechRate); // 最低0.2秒

  if (state.selectedSubtitleId) {
    // 編集モード
    const index = state.subtitles.findIndex(s => s.id === state.selectedSubtitleId);
    if (index !== -1) {
      state.subtitles[index] = {
        ...state.subtitles[index],
        text,
        duration,
        charName: char.name,
        charColor: char.color,
        layer: state.selectedLayerIndex
      };
      // 編集後は選択解除
      state.selectedSubtitleId = null;
      updateSelectionUI();
    }
  } else {
    // 新規追加モード
    const startTime = state.currentTime;
    const subtitle = {
      id: Date.now(),
      startTime,
      duration,
      layer: state.selectedLayerIndex,
      charName: char.name,
      charColor: char.color,
      text
    };
    state.subtitles.push(subtitle);
    advanceVideoTime(startTime + duration);
  }

  renderSubtitles();
  textInput.value = '';
}

// イベントバインディング
addBtn.onclick = addOrEditSubtitle;
textInput.onkeydown = (e) => {
  if (e.key === 'Enter') addOrEditSubtitle();
};

/**
 * アプリのメイン初期化ルーチン
 */
async function init() {
  // 各モジュールのイベントをセットアップ
  setupVideoEvents();
  setupTimelineEvents();
  setupExportEvents();
  setupJogWheel();
  initLayers(); // レイヤーDOM初期化

  // キャラクター設定読み込み
  try {
    const response = await fetch('./characters.json');
    state.characters = await response.json();
    if (state.characters.length > 0) {
      state.selectedCharId = state.characters[0].id;
    }
    initCharSelector();
  } catch (error) {
    console.error('キャラクター設定の読み込みに失敗しました:', error);
  }
}

// 起動
init();
