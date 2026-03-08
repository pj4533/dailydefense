import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { layout } from './layout';

function startGame(): void {
  new Phaser.Game({
    type: Phaser.AUTO,
    width: layout.canvasWidth,
    height: layout.canvasHeight,
    backgroundColor: '#2d1b0e',
    pixelArt: true,
    roundPixels: true,
    scene: [GameScene, GameOverScene, LeaderboardScene],
    parent: 'game-container',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
}

// Wait for the arcade font to load before starting Phaser,
// so text and buttons render correctly on first visit.
document.fonts.ready.then(() => {
  startGame();
});
