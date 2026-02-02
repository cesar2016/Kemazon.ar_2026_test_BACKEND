const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

router.get('/share/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
        });

        if (!product) {
            return res.status(404).send('Producto no encontrado');
        }

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

        // Helper to create slug
        const createSlug = (name) => {
            return name
                .toLowerCase()
                .replace(/ /g, '-')
                .replace(/[^\w-]+/g, '');
        };

        const targetUrl = `${clientUrl}/product/${id}-${createSlug(product.name)}`;

        // Handle Image URL (needs full path)
        const host = req.get('host');
        const protocol = req.protocol;
        const mainImage = product.images && product.images.length > 0 ? product.images[0] : '';
        const imageUrl = mainImage.startsWith('http')
            ? mainImage
            : `${protocol}://${host}${mainImage}`;

        // Self URL for crawlers (so they keep reading this metadata)
        const selfUrl = `${protocol}://${host}${req.originalUrl}`;

        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${product.name} | Kemazon.ar</title>
                
                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="website">
                <meta property="og:url" content="${selfUrl}">
                <meta property="og:title" content="${product.name} | Kemazon.ar">
                <meta property="og:description" content="${product.description ? product.description.substring(0, 200) : 'Mira este increíble producto en Kemazon.ar'}">
                <meta property="og:image" content="${imageUrl}">

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:url" content="${selfUrl}">
                <meta property="twitter:title" content="${product.name} | Kemazon.ar">
                <meta property="twitter:description" content="${product.description ? product.description.substring(0, 200) : 'Mira este increíble producto en Kemazon.ar'}">
                <meta property="twitter:image" content="${imageUrl}">
                
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #E63946; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <h1>Redirigiendo a Kemazon.ar...</h1>
                <div class="loader"></div>
                <p>${product.name}</p>
                <script>
                    setTimeout(() => {
                        window.location.href = "${targetUrl}";
                    }, 100);
                </script>
            </body>
            </html>
        `;

        res.send(html);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
