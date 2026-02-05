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

        if (status === 'approved') {
            try {
                // Fetch full order with items to get product info
                const fullOrder = await prisma.order.findUnique({
                    where: { id: parseInt(orderId) },
                    include: {
                        items: true,
                        seller: true,
                        buyer: true
                    }
                });

                const createNotification = require('../utils/notificationService');
                const productName = fullOrder.items[0]?.title || 'Producto';

                // Notify Seller (Sale)
                await createNotification(
                    fullOrder.sellerId,
                    'sale',
                    `¡Felicidades! Has vendido "${productName}" a ${fullOrder.buyer?.username || 'un usuario'}.`,
                    fullOrder.id
                );

                // Notify Buyer (Buy)
                if (fullOrder.buyerId) {
                    await createNotification(
                        fullOrder.buyerId,
                        'buy',
                        `¡Compra exitosa! Ya tienes "${productName}".`,
                        fullOrder.id
                    );
                }

            } catch (notifError) {
                console.error('Notification error:', notifError);
            }
        }

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
