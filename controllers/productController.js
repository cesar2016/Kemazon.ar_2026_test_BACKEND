const prisma = require('../prismaClient');

const cloudinary = require('../config/cloudinaryConfig');

// Helper to process and save image to Cloudinary
const processAndSaveImage = async (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'kemazon-products',
                format: 'jpg',
                transformation: [
                    { width: 1000, height: 1000, crop: 'limit' },
                    { quality: 'auto' }
                ]
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        uploadStream.end(buffer);
    });
};

exports.markAsSold = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

        if (!productId) return res.status(400).json({ msg: 'Product ID required' });

        // 1. Get product to verify owner
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });
        if (product.userId !== req.user.id) return res.status(403).json({ msg: 'No autorizado' });
        if (!product.isActive) return res.status(400).json({ msg: 'El producto ya ha sido marcado como vendido' });

        // 2. Create "Manual Sale" Order
        await prisma.order.create({
            data: {
                buyerId: null, // Unknown buyer for manual sale
                sellerId: req.user.id,
                total: product.price,
                status: 'APPROVED',
                paymentId: 'MANUAL',
                items: {
                    create: {
                        productId: product.id,
                        title: product.name,
                        quantity: 1,
                        price: product.price
                    }
                }
            }
        });

        // 3. Mark product as sold (Soft Delete)
        await prisma.product.update({
            where: { id: productId },
            data: { isActive: false }
        });

        // Trigger 'manual_sale' notification
        try {
            const createNotification = require('../utils/notificationService');
            await createNotification(
                req.user.id,
                'manual_sale',
                `¡Venta registrada! Marcaste "${product.name}" como vendido manualmenter.`,
                product.id
            );
        } catch (notifError) {
            console.error('Notification error:', notifError);
        }

        res.json({ msg: 'Producto marcado como vendido' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error marking product as sold');
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, userId, categoryId } = req.body;
        console.log('createProduct Request Body:', req.body);
        console.log('files received:', req.files ? req.files.length : 0);

        // Process images
        const images = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.path) {
                    // Local storage usage: path relative like '/uploads/file.jpg'
                    const localPath = `/uploads/${file.filename}`;
                    images.push(localPath);
                } else {
                    // Memory storage (Cloudinary)
                    const savedPath = await processAndSaveImage(file.buffer);
                    images.push(savedPath);
                }
            }
        }

        // Validate required fields
        if (!name || !price) {
            return res.status(400).json({ msg: 'Name and Price are required' });
        }

        const newProduct = await prisma.product.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                images: images,
                userId: userId ? parseInt(userId) : null,
                categoryId: categoryId ? parseInt(categoryId) : null
            }
        });

        res.json(newProduct);
    } catch (err) {
        console.error('Error in createProduct:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: {
                user: {
                    select: {
                        username: true,
                        email: true
                    }
                },
                category: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.recordVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);
        const userId = req.user ? req.user.id : null;
        const { guestId } = req.body;

        if (!productId) return res.status(400).json({ msg: 'Product ID required' });
        if (!userId && !guestId) return res.status(400).json({ msg: 'User ID or Guest ID required' });

        // Calculate 4 hours ago
        const fourHoursAgo = new Date(new Date() - 4 * 60 * 60 * 1000);

        // Check for recent visit
        const recentVisit = await prisma.productVisit.findFirst({
            where: {
                productId,
                createdAt: { gt: fourHoursAgo },
                OR: [
                    { userId: userId || undefined }, // undefined to skip if null
                    { guestId: guestId || undefined }
                ]
            }
        });

        if (recentVisit) {
            return res.status(200).json({ msg: 'Visit already recorded recently' });
        }

        // Record new visit
        await prisma.productVisit.create({
            data: {
                productId,
                userId,
                guestId
            }
        });

        res.status(201).json({ msg: 'Visit recorded' });

    } catch (err) {
        console.error('Error recording visit:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

        const product = await prisma.product.findUnique({
            where: {
                id: productId
            },
            include: {
                user: {
                    select: {
                        username: true,
                        email: true,
                        whatsapp: true, // Also good to have for 'Arrange with Seller'
                        paymentMethods: {
                            where: { isActive: true },
                            select: { provider: true }
                        }
                    }
                },
                category: true
            }
        });

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // Get Visit Stats
        const totalVisits = await prisma.productVisit.count({ where: { productId } });
        const userVisits = await prisma.productVisit.count({ where: { productId, userId: { not: null } } });
        const guestVisits = await prisma.productVisit.count({ where: { productId, userId: null } });

        res.json({
            ...product,
            stats: {
                total: totalVisits,
                users: userVisits,
                guests: guestVisits
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getProductsByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const products = await prisma.product.findMany({
            where: {
                userId: parseInt(userId),
                isActive: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Validate user ownership

        await prisma.product.delete({
            where: {
                id: parseInt(id)
            }
        });

        res.json({ msg: 'Product removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, existingImages, imageOrder } = req.body;

        // Process new images AND preserve order if provided
        // We need to map 'new' files to their processed paths

        const processedNewImages = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const savedPath = await processAndSaveImage(file.buffer);
                processedNewImages.push(savedPath);
            }
        }

        let finalImages = [];

        if (imageOrder) {
            // Reconstruct based on order
            // imageOrder is [{ type: 'existing', value: '...' }, { type: 'new' }, ...]
            const orderList = JSON.parse(imageOrder);
            let newImageIndex = 0;

            finalImages = orderList.map(item => {
                if (item.type === 'existing') {
                    return item.value;
                } else if (item.type === 'new') {
                    // Take next available new image
                    const path = processedNewImages[newImageIndex];
                    newImageIndex++;
                    return path;
                }
            }).filter(Boolean); // Remove undefined if something goes wrong

        } else {
            // Fallback to simple append if no order provided
            let currentImages = [];
            if (existingImages) {
                currentImages = Array.isArray(existingImages) ? existingImages : [existingImages];
            }
            finalImages = [...currentImages, ...processedNewImages];
        }

        if (finalImages.length > 6) {
            return res.status(400).json({ msg: 'Total images cannot exceed 6' });
        }

        const updatedProduct = await prisma.product.update({
            where: {
                id: parseInt(id)
            },
            data: {
                name,
                description,
                price: parseFloat(price),
                images: finalImages
            }
        });

        res.json(updatedProduct);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
