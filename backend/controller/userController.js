import prisma from "../config/prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinaryConfig.js";
import validator from "validator";

import { sendEmail } from "../utils/emailClient.js";




export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    //checking feilds
    if (!email || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json({ success: false, message: "all feilds required" });
    }

    // checking user already exist
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    //salting and hashing of password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // store user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );

    // response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { email: newUser.email, token },
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      status: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // checking if user exists or not
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    //salting and hashing of password
    const match = await bcrypt.compare(password, user.password);

    //checking password
    if (!match) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );
    // console.log(token);
    //respose
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        email: user.email,
        token,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const allUser = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const photoUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "MedKnock" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    const userId = req.user.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { photo: photoUrl.secure_url }
    });

    res.status(200).json({
      success: true,
      message: "Photo uploaded",
      photo: photoUrl,
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Upload failed", error: err.message });
  }
};
// --- Email Verification for Register ---
export const sendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Invalid email" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    await sendEmail(
      email,
      "Verify Your Email for MedKnock Registration",
      `<h3>Welcome to MedKnock!<br>Your verification OTP is: <strong>${otp}</strong></h3>`
    );
    console.log(`Verification OTP sent to ${email}`);
    res.json({ success: true, message: "Verification OTP sent to email" });
  } catch (error) {
    console.error("Email sending error:", error.message);
    res.status(500).json({ success: false, message: "Email failed" });
  }
};

export const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const stored = otpStore[email];
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }

    delete otpStore[email]; // remove used OTP
    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

//forgot password mail sender
const otpStore = {};

export const sendMail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Invalid email" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    // --- Start: Twilio Email Logic ---
    await sendEmail(
      email,
      "Your OTP Code for MedKnock",
      `<h3>Thank you for visiting MedKnock.<br>Your OTP is: <strong>${otp}</strong></h3>`
    );
    // --- End: Twilio Email Logic ---

    console.log(`OTP Email sent to ${email} via SendGrid`);
    res.json({ success: true, message: "OTP sent to email" });

  } catch (error) {
    console.error("Email sending error:", error.message);
    if (error.response) {
      console.error(error.response.body); // Log detailed SendGrid error
    }
    res.status(500).json({ success: false, message: "Email failed" });
  }
};

// update password
export const updatePassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    // Validate input
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Invalid email" });
    }
    if (password.length < 8) {
      return res.json({ success: false, message: "Weak password" });
    }

    const stored = otpStore[email];
    // console.log(stored,otp)
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    
    console.log("password update");
    delete otpStore[email]; // clean up used OTP

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({ success: true, message: "Password updated", token });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, message: "Email failed", error });
  }
};
