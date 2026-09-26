import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase (copied from config/firebaseAdmin.js logic)
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const testPush = async () => {
    // CHANGE THIS TO YOUR DEVICE'S FCM TOKEN (You can find it in your MongoDB User document or console logs in frontend)
    const targetFcmToken = "YOUR_FCM_TOKEN_HERE";

    if (targetFcmToken === "YOUR_FCM_TOKEN_HERE") {
        console.error(",? Please replace 'YOUR_FCM_TOKEN_HERE' with a real token in test-push.js");
        process.exit(1);
    }

    const message = {
        notification: { 
            title: "MedKnock Test Notification", 
            body: "This is a test push notification to verify Firebase Cloud Messaging." 
        },
        token: targetFcmToken,
    };

    try {
        console.log("Attempting to send Push Notification...");
        const response = await admin.messaging().send(message);
        console.log("Push notification sent successfully!");
        console.log("Response:", response);
    } catch (error) {
        console.error(",? Push notification failed:");
        console.error(error);
    }
};

testPush();
