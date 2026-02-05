const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const maskUsername = (username) => {
    if (!username) return 'Anónimo';
    const len = username.length;
    if (len <= 3) return username[0] + '***';
    return username.substring(0, 3) + '***';
};

exports.createQuestion = async (req, res) => {
    try {
        console.log('createQuestion - Body:', req.body);
        console.log('createQuestion - User:', req.user); // Should be populated by auth middleware

        const { content, productId } = req.body;
        const userId = req.user.id;

        const product = await prisma.product.findUnique({
            where: { id: parseInt(productId) }
        });

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // Prevent asking on own product? Usually allowed, but let's allow it for clarification.

        const question = await prisma.question.create({
            data: {
                content,
                productId: parseInt(productId),
                userId
            }
        });

        res.json(question);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getQuestionsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const questions = await prisma.question.findMany({
            where: {
                productId: parseInt(productId)
            },
            include: {
                user: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const maskedQuestions = questions.map(q => ({
            ...q,
            user: {
                username: maskUsername(q.user.username)
            }
        }));

        res.json(maskedQuestions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.answerQuestion = async (req, res) => {
    try {
        const { id } = req.params; // Question ID
        const { answer } = req.body;
        const userId = req.user.id; // Seller

        const question = await prisma.question.findUnique({
            where: { id: parseInt(id) },
            include: { product: true }
        });

        if (!question) {
            return res.status(404).json({ msg: 'Question not found' });
        }

        if (question.product.userId !== userId) {
            return res.status(401).json({ msg: 'Not authorized to answer this question' });
        }

        const updatedQuestion = await prisma.question.update({
            where: { id: parseInt(id) },
            data: {
                answer
            }
        });

        res.json(updatedQuestion);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get questions received on my products (for me to answer)
exports.getReceivedQuestions = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find products belonging to user
        const questions = await prisma.question.findMany({
            where: {
                product: {
                    userId: userId
                }
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        images: true
                    }
                },
                user: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(questions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get questions I asked on other products
exports.getAskedQuestions = async (req, res) => {
    try {
        const userId = req.user.id;

        const questions = await prisma.question.findMany({
            where: {
                userId: userId
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                        userId: true // To check seller info if needed
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(questions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
