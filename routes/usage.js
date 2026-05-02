const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // JWT Auth
const ApiUsage = require('../models/ApiUsage');

// @route    GET api/usage/stats
// @desc     Get current user's API usage for the dashboard (Read-only)
router.get('/stats', auth, async (req, res) => {
    try {
        // 1. Find usage for the logged-in user
        let usage = await ApiUsage.findOne({ user: req.user.id });

        // 2. If no usage record exists, return zeros
        if (!usage) {
            return res.json({ totalRequests: 0, currentBill: "0.00" });
        }

        // Calculate only UNPAID requests
        const unpaidRequests = usage.totalRequests - (usage.paidRequests || 0);
        
        const pricePerRequest = 0.10;
        const calculatedBill = (unpaidRequests * pricePerRequest).toFixed(2);

        res.json({
            totalRequests: usage.totalRequests, // Keep showing total history
            currentBill: calculatedBill        // Show 0.00 after payment
        });

    } catch (err) {
        console.error("Usage Route Error:", err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;