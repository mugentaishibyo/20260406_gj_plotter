import { CONFIG, state } from './config.js';
import { advanceVideoTime, getCurrentDuration } from './video.js';
import { updateSelectionUI } from './main.js';
import { saveHistory } from './history.js';
import { extractBaseText } from './lib/mora-counter.js';

const timelineContainer = document.getElementById('timeline-container');
const timelineContent = document.getElementById('timeline-content');
const playhead = document.getElementById('playhead');

/**
 * タイムライン用のレイヤー（行）を初期化
 */
export function initLayers() {
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
      // 子要素（字幕アイテムなど）がクリックされた場合は無視
      if (e.target !== layerDiv && e.target !== timelineContent && e.target.className !== 'timeline-layer-grid') return;
      
      state.selectedLayerIndex = i;
      document.querySelectorAll('.timeline-layer').forEach((el, index) => {
        el.classList.toggle('selected', index === i);
      });
    };

    timelineContent.insertBefore(layerDiv, timelineContent.firstChild);
  }
}

/**
 * タイムラインの再生ヘッドとスクロール位置を更新
 */
export function updateTimeline() {
  const duration = getCurrentDuration();
  if (duration > 0) {
    timelineContent.style.width = `${duration * state.pixelsPerSecond + 1000}px`;
  }

  const pos = state.currentTime * state.pixelsPerSecond;
  playhead.style.left = `${pos}px`;
  
  // モバイル向けの自動センタースクロール (再生時のみ、手動スクロール中は邪魔しないのが理想だが簡易実装)
  // timelineContainer.scrollLeft = pos - timelineContainer.clientWidth / 4;
}

/**
 * 字幕アイテムの描画とドラッグ＆ドロップ制御
 */
export function renderSubtitles() {
  const items = timelineContent.querySelectorAll('.subtitle-item');
  items.forEach(i => i.remove());

  state.subtitles.sort((a, b) => a.startTime - b.startTime).forEach(sub => {
    const div = document.createElement('div');
    div.className = 'subtitle-item';
    if (sub.id === state.selectedSubtitleId) {
      div.classList.add('selected');
    }
    if (sub.isPin) {
      div.classList.add('pin-item');
    }
    div.style.left = `${sub.startTime * state.pixelsPerSecond}px`;
    div.style.width = `${sub.duration * state.pixelsPerSecond}px`;
    div.style.backgroundColor = sub.charColor + '99';
    div.style.borderColor = sub.charColor;
    div.style.top = `${sub.layer * CONFIG.LAYER_HEIGHT}px`;
    div.style.height = `${CONFIG.LAYER_HEIGHT - 6}px`;

    const displayText = extractBaseText(sub.text);
    div.textContent = sub.isPin ? `📌 ${displayText}` : `[${sub.charName}] ${displayText}`;
    div.dataset.id = sub.id;

    setupDragAndDrop(div, sub);
    
    timelineContent.appendChild(div);
  });
}

function setupDragAndDrop(div, sub) {
  let longTapTimer = null;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let moved = false;

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    e.stopPropagation();
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseFloat(div.style.left) || 0;
    initialTop = parseFloat(div.style.top) || 0;
    moved = false;

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
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 5 || dy > 5) moved = true;

    if (!isDragging) {
      if (moved) {
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

    if (!isDragging) {
      // 移動していなければクリック（選択）として扱う
      if (!moved) {
        state.selectedSubtitleId = (state.selectedSubtitleId === sub.id) ? null : sub.id;
        renderSubtitles();
        updateSelectionUI();
      }
      return;
    }

    isDragging = false;
    div.classList.remove('dragging');

    saveHistory();
    const newLeft = parseFloat(div.style.left);
    let newTime = newLeft / state.pixelsPerSecond;
    if (newTime < 0) newTime = 0;

    const newTop = parseFloat(div.style.top) + (CONFIG.LAYER_HEIGHT / 2);
    let newLayer = Math.floor(newTop / CONFIG.LAYER_HEIGHT);
    if (newLayer < 0) newLayer = 0;
    if (newLayer >= CONFIG.LAYER_COUNT) newLayer = CONFIG.LAYER_COUNT - 1;

    const subIndex = state.subtitles.findIndex(s => s.id === sub.id);
    if (subIndex !== -1) {
      state.subtitles[subIndex].startTime = newTime;
      state.subtitles[subIndex].layer = newLayer;
    }
    
    renderSubtitles();
    // 移動後も選択状態を維持（必要に応じて）
    if (state.selectedSubtitleId === sub.id) {
      updateSelectionUI();
    }
  };

  const onPointerUp = (e) => finalizeDrag(e);
  const onPointerCancel = (e) => finalizeDrag(e);

  div.addEventListener('pointerdown', onPointerDown);
}

/**
 * タイムラインのシーク制御とネイティブスクロール
 */
export function setupTimelineEvents() {
  // マニュアルでのポインターイベントによるスクロール処理を削除し、
  // CSSの overflow-x: auto によるネイティブスクロールに任せることで、
  // スマートフォンでの怪しいスクロール挙動を解消します。

  timelineContainer.addEventListener('click', (e) => {
    // 字幕アイテム以外の場所がクリックされたか確認（余白のタップでシーク）
    if (e.target !== timelineContainer && e.target !== timelineContent && e.target.className !== 'timeline-layer-grid' && !e.target.classList.contains('timeline-layer')) return;

    const rect = timelineContent.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    let time = offsetX / state.pixelsPerSecond;
    if (time < 0) time = 0;
    
    advanceVideoTime(time);
    
    // 他の箇所がタップされたら選択解除する
    if (state.selectedSubtitleId !== null) {
      state.selectedSubtitleId = null;
      renderSubtitles();
      updateSelectionUI();
    }
  });
}
