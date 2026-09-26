import { sendEmail } from '../utils/emailClient.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const testGmail = async () => {
    try {
        console.log(`Attempting to send Gmail to singhalharsh1611@gmail.com...`);
        await sendEmail(
            "singhalharsh1611@gmail.com", 
            "MedKnock Test Email", 
            "<h3>It works!</h3><p>Your Nodemailer Gmail setup is working perfectly.</p>"
        );
        console.log("Successfully sent test email via Gmail!");
    } catch (error) {
        console.error("Test email failed:", error);
    }
};

testGmail();

