import { NotificationService } from "../services/notificationService.js";

export const saveFcmToken = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await NotificationService.saveFcmToken(userId, req.body.fcmToken);
    return res.status(200).json({ message: 'FCM token saved successfully' });
  } catch (err) {
    if (err.message === "fcmToken is required") return res.status(400).json({ message: err.message });
    if (err.message === "User not found") return res.status(404).json({ message: err.message });
    next(err);
  }
};

export const testNotification = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await NotificationService.testNotification(userId);
    return res.status(200).json({ message: 'Test notification sent!' });
  } catch (err) {
    if (err.message === "User or FCM token not found.") return res.status(404).json({ message: err.message });
    next(err);
  }
};
