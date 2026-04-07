import './style.css';
import { countMoras } from './lib/mora-counter.js';

/**
 * 状態管理
 */
const state = {
  characters: [],
  selectedCharId: '',
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
}

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
 * 字幕の描画
 */
function renderSubtitles() {
  // 既存のアイテムを削除（playhead以外）
  const items = timelineContent.querySelectorAll('.subtitle-item');
  items.forEach(i => i.remove());

  state.subtitles.sort((a, b) => a.startTime - b.startTime).forEach(sub => {
    const div = document.createElement('div');
    div.className = 'subtitle-item';
    div.style.left = `${sub.startTime * state.pixelsPerSecond}px`;
    div.style.width = `${sub.duration * state.pixelsPerSecond}px`;
    div.style.backgroundColor = sub.charColor + '99'; // 透明度追加
    div.style.borderColor = sub.charColor;
    div.style.top = '10px'; // とりあえず1行目
    div.textContent = `[${sub.charName}] ${sub.text}`;
    
    // 長押しで削除などの機能は今後検討
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

// 初期化実行: キャラクター設定を読み込む
async function init() {
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
