import { CONFIG, state } from './config.js';
import { advanceVideoTime } from './video.js';

const jogWheelContainer = document.getElementById('jog-wheel-container');
const jogWheelInner = document.getElementById('jog-wheel-inner');

/**
 * ジョグホイールの初期化
 */
export function setupJogWheel() {
  if (!jogWheelContainer || !jogWheelInner) return;

  // 目盛りの生成 (コンテナの幅より広めに作る)
  const tickCount = 100;
  for (let i = -tickCount / 2; i < tickCount / 2; i++) {
    const tick = document.createElement('div');
    tick.className = `jog-tick ${i % 5 === 0 ? 'major' : ''}`;
    jogWheelInner.appendChild(tick);
  }

  let isDragging = false;
  let startX = 0;
  let totalDeltaX = 0;
  let lastFrameStep = 0;
  const pixelsPerFrame = 12; // 1フレーム進めるのに必要なピクセル数

  const onPointerDown = (e) => {
    isDragging = true;
    startX = e.clientX;
    totalDeltaX = 0;
    lastFrameStep = 0;
    jogWheelContainer.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    totalDeltaX = dx;

    // 何フレーム分動いたか計算
    const frameStep = Math.round(totalDeltaX / pixelsPerFrame);
    
    if (frameStep !== lastFrameStep) {
      const diff = frameStep - lastFrameStep;
      // 1フレーム = 1 / FRAME_RATE 秒
      const timeStep = diff / CONFIG.FRAME_RATE;
      advanceVideoTime(state.currentTime + timeStep);
      lastFrameStep = frameStep;
    }

    // ホイールの見た目を更新 (無限ループ感)
    const visualOffset = totalDeltaX % (pixelsPerFrame * 5); // 5目盛り分でリピート
    jogWheelInner.style.transform = `translateX(${visualOffset}px)`;
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    jogWheelContainer.releasePointerCapture(e.pointerId);
    // 指を離した時にリセット
    jogWheelInner.style.transform = `translateX(0px)`;
  };

  jogWheelContainer.addEventListener('pointerdown', onPointerDown);
  jogWheelContainer.addEventListener('pointermove', onPointerMove);
  jogWheelContainer.addEventListener('pointerup', onPointerUp);
  jogWheelContainer.addEventListener('pointercancel', onPointerUp);
}
