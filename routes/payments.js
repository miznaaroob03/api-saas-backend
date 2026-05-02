const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const ApiUsage = require('../models/ApiUsage'); // Need this to update the bill

// @route    POST api/payments/create-checkout
router.post('/create-checkout', auth, async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            metadata: {
                userId: req.user.id 
            },
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { 
                        name: 'API Usage Bill',
                        description: 'Payment for your recent API usage' 
                    },
                    unit_amount: 200, // $2.00
                },
                quantity: 1,
            }],
            mode: 'payment',
            // Change these to redirect to a specific success page or handle it via query params
            success_url: 'http://localhost:5173/dashboard?payment=success',
            cancel_url: 'http://localhost:5173/dashboard?payment=cancel',
        });

        res.json({ id: session.id, url: session.url });
    } catch (err) {
        console.error("Stripe Error:", err.message);
        res.status(500).json({ msg: "Stripe session creation failed" });
    }
});

// ⭐ NEW ROUTE: Call this when the user returns from Stripe
// @route    POST api/payments/success
router.post('/success', auth, async (req, res) => {
    try {
        const usage = await ApiUsage.findOne({ user: req.user.id });
        
        if (usage) {
            // Set paidRequests equal to totalRequests to reset the current bill
            usage.paidRequests = usage.totalRequests;
            await usage.save();
            return res.json({ msg: "Payment recorded. Bill reset to $0." });
        }
        
        res.status(404).json({ msg: "Usage record not found" });
    } catch (err) {
        console.error("Payment Success Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;