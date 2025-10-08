import jwt from "jsonwebtoken";
import { google } from "googleapis";
import User from "../models/userModel.js";
import { oAuth2Client, SCOPES } from "../config/googleCalendar.js";
import { syncDosesToGoogleCalendar } from "./scheduleController.js";

// Step 1: Generate Google OAuth URL
export const connectGoogleCalendar = async (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(401).send("Unauthorized: Token missing");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state: userId,
    });

    res.redirect(authUrl);
  } catch (error) {
    return res.status(401).send("Unauthorized: Invalid token");
  }
};

// Step 2: Handle Google OAuth callback
export const googleCalendarCallback = async (req, res) => {
  const { code, state: userId } = req.query;

  if (!code) return res.status(400).send("Authorization code missing.");

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/v1/user/google-calendar/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        googleCalendarToken: tokens.access_token,
        ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
        isGoogleConnected: true,
      },
      { new: true }
    );

    await syncDosesToGoogleCalendar(user);

    res.redirect(`${process.env.FRONTEND_URL}/profile?calendar_connected=true`);
  } catch (error) {
    console.error("Calendar OAuth error:", error);
    res.redirect(
      `${process.env.FRONTEND_URL}/profile?calendar_error=${encodeURIComponent(
        error.message
      )}`
    );
  }
};

// Step 3: Disconnect Google Calendar
export const disconnectGoogleCalendar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.googleCalendarToken = null;
    user.googleRefreshToken = null;
    user.isGoogleConnected = false;

    await user.save();

    res.json({ success: true, message: "Disconnected from Google Calendar" });
  } catch (error) {
    console.error("Disconnect error:", error);
    res.status(500).json({ success: false, message: "Failed to disconnect" });
  }
};
