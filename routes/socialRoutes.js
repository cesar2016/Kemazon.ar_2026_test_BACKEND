const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

router.get('/share/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const debug = req.query.debug === 'true'; // Check for debug query param

        // 1. Detect Protocol (Force HTTPS on Render)
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');

        console.log(`[Social Share] Accessing ID: ${id}`);
        console.log(`[Social Share] Host: ${host}, Protocol: ${protocol}`);
        console.log(`[Social Share] User-Agent: ${req.get('User-Agent')}`);

        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
        });

        if (!product) {
            console.log(`[Social Share] Product ${id} not found`);
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

        // Handle Image URL (Force HTTPS)
        const mainImage = product.images && product.images.length > 0 ? product.images[0] : '';
        let imageUrl = '';

        if (mainImage) {
            if (mainImage.startsWith('http')) {
                // Ensure it's HTTPS
                imageUrl = mainImage.replace(/^http:\/\//i, 'https://');
            } else {
                // Local upload path - construct absolute URL
                imageUrl = `${protocol}://${host}${mainImage}`;
            }
        }

        console.log(`[Social Share] Generated Image URL: ${imageUrl}`);

        // Self URL for crawlers
        const selfUrl = `${protocol}://${host}${req.originalUrl}`;

        // Persuasive Marketing Logic
        const price = parseFloat(product.price).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
        const rawDescription = product.description || '';
        const shortDesc = rawDescription.length > 100 ? rawDescription.substring(0, 100) + '...' : rawDescription;

        // Emojis for rotation to keep it fresh (optional, but sticking to one solid format for now)
        const description = `🔥 ¡Oferta Imperdible! ${product.name} a solo ${price} 😱. ${shortDesc} 👉 ¡Entrá ya y compralo en Kemazon.ar antes de que vuele! 🚀`;

        const title = `${product.name} | ${price} | Kemazon.ar 🇦🇷`;

        const html = `
            <!DOCTYPE html>
            <html lang="es" prefix="og: http://ogp.me/ns#">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <meta name="description" content="${description}">

                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="product">
                <meta property="og:url" content="${selfUrl}">
                <meta property="og:title" content="${title}">
                <meta property="og:description" content="${description}">
                <meta property="og:site_name" content="Kemazon.ar">
                
                ${imageUrl ? `
                <meta property="og:image" content="${imageUrl}">
                <meta property="og:image:secure_url" content="${imageUrl}">
                <meta property="og:image:width" content="1000">
                <meta property="og:image:height" content="1000">
                <meta property="og:image:alt" content="${product.name}">
                ` : ''}

                <!-- Twitter -->
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:url" content="${selfUrl}">
                <meta name="twitter:title" content="${title}">
                <meta name="twitter:description" content="${description}">
                ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}

                <!-- Schema.org for Google -->
                <meta itemprop="name" content="${title}">
                <meta itemprop="description" content="${description}">
                ${imageUrl ? `<meta itemprop="image" content="${imageUrl}">` : ''}
                
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #E63946; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .debug-info { text-align: left; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 20px; overflow-wrap: break-word; max-width: 600px; margin-left: auto; margin-right: auto; }
                    code { background: #eee; padding: 2px 5px; border-radius: 4px; }
                </style>
            </head>
            <body>
                ${debug ? '<h1>Modo Debug: Meta Tags Generados</h1>' : '<h1>Redirigiendo a Kemazon.ar...</h1>'}
                
                ${!debug ? '<div class="loader"></div>' : ''}
                
                <p><strong>${product.name}</strong></p>

                ${debug ? `
                    <div class="debug-info">
                        <h3>Diagnostic Info:</h3>
                        <ul>
                            <li><strong>Incoming Protocol:</strong> <code>${protocol}</code></li>
                            <li><strong>Host:</strong> <code>${host}</code></li>
                            <li><strong>OG Title:</strong> ${title}</li>
                            <li><strong>OG Image:</strong> <a href="${imageUrl}" target="_blank">${imageUrl}</a></li>
                            <li><strong>Redirect Target:</strong> <a href="${targetUrl}">${targetUrl}</a></li>
                        </ul>
                        <p><em>Remove ?debug=true to test actual redirect.</em></p>
                    </div>
                ` : ''}

                <script>
                    ${!debug ? `
                    setTimeout(() => {
                        window.location.href = "${targetUrl}";
                    }, 500); // Increased slightly to ensure crawlers catch metadata if they execute JS (rare but possible)
                    ` : ''}
                </script>
            </body>
            </html>
        `;

        res.send(html);

    } catch (err) {
        console.error('[Social Share Error]', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
