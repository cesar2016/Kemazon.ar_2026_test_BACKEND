const prisma = require('../prismaClient');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Helper to process and save image
const processAndSaveImage = async (buffer) => {
    try {
        const filename = `img-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpeg`;
        const uploadPath = path.join(__dirname, '../uploads', filename);

        // Ensure uploads directory exists
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        console.log('Processing image with Sharp...');
        await sharp(buffer)
            .resize(1000, 1000, { // Max dimensions, maintain aspect ratio
                fit: 'inside',
                withoutEnlargement: true
            })
            .toFormat('jpeg', { quality: 80 })
            .toFile(uploadPath);

        console.log('Image saved to:', uploadPath);
        return `/uploads/${filename}`;
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
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
                        email: true
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
                userId: parseInt(userId)
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
