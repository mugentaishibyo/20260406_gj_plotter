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
  // 目盛りの生成 (表面の溝テクスチャを表現。全体をカバーするため多めに生成)
  const tickCount = 200;
  for (let i = -tickCount / 2; i < tickCount / 2; i++) {
    const tick = document.createElement('div');
    tick.className = 'jog-tick';
    jogWheelInner.appendChild(tick);
  }

  let isDragging = false;
  let startX = 0;
  let totalDeltaX = 0;
  let visualOffsetAccumulator = 0;
  // ドラッグの感度（1フレーム進めるためのピクセル数）
  const pixelsPerFrame = 6; 

  const applyFrameStep = (deltaPixels) => {
    const frameStep = Math.round(deltaPixels / pixelsPerFrame);
    if (frameStep !== 0) {
      // 1フレーム = 1 / FRAME_RATE 秒
      const timeStep = frameStep / CONFIG.FRAME_RATE;
      advanceVideoTime(state.currentTime + timeStep);
      return frameStep * pixelsPerFrame; // 消費した仮想ピクセル
    }
    return 0;
  };

  const updateVisuals = (deltaPixels) => {
    visualOffsetAccumulator += deltaPixels;
    // 無限リピート用 (適度なピクセル数でモデュロ演算: gap8 + width3 = 11px/tick -> 33)
    const visualOffset = visualOffsetAccumulator % 33;
    jogWheelInner.style.transform = `translateX(${visualOffset}px)`;
  };

  const onPointerDown = (e) => {
    isDragging = true;
    startX = e.clientX;
    totalDeltaX = 0;
    jogWheelContainer.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    startX = e.clientX; 

    const consumed = applyFrameStep(totalDeltaX + dx);
    if (consumed !== 0) {
       totalDeltaX = (totalDeltaX + dx) - consumed;
    } else {
       totalDeltaX += dx;
    }
    
    updateVisuals(dx);
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    jogWheelContainer.releasePointerCapture(e.pointerId);
  };

  // 物理マウスのホイール操作
  jogWheelContainer.addEventListener('wheel', (e) => {
    e.preventDefault(); 
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    
    // ホイール下回転（正値）で時間が進むように
    const direction = Math.sign(delta);
    
    // 1回のスクロールイベントで1フレーム動かす
    const timeStep = direction / CONFIG.FRAME_RATE;
    advanceVideoTime(state.currentTime + timeStep);
    
    // 視覚的な回転（右に時間が進む＝テクスチャは左に流れるべき）
    updateVisuals(-direction * pixelsPerFrame);
  }, { passive: false });

  jogWheelContainer.addEventListener('pointerdown', onPointerDown);
  jogWheelContainer.addEventListener('pointermove', onPointerMove);
  jogWheelContainer.addEventListener('pointerup', onPointerUp);
  jogWheelContainer.addEventListener('pointercancel', onPointerUp);
}
