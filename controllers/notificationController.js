const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const notifications = await prisma.userNotification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                notificationType: true
            },
            take: limit,
            skip: skip
        });

        const total = await prisma.userNotification.count({ where: { userId } });

        res.json({
            notifications,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error fetching notifications' });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await prisma.userNotification.count({
            where: {
                userId,
                isRead: false
            }
        });
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error getting unread count' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (id === 'all') {
            await prisma.userNotification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });
            return res.json({ msg: 'All notifications marked as read' });
        }

        const notification = await prisma.userNotification.findUnique({
            where: { id: parseInt(id) }
        });

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        if (notification.userId !== userId) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await prisma.userNotification.update({
            where: { id: parseInt(id) },
            data: { isRead: true }
        });

        res.json({ msg: 'Notification marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error marking as read' });
    }
};

module.exports = {
    getUserNotifications,
    getUnreadCount,
    markAsRead
};
