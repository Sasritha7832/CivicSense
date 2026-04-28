require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { createRedisClient } = require('../config/redis');
const setupImageWorker = require('./imageWorker');
const setupAITriageWorker = require('./aiTriageWorker');
const setupSLAWorker = require('./slaWorker');

const startWorkers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicpulse';
    await mongoose.connect(mongoUri);
    console.log('✅ Workers connected to MongoDB');

    const redisClient = createRedisClient();

    // Initialize Workers
    const imageWorker = await setupImageWorker(redisClient).init();
    const aiTriageWorker = await setupAITriageWorker(redisClient).init();
    const slaWorker = await setupSLAWorker(redisClient).init();

    console.log('🚀 All background workers started');

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('Closing workers...');
      if (imageWorker && typeof imageWorker.close === 'function') await imageWorker.close();
      if (aiTriageWorker && typeof aiTriageWorker.close === 'function') await aiTriageWorker.close();
      if (slaWorker && typeof slaWorker.close === 'function') await slaWorker.close();
      await mongoose.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return { imageWorker, aiTriageWorker, slaWorker };
  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startWorkers();
}

module.exports = { startWorkers };
