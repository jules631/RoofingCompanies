const { Queue } = require('bullmq');
const { Redis } = require('ioredis');
require('dotenv').config();

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const messageQueue = new Queue('messages', {
  connection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

module.exports = { messageQueue, connection };
