const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const sendEmail = require('../utils/emailService');

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

        // Insert user (Status: false by default, Role will default to 2 via Schema)
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                status: false // Explicitly set to false just in case
            },
            select: {
                id: true,
                username: true,
                email: true
            }
        });

        // Create verification token
        const payload = {
            user: {
                id: newUser.id,
            },
        };

        const verificationToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const verificationLink = `${clientUrl}/verify/${verificationToken}`;

        // Send Email
        const emailSent = await sendEmail(
            email,
            'Confirma tu cuenta en Kemazon.ar',
            `
            <h1>¡Bienvenido a Kemazon.ar!</h1>
            <p>Hola ${username}, gracias por registrarte.</p>
            <p>Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:</p>
            <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #E63946; color: white; text-decoration: none; border-radius: 5px;">Confirmar Cuenta</a>
            <p>Si no te registraste, ignora este correo.</p>
            `
        );

        if (!emailSent) {
            console.warn('Failed to send verification email');
            // Consider deleting the user or retrying, but for now we just return success but warn
        }

        res.json({ msg: 'Registro exitoso. Por favor verifica tu correo para activar tu cuenta.', user: newUser });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.verifyAccount = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.status) {
            return res.status(400).json({ msg: 'Account already verified' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { status: true }
        });

        res.json({ msg: 'Account verified successfully. You can now login.' });

    } catch (err) {
        console.error(err.message);
        res.status(400).json({ msg: 'Invalid or expired token' });
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

        // Check status
        if (!user.status) {
            return res.status(403).json({ msg: 'Account not active. Please check your email to verify your account.' });
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
                roleId: user.roleId // Include role in token
            },
        };

        // Sign Token
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email, roleId: user.roleId, avatar: user.avatar, fullName: user.fullName } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
