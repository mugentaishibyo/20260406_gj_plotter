import { state } from './config.js';
import { updateTimeline, renderSubtitles, initTimelineWidth } from './timeline.js';
import { extractBaseText } from './lib/mora-counter.js';

// DOM要素
const videoPreview = document.getElementById('video-preview');
const videoFile = document.getElementById('video-file');
const videoOverlay = document.getElementById('video-overlay');
const currentTimeDisplay = document.getElementById('current-time-display');
const subtitleOverlay = document.getElementById('subtitle-overlay');
const playPauseBtn = document.getElementById('play-pause-btn');
const controlsOverlay = document.getElementById('controls-overlay');

/**
 * 動画ファイルの読み込み
 */
export function setupVideoEvents() {
  videoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      videoPreview.src = url;
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

let isSeeking = false;
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

    // 動画自体のシークはブラウザの描画タイミングに合わせる（重要：描画をブロックしない）
    if (!isSeeking) {
      isSeeking = true;
      requestAnimationFrame(() => {
        videoPreview.currentTime = state.currentTime;
        isSeeking = false;
      });
    }
  } else {
    // 動画がない場合もUIだけは更新
    state.currentTime = time;
    updateTimeUI();
  }
}
