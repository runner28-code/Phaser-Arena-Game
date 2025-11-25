"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectPool = void 0;
/**
 * Generic object pool for efficient reuse of Phaser Matter sprites.
 * Reduces garbage collection by recycling objects instead of creating/destroying them.
 * @template T - The type of Phaser Physics Matter Sprite to pool
 */
class ObjectPool {
    constructor(createFunction, resetFunction, initialSize = 10, maxSize = 50) {
        this.pool = [];
        this.createFunction = createFunction;
        this.resetFunction = resetFunction;
        this.maxSize = maxSize;
        // Pre-populate pool - but since createFunction may need args, we'll create on demand for now
        // For simplicity, assume initial objects are created without args or with default args
    }
    /**
     * Retrieves an object from the pool or creates a new one if the pool is empty.
     * @param args - Arguments to pass to the creation function
     * @returns The pooled object or null if pool is exhausted and at max capacity
     */
    get(...args) {
        let obj = this.pool.pop();
        if (!obj) {
            // Only create new objects if we haven't hit the maximum pool size
            // This prevents unbounded memory growth during extended gameplay
            if (this.pool.length < this.maxSize) {
                obj = this.createFunction(...args);
            }
            else {
                // Return null instead of creating more objects to maintain performance
                // Game logic should handle pool exhaustion gracefully
                return null;
            }
        }
        // Reactivate the object for Phaser.js rendering and physics
        // setActive/setVisible ensures the object participates in the game world
        obj.setActive(true);
        obj.setVisible(true);
        return obj;
    }
    /**
     * Returns an object to the pool for reuse.
     * @param obj - The object to return to the pool
     */
    release(obj) {
        // Reset object to clean state before returning to pool
        // This ensures objects are reusable and don't carry state between uses
        this.resetFunction(obj);
        // Deactivate for Phaser.js to exclude from rendering and physics
        // This is crucial for performance - inactive objects aren't processed
        obj.setActive(false);
        obj.setVisible(false);
        // Only keep objects in pool up to maxSize to prevent memory bloat
        // Destroy excess objects rather than accumulating unused instances
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
        else {
            obj.destroy();
        }
    }
    /**
     * Destroys all objects in the pool and clears the pool.
     */
    clear() {
        this.pool.forEach(obj => obj.destroy());
        this.pool = [];
    }
    /**
     * Gets the current number of objects available in the pool.
     * @returns The number of objects currently in the pool
     */
    getSize() {
        return this.pool.length;
    }
}
exports.ObjectPool = ObjectPool;
