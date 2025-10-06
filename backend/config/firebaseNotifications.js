import admin from "./firebaseAdmin.js";

export const sendNotification = async (fcmToken, title, body) => {
    try {
        const message = {
            token: fcmToken,
            notification: { title, body },
            android: { priority: 'high' },
            apns: { headers: { 'apns-priority': '10' } }
        }

        const response = await admin.messaging().send(message);
        console.log('Notification sent:', response);
        return response;
    } catch (err) {
        console.error('Error sending notification:', err);
        throw err;
    }
}