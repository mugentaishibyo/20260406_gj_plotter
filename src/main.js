import './style.css';
import { state, CONFIG } from './config.js';
import { setupVideoEvents, advanceVideoTime } from './video.js';
import { initLayers, renderSubtitles, setupTimelineEvents } from './timeline.js';
import { setupExportEvents } from './export.js';
import { countMoras } from './lib/mora-counter.js';
import { setupJogWheel } from './jog-wheel.js';
import { setupProjectEvents } from './project.js';

// 入力関連のDOM要素
const charSelector = document.getElementById('char-selector');
const textInput = document.getElementById('text-input');
const addBtn = document.getElementById('add-btn');

// モーダル関連のDOM要素
const charModal = document.getElementById('char-modal');
const modalTitle = document.getElementById('modal-title');
const charNameInput = document.getElementById('char-name');
const charColorInput = document.getElementById('char-color');
const charMoraRateInput = document.getElementById('char-mora-rate');
const charSpeechRateInput = document.getElementById('char-speech-rate');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalDeleteBtn = document.getElementById('modal-delete-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');

let editingCharId = null; // 編集中のキャラクターID (新規作成時はnull)

/**
 * 初期化: キャラクターセレクターの生成
 */
export function initCharSelector() {
  charSelector.innerHTML = '';
  state.characters.forEach(char => {
    const btn = document.createElement('button');
    btn.className = `char-btn ${char.id === state.selectedCharId ? 'active' : ''}`;
    btn.textContent = char.name;
    btn.style.borderColor = char.color;
    btn.dataset.id = char.id;

    // ロングタップ検知用の変数
    let pressTimer;
    let isLongPress = false;

    const startPress = (e) => {
      // 右クリックや修飾キー付きクリックは除外
      if (e.type === 'mousedown' && e.button !== 0) return;
      
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        openCharModal(char.id);
      }, CONFIG.LONG_TAP_DURATION_MS);
    };

    const cancelPress = () => {
      clearTimeout(pressTimer);
    };

    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('touchstart', startPress, { passive: true });
    btn.addEventListener('mouseup', cancelPress);
    btn.addEventListener('mouseleave', cancelPress);
    btn.addEventListener('touchend', cancelPress);
    btn.addEventListener('touchcancel', cancelPress);

    btn.onclick = (e) => {
      // ロングタップ後はクリックイベントを発火させない
      if (isLongPress) return;
      
      state.selectedCharId = char.id;
      document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    charSelector.appendChild(btn);
  });

  // 追加ボタン
  const addCharBtn = document.createElement('button');
  addCharBtn.className = 'add-char-btn';
  addCharBtn.innerHTML = '+';
  addCharBtn.onclick = () => openCharModal();
  charSelector.appendChild(addCharBtn);
}

/**
 * モーダルを開く
 * @param {string|null} charId - 編集するキャラクターID。nullの場合は新規作成。
 */
function openCharModal(charId = null) {
  editingCharId = charId;
  const char = state.characters.find(c => c.id === charId);

  if (char) {
    modalTitle.textContent = 'キャラクター設定の編集';
    charNameInput.value = char.name;
    charColorInput.value = char.color;
    charMoraRateInput.value = char.moraRate || 0.15;
    charSpeechRateInput.value = char.speechRate || 1.0;
    modalDeleteBtn.style.display = 'block';
  } else {
    modalTitle.textContent = '新規キャラクター追加';
    charNameInput.value = '';
    charColorInput.value = '#646cff';
    charMoraRateInput.value = 0.15;
    charSpeechRateInput.value = 1.0;
    modalDeleteBtn.style.display = 'none';
  }

  charModal.classList.add('active');
}

/**
 * モーダルを閉じる
 */
function closeCharModal() {
  charModal.classList.remove('active');
  editingCharId = null;
}

/**
 * キャラクター設定をLocalStorageに保存
 */
export function persistCharacters() {
  localStorage.setItem('ymm_characters', JSON.stringify(state.characters));
}

/**
 * キャラクター設定を保存
 */
function saveCharacter() {
  const name = charNameInput.value.trim();
  if (!name) return alert('名前を入力してください');

  const newChar = {
    id: editingCharId || `char-${Date.now()}`,
    name,
    color: charColorInput.value,
    moraRate: parseFloat(charMoraRateInput.value),
    speechRate: parseFloat(charSpeechRateInput.value)
  };

  if (editingCharId) {
    const index = state.characters.findIndex(c => c.id === editingCharId);
    state.characters[index] = newChar;
  } else {
    state.characters.push(newChar);
    if (!state.selectedCharId) {
      state.selectedCharId = newChar.id;
    }
  }

  initCharSelector();
  closeCharModal();
  persistCharacters();
}

/**
 * キャラクターを削除
 */
function deleteCharacter() {
  if (!editingCharId) return;
  if (!confirm('このキャラクターを削除しますか？')) return;

  state.characters = state.characters.filter(c => c.id !== editingCharId);
  if (state.selectedCharId === editingCharId) {
    state.selectedCharId = state.characters[0]?.id || '';
  }

  initCharSelector();
  closeCharModal();
  persistCharacters();
}

// モーダルイベントバインディング
modalCancelBtn.onclick = closeCharModal;
modalSaveBtn.onclick = saveCharacter;
modalDeleteBtn.onclick = deleteCharacter;
charModal.onclick = (e) => {
  if (e.target === charModal) closeCharModal();
};

/**
 * 選択状態のUI更新
 */
export function updateSelectionUI() {
  const selectedSub = state.subtitles.find(s => s.id === state.selectedSubtitleId);
  if (selectedSub) {
    textInput.value = selectedSub.text;
    addBtn.textContent = '編集';
    
    // キャラクターの選択状態も同期
    if (selectedSub.isPin) {
      state.selectedCharId = state.PIN_CHAR_ID;
      document.querySelectorAll('.char-btn, .pin-btn').forEach(b => {
        b.classList.toggle('active', b.classList.contains('pin-btn'));
      });
    } else {
      const char = state.characters.find(c => c.name === selectedSub.charName);
      if (char) {
        state.selectedCharId = char.id;
        document.querySelectorAll('.char-btn, .pin-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.id === char.id);
        });
      }
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
  setupProjectEvents();
  setupJogWheel();
  initLayers(); // レイヤーDOM初期化

  // キャラクター設定読み込み
  try {
    const cached = localStorage.getItem('ymm_characters');
    if (cached) {
      state.characters = JSON.parse(cached);
    } else {
      const response = await fetch('./characters.json');
      state.characters = await response.json();
    }
    
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
