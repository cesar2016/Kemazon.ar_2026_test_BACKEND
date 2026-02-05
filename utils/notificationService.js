const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Creates a notification for a user.
 * 
 * @param {number} userId - The ID of the user receiving the notification.
 * @param {string} typeName - The name of the notification type (e.g., 'Alta', 'query').
 * @param {string} message - The notification message.
 * @param {number|null} relatedId - Optional ID of a related entity (e.g., product ID).
 */
const createNotification = async (userId, typeName, message, relatedId = null) => {
    try {
        const type = await prisma.notificationType.findUnique({
            where: { nameNotification: typeName }
        });

        if (!type) {
            console.error(`Notification type '${typeName}' not found.`);
            return;
        }

        await prisma.userNotification.create({
            data: {
                userId,
                notificationTypeId: type.id,
                message,
                relatedId
            }
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

module.exports = createNotification;
