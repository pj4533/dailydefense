export interface LayoutConfig {
  canvasWidth: number;
  canvasHeight: number;
  gameHeight: number;
  uiHeight: number;
  isMobile: boolean;
  btnHeight: number;
  statsFontSize: string;
}

function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    Math.max(window.innerWidth, window.innerHeight) < 1400;
}

function computeLayout(): LayoutConfig {
  const isMobile = detectMobile();
  const canvasWidth = 768;
  const gameHeight = 480; // GRID_ROWS * TILE_SIZE

  if (isMobile) {
    return {
      canvasWidth,
      canvasHeight: 540,
      gameHeight,
      uiHeight: 60,
      isMobile: true,
      btnHeight: 52,
      statsFontSize: '10px',
    };
  }

  return {
    canvasWidth,
    canvasHeight: 576,
    gameHeight,
    uiHeight: 96,
    isMobile: false,
    btnHeight: 42,
    statsFontSize: '9px',
  };
}

export const layout: LayoutConfig = computeLayout();
