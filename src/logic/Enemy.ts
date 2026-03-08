import { EnemyConfig, Point } from '../types';

export class Enemy {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  reward: number;
  color: number;
  currentWaypointIndex: number = 1;
  alive: boolean = true;
  reachedEnd: boolean = false;
  slowFactor: number = 1;
  slowTimer: number = 0;

  constructor(config: EnemyConfig, startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.reward = config.reward;
    this.color = config.color;
  }

  applySlow(factor: number, duration: number): void {
    this.slowFactor = factor;
    this.slowTimer = duration;
  }

  update(dt: number, path: Point[]): void {
    if (!this.alive || this.reachedEnd) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowTimer = 0;
        this.slowFactor = 1;
      }
    }

    const target = path[this.currentWaypointIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveAmount = this.speed * this.slowFactor * dt;

    if (moveAmount >= dist) {
      this.x = target.x;
      this.y = target.y;
      this.currentWaypointIndex++;
      if (this.currentWaypointIndex >= path.length) {
        this.reachedEnd = true;
      }
    } else {
      this.x += (dx / dist) * moveAmount;
      this.y += (dy / dist) * moveAmount;
    }
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  }
}
