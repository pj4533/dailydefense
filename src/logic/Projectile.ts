import { Enemy } from './Enemy';

export class Projectile {
  x: number;
  y: number;
  speed: number = 300;
  damage: number;
  alive: boolean = true;
  target: Enemy;
  slowAmount?: number;
  slowDuration?: number;

  constructor(x: number, y: number, target: Enemy, damage: number, slowAmount?: number, slowDuration?: number) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.slowAmount = slowAmount;
    this.slowDuration = slowDuration;
  }

  update(dt: number): void {
    if (!this.alive) return;

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveAmount = this.speed * dt;

    if (moveAmount >= dist || dist < 1) {
      this.alive = false;
      if (this.target.alive) {
        this.target.takeDamage(this.damage);
        if (this.target.alive && this.slowAmount != null && this.slowDuration != null) {
          this.target.applySlow(this.slowAmount, this.slowDuration);
        }
      }
    } else {
      this.x += (dx / dist) * moveAmount;
      this.y += (dy / dist) * moveAmount;
    }
  }
}
