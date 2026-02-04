const prisma = require('./prismaClient');

async function cleanup() {
    // Delete Order 1 (assuming it's the duplicate or one of them)
    // We need to delete OrderItems first if cascade isn't set up, but let's try deleting Order.
    // In schema, we didn't set onDelete: Cascade for items, so we should delete items first.

    console.log('Deleting items for Order 1...');
    await prisma.orderItem.deleteMany({
        where: { orderId: 1 }
    });

    console.log('Deleting Order 1...');
    await prisma.order.delete({
        where: { id: 1 }
    });

    console.log('Cleanup complete.');
}

cleanup()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
