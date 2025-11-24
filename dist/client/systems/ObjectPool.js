"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectPool = void 0;
class ObjectPool {
    constructor(createFunction, resetFunction, initialSize = 10, maxSize = 50) {
        this.pool = [];
        this.createFunction = createFunction;
        this.resetFunction = resetFunction;
        this.maxSize = maxSize;
        // Pre-populate pool - but since createFunction may need args, we'll create on demand for now
        // For simplicity, assume initial objects are created without args or with default args
    }
    get(...args) {
        let obj = this.pool.pop();
        if (!obj) {
            if (this.pool.length < this.maxSize) {
                obj = this.createFunction(...args);
            }
            else {
                return null; // Pool exhausted
            }
        }
        obj.setActive(true);
        obj.setVisible(true);
        return obj;
    }
    release(obj) {
        this.resetFunction(obj);
        obj.setActive(false);
        obj.setVisible(false);
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
        else {
            obj.destroy();
        }
    }
    clear() {
        this.pool.forEach(obj => obj.destroy());
        this.pool = [];
    }
    getSize() {
        return this.pool.length;
    }
}
exports.ObjectPool = ObjectPool;
