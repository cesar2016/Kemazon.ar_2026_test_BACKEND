const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const makeAdmin = async () => {
    const email = process.argv[2];

    if (!email) {
        console.error('Please provide an email address as an argument.');
        console.log('Usage: node make_admin.js <email>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email }
        });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        const updatedUser = await prisma.user.update({
            where: { email: email },
            data: { roleId: 1 }
        });

        console.log(`Success! User ${updatedUser.username} (${updatedUser.email}) is now an Admin (roleId: 1).`);
    } catch (error) {
        console.error('Error updating user:', error);
    } finally {
        await prisma.$disconnect();
    }
};

makeAdmin();
