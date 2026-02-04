const prisma = require('../prismaClient');

// Get all payment methods for the authenticated user
exports.getPaymentMethods = async (req, res) => {
    try {
        const userId = req.user.id;
        const methods = await prisma.paymentMethod.findMany({
            where: { userId },
            select: {
                id: true,
                provider: true,
                isActive: true,
                // Do NOT return full accessToken for security
                // returning masked or partial might be better, or just existence
                // For now, we return it so they can edit it (or we could just return 'set')
                // Let's decide to return it so they can see what they pasted, 
                // but front-end should mask it or careful.
                // Better practice: Return masked.
            }
        });

        // Return masked token for verification
        const safeMethods = methods.map(m => ({
            ...m,
            accessToken: '****************' + m.accessToken.slice(-4) // Only show last 4 chars? Or just 'Configured'
        }));

        res.json(safeMethods);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).send('Server Error');
    }
};

// Save (Upsert) a payment method
exports.savePaymentMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { provider, accessToken, publicKey } = req.body; // provider: 'MERCADOPAGO'

        if (!provider || !accessToken) {
            return res.status(400).json({ msg: 'Provider and Access Token are required' });
        }

        const method = await prisma.paymentMethod.upsert({
            where: {
                userId_provider: {
                    userId,
                    provider
                }
            },
            update: {
                accessToken,
                publicKey,
                isActive: true
            },
            create: {
                userId,
                provider,
                accessToken,
                publicKey,
                isActive: true
            }
        });

        res.json({ msg: 'Payment method saved', method });
    } catch (error) {
        console.error('Error saving payment method:', error);
        res.status(500).send('Server Error');
    }
};

// Toggle active status or delete could be added here
