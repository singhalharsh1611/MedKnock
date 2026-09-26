import twilio from "twilio";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const testWhatsApp = async () => {
    // CHANGE THIS TO YOUR PHONE NUMBER (e.g., "+919876543210")
    const targetNumber = "+919999999999"; 
    
    // Ensure twilio sandbox number is set in .env as TWILIO_PHONE_NUMBER
    const fromNumber = `${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const toNumber = `whatsapp:${targetNumber}`;

    try {
        console.log(`Attempting to send WhatsApp message to ${toNumber}...`);
        const message = await client.messages.create({
            from: fromNumber,
            to: toNumber,
            contentSid: process.env.TWILIO_CONTENT_SID
        });
        
        console.log("WhatsApp message sent successfully!");
        console.log("Message SID:", message.sid);
    } catch (error) {
        console.error("Error: WhatsApp sending failed:");
        console.error(error.message);
    }
};

testWhatsApp();


