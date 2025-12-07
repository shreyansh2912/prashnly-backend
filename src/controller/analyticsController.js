const User = require('../models/User');
const TokenUsage = require('../models/TokenUsage');

exports.getUsageStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user limits
        const user = await User.findById(userId).select('tokensUsed maxTokens plan');

        // Fetch recent usage history
        const history = await TokenUsage.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('document', 'title');

        res.json({
            tokensUsed: user.tokensUsed,
            maxTokens: user.maxTokens,
            plan: user.plan,
            history: history.map(h => ({
                id: h._id,
                document: h.document ? h.document.title : 'Deleted Document',
                tokens: h.tokens,
                date: h.createdAt
            }))
        });
    } catch (error) {
        console.error('Get Usage Stats Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
