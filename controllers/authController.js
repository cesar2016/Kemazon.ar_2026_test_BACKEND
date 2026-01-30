const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user exists
        const userCheck = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: username }
                ]
            }
        });

        if (userCheck) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword
            },
            select: {
                id: true,
                username: true,
                email: true
            }
        });

        // Create payload
        const payload = {
            user: {
                id: newUser.id,
            },
        };

        // Sign Token
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: newUser });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check user
        const user = await prisma.user.findUnique({
            where: { email: email }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Create payload
        const payload = {
            user: {
                id: user.id,
            },
        };

        // Sign Token
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, fullName: user.fullName } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
