const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categories = [
    'Casa, hogar y jardin',
    'Belleza',
    'Ropa y calzado',
    'Construcion',
    'Rodados',
    'Fitness',
    'Niños y bebes',
    'Mascotas',
    'Servicios',
    'Otros'
];

async function main() {
    console.log('Seeding categories...');

    for (const categoryName of categories) {
        const category = await prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: {
                name: categoryName,
            },
        });
        console.log(`Created/Updated category: ${category.name}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
