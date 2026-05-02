const redis = require('redis');
const ApiKey = require('../models/ApiKey');

// 1. Initialize Redis Client
const redisClient = redis.createClient();

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis (Required for version 4+)
(async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
})();

module.exports = async function(req, res, next) {
  const userKey = req.header('x-api-key');

  // 1. Security Check: Is the key present?
  if (!userKey) {
    return res.status(401).json({ msg: 'No API key provided. Access denied.' });
  }

  try {
    // 2. Rate Limiting Logic (Redis)
    const limit = 5; // Max 5 requests
    const windowSeconds = 60; // Per 60 seconds
    
    // Create a unique identifier in Redis for this specific key
    const redisId = `rate_limit:${userKey}`;

    // Increment the count
    const currentUsage = await redisClient.incr(redisId);

    // If it's a new window, set the expiration
    if (currentUsage === 1) {
      await redisClient.expire(redisId, windowSeconds);
    }

    // 3. Check if they exceeded the limit
    if (currentUsage > limit) {
      return res.status(429).json({ 
        msg: 'Too many requests! You are limited to 5 per minute.',
        retryAfter: '60s'
      });
    }

    // 4. Database Check: Does this key exist and who owns it?
    const keyDoc = await ApiKey.findOne({ key: userKey });
    
    if (!keyDoc) {
      return res.status(401).json({ msg: 'Invalid API Key.' });
    }

    // Attach user ID so the next middleware (usage logger) knows who to charge
    req.user = { id: keyDoc.user };
    next();

  } catch (err) {
    console.error('Gateway Error:', err);
    res.status(500).json({ msg: 'Gateway Authorization Error' });
  }
};