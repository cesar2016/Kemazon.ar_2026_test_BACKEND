const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const notificationTypes = [
        { nameNotification: 'Alta', description: 'Bienvenida al registrarse' },
        { nameNotification: 'query', description: 'Pregunta recibida en un producto' },
        { nameNotification: 'answer', description: 'Respuesta recibida a una pregunta' },
        { nameNotification: 'manual_sale', description: 'Venta manual registrada' },
        { nameNotification: 'sale', description: 'Venta realizada por MercadoPago' },
        { nameNotification: 'buy', description: 'Compra realizada por MercadoPago' },
    ];

    console.log('Seeding notification types...');

    for (const type of notificationTypes) {
        await prisma.notificationType.upsert({
            where: { nameNotification: type.nameNotification },
            update: {},
            create: type,
        });
    }

    console.log('Notification types seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
