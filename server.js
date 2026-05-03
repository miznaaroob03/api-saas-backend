require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const auth = require('./middleware/auth');

// Models
const User = require('./models/User');
const ApiUsage = require('./models/ApiUsage');

const app = express();

// 2. Add it right here, BEFORE your routes
app.use(cors({
  origin: '*' 
}));

// 1. CORS Configuration (Keep this at the top)
//app.use(cors());

// 2. Stripe Webhook (CRITICAL: This must come BEFORE express.json())
// Stripe needs the RAW body to verify the signature. 
app.post('/api/payments/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;

        try {
            await User.findByIdAndUpdate(userId, { apiUsage: 0 }); 
            await ApiUsage.findOneAndUpdate(
                { user: userId }, 
                { totalRequests: 0 } 
            );
            console.log(`✅ Success! All counts reset to 0 for user: ${userId}`);
        } catch (dbErr) {
            console.error('Database Update Error:', dbErr);
        }
    }
    res.json({received: true});
});

// 3. Body Parsers (NOW we can parse JSON for all other routes)
app.use(express.json());

// 4. Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usage', require('./routes/usage'));
app.use('/api/service', require('./routes/service'));
app.use('/api/keys', require('./routes/keys'));
app.use('/api/payments', require('./routes/payments'));

// Dashboard route (using the auth middleware)
app.get('/api/dashboard', auth, (req, res) => {
    res.json({ 
        msg: `Welcome to your dashboard!`, 
        user: req.user,
        data: "This is private data only a logged-in user can see."
    });
});

// 5. Connections
// Redis with Error Handling
const redis = new Redis(process.env.REDIS_URL, {
    tls: {}, // ADD THIS LINE for Upstash/Production
    connectTimeout: 10000, 
    maxRetriesPerRequest: 1 
});

redis.on('connect', () => console.log('✅ Redis Connected'));
redis.on('error', (err) => {
    console.log('⚠️ Redis Connection Issue:', err.message);
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ DB Error:', err));

// 6. Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server spinning on port ${PORT}`));