import { Worker } from 'worker_threads';
import path from 'path';

export class WorkerPool {
  constructor(workerPath, size, sharedData) {
    this.size = size;
    this.tasks = [];
    this.free = [];
    this.workers = [];

    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerPath, {
        workerData: { sharedData }
      });

      worker.on('message', (msg) => {
        worker._resolve(msg);
        this.free.push(worker);
        this._dispatch();
      });

      worker.on('error', err => {
        worker._reject(err);
        this.free.push(worker);
        this._dispatch();
      });

      this.free.push(worker);
      this.workers.push(worker);
    }
  }

  _dispatch() {
    if (this.free.length === 0 || this.tasks.length === 0) return;

    const worker = this.free.pop();
    const { payload, resolve, reject } = this.tasks.shift();
    worker._resolve = resolve;
    worker._reject = reject;

    worker.postMessage(payload);
  }

  run(payload) {
    return new Promise((resolve, reject) => {
      this.tasks.push({ payload, resolve, reject });
      this._dispatch();
    });
  }

  async close() {
    await Promise.all(this.workers.map(w => w.terminate()));
  }
}
