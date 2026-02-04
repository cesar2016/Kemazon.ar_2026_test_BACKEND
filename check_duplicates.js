const prisma = require('./prismaClient');

async function checkDuplicates() {
    const orders = await prisma.order.findMany({
        include: { items: true }
    });

    const productCounts = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            if (!productCounts[item.productId]) {
                productCounts[item.productId] = [];
            }
            productCounts[item.productId].push(order.id);
        });
    });

    console.log('Duplicate Orders for Products:');
    for (const [productId, orderIds] of Object.entries(productCounts)) {
        if (orderIds.length > 1) {
            console.log(`Product ID ${productId} has orders: ${orderIds.join(', ')}`);
        }
    }
}

checkDuplicates()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
