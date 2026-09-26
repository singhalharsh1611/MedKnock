import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const FROM_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

/**
 * Send a WhatsApp message (Sandbox mode)
 * @param {string} to - recipient number in E.164 format (e.g. whatsapp:+919876543210)
 * @param {string} name - person's name
 * @param {string} medicine - medicine name
 * @param {string} time - reminder time
 */

export const sendWhatsAppMessage = async (to, name, medicine, time, customMsg) => {
  try {
    // console.log(FROM_NUMBER);
    const message = await client.messages.create({
      from: FROM_NUMBER,
      to,
      body: customMsg ? customMsg : `👋 Hi ${name}! It's time to take your medicine: 💊${medicine} at ⏰${time}.`,
    });

    console.log(`WhatsApp message sent successfully! SID: ${message.sid}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error.message);
    return { success: false, error };
  }
};
