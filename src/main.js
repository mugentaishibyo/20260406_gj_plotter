import './style.css';
import { countMoras } from './lib/mora-counter.js';

/**
 * アプリケーション設定（定数）
 */
const CONFIG = {
  LAYER_COUNT: 5,           // タイムラインのレイヤー階層数
  LAYER_HEIGHT: 44,         // 1レイヤーあたりの高さ(px)
  LONG_TAP_DURATION_MS: 500 // ロングタップを判定する時間(ミリ秒)
};

/**
 * 状態管理
 */
const state = {
  characters: [],
  selectedCharId: '',
  selectedLayerIndex: 0, // 現在選択されているレイヤー
  subtitles: [],
  currentTime: 0,
  pixelsPerSecond: 100, // 1秒 = 100px
  isVideoLoaded: false
};

// DOM要素の取得
const videoPreview = document.getElementById('video-preview');
const videoFile = document.getElementById('video-file');
const videoOverlay = document.getElementById('video-overlay');
const currentTimeDisplay = document.getElementById('current-time-display');
const timelineContainer = document.getElementById('timeline-container');
const timelineContent = document.getElementById('timeline-content');
const playhead = document.getElementById('playhead');
const charSelector = document.getElementById('char-selector');
const textInput = document.getElementById('text-input');
const addBtn = document.getElementById('add-btn');
const exportTimelineBtn = document.getElementById('export-timeline');
const exportScriptBtn = document.getElementById('export-script');
const subtitleOverlay = document.getElementById('subtitle-overlay');
const playPauseBtn = document.getElementById('play-pause-btn');
const controlsOverlay = document.getElementById('controls-overlay');

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
 * 動画ファイルの読み込み
 */
videoFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    videoPreview.src = url;
    videoOverlay.style.display = 'none';
    controlsOverlay.style.display = 'flex'; // 再生ボタンを表示
    state.isVideoLoaded = true;
    
    videoPreview.onloadedmetadata = () => {
      const duration = videoPreview.duration;
      timelineContent.style.width = `${duration * state.pixelsPerSecond + 1000}px`;
    };
  }
});

/**
 * 再生時間の更新同期
 */
videoPreview.addEventListener('timeupdate', () => {
  state.currentTime = videoPreview.currentTime;
  updateTimeline();
});

function updateTimeline() {
  const pos = state.currentTime * state.pixelsPerSecond;
  playhead.style.left = `${pos}px`;
  
  // 再生位置が中心に来るようにスクロール（モバイルの操作感を重視）
  const containerWidth = timelineContainer.clientWidth;
  timelineContainer.scrollLeft = pos - containerWidth / 4;

  // 時間表示の更新
  const format = (t) => {
    const h = Math.floor(t / 3600).toString().padStart(2, '0');
    const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    const ms = Math.floor((t % 1) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  };
  currentTimeDisplay.textContent = format(state.currentTime);

  // 字幕の更新
  updateSubtitleDisplay();
}

/**
 * 動画プレビュー上の字幕を更新
 */
function updateSubtitleDisplay() {
  const currentSub = state.subtitles.find(sub => 
    state.currentTime >= sub.startTime && 
    state.currentTime <= sub.startTime + sub.duration
  );

  if (currentSub) {
    subtitleOverlay.textContent = currentSub.text;
    subtitleOverlay.style.color = currentSub.charColor;
    subtitleOverlay.style.display = 'block';
  } else {
    subtitleOverlay.style.display = 'none';
  }
}

/**
 * 再生 / 一時停止の切り替え
 */
function togglePlay() {
  if (!state.isVideoLoaded) return;
  
  if (videoPreview.paused) {
    videoPreview.play();
    playPauseBtn.textContent = '⏸';
  } else {
    videoPreview.pause();
    playPauseBtn.textContent = '▶';
  }
}

playPauseBtn.onclick = togglePlay;
// ビデオ本体のクリックでも切り替え（モバイルを考慮）
videoPreview.onclick = togglePlay;

/**
 * 字幕アイテムの追加
 */
function addSubtitle() {
  const text = textInput.value.trim();
  if (!text) return;

  const char = state.characters.find(c => c.id === state.selectedCharId);
  const moras = countMoras(text);
  const moraLength = moras * (char.moraRate || 0.15); // モーラ長
  const speechRate = char.speechRate || 1.0; // 話速
  const duration = Math.max(0.2, moraLength / speechRate); // 最低0.2秒
  
  // YMM4のように、現在の再生ヘッド位置から配置
  // もし前のアイテムと被る場合は、前のアイテムの直後に配置するなどの制御も可能だが、
  // 今回は「現在位置」を基準にする。
  const startTime = state.currentTime;

  const subtitle = {
    id: Date.now(),
    startTime,
    duration,
    layer: state.selectedLayerIndex, // レイヤー情報を追加
    charName: char.name,
    charColor: char.color,
    text
  };

  state.subtitles.push(subtitle);
  renderSubtitles();
  
  // 入力欄をクリア
  textInput.value = '';
  
  // 再生ヘッドをアイテムの終了位置まで進める（連続入力のため）
  videoPreview.currentTime = startTime + duration;
}

addBtn.onclick = addSubtitle;

// Enterキーでも追加
textInput.onkeydown = (e) => {
  if (e.key === 'Enter') {
    addSubtitle();
  }
};

/**
 * 字幕の描画とドラッグイベントの設定
 */
function renderSubtitles() {
  // 既存のアイテムを削除（playheadとlayer-grid以外）
  const items = timelineContent.querySelectorAll('.subtitle-item');
  items.forEach(i => i.remove());

  state.subtitles.sort((a, b) => a.startTime - b.startTime).forEach(sub => {
    const div = document.createElement('div');
    div.className = 'subtitle-item';
    div.style.left = `${sub.startTime * state.pixelsPerSecond}px`;
    div.style.width = `${sub.duration * state.pixelsPerSecond}px`;
    div.style.backgroundColor = sub.charColor + '99';
    div.style.borderColor = sub.charColor;
    div.style.top = `${sub.layer * CONFIG.LAYER_HEIGHT}px`; // レイヤー位置に配置
    div.textContent = `[${sub.charName}] ${sub.text}`;
    div.dataset.id = sub.id;

    // ドラッグ＆ドロップ（ロングタップ）イベントの実装
    let longTapTimer = null;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onPointerDown = (e) => {
      // 左クリックまたはタッチのみ
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      
      e.stopPropagation(); // タイムラインのシーク発火を防ぐ
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = parseFloat(div.style.left) || 0;
      initialTop = parseFloat(div.style.top) || 0;

      // ロングタップ判定を開始
      longTapTimer = setTimeout(() => {
        isDragging = true;
        div.classList.add('dragging');
        div.setPointerCapture(e.pointerId);
      }, CONFIG.LONG_TAP_DURATION_MS);

      div.addEventListener('pointermove', onPointerMove);
      div.addEventListener('pointerup', onPointerUp);
      div.addEventListener('pointercancel', onPointerCancel);
    };

    const updatePosition = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      div.style.left = `${initialLeft + dx}px`;
      div.style.top = `${initialTop + dy}px`;
    };

    const onPointerMove = (e) => {
      // ロングタップ判定前に動いたらキャンセル
      if (!isDragging) {
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > 10 || dy > 10) {
          clearTimeout(longTapTimer);
        }
        return;
      }
      e.preventDefault();
      updatePosition(e);
    };

    const finalizeDrag = (e) => {
      clearTimeout(longTapTimer);
      div.removeEventListener('pointermove', onPointerMove);
      div.removeEventListener('pointerup', onPointerUp);
      div.removeEventListener('pointercancel', onPointerCancel);
      div.releasePointerCapture(e.pointerId);

      if (!isDragging) return; // ロングタップ成立前のクリック等

      isDragging = false;
      div.classList.remove('dragging');

      // 新しい startTime と layer を計算
      const newLeft = parseFloat(div.style.left);
      let newTime = newLeft / state.pixelsPerSecond;
      if (newTime < 0) newTime = 0;

      const newTop = parseFloat(div.style.top) + (CONFIG.LAYER_HEIGHT / 2); // 中心座標で判定
      let newLayer = Math.floor(newTop / CONFIG.LAYER_HEIGHT);
      if (newLayer < 0) newLayer = 0;
      if (newLayer >= CONFIG.LAYER_COUNT) newLayer = CONFIG.LAYER_COUNT - 1;

      // stateの更新
      const subIndex = state.subtitles.findIndex(s => s.id === sub.id);
      if (subIndex !== -1) {
        state.subtitles[subIndex].startTime = newTime;
        state.subtitles[subIndex].layer = newLayer;
      }
      
      // 再描画
      renderSubtitles();
    };

    const onPointerUp = (e) => finalizeDrag(e);
    const onPointerCancel = (e) => finalizeDrag(e);

    div.addEventListener('pointerdown', onPointerDown);
    
    timelineContent.appendChild(div);
  });
}

