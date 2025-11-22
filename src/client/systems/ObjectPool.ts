import Phaser from 'phaser';

export class ObjectPool<T extends Phaser.Physics.Matter.Sprite> {
  private pool: T[] = [];
  private createFunction: (...args: any[]) => T;
  private resetFunction: (obj: T) => void;
  private maxSize: number;

  constructor(createFunction: (...args: any[]) => T, resetFunction: (obj: T) => void, initialSize: number = 10, maxSize: number = 50) {
    this.createFunction = createFunction;
    this.resetFunction = resetFunction;
    this.maxSize = maxSize;

    // Pre-populate pool - but since createFunction may need args, we'll create on demand for now
    // For simplicity, assume initial objects are created without args or with default args
  }

  get(...args: any[]): T | null {
    let obj = this.pool.pop();
    if (!obj) {
      if (this.pool.length < this.maxSize) {
        obj = this.createFunction(...args);
      } else {
        return null; // Pool exhausted
      }
    }
    obj.setActive(true);
    obj.setVisible(true);
    return obj;
  }

  release(obj: T): void {
    this.resetFunction(obj);
    obj.setActive(false);
    obj.setVisible(false);
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    } else {
      obj.destroy();
    }
  }

  clear(): void {
    this.pool.forEach(obj => obj.destroy());
    this.pool = [];
  }

  getSize(): number {
    return this.pool.length;
  }
}