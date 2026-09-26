import { sendNotification } from "../utils/pushClient.js";
import prisma from "../config/prismaClient.js";

export const saveFcmToken = async (req, res, next) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user?.id;

        if (!fcmToken) {
            return res.status(400).json({ message: 'fcmToken is required' });
        }

        // Find the user and update their fcmToken field
        const user = await prisma.user.update({
            where: { id: userId },
            data: { fcmToken: fcmToken }
        }).catch(() => null);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'FCM token saved successfully' });

    } catch (err) {
        next(err);
    }
};

export const testNotification = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.id } });

        if (!user || !user.fcmToken) {
            return res.status(404).json({ message: 'User or FCM token not found.' });
        }

        const title = "MedKnock Test ✨";
        const body = "Your connection to the arcane realm is working perfectly!";

        await sendNotification(user.fcmToken, title, body);

        return res.status(200).json({ message: 'Test notification sent!' });
    } catch (err) {
        next(err);
    }
};