/**
 * CSVエクスポート
 */
function downloadCSV(csvContent, filename) {
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 with BOM for Excel
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

exportTimelineBtn.onclick = () => {
  // 開始時点, キャラクター名, セリフ
  let csv = '開始時間(秒),キャラクター名,セリフ\n';
  state.subtitles.sort((a, b) => a.startTime - b.startTime).forEach(sub => {
    csv += `${sub.startTime.toFixed(3)},${sub.charName},"${sub.text.replace(/"/g, '""')}"\n`;
  });
  downloadCSV(csv, 'ymm_timeline_design.csv');
};

exportScriptBtn.onclick = () => {
  // キャラクター名, セリフ
  let csv = 'キャラクター名,セリフ\n';
  state.subtitles.sort((a, b) => a.startTime - b.startTime).forEach(sub => {
    csv += `${sub.charName},"${sub.text.replace(/"/g, '""')}"\n`;
  });
  downloadCSV(csv, 'ymm_script.csv');
};

// タイムラインのクリックでシーク
timelineContainer.onclick = (e) => {
  if (e.target !== timelineContainer && e.target !== timelineContent) return;
  const rect = timelineContent.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const time = offsetX / state.pixelsPerSecond;
  videoPreview.currentTime = time;
};

// 初期化実行: レイヤーとキャラクター設定を読み込む
function initLayers() {
  // 古いレイヤーDOMを削除
  timelineContent.querySelectorAll('.timeline-layer').forEach(el => el.remove());

  for (let i = 0; i < CONFIG.LAYER_COUNT; i++) {
    const layerDiv = document.createElement('div');
    layerDiv.className = 'timeline-layer';
    layerDiv.style.top = `${i * CONFIG.LAYER_HEIGHT}px`;
    layerDiv.style.height = `${CONFIG.LAYER_HEIGHT}px`;
    
    if (i === state.selectedLayerIndex) {
      layerDiv.classList.add('selected');
    }

    layerDiv.onclick = (e) => {
      // サブタイトルのクリックが伝播してきた場合は無視
      if (e.target !== layerDiv && e.target !== timelineContent && e.target.className !== 'timeline-layer-grid') return;
      state.selectedLayerIndex = i;
      // UI更新
      document.querySelectorAll('.timeline-layer').forEach((el, index) => {
        el.classList.toggle('selected', index === i);
      });
    };

    timelineContent.insertBefore(layerDiv, timelineContent.firstChild);
  }
}

async function init() {
  initLayers();
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

init();
