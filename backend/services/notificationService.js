import { sendNotification } from "../utils/pushClient.js";
import prisma from "../config/prismaClient.js";

export class NotificationService {
  static async saveFcmToken(userId, fcmToken) {
    if (!fcmToken) throw new Error("fcmToken is required");

    const user = await prisma.user.update({
      where: { id: userId },
      data: { fcmToken: fcmToken }
    }).catch(() => null);

    if (!user) throw new Error("User not found");
    return user;
  }

  static async testNotification(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.fcmToken) {
      throw new Error("User or FCM token not found.");
    }

    const title = "MedKnock Test ✨";
    const body = "Your connection to the arcane realm is working perfectly!";

    await sendNotification(user.fcmToken, title, body);
    return true;
  }
}
