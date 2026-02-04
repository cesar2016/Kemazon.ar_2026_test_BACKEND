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
                const savedPath = await processAndSaveImage(file.buffer);
                images.push(savedPath);
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
        console.error(err.message);
        res.status(500).send('Server Error');
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

exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: {
                id: parseInt(id)
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

        res.json(product);
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
