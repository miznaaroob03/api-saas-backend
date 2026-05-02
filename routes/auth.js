const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const auth = require('../middleware/auth'); 
const User = require('../models/User');
const ApiKey = require('../models/ApiKey'); // Fix: Capital A and K

// @route   POST api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ name, email, password });

        await user.save(); // This triggers the hashing in User.js

        res.json({ msg: 'User registered successfully' });
    } catch (err) {
        // THIS LINE IS CRITICAL: It tells you why it's failing in VS Code
        console.error("REGISTRATION ERROR:", err); 
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Find user by email
let user = await User.findOne({ email });
if (!user) {
  return res.status(400).json({ msg: 'Invalid Credentials' });
}

// Check password using bcrypt
const isMatch = await bcrypt.compare(password, user.password);
console.log("Password Match:", isMatch); // DEBUG LINE 1
if (!isMatch) {
  return res.status(400).json({ msg: 'Invalid Credentials' });
}
// CRITICAL CHECK: Ensure your .env loaded correctly
        if (!process.env.JWT_SECRET) {
            console.error("ERROR: JWT_SECRET is missing from .env file");
            return res.status(500).send('Server Error: Secret Missing');
        }

        const payload = { user: { id: user.id } };
        
        jwt.sign(
            payload, 
            process.env.JWT_SECRET, 
            { expiresIn: 3600 }, 
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error("LOGIN ERROR:", err.message); // Add this to see why it fails
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/generate-key
router.post('/generate-key', auth, async (req, res) => {
  try {
    const keyString = `sk_live_${crypto.randomBytes(16).toString('hex')}`;
    const newKey = new ApiKey({
      user: req.user.id,
      key: keyString,
      name: req.body && req.body.name ? req.body.name : 'Default Key'
    });
    await newKey.save();
    res.json({ key: keyString });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});
// Get all keys for the logged-in user
router.get('/my-keys', auth, async (req, res) => {
  try {
    const keys = await ApiKey.find({ user: req.user.id });
    res.json(keys);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});
module.exports = router;