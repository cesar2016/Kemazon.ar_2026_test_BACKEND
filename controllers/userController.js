const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                whatsapp: true,
                avatar: true,
                roleId: true,
                status: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                fullName: true,
                country: true,
                province: true,
                city: true,
                whatsapp: true,
                avatar: true,
                roleId: true, // Important for AuthContext
                status: true,
                products: true // Opcional: incluir productos del usuario
            }
        });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Helper to process and save avatar
const processAndSaveAvatar = async (buffer) => {
    try {
        const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpeg`;
        const uploadPath = path.join(__dirname, '../uploads', filename);

        // Ensure uploads directory exists
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        await sharp(buffer)
            .resize(300, 300, { // Standard avatar size
                fit: 'cover'
            })
            .toFormat('jpeg', { quality: 80 })
            .toFile(uploadPath);

        return `/uploads/${filename}`;
    } catch (error) {
        console.error('Error processing avatar:', error);
        throw error;
    }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, fullName, country, province, city, whatsapp } = req.body;

        // Validar si el usuario existe
        const userExists = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!userExists) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Preparar datos para actualizar
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (fullName !== undefined) updateData.fullName = fullName;
        if (country !== undefined) updateData.country = country;
        if (province !== undefined) updateData.province = province;
        if (city !== undefined) updateData.city = city;
        if (whatsapp !== undefined) updateData.whatsapp = whatsapp;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        if (req.file) {
            const avatarPath = await processAndSaveAvatar(req.file.buffer);
            updateData.avatar = avatarPath;
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                country: true,
                province: true,
                city: true,
                whatsapp: true,
                avatar: true,
                createdAt: true
            }
        });

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar si el usuario existe
        const userExists = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!userExists) {
            return res.status(404).json({ msg: 'User not found' });
        }

        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
// Cambiar estado del usuario (Bloquear/Desbloquear)
exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Expecting boolean

        if (typeof status !== 'boolean') {
            return res.status(400).json({ msg: 'Invalid status format' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status },
            select: { id: true, username: true, status: true }
        });

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Cambiar rol del usuario
exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId } = req.body; // Expecting integer (1=Admin, 2=User)

        if (!roleId || typeof roleId !== 'number') {
            return res.status(400).json({ msg: 'Invalid roleId' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { roleId },
            select: { id: true, username: true, roleId: true }
        });

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
