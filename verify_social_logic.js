
const product = {
    name: 'Lancha con motor Yamaha 90',
    description: 'Lancha en perfecto estado, poco uso, incluye trailer y lona.',
    price: 15000000
};

// Logic copied from socialRoutes.js for verification
const price = parseFloat(product.price).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
const rawDescription = product.description || '';
const shortDesc = rawDescription.length > 100 ? rawDescription.substring(0, 100) + '...' : rawDescription;

const description = `🔥 ¡Oferta Imperdible! ${product.name} a solo ${price} 😱. ${shortDesc} 👉 ¡Entrá ya y compralo en Kemazon.ar antes de que vuele! 🚀`;
const title = `${product.name} | ${price} | Kemazon.ar 🇦🇷`;

console.log('--- Generated Meta Tags ---');
console.log('Title:', title);
console.log('Description:', description);
console.log('--- End ---');
