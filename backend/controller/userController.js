import validator from "validator";
import { UserService } from "../services/userService.js";

export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: "all fields required" });
    }

    const { user, token } = await UserService.registerUser({ email, password, firstName, lastName });
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { email: user.email, token },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await UserService.loginUser({ email, password });
    
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { email: user.email, token },
    });
  } catch (err) {
    const statusCode = err.message === "User not found" ? 404 : 400;
    res.status(statusCode).json({ success: false, message: err.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const updatedUser = await UserService.updateUserProfile(req.params.id, req.body);
    res.json({
      status: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    const statusCode = err.message === "User not found" ? 404 : 400;
    res.status(statusCode).json({ success: false, message: err.message });
  }
};

export const allUser = async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    const statusCode = err.message === "User not found" ? 404 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const { photoUrl, updatedUser } = await UserService.uploadProfilePhoto(req.user.id, req.file.buffer);
    res.status(200).json({
      success: true,
      message: "Photo uploaded",
      photo: photoUrl,
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed", error: err.message });
  }
};

export const sendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!validator.isEmail(email)) return res.json({ success: false, message: "Invalid email" });

    await UserService.sendVerificationOTP(email);
    res.json({ success: true, message: "Verification OTP sent to email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message === "User already exists" ? error.message : "Email failed" });
  }
};

export const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    await UserService.verifyEmailOTP(email, otp);
    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const sendMail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!validator.isEmail(email)) return res.json({ success: false, message: "Invalid email" });

    await UserService.sendPasswordResetOTP(email);
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message === "User not found" ? error.message : "Email failed" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    if (!validator.isEmail(email)) return res.json({ success: false, message: "Invalid email" });
    if (password.length < 8) return res.json({ success: false, message: "Weak password" });

    const token = await UserService.updatePassword(email, password, otp);
    res.json({ success: true, message: "Password updated", token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
