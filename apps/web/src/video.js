import { state } from './config.js';
import { updateTimeline, renderSubtitles, initTimelineWidth } from './timeline.js';
import { extractBaseText } from './lib/mora-counter.js';

// DOM要素
const videoPreview = document.getElementById('video-preview');
const videoFile = document.getElementById('video-file');
const videoOverlay = document.getElementById('video-overlay');
const currentTimeDisplay = document.getElementById('current-time-display');
const subtitleOverlay = document.getElementById('subtitle-overlay');
const pinOverlay = document.getElementById('pin-overlay');
const playPauseBtn = document.getElementById('play-pause-btn');
const controlsOverlay = document.getElementById('controls-overlay');

// Safariを含む各ブラウザのデコーダーに同時シークを重ねないよう、
// 動画要素へは常に最新の要求だけを順番に渡す。
let pendingSeekTime = null;
let seekInFlight = false;
let nextSeekScheduled = false;

function pumpPendingSeek() {
  if (
    seekInFlight ||
    pendingSeekTime === null ||
    videoPreview.readyState === HTMLMediaElement.HAVE_NOTHING
  ) {
    return;
  }

  const targetTime = pendingSeekTime;
  pendingSeekTime = null;

  // 同じ位置への代入では seeked が発火しない実装もあるため、ここで完了扱いにする。
  if (Math.abs(videoPreview.currentTime - targetTime) < 0.0001) {
    requestAnimationFrame(pumpPendingSeek);
    return;
  }

  seekInFlight = true;

  try {
    videoPreview.currentTime = targetTime;
  } catch (error) {
    seekInFlight = false;
    console.warn('動画をシークできませんでした。', error);
    requestAnimationFrame(pumpPendingSeek);
  }
}

function requestVideoSeek(time) {
  pendingSeekTime = time;
  pumpPendingSeek();
}

function scheduleNextSeekAfterPaint() {
  if (pendingSeekTime === null || nextSeekScheduled) return;

  nextSeekScheduled = true;
  let continued = false;

  const continueSeek = () => {
    if (continued) return;
    continued = true;
    nextSeekScheduled = false;
    pumpPendingSeek();
  };

  // 実際の映像フレームがコンポジターへ渡った時点を優先する。
  // 停止中などで通知されない場合も、2描画フレーム後には処理を継続する。
  if (typeof videoPreview.requestVideoFrameCallback === 'function') {
    videoPreview.requestVideoFrameCallback(continueSeek);
    requestAnimationFrame(() => requestAnimationFrame(continueSeek));
  } else {
    requestAnimationFrame(continueSeek);
  }
}

function resetSeekQueue() {
  pendingSeekTime = null;
  seekInFlight = false;
  nextSeekScheduled = false;
}

/**
 * 動画ファイルの読み込み
 */
export function setupVideoEvents() {
  videoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      videoPreview.src = url;
      videoPreview.load();
      videoOverlay.style.display = 'none';
      controlsOverlay.style.display = 'flex'; // 再生ボタンを表示
      state.isVideoLoaded = true;
      
      videoPreview.onloadedmetadata = () => {
        initTimelineWidth();
      };
    }
  });

  videoPreview.addEventListener('timeupdate', () => {
    // 動画の再生中の同期処理
    // シーク中は `advanceVideoTime` 直下の `updateTimeUI` で処理されるが、
    // 動画が実際に再生中の場合のみ state.currentTime をブラウザから同期する
    if (!videoPreview.paused) {
      state.currentTime = videoPreview.currentTime;
      updateTimeUI();
    }
  });

  videoPreview.addEventListener('seeked', () => {
    seekInFlight = false;
    scheduleNextSeekAfterPaint();
  });

  videoPreview.addEventListener('emptied', resetSeekQueue);
  videoPreview.addEventListener('error', resetSeekQueue);

  playPauseBtn.onclick = togglePlay;
  videoPreview.onclick = togglePlay;
}

/**
 * 共通の時間UI更新関数
 */
export function updateTimeUI() {
  updateTimeline();
  
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
    !sub.isPin &&
    state.currentTime >= sub.startTime && 
    state.currentTime <= sub.startTime + sub.duration
  );

  if (currentSub) {
    subtitleOverlay.textContent = extractBaseText(currentSub.text);
    subtitleOverlay.style.color = currentSub.charColor;
    subtitleOverlay.style.display = 'block';
  } else {
    subtitleOverlay.style.display = 'none';
  }

  const currentPin = state.subtitles.find(sub => 
    sub.isPin &&
    state.currentTime >= sub.startTime && 
    state.currentTime <= sub.startTime + sub.duration
  );

  if (currentPin) {
    pinOverlay.textContent = extractBaseText(currentPin.text);
    pinOverlay.style.color = currentPin.charColor || '#ffaa00';
    pinOverlay.style.display = 'block';
  } else {
    pinOverlay.style.display = 'none';
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

export function getCurrentDuration() {
  return videoPreview.duration || 0;
}

/**
 * 指定した時間に動画を移動させ、UIを更新する
 * @param {number} time - 目標時間（秒）
 */
export function advanceVideoTime(time) {
  if (time < 0) time = 0;
  
  // 動画が読み込まれている場合は動画要素の時間を更新
  if (state.isVideoLoaded) {
    if (videoPreview.duration && time > videoPreview.duration) {
      time = videoPreview.duration;
    }
    
    // UI用の状態を即座に更新して、赤い再生バーなどはヌルヌル動かす
    state.currentTime = time;
    updateTimeUI();

    // 動画自体はシーク完了を待ってから次の最新位置へ進める。
    requestVideoSeek(state.currentTime);
  } else {
    // 動画がない場合もUIだけは更新
    state.currentTime = time;
    updateTimeUI();
  }
}
