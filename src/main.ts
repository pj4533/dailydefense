import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config';

new Phaser.Game({
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#2d1b0e',
  pixelArt: true,
  roundPixels: true,
  scene: [GameScene, GameOverScene, LeaderboardScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
