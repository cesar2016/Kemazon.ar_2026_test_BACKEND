const prisma = require('../prismaClient');

exports.confirmOrder = async (req, res) => {
    try {
        const { orderId, paymentId, status } = req.body;
        // status from MP: approved, pending, failure

        const order = await prisma.order.update({
            where: { id: parseInt(orderId) },
            data: {
                paymentId: paymentId,
                status: status === 'approved' ? 'APPROVED' : (status === 'failure' ? 'REJECTED' : 'PENDING')
            }
        });

        // Also update the stock? For now we just mark as sold.
        // Actually, if approved, we might want to decrease stock if we tracked it.
        // Our simple model doesn't have quantity stock, just maybe active/inactive.
        // For now, let's leave products active unless it's a unique item.

        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error confirming order');
    }
};

exports.getPurchases = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { buyerId: req.user.id },
            include: {
                seller: { select: { username: true, email: true } },
                items: { include: { product: { select: { images: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching purchases');
    }
};

exports.getSales = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { sellerId: req.user.id },
            include: {
                buyer: { select: { username: true, email: true, fullName: true, whatsapp: true } },
                items: {
                    include: {
                        product: {
                            select: { images: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching sales');
    }
};
