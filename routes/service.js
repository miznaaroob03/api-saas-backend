const express = require('express');
const router = express.Router();
const gatewayAuth = require('../middleware/gateway'); // The API Key checker
const ApiUsage = require('../models/ApiUsage'); // The counter model

router.get('/fetch-data', gatewayAuth, async (req, res) => {
  try {
    // This part tells MongoDB to add +1 to the user's count
    await ApiUsage.findOneAndUpdate(
      { user: req.user.id },
      { $inc: { totalRequests: 1 }, lastUsed: Date.now() },
      { upsert: true }
    );

    res.json({
      success: true,
      data: { message: "Success! Your SaaS Gateway is working." }
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;