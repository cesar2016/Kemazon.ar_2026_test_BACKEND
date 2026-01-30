const prisma = require('../prismaClient');

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                name: 'asc'
            }
        });
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
