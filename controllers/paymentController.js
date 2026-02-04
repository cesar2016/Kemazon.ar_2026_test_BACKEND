const { MercadoPagoConfig, Preference } = require('mercadopago');
const prisma = require('../prismaClient');

// Initialize client with Access Token from env
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

exports.createPreference = async (req, res) => {
    try {
        const { items } = req.body;

        let purchaseItems = [];

        // Handle both single item (legacy/direct buy) and cart (items array)
        if (items && Array.isArray(items) && items.length > 0) {
            purchaseItems = items;
        } else {
            // Flatten single item request to array
            const { title, price, quantity, picture_url, productId } = req.body;
            if (!productId) return res.status(400).json({ msg: 'Se requiere el ID del producto' });
            purchaseItems = [{ title, price, quantity, picture_url, productId }];
        }

        if (purchaseItems.length === 0) {
            return res.status(400).json({ msg: 'No hay productos para comprar' });
        }

        // 1. Validate items and get Seller
        // We need to fetch products to get the REAL Seller ID (security)
        const productIds = purchaseItems.map(i => parseInt(i.productId));
        const dbProducts = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, userId: true }
        });

        if (dbProducts.length !== purchaseItems.length) {
            console.log('Error: Product count mismatch', dbProducts.length, purchaseItems.length);
            return res.status(400).json({ msg: 'Algunos productos no fueron encontrados' });
        }

        // Check if all products belong to the same seller
        const firstSellerId = dbProducts[0].userId;
        const allSameSeller = dbProducts.every(p => p.userId === firstSellerId);

        if (!allSameSeller) {
            console.log('Error: Mixed sellers. IDs:', dbProducts.map(p => p.userId));
            return res.status(400).json({ msg: 'No se permite comprar a múltiples vendedores a la vez. Por favor, compra a un solo vendedor por transacción.' });
        }

        // 2. Find the Seller's MercadoPago Access Token
        console.log('Looking for PaymentMethod for User:', firstSellerId);
        const paymentMethod = await prisma.paymentMethod.findUnique({
            where: {
                userId_provider: {
                    userId: firstSellerId,
                    provider: 'MERCADOPAGO'
                }
            }
        });

        if (!paymentMethod || !paymentMethod.accessToken || !paymentMethod.isActive) {
            console.log('Error: Seller has not configured MP. Method:', paymentMethod);
            return res.status(400).json({ msg: 'Ups, el vendedor de este producto aún no ha activado los pagos con MercadoPago. Por favor, contáctalo para acordar otra forma de pago.' });
        }

        // 3. Initialize client with SELLER'S Access Token
        const client = new MercadoPagoConfig({ accessToken: paymentMethod.accessToken });
        const preference = new Preference(client);

        const mpItems = purchaseItems.map(item => ({
            title: item.title,
            quantity: Number(item.quantity),
            unit_price: Number(item.price),
            currency_id: 'ARS',
            picture_url: item.picture_url
        }));

        // 3.5 Create PENDING Order in Database
        const totalAmount = purchaseItems.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

        const newOrder = await prisma.order.create({
            data: {
                buyerId: req.user.id, // Authenticated buyer
                sellerId: firstSellerId,
                total: totalAmount,
                status: 'PENDING',
                items: {
                    create: purchaseItems.map(item => ({
                        productId: parseInt(item.productId),
                        title: item.title,
                        quantity: Number(item.quantity),
                        price: Number(item.price)
                    }))
                }
            }
        });

        const result = await preference.create({
            body: {
                items: mpItems,
                external_reference: newOrder.id.toString(), // Link MP payment to our Order
                back_urls: {
                    success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success`,
                    failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/failure`,
                    pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pending`
                },
                auto_return: 'approved',
            }
        });

        res.json({ init_point: result.init_point });
    } catch (error) {
        console.error('Error creating preference:', error);
        res.status(500).send('Error creating payment preference');
    }
};
