import { state } from './config.js';
import { updateTimeline, renderSubtitles } from './timeline.js';

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
        // メタデータロード時に必要な処理があればここに追加
        // （長さによるタイムラインの初期化などは timeline.js で実施）
      };
    }
  });

  videoPreview.addEventListener('timeupdate', () => {
    state.currentTime = videoPreview.currentTime;
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
  });

  playPauseBtn.onclick = togglePlay;
  videoPreview.onclick = togglePlay;
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

export function getCurrentDuration() {
  return videoPreview.duration || 0;
}

export function advanceVideoTime(time) {
  videoPreview.currentTime = time;
}
