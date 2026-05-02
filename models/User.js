const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcryptjs

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true 
    },
    password: {
        type: String,
        required: true
    },
    apiUsage: {
        type: Number,
        default: 0
    },
    plan: {
        type: String,
        default: 'Free'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// Use 'function (next)' exactly like this. 
// Do NOT use 'async (next) =>' (the arrow function).
UserSchema.pre('save', async function () {
  // 1. We removed (next) from the function arguments
  if (!this.isModified('password')) {
    return; // 2. Changed 'return next()' to just 'return'
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // 3. We removed 'next()' from here
  } catch (err) {
    throw err; // 4. This replaces 'next(err)'
  }
});

module.exports = mongoose.model('User', UserSchema);