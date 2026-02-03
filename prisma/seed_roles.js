
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding roles...');

    const roles = [
        { id: 1, name: 'Administrador' },
        { id: 2, name: 'Usuario' },
    ];

    for (const role of roles) {
        const upsertedRole = await prisma.role.upsert({
            where: { id: role.id },
            update: { name: role.name },
            create: { id: role.id, name: role.name },
        });
        console.log(`Role upserted: ${upsertedRole.name}`);
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
