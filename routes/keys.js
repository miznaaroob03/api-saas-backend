const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const ApiKey = require('../models/ApiKey');

// @route    GET api/keys
// @desc     Get the user's actual API key
router.get('/', auth, async (req, res) => {
    try {
        const keyData = await ApiKey.findOne({ user: req.user.id });
        if (!keyData) {
            return res.status(404).json({ msg: 'No API key found' });
        }
        res.json({ key: keyData.key });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    PUT api/keys/regenerate
// @desc     Delete old key and create a new one
router.put('/regenerate', auth, async (req, res) => {
    try {
        // 1. Delete the existing key for this user
        await ApiKey.findOneAndDelete({ user: req.user.id });

        // 2. Generate a new secure random key
        // This creates a string like 'sk_live_...'
        const newRawKey = `sk_live_${crypto.randomBytes(20).toString('hex')}`;

        // 3. Save new key to Database
        const newKeyDoc = new ApiKey({
            user: req.user.id,
            key: newRawKey
        });

        await newKeyDoc.save();

        res.json({ key: newKeyDoc.key });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;