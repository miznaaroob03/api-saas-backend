const mongoose = require('mongoose');

const ApiUsageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  totalRequests: { type: Number, default: 0 },
  paidRequests: { type: Number, default: 0 },
    lastUsed: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiUsage', ApiUsageSchema);