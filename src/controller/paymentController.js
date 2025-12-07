const Stripe = require('stripe');
const User = require('../models/User');

let stripe;
const getStripe = () => {
    if (!stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
        }
        stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
};

const PLANS = {
    premium: {
        priceId: process.env.STRIPE_PRICE_PREMIUM,
        tokens: 10000,
        maxDocs: Infinity
    },
    enterprise: {
        priceId: process.env.STRIPE_PRICE_ENTERPRISE,
        tokens: Infinity,
        maxDocs: Infinity
    }
};

exports.createCheckoutSession = async (req, res) => {
    try {
        const { plan } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!PLANS[plan]) {
            return res.status(400).json({ message: 'Invalid plan selected' });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const session = await getStripe().checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: PLANS[plan].priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${frontendUrl}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/settings?canceled=true`,
            customer_email: user.email,
            metadata: {
                userId: userId,
                plan: plan
            }
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        res.status(500).json({ message: 'Payment initiation failed', error: error.message });
    }
};

exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Verify webhook signature
        event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook Signature Verification Failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, plan } = session.metadata;

        console.log(`Payment successful for user ${userId}, plan: ${plan}`);

        try {
            const user = await User.findById(userId);
            if (user) {
                user.plan = plan;
                user.stripeCustomerId = session.customer;
                user.subscriptionId = session.subscription;

                // Update limits based on plan
                if (PLANS[plan]) {
                    user.maxTokens = PLANS[plan].tokens === Infinity ? 999999999 : PLANS[plan].tokens;
                }

                await user.save();
                console.log(`User ${userId} upgraded to ${plan}`);
            }
        } catch (error) {
            console.error('Error updating user after payment:', error);
        }
    }

    res.json({ received: true });
};
