
const { Queue, Worker } = require('bullmq');
const { checkRedisVersion } = require('./redisCheck');

class FallbackQueue {
  constructor(name, opts) {
    this.name = name;
    this.opts = opts;
    this.queue = null;
    this.handlers = [];
    this.isCompatible = null;
  }

  async init() {
    if (this.isCompatible !== null) return;
    this.isCompatible = await checkRedisVersion();
    if (this.isCompatible) {
      this.queue = new Queue(this.name, this.opts);
    } else {
      console.warn(`[Queue:${this.name}] Redis version too low. Using synchronous fallback.`);
    }
  }

  async add(jobName, data) {
    await this.init();
    if (this.isCompatible && this.queue) {
      return this.queue.add(jobName, data);
    } else {
      // Run immediately (synchronous fallback)
      console.log(`[Queue:${this.name}] Running job "${jobName}" synchronously...`);
      for (const handler of this.handlers) {
        try {
          await handler({ data, name: jobName });
        } catch (err) {
          console.error(`[Queue:${this.name}] Fallback handler error:`, err);
        }
      }
      return { id: 'fallback-' + Date.now() };
    }
  }

  registerHandler(handler) {
    this.handlers.push(handler);
  }
}

const queues = {};

const getQueue = (name, opts) => {
  if (!queues[name]) {
    queues[name] = new FallbackQueue(name, opts);
  }
  return queues[name];
};

module.exports = { getQueue };
